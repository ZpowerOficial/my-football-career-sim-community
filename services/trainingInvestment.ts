/**
 * TRAINING INVESTMENT SERVICE - v0.5.6
 * 
 * Sistema de investimento em treino intensivo.
 * Permite ao jogador investir dinheiro para aumentar chances de desenvolvimento.
 * 
 * FILOSOFIA "ANSU FATI":
 * - Pagar NÃO garante resultado
 * - Existe variância (0.95 - 1.4)
 * - Super Agent protege contra resultados negativos
 * - Modo Dinâmico: IA decide baseado em fatores do jogo
 * - Modo Tático: Jogador decide manualmente
 */

import type { Player, CareerMode } from '../types';
import { gaussianRandom, clamp, randFloat } from './utils';

// ==================== TIPOS ====================

export interface TrainingInvestmentResult {
  success: boolean;
  modifier: number;           // 0.95 - 1.4
  cost: number;               // Custo em €
  resultType: 'excellent' | 'good' | 'neutral' | 'poor';
  narrativeKey: string;       // Chave de tradução para feedback
  canAfford: boolean;
}

export interface TrainingInvestmentDecision {
  shouldInvest: boolean;
  reason: string;
  confidence: number;         // 0-1, quão certa é a IA sobre a decisão
}

// ==================== CONSTANTES ====================

const TRAINING_COST_WEEKS = 4; // Custo = 4 semanas de salário

// Ranges de modificador por resultado
const MODIFIER_RANGES = {
  excellent: { min: 1.25, max: 1.40 },  // ~15% chance
  good: { min: 1.10, max: 1.24 },       // ~35% chance
  neutral: { min: 1.00, max: 1.09 },    // ~35% chance
  poor: { min: 0.95, max: 0.99 }        // ~15% chance
};

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Calcula o custo do treino intensivo
 */
export function calculateTrainingCost(player: Player): number {
  const weeklyWage = player.wage || 0;
  return weeklyWage * TRAINING_COST_WEEKS * 1000; // wage é em k€/semana
}

/**
 * Verifica se o jogador pode pagar pelo treino
 */
export function canAffordTraining(player: Player): boolean {
  const cost = calculateTrainingCost(player);
  const savings = player.bankBalance || player.expandedData?.careerFinanceStats?.currentSavings || 0;
  return savings >= cost;
}

/**
 * Rola o dado de treino e retorna o modificador
 * Super Agent protege contra resultados negativos (piso de 1.0)
 */
export function rollTrainingModifier(player: Player): TrainingInvestmentResult {
  const cost = calculateTrainingCost(player);
  const canAfford = canAffordTraining(player);
  
  if (!canAfford) {
    return {
      success: false,
      modifier: 1.0,
      cost,
      resultType: 'neutral',
      narrativeKey: 'training.cantAfford',
      canAfford: false
    };
  }
  
  // Rola o dado base usando distribuição normal
  // Média de 1.1, desvio padrão de 0.12
  // Isso dá ~68% entre 0.98-1.22 e ~95% entre 0.86-1.34
  let rawRoll = gaussianRandom(1.10, 0.12);
  rawRoll = clamp(rawRoll, 0.95, 1.40);
  
  // Super Agent protege contra resultados negativos
  const isSuperAgent = player.agent?.reputation === 'Super Agent';
  if (isSuperAgent && rawRoll < 1.0) {
    rawRoll = 1.0;
  }
  
  // Determina o tipo de resultado
  let resultType: 'excellent' | 'good' | 'neutral' | 'poor';
  let narrativeKey: string;
  
  if (rawRoll >= MODIFIER_RANGES.excellent.min) {
    resultType = 'excellent';
    narrativeKey = 'training.resultExcellent';
  } else if (rawRoll >= MODIFIER_RANGES.good.min) {
    resultType = 'good';
    narrativeKey = 'training.resultGood';
  } else if (rawRoll >= MODIFIER_RANGES.neutral.min) {
    resultType = 'neutral';
    narrativeKey = 'training.resultNeutral';
  } else {
    resultType = 'poor';
    narrativeKey = 'training.resultPoor';
  }
  
  return {
    success: true,
    modifier: Math.round(rawRoll * 100) / 100, // 2 casas decimais
    cost,
    resultType,
    narrativeKey,
    canAfford: true
  };
}

