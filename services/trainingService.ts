/**
 * TRAINING SERVICE - v0.5.6 (Fixed)
 * 
 * Serviço completo de treinamento baseado em ciência do esporte.
 */

import type { Player } from '../types';
import type {
  TrainingFocus,
  TrainingType,
  TrainingSession,
  TrainingResult,
  PersonalTrainer,
  ClubInfrastructure,
  PositionTraining,
  PlayerTrainingState,
  TrainerTier,
  SeasonPhase,
  TrainingCategory,

} from '../types/trainingTypes';
import {
  TRAINING_TYPES,
  TRAINER_TIERS,
  INFRASTRUCTURE_BY_LEAGUE_TIER,
  INTENSITY_MODIFIERS,
  POSITION_TRANSITION_DIFFICULTY,
  calculateMaxTrainingSlots,
} from '../types/trainingTypes';
import { gaussianRandom, clamp, randFloat } from './utils';
import { calculateOverall } from './playerProgression';
import { getMainClub } from './youthCompetitionSystem';

// v0.5.6: Penalidade de fadiga para múltiplas sessões (Dimishing Returns)
export const MULTI_SESSION_PENALTY = [1.0, 0.6, 0.3, 0.1, 0.05];

// Regex para identificar times de base/academia
const YOUTH_TEAM_SUFFIX_REGEX = / U(18|19|20|21|23)| EDS| Primavera| Castilla| Atlètic| II| B| Sub-20| Sub-19| Sub-18| Juvenil| Youth| Academy| Reserves/gi;

/**
 * Obtém o nome do clube pai a partir da hierarquia ou do nome do time
 */
export function getParentClubName(team: { name: string; parentClubName?: string; isYouth?: boolean }): string | null {
  if (team.parentClubName) return team.parentClubName;
  const seniorName = team.name.replace(YOUTH_TEAM_SUFFIX_REGEX, '').trim();
  return seniorName !== team.name ? seniorName : null;
}

export function isYouthTeam(team: { name: string; isYouth?: boolean; clubHierarchyLevel?: string }): boolean {
  if (team.isYouth) return true;
  if (team.clubHierarchyLevel === "youth" || team.clubHierarchyLevel === "reserve") return true;
  return YOUTH_TEAM_SUFFIX_REGEX.test(team.name);
}

// ==================== SISTEMA DE INFRAESTRUTURA POR REPUTAÇÃO ====================

/**
 * Faixas de reputação e seus limites de infraestrutura
 * 
 * Reputação é 0-100, onde:
 * - 90+: Elite mundial (Real Madrid, Man City, Bayern)
 * - 82-89: Grandes clubes (Dortmund, Ajax, Benfica, Roma)
 * - 72-81: Clubes estabelecidos (Brighton, Fiorentina, Sporting)
 * - 60-71: Clubes médios (times médios de ligas top, times bons de ligas fracas)
 * - 45-59: Clubes pequenos (relegation zone de ligas top, times médios de ligas fracas)
 * - 30-44: Clubes muito pequenos (2ª divisão, ligas muito fracas)
 * - 0-29: Semi-profissional/amador
 */

interface InfrastructureProfile {
  maxLevel: number;      // Máximo possível (teto)
  baseLevel: number;     // Nível base antes de variação
  minLevel: number;      // Mínimo garantido (piso)
  variationRange: number; // Quanto pode variar (+/-)
}

/**
 * Obtém o perfil de infraestrutura baseado na reputação
 */
function getInfrastructureProfileByReputation(reputation: number): InfrastructureProfile {
  // Elite Mundial (90-100)
  // Real Madrid, Barcelona, Bayern, Man City, PSG, Liverpool, etc.
  if (reputation >= 90) {
    return { maxLevel: 5, baseLevel: 4, minLevel: 3, variationRange: 1 };
  }

  // Grandes Clubes (82-89)
  // Dortmund, Ajax, Benfica, Roma, Sevilla, Tottenham, etc.
  if (reputation >= 82) {
    return { maxLevel: 5, baseLevel: 3, minLevel: 2, variationRange: 1 };
  }

  // Clubes Estabelecidos de Ligas Fortes (72-81)
  // Brighton, Fiorentina, Real Sociedad, Wolfsburg, Sporting, etc.
  if (reputation >= 72) {
    return { maxLevel: 4, baseLevel: 3, minLevel: 2, variationRange: 1 };
  }

  // Clubes Médios (60-71)
  // Times de meio de tabela, times bons de ligas menores
  // Getafe, Sassuolo, Augsburg, Braga, etc.
  if (reputation >= 60) {
    return { maxLevel: 3, baseLevel: 2, minLevel: 1, variationRange: 1 };
  }

  // Clubes Pequenos (45-59)
  // Times lutando contra rebaixamento, times médios de ligas fracas
  // Cádiz, Empoli, Darmstadt, times da A-League, etc.
  if (reputation >= 45) {
    return { maxLevel: 3, baseLevel: 2, minLevel: 1, variationRange: 1 };
  }

  // Clubes Muito Pequenos (30-44)
  // Segunda divisão de ligas fortes, primeira divisão de ligas muito fracas
  if (reputation >= 30) {
    return { maxLevel: 2, baseLevel: 1, minLevel: 1, variationRange: 1 };
  }

  // Semi-profissional/Amador (0-29)
  return { maxLevel: 2, baseLevel: 1, minLevel: 1, variationRange: 0 };
}

/**
 * Gera variação determinística para uma área específica
 * Baseado em hash do nome do time + área
 * Retorna valor no range especificado
 */
function getDeterministicVariation(teamName: string, area: string, range: number): number {
  if (range === 0) return 0;

  let hash = 0;
  const str = (teamName || 'unknown') + area + 'infraV2';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }

  const normalized = Math.abs(hash) % 100;

  // Distribuição com viés para baixo (mais realista - nem tudo é perfeito)
  // 20% = -range, 35% = 0, 30% = parcial positivo, 15% = +range
  if (normalized < 20) return -range;
  if (normalized < 55) return 0;
  if (normalized < 85) return Math.ceil(range * 0.5);
  return range;
}

