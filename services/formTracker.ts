/**
 * Sistema de Rastreamento de Forma (Form Tracker)
 * Monitora performances recentes e momentum do jogador
 */

import { Player, FormTracker } from '../types';
import { clamp, randFloat } from '../utils/random';
import { logger } from '../utils/logger';

// ==================== CONSTANTES ====================

const FORM_THRESHOLDS = {
  EXCELLENT: 8.0,
  GOOD: 7.0,
  AVERAGE: 6.0,
  POOR: 5.0,
  // Abaixo de 5.0 = Terrible
};

const MOMENTUM_THRESHOLDS = {
  HOT_STREAK: 75, // Form >= 75
  COLD_SPELL: 35, // Form <= 35
  // Entre 35-75 = Steady
};

// ==================== INICIALIZAÃ‡ÃƒO ====================

/**
 * Cria um novo FormTracker para um jogador
 */
export const initializeFormTracker = (): FormTracker => {
  return {
    last5Matches: [],
    currentForm: 50, // Começa neutro
    momentum: 'Steady',
    effects: {
      ratingBonus: 0,
      transferInterest: 0,
      fanSentiment: 0
    }
  };
};

// ==================== ATUALIZAÃ‡ÃƒO DE FORMA ====================

/**
 * Classifica uma performance individual
 */
