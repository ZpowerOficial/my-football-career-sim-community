/**
 * Sistema de Treinamento e Desenvolvimento
 * Permite jogador escolher foco de treinamento para acelerar desenvolvimento
 */

import { Player, PlayerStats, Position } from '../types';
import { rand, randFloat, gaussianRandom, chance, clamp } from '../utils/random';
import { logger } from '../utils/logger';

export interface TrainingSession {
  type: 'Technical' | 'Physical' | 'Tactical' | 'Mental' | 'Position-Specific';
  intensity: 'Light' | 'Moderate' | 'Intense' | 'Maximum';
  focus?: keyof PlayerStats; // Stat específico (opcional)
  duration: number; // Semanas
  benefit: number; // Boost em %
  injuryRisk: number; // Chance de lesão (0-100)
  fatigueImpact: number; // Impacto na fitness (0-100)
}

export interface TrainingProgram {
  name: string;
  sessions: TrainingSession[];
  totalWeeks: number;
  expectedGrowth: Record<string, number>; // Stats e seus ganhos esperados
  suitableFor: Position[];
}

export interface TrainingResult {
  statChanges: Partial<Record<keyof PlayerStats, number>>;
  injured: boolean;
  injuryType?: string;
  fitnessChange: number;
  experienceGained: number;
}

// ==================== PROGRAMAS DE TREINAMENTO ====================