/**
 * Determina qual área é o "ponto forte" do clube
 * Clubes tendem a ter uma área melhor que outras
 */
function getClubStrengthArea(teamName: string): keyof ClubInfrastructure {
  let hash = 0;
  const str = (teamName || '') + 'strength';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }

  const areas: (keyof ClubInfrastructure)[] = [
    'trainingFacilities',
    'youthAcademy',
    'medicalDepartment',
    'nutritionCenter',
    'recoveryCenter'
  ];

  return areas[Math.abs(hash) % areas.length];
}

/**
 * Determina qual área é o "ponto fraco" do clube
 */
function getClubWeaknessArea(teamName: string): keyof ClubInfrastructure {
  let hash = 0;
  const str = (teamName || '') + 'weakness';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }

  const areas: (keyof ClubInfrastructure)[] = [
    'trainingFacilities',
    'youthAcademy',
    'medicalDepartment',
    'nutritionCenter',
    'recoveryCenter'
  ];

  return areas[Math.abs(hash) % areas.length];
}

/**
 * Obtém a infraestrutura do clube - VERSÃO BASEADA EM REPUTAÇÃO
 */
export function getClubInfrastructure(player: Player): ClubInfrastructure {
  const team = player.team;
  const teamName = team?.name || 'Unknown FC';
  const reputation = team?.reputation ?? 50; // Default 50 se não definido

  // Verificar se é time de base
  if (isYouthTeam(team)) {
    return getYouthTeamInfrastructure(team, reputation);
  }

  // Obter perfil baseado na reputação
  const profile = getInfrastructureProfileByReputation(reputation);

  // Gerar valores para cada área
  const strengthArea = getClubStrengthArea(teamName);
  const weaknessArea = getClubWeaknessArea(teamName);

  const calculateAreaLevel = (area: keyof ClubInfrastructure): number => {
    let level = profile.baseLevel;

    // Aplicar variação determinística
    level += getDeterministicVariation(teamName, area, profile.variationRange);

    // Ponto forte: +1 (se não ultrapassar máximo)
    if (area === strengthArea && level < profile.maxLevel) {
      level += 1;
    }

    // Ponto fraco: -1 (se não ficar abaixo do mínimo)
    // Apenas se não for o mesmo que o ponto forte
    if (area === weaknessArea && area !== strengthArea && level > profile.minLevel) {
      level -= 1;
    }

    // Garantir limites
    return clamp(level, profile.minLevel, profile.maxLevel);
  };

  const infrastructure: ClubInfrastructure = {
    trainingFacilities: calculateAreaLevel('trainingFacilities'),
    youthAcademy: calculateAreaLevel('youthAcademy'),
    medicalDepartment: calculateAreaLevel('medicalDepartment'),
    nutritionCenter: calculateAreaLevel('nutritionCenter'),
    recoveryCenter: calculateAreaLevel('recoveryCenter'),
  };

  // Log para debug (remover em produção)
  // console.log(`[INFRA] ${teamName} (rep: ${reputation}):`, infrastructure);

  return infrastructure;
}

/**
 * Infraestrutura para times de base/academia
 * Herda do clube pai baseado na reputação REAL do pai
 * Usa youthAcademyQuality como peso adicional se definido
 * 
 * CORRIGIDO v0.6.1: Academias de clubes de elite herdam infraestrutura de alta qualidade
 */
function getYouthTeamInfrastructure(
  team: import('../types').Team,
  teamReputation: number
): ClubInfrastructure {
  // Tentar encontrar o clube pai real
  const parentClub = getMainClub(team);

  // Usar reputação real do pai se encontrado, senão estimar pelo nome
  let parentReputation = teamReputation;
  
  if (parentClub) {
    parentReputation = parentClub.reputation;
  } else {
    // Fallback melhorado: estimar reputação pelo nome do time juvenil
    const parentClubName = getParentClubName(team) || team.name;
    
    // Clubes de elite conhecidos - suas academias devem ter infraestrutura TOP
    const eliteClubs = [
      'Real Madrid', 'Barcelona', 'Bayern', 'Manchester City', 'Manchester United',
      'Liverpool', 'Chelsea', 'Arsenal', 'PSG', 'Juventus', 'Inter', 'AC Milan',
      'Atletico Madrid', 'Dortmund', 'Ajax', 'Benfica', 'Porto', 'Sporting',
      'Roma', 'Napoli', 'Lazio', 'Tottenham', 'Newcastle', 'Aston Villa',
      'Sevilla', 'Real Sociedad', 'Athletic Bilbao', 'Valencia', 'Villarreal',
      'RB Leipzig', 'Bayer Leverkusen', 'Fiorentina', 'Atalanta', 'Monaco',
      'Lyon', 'Marseille', 'Lille', 'Club Brugge', 'Feyenoord', 'PSV',
      'Celtic', 'Rangers', 'Shakhtar', 'Dynamo Kyiv', 'Zenit', 'Spartak',
      'River Plate', 'Boca Juniors', 'Flamengo', 'Palmeiras', 'Santos',
      'Corinthians', 'São Paulo', 'Cruzeiro', 'Grêmio', 'Internacional',
      'America', 'Guadalajara', 'Monterrey', 'Tigres', 'Cruz Azul',
    ];
    
    // Verificar se o nome do time juvenil contém algum clube de elite
    const normalizedName = (parentClubName || '').toLowerCase();
    const teamNameLower = team.name.toLowerCase();
    const isEliteAcademy = eliteClubs.some(club => {
      const clubLower = club.toLowerCase();
      return normalizedName.includes(clubLower) || teamNameLower.includes(clubLower);
    });
    
    if (isEliteAcademy) {
      // Academias de clubes de elite: reputação 85-95
      parentReputation = Math.max(85, Math.min(95, teamReputation + 35));
    } else {
      // Outros clubes: adicionar 20 pontos à reputação do time juvenil
      parentReputation = Math.min(100, teamReputation + 20);
    }
  }

  const parentProfile = getInfrastructureProfileByReputation(parentReputation);

  // youthAcademyQuality: 1-5, usado como modificador adicional
  // Se definido, ajusta os níveis de infraestrutura
  const academyQuality = team.youthAcademyQuality ?? 0;
  const academyBonus = academyQuality > 0 ? Math.floor((academyQuality - 3) * 0.5) : 0; // -1 a +1

  // Academia herda com modificadores MELHORADOS:
  // - youthAcademy: 100% do pai (academias de elite investem pesado)
  // - trainingFacilities: 90% do pai (antes era 80%)
  // - Outros: 75% do pai (antes era 60%)
  // youthAcademyQuality pode modificar em +/- 1 nível

  const youthAcademyLevel = clamp(
    parentProfile.baseLevel + academyBonus,
    parentProfile.minLevel,
    parentProfile.maxLevel
  );

  const trainingLevel = clamp(
    Math.round(parentProfile.baseLevel * 0.9) + academyBonus,
    1,
    parentProfile.maxLevel
  );

  const supportLevel = clamp(
    Math.round(parentProfile.baseLevel * 0.75) + Math.floor(academyBonus * 0.5),
    1,
    parentProfile.maxLevel
  );

  // Variação menor para academias (determinística)
  const variation = getDeterministicVariation(team.name, 'youth_var', 1);

  return {
    trainingFacilities: clamp(trainingLevel + variation, 1, parentProfile.maxLevel),
    youthAcademy: youthAcademyLevel,
    medicalDepartment: clamp(supportLevel, 1, parentProfile.maxLevel),
    nutritionCenter: clamp(supportLevel, 1, parentProfile.maxLevel),
    recoveryCenter: clamp(Math.max(1, supportLevel - 1), 1, parentProfile.maxLevel),
  };
}