/**
 * Verifica se o jogador já investiu nesta temporada
 */
export function hasAlreadyInvestedThisSeason(player: Player, currentSeason: number): boolean {
  return player.trainingModifierSeason === currentSeason;
}

/**
 * Aplica o investimento em treino ao jogador
 * Retorna o jogador atualizado com o modificador e saldo descontado
 */
export function applyTrainingInvestment(
  player: Player,
  currentSeason: number
): Player {
  const result = rollTrainingModifier(player);
  
  if (!result.success) {
    return player;
  }
  
  // Cria cópia do jogador com as alterações
  const updatedPlayer: Player = {
    ...player,
    trainingModifier: result.modifier,
    trainingModifierSeason: currentSeason,
    lastTrainingResult: result.resultType,
    bankBalance: (player.bankBalance || 0) - result.cost
  };
  
  // Desconta do saldo também no expandedData
  if (updatedPlayer.expandedData?.careerFinanceStats) {
    updatedPlayer.expandedData = {
      ...updatedPlayer.expandedData,
      careerFinanceStats: {
        ...updatedPlayer.expandedData.careerFinanceStats,
        currentSavings: updatedPlayer.expandedData.careerFinanceStats.currentSavings - result.cost,
        totalSpent: updatedPlayer.expandedData.careerFinanceStats.totalSpent + result.cost
      }
    };
  }
  
  return updatedPlayer;
}

// ==================== DECISÃO AUTOMÁTICA (MODO DINÂMICO) ====================

/**
 * IA decide se o jogador deve investir em treino (Modo Dinâmico)
 * Baseado em: agente, clube, potencial, idade, finanças, liga
 */
export function shouldAutoInvest(player: Player): TrainingInvestmentDecision {
  const factors = {
    canAfford: canAffordTraining(player),
    hasGrowthRoom: (player.potential - player.stats.overall) > 3,
    isYoung: player.age < 28,
    hasGoodAgent: ['Good', 'Super Agent'].includes(player.agent?.reputation || ''),
    isInStrongLeague: player.team.leagueTier <= 2,
    hasHighPotential: player.potential >= 80,
    isAmbitious: player.personality === 'Ambitious' || player.personality === 'Professional',
    hasSufficientSavings: (player.expandedData?.careerFinanceStats?.currentSavings || 0) > calculateTrainingCost(player) * 3
  };
  
  // Contagem de fatores positivos
  let score = 0;
  let reasons: string[] = [];
  
  if (!factors.canAfford) {
    return {
      shouldInvest: false,
      reason: 'insufficient_funds',
      confidence: 1.0
    };
  }
  
  if (factors.hasGrowthRoom) { score += 2; reasons.push('growth_potential'); }
  if (factors.isYoung) { score += 1.5; reasons.push('young_age'); }
  if (factors.hasGoodAgent) { score += 1; reasons.push('good_agent'); }
  if (factors.isInStrongLeague) { score += 1; reasons.push('competitive_league'); }
  if (factors.hasHighPotential) { score += 1.5; reasons.push('high_potential'); }
  if (factors.isAmbitious) { score += 1; reasons.push('ambitious_personality'); }
  if (factors.hasSufficientSavings) { score += 0.5; reasons.push('financial_security'); }
  
  // Fatores negativos
  if (!factors.hasGrowthRoom) { score -= 3; } // Já atingiu potencial
  if (player.age >= 32) { score -= 2; } // Muito velho
  if (player.team.leagueTier >= 4) { score -= 1; } // Liga fraca (menos incentivo)
  
  // Decisão final
  // Score máximo ~8.5, mínimo ~-6
  // Threshold: 3.5 (investe se tem bom potencial e pode pagar)
  const threshold = 3.5;
  const shouldInvest = score >= threshold;
  
  // Adiciona aleatoriedade para não ser 100% previsível
  const randomFactor = randFloat(0.85, 1.15);
  const adjustedScore = score * randomFactor;
  const finalDecision = adjustedScore >= threshold;
  
  return {
    shouldInvest: finalDecision,
    reason: reasons[0] || 'general_assessment',
    confidence: clamp(Math.abs(adjustedScore - threshold) / 5, 0, 1)
  };
}