export const TRAINING_PROGRAMS: Record<string, TrainingProgram> = {
  STRIKER_FINISHING: {
    name: 'Elite Striker Finishing',
    totalWeeks: 4,
    sessions: [
      { type: 'Technical', intensity: 'Intense', focus: 'shooting', duration: 2, benefit: 3, injuryRisk: 5, fatigueImpact: 15 },
      { type: 'Technical', intensity: 'Intense', focus: 'finishing', duration: 2, benefit: 4, injuryRisk: 5, fatigueImpact: 15 },
      { type: 'Mental', intensity: 'Moderate', focus: 'composure', duration: 2, benefit: 2, injuryRisk: 1, fatigueImpact: 5 },
      { type: 'Position-Specific', intensity: 'Intense', focus: 'positioning', duration: 2, benefit: 3, injuryRisk: 3, fatigueImpact: 10 }
    ],
    expectedGrowth: { shooting: 3, finishing: 4, composure: 2, positioning: 3 },
    suitableFor: ['Attacker']
  },

  PLAYMAKER_VISION: {
    name: 'Creative Playmaker',
    totalWeeks: 4,
    sessions: [
      { type: 'Technical', intensity: 'Moderate', focus: 'passing', duration: 2, benefit: 4, injuryRisk: 2, fatigueImpact: 10 },
      { type: 'Tactical', intensity: 'Moderate', focus: 'vision', duration: 3, benefit: 5, injuryRisk: 1, fatigueImpact: 8 },
      { type: 'Technical', intensity: 'Moderate', focus: 'dribbling', duration: 2, benefit: 2, injuryRisk: 3, fatigueImpact: 10 },
      { type: 'Mental', intensity: 'Light', focus: 'composure', duration: 1, benefit: 2, injuryRisk: 1, fatigueImpact: 5 }
    ],
    expectedGrowth: { passing: 4, vision: 5, dribbling: 2, composure: 2 },
    suitableFor: ['Midfielder']
  },

  DEFENDER_STRENGTH: {
    name: 'Defensive Powerhouse',
    totalWeeks: 4,
    sessions: [
      { type: 'Physical', intensity: 'Maximum', focus: 'strength', duration: 2, benefit: 4, injuryRisk: 8, fatigueImpact: 20 },
      { type: 'Technical', intensity: 'Intense', focus: 'defending', duration: 2, benefit: 3, injuryRisk: 4, fatigueImpact: 12 },
      { type: 'Tactical', intensity: 'Moderate', focus: 'positioning', duration: 2, benefit: 3, injuryRisk: 2, fatigueImpact: 8 },
      { type: 'Mental', intensity: 'Moderate', focus: 'aggression', duration: 1, benefit: 2, injuryRisk: 1, fatigueImpact: 5 }
    ],
    expectedGrowth: { strength: 4, defending: 3, positioning: 3, aggression: 2 },
    suitableFor: ['Defender']
  },

  GOALKEEPER_REFLEXES: {
    name: 'Elite Shot-Stopper',
    totalWeeks: 4,
    sessions: [
      { type: 'Technical', intensity: 'Intense', focus: 'reflexes', duration: 3, benefit: 5, injuryRisk: 3, fatigueImpact: 15 },
      { type: 'Physical', intensity: 'Moderate', focus: 'diving', duration: 2, benefit: 3, injuryRisk: 5, fatigueImpact: 12 },
      { type: 'Technical', intensity: 'Moderate', focus: 'handling', duration: 2, benefit: 3, injuryRisk: 2, fatigueImpact: 8 },
      { type: 'Mental', intensity: 'Light', focus: 'positioning', duration: 1, benefit: 2, injuryRisk: 1, fatigueImpact: 5 }
    ],
    expectedGrowth: { reflexes: 5, diving: 3, handling: 3, positioning: 2 },
    suitableFor: ['Goalkeeper']
  },

  SPEED_TRAINING: {
    name: 'Speed & Agility',
    totalWeeks: 3,
    sessions: [
      { type: 'Physical', intensity: 'Maximum', focus: 'pace', duration: 2, benefit: 3, injuryRisk: 10, fatigueImpact: 25 },
      { type: 'Physical', intensity: 'Intense', focus: 'acceleration', duration: 2, benefit: 3, injuryRisk: 8, fatigueImpact: 20 },
      { type: 'Physical', intensity: 'Moderate', focus: 'agility', duration: 2, benefit: 2, injuryRisk: 5, fatigueImpact: 12 }
    ],
    expectedGrowth: { pace: 3, acceleration: 3, agility: 2 },
    suitableFor: ['Attacker', 'Midfielder', 'Defender']
  },

  GENERAL_FITNESS: {
    name: 'General Conditioning',
    totalWeeks: 2,
    sessions: [
      { type: 'Physical', intensity: 'Moderate', focus: 'stamina', duration: 2, benefit: 3, injuryRisk: 2, fatigueImpact: 10 },
      { type: 'Physical', intensity: 'Moderate', focus: 'fitness', duration: 2, benefit: 4, injuryRisk: 2, fatigueImpact: 8 },
      { type: 'Physical', intensity: 'Light', focus: 'workRate', duration: 1, benefit: 2, injuryRisk: 1, fatigueImpact: 5 }
    ],
    expectedGrowth: { stamina: 3, fitness: 4, workRate: 2 },
    suitableFor: ['Attacker', 'Midfielder', 'Defender', 'Goalkeeper']
  }
};

// ==================== FUNÃ‡Ã•ES PRINCIPAIS ====================

/**
 * Obtém programas disponíveis para a posição do jogador
 */
export const getAvailablePrograms = (player: Player): TrainingProgram[] => {
  // Mapear PositionDetail para Position
  const positionMap: Record<string, Position> = {
    ST: 'Attacker', CF: 'Attacker', LW: 'Attacker', RW: 'Attacker',
    CAM: 'Midfielder', CM: 'Midfielder', CDM: 'Midfielder', LM: 'Midfielder', RM: 'Midfielder',
    CB: 'Defender', LB: 'Defender', RB: 'Defender', LWB: 'Defender', RWB: 'Defender',
    GK: 'Goalkeeper'
  };

  const generalPosition = positionMap[player.position] || 'Midfielder';

  return Object.values(TRAINING_PROGRAMS).filter(program =>
    program.suitableFor.includes(generalPosition)
  );
};

/**
 * Executa uma sessão de treinamento individual
 */