// ==================== BÔNUS DE INFRAESTRUTURA ====================

/**
 * Calcula o bônus de infraestrutura
 * Escala não-linear para dificultar maximização
 */
export function calculateInfrastructureBonus(infrastructure: ClubInfrastructure): number {
  const avg = (
    infrastructure.trainingFacilities +
    infrastructure.youthAcademy +
    infrastructure.medicalDepartment +
    infrastructure.nutritionCenter +
    infrastructure.recoveryCenter
  ) / 5;

  // Escala não-linear - difícil chegar ao topo
  if (avg >= 4.8) return 0.25;    // Praticamente perfeito (só elite)
  if (avg >= 4.5) return 0.20;
  if (avg >= 4.0) return 0.15;
  if (avg >= 3.5) return 0.11;
  if (avg >= 3.0) return 0.08;
  if (avg >= 2.5) return 0.05;
  if (avg >= 2.0) return 0.03;
  if (avg >= 1.5) return 0.01;
  return 0;
}

// ==================== EFETIVIDADE DO TREINO ====================

/**
 * Calcula a efetividade total do treino
 * NOTA: Removido o bônus de leagueTier pois não faz sentido globalmente
 */
export function calculateTrainingEffectiveness(
  player: Player,
  trainingType: TrainingType,
  intensity: 'low' | 'medium' | 'high' | 'extreme',
  trainer: PersonalTrainer | null,
  currentPhase?: SeasonPhase
): number {
  let effectiveness = 1.0;

  // 1. Fator de idade
  const ageFactor = getAgeFactorBalanced(player.age ?? 20);
  effectiveness *= ageFactor;

  // 2. Infraestrutura do clube (baseada em reputação agora)
  const infrastructure = getClubInfrastructure(player);
  const infraBonus = calculateInfrastructureBonus(infrastructure);
  effectiveness *= (1 + infraBonus);

  // 3. Personal trainer
  if (trainer) {
    const trainerBonus = (trainer.effectivenessBonus ?? 0) * 0.7;
    effectiveness *= (1 + trainerBonus);

    if (trainer.specialties?.includes(trainingType.id)) {
      effectiveness *= 1.08;
    }
  }

  // 4. Intensidade
  const intensityMod = INTENSITY_MODIFIERS[intensity] || INTENSITY_MODIFIERS['medium'];
  effectiveness *= intensityMod.effectiveness;

  // 5. Nível do agente
  const agentBonus = getAgentTrainingBonusBalanced(player);
  effectiveness *= (1 + agentBonus);

  // 6. Moral do jogador
  if (player.morale === 'Very High') effectiveness *= 1.05;
  else if (player.morale === 'High') effectiveness *= 1.02;
  else if (player.morale === 'Low') effectiveness *= 0.95;
  else if (player.morale === 'Very Low') effectiveness *= 0.85;

  // 7. Personalidade
  if (player.personality === 'Professional') effectiveness *= 1.05;
  else if (player.personality === 'Ambitious') effectiveness *= 1.03;
  else if (player.personality === 'Lazy') effectiveness *= 0.92;

  // 8. REMOVIDO: Tier da liga (não faz sentido - tier é apenas divisão)
  // O bônus agora vem da reputação via infraestrutura

  // 9. Periodização
  if (currentPhase) {
    const phaseMultiplier = getPhaseEffectivenessMultiplier(trainingType, currentPhase);
    effectiveness *= phaseMultiplier;
  }

  // 10. Carga do treino
  const loadIntensity = trainingType.loadIntensity ?? 50;
  const loadFactor = 0.95 + (loadIntensity / 100);
  effectiveness *= loadFactor;

  if (!Number.isFinite(effectiveness)) {
    return 1.0;
  }

  return Math.min(effectiveness, 1.8);
}