/**
 * Processa o treino automaticamente (Modo Dinâmico)
 * Retorna o jogador atualizado se decidiu investir, ou o mesmo jogador se não
 */
export function processAutoTraining(
  player: Player,
  currentSeason: number
): { player: Player; invested: boolean; result?: TrainingInvestmentResult } {
  const decision = shouldAutoInvest(player);
  
  if (!decision.shouldInvest) {
    return { player, invested: false };
  }
  
  const updatedPlayer = applyTrainingInvestment(player, currentSeason);
  
  // Verifica se houve investimento comparando o saldo
  const invested = updatedPlayer.bankBalance !== player.bankBalance;
  
  return {
    player: updatedPlayer,
    invested,
    result: invested ? {
      success: true,
      modifier: updatedPlayer.trainingModifier || 1.0,
      resultType: updatedPlayer.lastTrainingResult || 'neutral',
      cost: (player.bankBalance || 0) - (updatedPlayer.bankBalance || 0),
      narrativeKey: `training.result.${updatedPlayer.lastTrainingResult || 'neutral'}`,
      canAfford: true
    } : undefined
  };
}

// ==================== UTILITÁRIOS ====================

/**
 * Retorna o status de desenvolvimento baseado na liga e modificador
 */
export function getDevelopmentStatus(player: Player): 'boosted' | 'normal' | 'limited' {
  const leagueTier = player.team.leagueTier;
  const trainingModifier = player.trainingModifier || 1.0;
  
  if (trainingModifier >= 1.1 && leagueTier <= 2) {
    return 'boosted';
  } else if (leagueTier >= 4 && trainingModifier < 1.1) {
    return 'limited';
  }
  return 'normal';
}

/**
 * Calcula o fator de desenvolvimento combinado (liga + treino)
 * Para uso em playerProgression.ts
 */
export function getCombinedDevelopmentFactor(player: Player): number {
  // Fator base da liga (Tier 1 = 1.0, Tier 5 = 0.7)
  const leagueFactor = 1.0 - (player.team.leagueTier - 1) * 0.075;
  
  // Fator de treino (default 1.0)
  const trainingFactor = player.trainingModifier || 1.0;
  
  // Combina os fatores
  // Liga ruim + treino bom = compensa parcialmente
  // Liga boa + treino bom = stacks
  return leagueFactor * trainingFactor;
}

/**
 * Atualiza as finanças do jogador no fim da temporada
 * (Adiciona salário anual às economias)
 */
export function updateSeasonFinances(player: Player): Player {
  if (!player.expandedData?.careerFinanceStats) {
    return player;
  }
  
  const annualWage = player.wage * 52; // wage é em €/semana (não k€)
  
  // Jogador gasta ~60% do salário em estilo de vida, guarda ~40%
  const savingsRate = 0.4;
  const savedAmount = annualWage * savingsRate;
  
  const newSavings = player.expandedData.careerFinanceStats.currentSavings + savedAmount;
  
  return {
    ...player,
    bankBalance: newSavings, // <-- SYNC: bankBalance = currentSavings
    expandedData: {
      ...player.expandedData,
      careerFinanceStats: {
        ...player.expandedData.careerFinanceStats,
        totalEarnings: player.expandedData.careerFinanceStats.totalEarnings + annualWage,
        currentSavings: newSavings,
        weeklyWage: player.wage,
        monthlyWage: player.wage * 4,
        annualWage: player.wage * 52
      }
    }
  };
}