const classifyPerformance = (rating: number): FormTracker['last5Matches'][0] => {
  if (rating >= FORM_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (rating >= FORM_THRESHOLDS.GOOD) return 'Good';
  if (rating >= FORM_THRESHOLDS.AVERAGE) return 'Average';
  if (rating >= FORM_THRESHOLDS.POOR) return 'Poor';
  return 'Terrible';
};

/**
 * Atualiza o FormTracker após uma partida
 */
export const updateFormTracker = (
  formTracker: FormTracker,
  matchRating: number,
  playerName?: string
): FormTracker => {
  const performance = classifyPerformance(matchRating);

  // Adicionar nova performance
  const newLast5 = [...formTracker.last5Matches, performance];

  // Manter apenas últimas 5
  if (newLast5.length > 5) {
    newLast5.shift();
  }

  // Calcular nova forma baseada nas últimas partidas
  const currentForm = calculateCurrentForm(newLast5);

  // Determinar momentum
  const momentum = determineMomentum(currentForm, formTracker.currentForm);

  // Calcular efeitos
  const effects = calculateFormEffects(currentForm, momentum);

  logger.debug(
    `Form updated${playerName ? ` for ${playerName}` : ''}: ${performance} (Rating: ${matchRating.toFixed(1)}) - Form: ${currentForm.toFixed(0)}, Momentum: ${momentum}`,
    'form'
  );

  return {
    last5Matches: newLast5,
    currentForm,
    momentum,
    effects
  };
};

/**
 * Calcula a forma atual baseada nas últimas 5 partidas
 */
const calculateCurrentForm = (
  last5Matches: FormTracker['last5Matches']
): number => {
  if (last5Matches.length === 0) return 50;

  // Pesos: Partida mais recente vale mais
  const weights = [1.0, 1.1, 1.2, 1.4, 1.6]; // Ãšltimo jogo = 1.6x

  // Valores para cada performance
  const performanceValues = {
    'Excellent': 100,
    'Good': 75,
    'Average': 50,
    'Poor': 25,
    'Terrible': 0
  };

  let weightedSum = 0;
  let totalWeight = 0;

  last5Matches.forEach((perf, index) => {
    const weight = weights[index] || 1.0;
    weightedSum += performanceValues[perf] * weight;
    totalWeight += weight;
  });

  const form = weightedSum / totalWeight;

  return clamp(form, 0, 100);
};

/**
 * Determina o momentum baseado na forma
 */
const determineMomentum = (
  currentForm: number,
  previousForm: number
): FormTracker['momentum'] => {
  // Hot Streak: Forma alta e melhorando
  if (currentForm >= MOMENTUM_THRESHOLDS.HOT_STREAK) {
    return 'Hot Streak';
  }

  // Cold Spell: Forma baixa e piorando
  if (currentForm <= MOMENTUM_THRESHOLDS.COLD_SPELL) {
    return 'Cold Spell';
  }

  // Steady: Forma moderada ou estável
  return 'Steady';
};

/**
 * Calcula efeitos da forma no jogador
 */
const calculateFormEffects = (
  currentForm: number,
  momentum: FormTracker['momentum']
): FormTracker['effects'] => {
  let ratingBonus = 0;
  let transferInterest = 0;
  let fanSentiment = 0;

  // ========== RATING BONUS ==========
  // Boa forma = bônus, má forma = penalidade
  if (currentForm >= 85) {
    ratingBonus = 0.3; // +0.3 nas ratings
  } else if (currentForm >= 70) {
    ratingBonus = 0.2;
  } else if (currentForm >= 55) {
    ratingBonus = 0.1;
  } else if (currentForm <= 30) {
    ratingBonus = -0.3; // -0.3 nas ratings
  } else if (currentForm <= 45) {
    ratingBonus = -0.1;
  }

  // Momentum amplifica o bônus
  if (momentum === 'Hot Streak') {
    ratingBonus += 0.2;
  } else if (momentum === 'Cold Spell') {
    ratingBonus -= 0.2;
  }

  ratingBonus = clamp(ratingBonus, -0.5, 0.5);

  // ========== TRANSFER INTEREST ==========
  // Boa forma = mais interesse de outros clubes
  if (currentForm >= 80) {
    transferInterest = 40 + (currentForm - 80);
  } else if (currentForm >= 65) {
    transferInterest = 20 + (currentForm - 65) * 1.3;
  } else if (currentForm <= 35) {
    transferInterest = -20; // Menos interesse
  }

  transferInterest = clamp(transferInterest, -30, 60);

  // ========== FAN SENTIMENT ==========
  // Forma afeta como torcedores veem o jogador
  fanSentiment = (currentForm - 50) * 1.5; // -75 a +75

  if (momentum === 'Hot Streak') {
    fanSentiment += 25;
  } else if (momentum === 'Cold Spell') {
    fanSentiment -= 25;
  }

  fanSentiment = clamp(fanSentiment, -100, 100);

  return {
    ratingBonus,
    transferInterest,
    fanSentiment
  };
};

// ==================== CONSULTAS E ANÃLISE ====================

/**
 * Obtém descrição narrativa da forma atual
 */
export const getFormDescription = (formTracker: FormTracker): string => {
  const { currentForm, momentum } = formTracker;

  if (momentum === 'Hot Streak') {
    return `ðŸ”¥ On Fire! Unstoppable form with ${formTracker.last5Matches.filter(p => p === 'Excellent' || p === 'Good').length} strong performances in last 5 games.`;
  }

  if (momentum === 'Cold Spell') {
    return `â„ï¸ Struggling for form with ${formTracker.last5Matches.filter(p => p === 'Poor' || p === 'Terrible').length} poor performances in last 5 games.`;
  }

  if (currentForm >= 70) {
    return `âœ… In good form - consistently solid performances.`;
  } else if (currentForm >= 45) {
    return `âž¡ï¸ Steady form - performing at expected level.`;
  } else {
    return `âš ï¸ Below par form - needs to improve performances.`;
  }
};

/**
 * Obtém estatísticas detalhadas da forma
 */
export const getFormStats = (formTracker: FormTracker): {
  excellentCount: number;
  goodCount: number;
  averageCount: number;
  poorCount: number;
  terribleCount: number;
  consistency: number; // 0-100, quanto mais alto mais consistente
  trend: 'Improving' | 'Declining' | 'Stable';
} => {
  const last5 = formTracker.last5Matches;

  const excellentCount = last5.filter(p => p === 'Excellent').length;
  const goodCount = last5.filter(p => p === 'Good').length;
  const averageCount = last5.filter(p => p === 'Average').length;
  const poorCount = last5.filter(p => p === 'Poor').length;
  const terribleCount = last5.filter(p => p === 'Terrible').length;

  // Calcular consistência (baixa variância = alta consistência)
  const performanceValues = {
    'Excellent': 100,
    'Good': 75,
    'Average': 50,
    'Poor': 25,
    'Terrible': 0
  };

  const values = last5.map(p => performanceValues[p]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Inverter: menos desvio = mais consistência
  const consistency = clamp(100 - stdDev, 0, 100);

  // Determinar tendência (comparar primeira metade com segunda metade)
  const firstHalf = last5.slice(0, Math.floor(last5.length / 2)).map(p => performanceValues[p]);
  const secondHalf = last5.slice(Math.floor(last5.length / 2)).map(p => performanceValues[p]);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  let trend: 'Improving' | 'Declining' | 'Stable' = 'Stable';
  if (secondAvg > firstAvg + 10) trend = 'Improving';
  else if (secondAvg < firstAvg - 10) trend = 'Declining';

  return {
    excellentCount,
    goodCount,
    averageCount,
    poorCount,
    terribleCount,
    consistency,
    trend
  };
};

/**
 * Verifica se jogador está em sequência
 */
export const getStreak = (formTracker: FormTracker): {
  type: 'Good' | 'Bad' | 'None';
  length: number;
  description: string;
  descriptionParams?: Record<string, string | number>;
} | null => {
  const last5 = formTracker.last5Matches;

  if (last5.length < 3) return null;

  // Verificar sequência de boas performances
  const recentGood = last5.slice(-3).every(p => p === 'Excellent' || p === 'Good');
  if (recentGood) {
    const streakLength = last5.reverse().findIndex(p => p !== 'Excellent' && p !== 'Good');
    return {
      type: 'Good',
      length: streakLength === -1 ? last5.length : streakLength,
      description: 'events.form.strongStreak',
      descriptionParams: { count: streakLength === -1 ? last5.length : streakLength }
    };
  }

  // Verificar sequência de más performances
  const recentBad = last5.slice(-3).every(p => p === 'Poor' || p === 'Terrible');
  if (recentBad) {
    const streakLength = last5.reverse().findIndex(p => p !== 'Poor' && p !== 'Terrible');
    return {
      type: 'Bad',
      length: streakLength === -1 ? last5.length : streakLength,
      description: 'events.form.poorStreak',
      descriptionParams: { count: streakLength === -1 ? last5.length : streakLength }
    };
  }

  return null;
};

/**
 * Gera mensagem para mudança de forma
 */
export const generateFormChangeMessage = (
  previousMomentum: FormTracker['momentum'],
  newMomentum: FormTracker['momentum'],
  playerName: string
): string | null => {
  // Entrou em hot streak
  if (previousMomentum !== 'Hot Streak' && newMomentum === 'Hot Streak') {
    return `ðŸ”¥ ${playerName} is ON FIRE! Hitting peak form with exceptional recent performances!`;
  }

  // Entrou em cold spell
  if (previousMomentum !== 'Cold Spell' && newMomentum === 'Cold Spell') {
    return `â„ï¸ ${playerName} struggling for form - performances have dropped significantly.`;
  }

  // Recuperou de cold spell
  if (previousMomentum === 'Cold Spell' && newMomentum !== 'Cold Spell') {
    return `âœ… ${playerName} showing signs of improvement - breaking out of poor form.`;
  }

  // Saiu de hot streak
  if (previousMomentum === 'Hot Streak' && newMomentum !== 'Hot Streak') {
    return `âš ï¸ ${playerName}'s exceptional form cooling down - still solid but not unstoppable.`;
  }

  return null;
};

// ==================== DECAY E MANUTENÃ‡ÃƒO ====================

/**
 * Aplica decay natural da forma quando jogador não joga
 */
export const applyFormDecay = (formTracker: FormTracker, weeksMissed: number = 1): FormTracker => {
  // Forma decai gradualmente quando não joga
  const decayPerWeek = 3;
  const totalDecay = decayPerWeek * weeksMissed;

  const newForm = Math.max(formTracker.currentForm - totalDecay, 40); // Não cai abaixo de 40

  // Recalcular momentum e efeitos
  const momentum = determineMomentum(newForm, formTracker.currentForm);
  const effects = calculateFormEffects(newForm, momentum);

  logger.debug(`Form decay applied: ${formTracker.currentForm.toFixed(0)} -> ${newForm.toFixed(0)}`, 'form');

  return {
    ...formTracker,
    currentForm: newForm,
    momentum,
    effects
  };
};

/**
 * Reset de forma (novo clube, grande lesão, etc)
 */
export const resetForm = (reason: 'Transfer' | 'Injury' | 'NewSeason'): FormTracker => {
  const baseForm = reason === 'NewSeason' ? 55 : 45;

  logger.info(`Form reset due to ${reason}`, 'form');

  return {
    last5Matches: [],
    currentForm: baseForm,
    momentum: 'Steady',
    effects: {
      ratingBonus: 0,
      transferInterest: 0,
      fanSentiment: 0
    }
  };
};