/**
 * Fator de idade balanceado - v0.6.0: Reworked for realistic decline
 * Jogadores mais velhos têm menos ganhos e eventualmente perdem efetividade
 * 
 * A partir dos 32 anos, o treino compensa cada vez menos o declínio natural
 * A partir dos 36 anos, o treino apenas desacelera o declínio
 * A partir dos 40 anos, o treino tem efetividade mínima
 */
function getAgeFactorBalanced(age: number): number {
  // Youth/Development phase (high learning capacity)
  if (age <= 17) return 1.30;
  if (age <= 20) return 1.20;
  if (age <= 23) return 1.10;
  
  // Prime phase (stable)
  if (age <= 26) return 1.0;
  if (age <= 29) return 0.90;
  
  // Early decline phase (training helps maintain, but less gain)
  if (age <= 31) return 0.70;
  if (age <= 33) return 0.50;
  
  // Mid decline phase (training mostly maintains, minimal gains)
  if (age <= 35) return 0.30;
  if (age <= 37) return 0.15;
  
  // Late decline phase (training only slows decline, no gains)
  if (age <= 39) return 0.08;
  if (age <= 41) return 0.04;
  
  // Veteran phase (40+): training has almost no effect on attributes
  return 0.02;
}

/**
 * Bonus do agente balanceado
 */
// ==================== OPERAÇÕES DE TREINO ====================

function getAgentTrainingBonusBalanced(player: Player): number {
  const agentRep = player.agent?.reputation;
  switch (agentRep) {
    case 'Super Agent': return 0.06;
    case 'Good': return 0.04;
    case 'Average': return 0.02;
    case 'Rookie': return 0.01;
    default: return 0;
  }
}

// ==================== PERIODIZAÇÃO (Gomes, 2002) ====================

/**
 * Determina a fase atual da temporada baseado no mês do jogo
 */
export function getCurrentSeasonPhase(gameMonth: number): SeasonPhase {
  if (gameMonth >= 7 && gameMonth <= 8) return 'preseason';
  if (gameMonth >= 9 && gameMonth <= 11) return 'earlyseason';
  if (gameMonth >= 12 || (gameMonth >= 1 && gameMonth <= 2)) return 'midseason';
  if (gameMonth >= 3 && gameMonth <= 5) return 'lateseason';
  return 'offseason';
}

/**
 * Retorna treinos recomendados para a fase atual da temporada
 */
export function getRecommendedTrainingTypes(phase: SeasonPhase): TrainingType[] {
  return TRAINING_TYPES.filter(t =>
    t.recommendedPhase?.includes(phase) ?? true
  );
}

/**
 * Calcula o multiplicador de efetividade baseado na fase da temporada
 */
export function getPhaseEffectivenessMultiplier(
  trainingType: TrainingType,
  currentPhase: SeasonPhase
): number {
  if (!trainingType.recommendedPhase) return 1.0;

  if (trainingType.recommendedPhase.includes(currentPhase)) {
    return 1.2; // 20% bonus na fase correta
  }

  return 0.85; // Penalidade
}

/**
 * Retorna a categoria de treino mais adequada para a fase
 */
export function getRecommendedCategoryForPhase(phase: SeasonPhase): TrainingCategory[] {
  switch (phase) {
    case 'preseason': return ['generalDevelopment'];
    case 'earlyseason': return ['generalDevelopment', 'specificSimple'];
    case 'midseason': return ['specificCompetitive', 'recovery'];
    case 'lateseason': return ['specificSimple', 'recovery'];
    case 'offseason': return ['recovery'];
  }
}

/**
 * Calcula custo do treino
 */
export function calculateTrainingCost(
  player: Player,
  trainingType: TrainingType,
  intensity: 'low' | 'medium' | 'high' | 'extreme',
  trainer: PersonalTrainer | null
): number {
  const weeklyWage = player.wage || 1;
  let baseCost = Math.round(weeklyWage * 0.10);

  if (baseCost > 50000) baseCost = 50000;
  if (baseCost < 500) baseCost = 500;

  baseCost *= trainingType.baseCostMultiplier;

  const intensityMultipliers = { low: 0.5, medium: 1.0, high: 1.5, extreme: 2.0 };
  baseCost *= intensityMultipliers[intensity];

  if (trainer) {
    baseCost += trainer.costPerWeek * trainingType.duration;
  }

  return Math.round(baseCost);
}

export function canAffordTraining(player: Player, cost: number): boolean {
  const balance = player.bankBalance || 0;
  return balance >= cost;
}

/**
 * Executa uma sessão de treino
 * 
 * TASK 2: Implements logarithmic growth curve (diminishing returns)
 * - 0-60: Normal growth
 * - 61-80: Moderate growth (0.7x)
 * - 81-90: Slow growth (0.4x)
 * - 91-99: Elite grind (0.1x - requires many sessions for +1)
 */