export const executeTrainingSession = (
  player: Player,
  session: TrainingSession
): TrainingResult => {
  const result: TrainingResult = {
    statChanges: {},
    injured: false,
    fitnessChange: 0,
    experienceGained: 0
  };

  // Calcular modificadores baseados em idade e fitness
  const age = player.age;
  const fitness = player.stats.fitness;

  // Jogadores jovens aprendem mais rápido
  let ageModifier = 1.0;
  if (age <= 21) ageModifier = 1.3;
  else if (age <= 25) ageModifier = 1.15;
  else if (age <= 29) ageModifier = 1.0;
  else if (age <= 33) ageModifier = 0.85;
  else ageModifier = 0.7;

  // Fitness afeta risco de lesão e benefício
  const fitnessModifier = fitness / 90;
  const injuryRiskMultiplier = fitness < 80 ? 1.5 : 1.0;

  // Calcular ganho de stat
  if (session.focus) {
    const baseBenefit = session.benefit * ageModifier * fitnessModifier;
    const actualBenefit = gaussianRandom(baseBenefit, baseBenefit * 0.2);

    result.statChanges[session.focus] = Math.max(Math.round(actualBenefit), 1);
  }

  // Verificar lesão
  const adjustedInjuryRisk = session.injuryRisk * injuryRiskMultiplier;
  if (chance(adjustedInjuryRisk)) {
    result.injured = true;
    result.injuryType = determineInjuryType(session.type, session.intensity);
    logger.warn(`${player.name} injured during ${session.type} training (${session.intensity})`, 'training');
  }

  // Impacto na fitness
  result.fitnessChange = -session.fatigueImpact * (fitness < 70 ? 1.5 : 1.0);

  // Experiência ganha
  result.experienceGained = session.intensity === 'Maximum' ? 3 :
                           session.intensity === 'Intense' ? 2 :
                           session.intensity === 'Moderate' ? 1 : 0;

  return result;
};

/**
 * Executa um programa completo de treinamento
 */
export const executeTrainingProgram = (
  player: Player,
  program: TrainingProgram
): {
  totalStatChanges: Partial<Record<keyof PlayerStats, number>>;
  totalInjuries: number;
  totalFitnessChange: number;
  totalExperience: number;
  injuryDetails?: string[];
} => {
  const totalStatChanges: Partial<Record<keyof PlayerStats, number>> = {};
  let totalInjuries = 0;
  let totalFitnessChange = 0;
  let totalExperience = 0;
  const injuryDetails: string[] = [];

  logger.info(`${player.name} starting ${program.name} training program`, 'training');

  for (const session of program.sessions) {
    const result = executeTrainingSession(player, session);

    // Acumular mudanças de stats
    for (const [stat, change] of Object.entries(result.statChanges)) {
      const statKey = stat as keyof PlayerStats;
      totalStatChanges[statKey] = (totalStatChanges[statKey] || 0) + change;
    }

    // Acumular outros resultados
    if (result.injured) {
      totalInjuries++;
      if (result.injuryType) injuryDetails.push(result.injuryType);
    }

    totalFitnessChange += result.fitnessChange;
    totalExperience += result.experienceGained;
  }

  logger.info(
    `${player.name} completed ${program.name}: ${Object.keys(totalStatChanges).length} stats improved, ${totalInjuries} injuries`,
    'training',
    { statChanges: totalStatChanges }
  );

  return {
    totalStatChanges,
    totalInjuries,
    totalFitnessChange,
    totalExperience,
    injuryDetails: totalInjuries > 0 ? injuryDetails : undefined
  };
};

/**
 * Cria uma sessão customizada
 */