export function executeTrainingSession(
  player: Player,
  session: TrainingSession,
  trainingType: TrainingType,
  currentPhase?: SeasonPhase,
  sessionIndex: number = 0
): TrainingResult {
  const effectiveness = calculateTrainingEffectiveness(
    player,
    trainingType,
    session.intensity,
    session.trainer,
    currentPhase
  );

  const fatigueFactor = MULTI_SESSION_PENALTY[Math.min(sessionIndex, MULTI_SESSION_PENALTY.length - 1)] || 0.05;
  const adjustedEffectiveness = effectiveness * fatigueFactor;

  const infrastructure = getClubInfrastructure(player);
  const attributeChanges: Record<string, number> = {};

  const baseRoll = gaussianRandom(1.0, 0.25);
  const finalMultiplier = clamp(baseRoll * adjustedEffectiveness, 0.1, 2.5);

  let categoryMultiplier = 1.0;
  switch (trainingType.category) {
    case 'specificCompetitive': categoryMultiplier = 1.15; break;
    case 'specificSimple': categoryMultiplier = 1.05; break;
    case 'generalDevelopment': categoryMultiplier = 1.0; break;
    case 'recovery': categoryMultiplier = 0.5; break;
  }

  /**
   * TASK 2: Diminishing Returns Function
   * Returns a multiplier based on current stat level
   */
  const getDiminishingReturns = (currentValue: number): number => {
    if (currentValue >= 91) return 0.10;  // Elite grind: 10% effectiveness
    if (currentValue >= 81) return 0.40;  // Slow growth: 40% effectiveness
    if (currentValue >= 61) return 0.70;  // Moderate: 70% effectiveness
    return 1.0;                            // Normal growth
  };

  /**
   * TASK 2: Calculate the actual gain with diminishing returns
   * High-level stats require probability roll for +1
   */
  const calculateGainWithDiminishing = (
    baseChange: number,
    currentValue: number
  ): number => {
    const diminishing = getDiminishingReturns(currentValue);
    const adjustedChange = baseChange * diminishing;

    // For elite stats (90+), use probability instead of guaranteed points
    if (currentValue >= 90) {
      // Fractional chance to gain +1
      const gainChance = adjustedChange;
      if (Math.random() < gainChance) {
        return 1; // Lucky! Gained +1
      }
      return 0; // No gain this session
    }

    // For stats 81-90, also add probability element
    if (currentValue >= 81) {
      const floorChange = Math.floor(adjustedChange);
      const fractional = adjustedChange - floorChange;
      return floorChange + (Math.random() < fractional ? 1 : 0);
    }

    // Normal rounding for lower stats
    return Math.round(adjustedChange);
  };

  // Primary stats with diminishing returns
  for (const stat of trainingType.primaryBoost) {
    const currentValue = player.stats[stat as keyof typeof player.stats] as number || 50;
    const rawChange = randFloat(0.8, 1.8) * finalMultiplier * categoryMultiplier;
    const change = calculateGainWithDiminishing(rawChange, currentValue);
    attributeChanges[stat] = change;
  }

  // Secondary stats with diminishing returns
  for (const stat of trainingType.secondaryBoost) {
    const currentValue = player.stats[stat as keyof typeof player.stats] as number || 50;
    const rawChange = randFloat(0.3, 1.0) * finalMultiplier * categoryMultiplier;
    const change = calculateGainWithDiminishing(rawChange, currentValue);
    attributeChanges[stat] = (attributeChanges[stat] || 0) + change;
  }

  for (const stat of trainingType.penaltyStats) {
    if (session.intensity === 'high' || session.intensity === 'extreme') {
      if (Math.random() < 0.3) {
        const penalty = -Math.round(randFloat(0.5, 1.5));
        attributeChanges[stat] = (attributeChanges[stat] || 0) + penalty;
      }
    }
  }

  let injuryRisk = INTENSITY_MODIFIERS[session.intensity].injuryRisk * 100;
  injuryRisk *= (0.8 + (trainingType.loadIntensity || 50) * 0.04);
  injuryRisk *= (1 + sessionIndex * 0.5);
  injuryRisk *= (1 - (infrastructure.medicalDepartment - 1) * 0.1);
  if (session.trainer) injuryRisk *= (1 - session.trainer.injuryReduction);
  if (player.age > 30) injuryRisk *= 1 + (player.age - 30) * 0.1;

  let fatigueImpact = INTENSITY_MODIFIERS[session.intensity].fatigue;
  fatigueImpact *= (1 - (infrastructure.recoveryCenter - 1) * 0.1);

  let narrativeKey: string;
  if (finalMultiplier >= 1.8) narrativeKey = 'training.result.exceptional';
  else if (finalMultiplier >= 1.3) narrativeKey = 'training.result.excellent';
  else if (finalMultiplier >= 1.0) narrativeKey = 'training.result.good';
  else if (finalMultiplier >= 0.7) narrativeKey = 'training.result.moderate';
  else narrativeKey = 'training.result.poor';

  const cost = calculateTrainingCost(player, trainingType, session.intensity, session.trainer);

  return {
    success: true,
    attributeChanges,
    injuryRisk: Math.round(injuryRisk),
    fatigueImpact: Math.round(fatigueImpact),
    costTotal: cost,
    narrativeKey,
  };
}

/**
 * Aplica o resultado do treino ao jogador
 */
export function applyTrainingResult(
  player: Player,
  result: TrainingResult
): Player {
  const updatedPlayer = { ...player };
  const stats = { ...updatedPlayer.stats };

  for (const [stat, change] of Object.entries(result.attributeChanges)) {
    if (stat in stats && typeof stats[stat as keyof typeof stats] === 'number') {
      const currentValue = stats[stat as keyof typeof stats] as number;
      const newValue = clamp(currentValue + change, 1, 99);
      (stats as any)[stat] = newValue;
    }
  }

  const position = updatedPlayer.position;
  stats.overall = calculateOverall(stats, position, updatedPlayer.expandedData);
  updatedPlayer.stats = stats;
  updatedPlayer.bankBalance = (updatedPlayer.bankBalance || 0) - result.costTotal;

  if (updatedPlayer.expandedData?.careerFinanceStats) {
    updatedPlayer.expandedData = {
      ...updatedPlayer.expandedData,
      careerFinanceStats: {
        ...updatedPlayer.expandedData.careerFinanceStats,
        currentSavings: updatedPlayer.expandedData.careerFinanceStats.currentSavings - result.costTotal,
        totalSpent: updatedPlayer.expandedData.careerFinanceStats.totalSpent + result.costTotal,
      },
    };
  }

  // Point 8: Sync expandedData attributes with training gains
  // This ensures UI-visible expanded attributes reflect training progress
  if (updatedPlayer.expandedData?.technicalAttributes) {
    const expandedData = { ...updatedPlayer.expandedData };
    const techAttrs = { ...expandedData.technicalAttributes };
    const physAttrs = expandedData.physicalAttributes ? { ...expandedData.physicalAttributes } : null;
    const defAttrs = expandedData.defensiveAttributes ? { ...expandedData.defensiveAttributes } : null;

    // Apply training gains to corresponding expanded attributes
    for (const [stat, change] of Object.entries(result.attributeChanges)) {
      if (change <= 0) continue; // Only apply positive gains

      // Reduced multiplier since expanded stats are more granular
      const expandedChange = Math.round(change * 0.7);
      if (expandedChange <= 0) continue;

      // Map base stats to expanded attributes
      switch (stat) {
        case 'shooting':
          if (techAttrs.finishing) {
            techAttrs.finishing = { ...techAttrs.finishing };
            techAttrs.finishing.finishingInsideBox = clamp((techAttrs.finishing.finishingInsideBox || 50) + expandedChange, 1, 99);
            techAttrs.finishing.finishingOutsideBox = clamp((techAttrs.finishing.finishingOutsideBox || 50) + expandedChange, 1, 99);
            techAttrs.finishing.oneOnOneFinishing = clamp((techAttrs.finishing.oneOnOneFinishing || 50) + expandedChange, 1, 99);
            techAttrs.finishing.shotPower = clamp((techAttrs.finishing.shotPower || 50) + expandedChange, 1, 99);
          }
          break;

        case 'dribbling':
          if (techAttrs.dribbling) {
            techAttrs.dribbling = { ...techAttrs.dribbling };
            techAttrs.dribbling.closeControlDribbling = clamp((techAttrs.dribbling.closeControlDribbling || 50) + expandedChange, 1, 99);
            techAttrs.dribbling.speedDribbling = clamp((techAttrs.dribbling.speedDribbling || 50) + expandedChange, 1, 99);
            techAttrs.dribbling.skillMoves = clamp((techAttrs.dribbling.skillMoves || 50) + expandedChange, 1, 99);
          }
          if (techAttrs.ballControl) {
            techAttrs.ballControl = { ...techAttrs.ballControl };
            techAttrs.ballControl.firstTouchOrientated = clamp((techAttrs.ballControl.firstTouchOrientated || 50) + expandedChange, 1, 99);
          }
          break;

        case 'passing':
          if (techAttrs.passing) {
            techAttrs.passing = { ...techAttrs.passing };
            techAttrs.passing.shortPassingSupport = clamp((techAttrs.passing.shortPassingSupport || 50) + expandedChange, 1, 99);
            techAttrs.passing.shortPassingUnderPressure = clamp((techAttrs.passing.shortPassingUnderPressure || 50) + expandedChange, 1, 99);
            techAttrs.passing.throughBalls = clamp((techAttrs.passing.throughBalls || 50) + expandedChange, 1, 99);
          }
          break;

        case 'pace':
          if (physAttrs?.speed) {
            physAttrs.speed = { ...physAttrs.speed };
            physAttrs.speed.accelerationInitial = clamp((physAttrs.speed.accelerationInitial || 50) + expandedChange, 1, 99);
            physAttrs.speed.topSpeed = clamp((physAttrs.speed.topSpeed || 50) + expandedChange, 1, 99);
            physAttrs.speed.sprintSpeed = clamp((physAttrs.speed.sprintSpeed || 50) + expandedChange, 1, 99);
          }
          break;

        case 'physical':
        case 'strength':
          if (physAttrs?.strength) {
            physAttrs.strength = { ...physAttrs.strength };
            physAttrs.strength.upperBodyStrength = clamp((physAttrs.strength.upperBodyStrength || 50) + expandedChange, 1, 99);
            physAttrs.strength.bodyToBodyStrength = clamp((physAttrs.strength.bodyToBodyStrength || 50) + expandedChange, 1, 99);
          }
          break;

        case 'defending':
          if (defAttrs?.tackling) {
            defAttrs.tackling = { ...defAttrs.tackling };
            defAttrs.tackling.standingTackle = clamp((defAttrs.tackling.standingTackle || 50) + expandedChange, 1, 99);
            defAttrs.tackling.slidingTackle = clamp((defAttrs.tackling.slidingTackle || 50) + expandedChange, 1, 99);
          }
          if (defAttrs?.marking) {
            defAttrs.marking = { ...defAttrs.marking };
            defAttrs.marking.individualMarking = clamp((defAttrs.marking.individualMarking || 50) + expandedChange, 1, 99);
          }
          break;

        case 'stamina':
          if (physAttrs?.endurance) {
            physAttrs.endurance = { ...physAttrs.endurance };
            physAttrs.endurance.aerobicEndurance = clamp((physAttrs.endurance.aerobicEndurance || 50) + expandedChange, 1, 99);
            physAttrs.endurance.stamina = clamp((physAttrs.endurance.stamina || 50) + expandedChange, 1, 99);
          }
          break;

        case 'crossing':
          if (techAttrs.passing) {
            techAttrs.passing = { ...techAttrs.passing };
            techAttrs.passing.crossingFromByline = clamp((techAttrs.passing.crossingFromByline || 50) + expandedChange, 1, 99);
            techAttrs.passing.crossingFromDeep = clamp((techAttrs.passing.crossingFromDeep || 50) + expandedChange, 1, 99);
          }
          break;
      }
    }

    expandedData.technicalAttributes = techAttrs;
    if (physAttrs) expandedData.physicalAttributes = physAttrs;
    if (defAttrs) expandedData.defensiveAttributes = defAttrs;
    updatedPlayer.expandedData = expandedData;
  }

  return updatedPlayer;
}

/**
 * IA decide qual treino fazer automaticamente
 */