export const createCustomSession = (
  type: TrainingSession['type'],
  intensity: TrainingSession['intensity'],
  focus: keyof PlayerStats,
  weeks: number = 1
): TrainingSession => {
  // Determinar benefícios e riscos baseados em intensidade
  const intensityMap = {
    Light: { benefit: 1, injuryRisk: 1, fatigueImpact: 5 },
    Moderate: { benefit: 2, injuryRisk: 3, fatigueImpact: 10 },
    Intense: { benefit: 3, injuryRisk: 6, fatigueImpact: 15 },
    Maximum: { benefit: 4, injuryRisk: 10, fatigueImpact: 25 }
  };

  const params = intensityMap[intensity];

  return {
    type,
    intensity,
    focus,
    duration: weeks,
    benefit: params.benefit,
    injuryRisk: params.injuryRisk,
    fatigueImpact: params.fatigueImpact
  };
};

/**
 * Determina tipo de lesão baseado no tipo de treino
 */
const determineInjuryType = (
  type: TrainingSession['type'],
  intensity: TrainingSession['intensity']
): string => {
  const injuries = {
    Technical: ['Ankle Sprain', 'Minor Knock', 'Muscle Fatigue'],
    Physical: ['Hamstring Strain', 'Groin Pull', 'Muscle Tear', 'Knee Sprain'],
    Tactical: ['Minor Knock', 'Muscle Fatigue'],
    Mental: ['Burnout', 'Mental Fatigue'],
    'Position-Specific': ['Minor Knock', 'Ankle Sprain', 'Muscle Strain']
  };

  const typeInjuries = injuries[type];
  let injury = typeInjuries[rand(0, typeInjuries.length - 1)];

  // Intensidade afeta gravidade
  if (intensity === 'Maximum' && chance(30)) {
    injury = 'Serious ' + injury;
  }

  return injury;
};

/**
 * Calcula custo (se clube oferece) ou impacto no tempo
 */
export const calculateTrainingCost = (
  program: TrainingProgram,
  playerWage: number
): {
  timeCost: number; // Horas por semana
  moneyCost?: number; // Se pago privadamente
} => {
  const intensity = program.sessions.reduce((sum, s) => {
    const weights = { Light: 1, Moderate: 2, Intense: 3, Maximum: 4 };
    return sum + weights[s.intensity];
  }, 0);

  const avgIntensity = intensity / program.sessions.length;
  const timeCost = avgIntensity * 5; // Horas por semana

  // Se jogador pagar privadamente (personal trainer, etc)
  const moneyCost = program.totalWeeks * 5000 * avgIntensity;

  return { timeCost, moneyCost };
};

/**
 * Recomenda programa baseado nas necessidades do jogador
 */
export const recommendProgram = (player: Player): TrainingProgram | null => {
  const available = getAvailablePrograms(player);
  if (available.length === 0) return null;

  const stats = player.stats;
  const positionDetail = player.position;

  // Mapear para posição geral
  const isAttacker = ['ST', 'CF', 'LW', 'RW'].includes(positionDetail);
  const isMidfielder = ['CAM', 'CM', 'CDM', 'LM', 'RM'].includes(positionDetail);
  const isDefender = ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(positionDetail);
  const isGoalkeeper = positionDetail === 'GK';

  // Identificar stats mais fracos da posição
  let weakestArea: string | null = null;

  if (isAttacker) {
    if (stats.shooting && stats.shooting < 75) weakestArea = 'STRIKER_FINISHING';
    else if (stats.pace && stats.pace < 75) weakestArea = 'SPEED_TRAINING';
  } else if (isMidfielder) {
    if (stats.passing && stats.passing < 75) weakestArea = 'PLAYMAKER_VISION';
    else if (stats.stamina && stats.stamina < 75) weakestArea = 'GENERAL_FITNESS';
  } else if (isDefender) {
    if (stats.defending && stats.defending < 75) weakestArea = 'DEFENDER_STRENGTH';
  } else if (isGoalkeeper) {
    if (stats.reflexes && stats.reflexes < 75) weakestArea = 'GOALKEEPER_REFLEXES';
  }

  if (weakestArea && TRAINING_PROGRAMS[weakestArea]) {
    return TRAINING_PROGRAMS[weakestArea];
  }

  // Default: fitness
  return TRAINING_PROGRAMS.GENERAL_FITNESS;
};