export function decideAutoTraining(player: Player): {
  shouldTrain: boolean;
  trainingType: TrainingType | null;
  trainingTypes: TrainingType[];
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  trainer: PersonalTrainer | null;
} {
  const balance = player.bankBalance || 0;
  const position = player.position;
  const infrastructure = getClubInfrastructure(player);

  let trainer: PersonalTrainer | null = null;
  const affordableTrainers = Object.values(TRAINER_TIERS).filter(t =>
    balance > t.costPerWeek * 4 * 2
  );
  if (affordableTrainers.length > 0) {
    trainer = affordableTrainers[affordableTrainers.length - 1];
  }

  const trainerTier = trainer?.tier || null;
  const maxSlots = calculateMaxTrainingSlots(infrastructure.trainingFacilities, trainerTier);

  const allTrainingTypes = TRAINING_TYPES.filter(t => {
    if (t.id === 'position') return false;
    if (!t.forPositions || t.forPositions.length === 0) return true;
    return t.forPositions.includes(position);
  });

  const paidTrainingTypes = allTrainingTypes.filter(t => t.id !== 'clubTraining');

  if (balance < 5000) {
    const clubTraining = TRAINING_TYPES.find(t => t.id === 'clubTraining')!;
    return { shouldTrain: true, trainingType: clubTraining, trainingTypes: [clubTraining], intensity: 'medium', trainer: null };
  }

  const maxSpendable = balance * 0.8;
  const shuffled = [...paidTrainingTypes].sort(() => Math.random() - 0.5);

  const selectedTypes: TrainingType[] = [];
  let totalCost = 0;

  for (const trainingType of shuffled) {
    if (selectedTypes.length >= maxSlots) break;
    const estimatedCost = calculateTrainingCost(player, trainingType, 'medium', null);
    if (totalCost + estimatedCost > maxSpendable) break;

    selectedTypes.push(trainingType);
    totalCost += estimatedCost;
  }

  if (selectedTypes.length === 0) {
    const clubTraining = TRAINING_TYPES.find(t => t.id === 'clubTraining')!;
    return { shouldTrain: true, trainingType: clubTraining, trainingTypes: [clubTraining], intensity: 'medium', trainer: null };
  }

  let intensity: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
  let intensityScore = 50;

  if (player.age < 21) intensityScore += 20;
  else if (player.age < 25) intensityScore += 10;
  else if (player.age > 32) intensityScore -= 20;

  if (player.personality === 'Ambitious') intensityScore += 15;
  else if (player.personality === 'Professional') intensityScore += 10;
  else if (player.personality === 'Lazy') intensityScore -= 20;

  if (player.morale === 'Very High') intensityScore += 10;
  else if (player.morale === 'Low') intensityScore -= 10;

  intensityScore += Math.floor(Math.random() * 30) - 15;

  if (intensityScore >= 70) intensity = 'extreme';
  else if (intensityScore >= 50) intensity = 'high';
  else if (intensityScore >= 30) intensity = 'medium';
  else intensity = 'low';

  return {
    shouldTrain: true,
    trainingType: selectedTypes[0] || null,
    trainingTypes: selectedTypes,
    intensity,
    trainer
  };
}

// ==================== GETTERS ====================

export function getTrainingType(id: TrainingFocus): TrainingType | undefined {
  return TRAINING_TYPES.find(t => t.id === id);
}

export function getTrainer(tier: TrainerTier): PersonalTrainer {
  return TRAINER_TIERS[tier];
}

export function getAllTrainingTypes(): TrainingType[] {
  return TRAINING_TYPES;
}

export function getAllTrainers(): PersonalTrainer[] {
  return Object.values(TRAINER_TIERS);
}


// ==================== DEBUG ====================

/**
 * Função de debug para testar a distribuição
 */
export function debugInfrastructureByReputation(): void {
  const testCases = [
    { name: 'Real Madrid', reputation: 95 },
    { name: 'Borussia Dortmund', reputation: 84 },
    { name: 'Brighton', reputation: 75 },
    { name: 'Getafe', reputation: 65 },
    { name: 'Cádiz', reputation: 55 },
    { name: 'Melbourne Victory', reputation: 52 },
    { name: 'Segunda División Team', reputation: 40 },
    { name: 'Amateur FC', reputation: 25 },
  ];

  console.log('\n=== INFRASTRUCTURE DEBUG ===\n');

  for (const test of testCases) {
    const mockPlayer = {
      team: { name: test.name, reputation: test.reputation }
    } as Player;

    const infra = getClubInfrastructure(mockPlayer);
    const avg = (infra.trainingFacilities + infra.youthAcademy + infra.medicalDepartment + infra.nutritionCenter + infra.recoveryCenter) / 5;
    const bonus = calculateInfrastructureBonus(infra);

    console.log(`${test.name} (rep: ${test.reputation})`);
    console.log(`  Training: ${infra.trainingFacilities}★ | Youth: ${infra.youthAcademy}★ | Medical: ${infra.medicalDepartment}★ | Nutrition: ${infra.nutritionCenter}★ | Recovery: ${infra.recoveryCenter}★`);
    console.log(`  Average: ${avg.toFixed(1)}★ | Bonus: ${(bonus * 100).toFixed(0)}%\n`);
  }
}

// ==================== SISTEMA DE TREINO CONTÍNUO (SEMANAL) ====================

/**
 * Calcula o custo SEMANAL de treino baseado na configuração atual do jogador
 * Este é o custo que será cobrado a cada semana, não upfront
 */
export function getWeeklyTrainingCost(player: Player): number {
  // Se não tem treino configurado, custo é zero
  if (!player.activeTrainingFocuses || player.activeTrainingFocuses.length === 0) {
    return 0;
  }

  const allTypes = getAllTrainingTypes();
  const intensity = player.activeTrainingIntensity || 'medium';
  const trainer = player.activeTrainerTier ? getTrainer(player.activeTrainerTier) : null;

  let totalWeeklyCost = 0;

  for (const focusId of player.activeTrainingFocuses) {
    const trainingType = allTypes.find(t => t.id === focusId);
    if (!trainingType) continue;

    // Custo base por semana (não multiplicado pela duração)
    const weeklyWage = player.wage || 1;
    let baseCost = Math.round(weeklyWage * 0.05); // 5% do salário por treino

    if (baseCost > 25000) baseCost = 25000;
    if (baseCost < 250) baseCost = 250;

    baseCost *= trainingType.baseCostMultiplier;

    const intensityMultipliers = { low: 0.5, medium: 1.0, high: 1.5, extreme: 2.0 };
    baseCost *= intensityMultipliers[intensity];

    totalWeeklyCost += Math.round(baseCost);
  }

  // Custo semanal do preparador físico
  if (trainer) {
    totalWeeklyCost += trainer.costPerWeek;
  }

  return totalWeeklyCost;
}

/**
 * Verifica se jogador pode pagar o custo semanal de treino
 * Se não puder, retorna a intensidade máxima que pode pagar
 */
export function getAffordableTrainingIntensity(
  player: Player
): 'low' | 'medium' | 'high' | 'extreme' | 'none' {
  const balance = player.bankBalance || 0;
  const wage = player.wage || 0;

  // Calculado: quanto sobra após despesas básicas (50% para vida)
  const availableForTraining = balance + wage * 0.5;

  if (!player.activeTrainingFocuses || player.activeTrainingFocuses.length === 0) {
    return 'none';
  }

  // Tenta cada intensidade do mais alto ao mais baixo
  const intensities: Array<'extreme' | 'high' | 'medium' | 'low'> = ['extreme', 'high', 'medium', 'low'];

  for (const intensity of intensities) {
    const testPlayer = { ...player, activeTrainingIntensity: intensity };
    const cost = getWeeklyTrainingCost(testPlayer);
    if (cost <= availableForTraining) {
      return intensity;
    }
  }

  return 'none';
}

/**
 * Processa o treino semanal automaticamente
 * Chamado pelo sistema de simulação a cada semana
 * Retorna o jogador atualizado e informações sobre o treino
 */
export function processWeeklyTraining(
  player: Player,
  currentSeason: number
): {
  updatedPlayer: Player;
  trainingApplied: boolean;
  costDeducted: number;
  intensityReduced: boolean;
  message: string;
} {
  // Se não tem treino configurado, pula
  if (!player.activeTrainingFocuses || player.activeTrainingFocuses.length === 0) {
    return {
      updatedPlayer: player,
      trainingApplied: false,
      costDeducted: 0,
      intensityReduced: false,
      message: 'training.noTrainingConfigured'
    };
  }

  let updatedPlayer = { ...player };
  const originalIntensity = player.activeTrainingIntensity || 'medium';

  // Verifica se pode pagar
  const affordableIntensity = getAffordableTrainingIntensity(player);

  if (affordableIntensity === 'none') {
    // Não pode pagar nenhum treino, pula a semana
    return {
      updatedPlayer: player,
      trainingApplied: false,
      costDeducted: 0,
      intensityReduced: false,
      message: 'training.cannotAffordAny'
    };
  }

  // Reduz intensidade se necessário
  const intensityReduced = affordableIntensity !== originalIntensity;
  if (intensityReduced) {
    updatedPlayer.activeTrainingIntensity = affordableIntensity;
  }

  // Calcula custo final
  const cost = getWeeklyTrainingCost(updatedPlayer);

  // Deduz custo
  updatedPlayer.bankBalance = (updatedPlayer.bankBalance || 0) - cost;

  // Aplica efeitos de treino (acumulativos por semana)
  const allTypes = getAllTrainingTypes();
  const trainer = updatedPlayer.activeTrainerTier ? getTrainer(updatedPlayer.activeTrainerTier) : null;

  for (const focusId of updatedPlayer.activeTrainingFocuses) {
    const trainingType = allTypes.find(t => t.id === focusId);
    if (!trainingType) continue;

    const session: TrainingSession = {
      focus: focusId,
      intensity: updatedPlayer.activeTrainingIntensity || 'medium',
      trainer,
      weeksRemaining: 1,
      startedSeason: currentSeason,
    };

    // Executa sessão de treino e aplica resultado
    const result = executeTrainingSession(updatedPlayer, session, trainingType);
    updatedPlayer = applyTrainingResult(updatedPlayer, { ...result, costTotal: 0 }); // custo já foi deduzido
  }

  const message = intensityReduced
    ? 'training.intensityReducedDueToBalance'
    : 'training.appliedSuccessfully';

  return {
    updatedPlayer,
    trainingApplied: true,
    costDeducted: cost,
    intensityReduced,
    message
  };
}

/**
 * Calcula o salário líquido do jogador após desconto do agente
 */
export function calculateNetSalary(player: Player): number {
  const grossSalary = player.wage || 0;
  const agentFee = player.agent?.feePercentage || 0;

  // Desconta a % do agente
  const agentCut = grossSalary * (agentFee / 100);
  const netSalary = grossSalary - agentCut;

  return Math.round(netSalary);
}

/**
 * Processa finanças semanais do jogador
 * Adiciona salário líquido (após desconto do agente)
 */
export function processWeeklySalary(player: Player): {
  updatedPlayer: Player;
  grossSalary: number;
  agentFee: number;
  netSalary: number;
} {
  const grossSalary = player.wage || 0;
  const agentFeePercent = player.agent?.feePercentage || 0;
  const agentFee = Math.round(grossSalary * (agentFeePercent / 100));
  const netSalary = grossSalary - agentFee;

  const updatedPlayer = {
    ...player,
    bankBalance: (player.bankBalance || 0) + netSalary
  };

  return {
    updatedPlayer,
    grossSalary,
    agentFee,
    netSalary
  };
}