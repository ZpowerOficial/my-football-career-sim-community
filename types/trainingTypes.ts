/**
 * TRAINING SYSTEM TYPES - v0.5.6
 * 
 * Sistema completo de treinamento estilo FIFA Career Mode.
 * Permite escolher tipos de treino, treinar posições, e tem
 * múltiplos fatores que influenciam o resultado.
 * 
 * Treinos são filtrados por posição detalhada (ST, CF, LW, RW, CAM, CM, etc.)
 * e também consideram posições secundárias do jogador.
 */

import type { Position, PositionDetail } from '../types';

// ==================== TIPOS DE TREINO ====================

export type TrainingFocus =
  // ===== GERAIS (todos) =====
  | 'clubTraining'       // Treino do clube - gratuito
  | 'balanced'           // Equilibrado
  | 'scrimmage'          // Rachinha/Coletivo
  | 'activeRest'         // Descanso ativo
  | 'position'           // Mudança de posição

  // ===== FÍSICOS =====
  | 'sprints'            // Tiros de velocidade
  | 'endurance'          // Resistência/Fôlego
  | 'explosiveness'      // Explosão muscular
  | 'gym'                // Academia/Força
  | 'agility'            // Agilidade
  | 'flexibility'        // Flexibilidade

  // ===== TÉCNICOS (jogadores de linha) =====
  | 'shooting'           // Finalização
  | 'longshots'          // Chutes de fora
  | 'playmaking'         // Criação de jogadas
  | 'passing'            // Passes
  | 'crossing'           // Cruzamentos
  | 'heading'            // Cabeceio
  | 'setpieces'          // Bolas paradas
  | 'skillMoves'         // Dribles e firulas
  | 'firstTouch'         // Domínio de bola
  | 'weakFoot'           // Perna ruim

  // ===== TÁTICOS =====
  | 'positioning'        // Posicionamento ofensivo
  | 'marking'            // Marcação
  | 'pressing'           // Pressão alta
  | 'counterAttack'      // Contra-ataque

  // ===== ESPECÍFICOS - ATACANTES =====
  | 'poacher'            // Matador de área
  | 'targetMan'          // Pivô/Referência
  | 'winger'             // Ponta veloz

  // ===== ESPECÍFICOS - MEIAS =====
  | 'boxToBox'           // Box-to-box
  | 'playmaker'          // Armador/Regista
  | 'defensiveMid'       // Volante/Primeiro volante

  // ===== ESPECÍFICOS - DEFENSORES =====
  | 'aerialDefense'      // Jogo aéreo defensivo
  | 'tackles'            // Desarmes
  | 'covering'           // Cobertura
  | 'fullback'           // Ala/Lateral ofensivo

  // ===== GOLEIROS =====
  | 'gkReflexes'         // Reflexos
  | 'gkDiving'           // Mergulhos
  | 'gkPositioning'      // Posicionamento
  | 'gkDistribution'     // Saída de gol/Reposição
  | 'gkCrosses'          // Cruzamentos/Saídas
  | 'gkOneOnOne';        // Um contra um

// Categoria de treino baseada na ciência do esporte (Gomes, 2002)
export type TrainingCategory =
  | 'generalDevelopment'     // T.G.D - Treino Geral de Desenvolvimento
  | 'recovery'               // T.G.R - Treino Geral de Recuperação  
  | 'specificSimple'         // T.E.S - Treino Específico Simples
  | 'specificCompetitive';   // T.E.C - Treino Específico Competitivo

// Fases da temporada para periodização
export type SeasonPhase =
  | 'preseason'      // Pré-temporada (maior volume, desenvolvimento geral)
  | 'earlyseason'    // Início da temporada (transição para competição)
  | 'midseason'      // Meio da temporada (manutenção, alta intensidade)
  | 'lateseason'     // Final da temporada (polimento, foco tático)
  | 'offseason';     // Férias/transição (recuperação ativa)

export interface TrainingType {
  id: TrainingFocus;
  nameKey: string;           // Chave de tradução
  descriptionKey: string;    // Descrição traduzida
  icon: string;              // Ícone FontAwesome
  category?: TrainingCategory; // Categoria do treino (opcional para retrocompatibilidade)
  primaryBoost: string[];    // Atributos com boost maior (1.5-2.5x)
  secondaryBoost: string[];  // Atributos com boost menor (0.8-1.2x)
  penaltyStats: string[];    // Atributos que podem diminuir (-0.5 a 0)
  baseCostMultiplier: number; // Multiplicador de custo base
  duration: number;          // Semanas de treino
  minAge?: number;           // Idade mínima para este treino
  maxAge?: number;           // Idade máxima para este treino
  loadIntensity?: number;    // Intensidade da carga (1-10)
  recoveryDays?: number;     // Dias de recuperação necessários
  recommendedPhase?: SeasonPhase[]; // Fases da temporada recomendadas
  forPositions?: PositionDetail[]; // Posições que podem usar (vazio = todos)
}

// ==================== PERSONAL TRAINER ====================

export type TrainerTier = 'basic' | 'standard' | 'premium' | 'elite' | 'worldClass';

export interface PersonalTrainer {
  tier: TrainerTier;
  nameKey: string;
  costPerWeek: number;        // Custo semanal em €
  effectivenessBonus: number; // 0.0 - 0.5 (bonus no resultado do treino)
  specialties: TrainingFocus[]; // Especialidades (bonus extra)
  injuryReduction: number;    // 0.0 - 0.3 (reduz chance de lesão)
}

// ==================== INFRAESTRUTURA DO CLUBE ====================

export interface ClubInfrastructure {
  trainingFacilities: number;  // 1-5 (1=básico, 5=elite)
  youthAcademy: number;        // 1-5
  medicalDepartment: number;   // 1-5
  nutritionCenter: number;     // 1-5
  recoveryCenter: number;      // 1-5
}

// ==================== SESSÃO DE TREINO ====================

export interface TrainingSession {
  focus: TrainingFocus;
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  trainer: PersonalTrainer | null;
  targetPosition?: PositionDetail; // Para treino de posição
  weeksRemaining: number;
  startedSeason: number;
}

export interface TrainingResult {
  success: boolean;
  attributeChanges: Record<string, number>; // { pace: +2, shooting: +1, defending: -1 }
  positionProgress?: number;   // Progresso para nova posição (0-100)
  injuryRisk: number;          // 0-100 chance de lesão leve
  fatigueImpact: number;       // Impacto na forma física
  costTotal: number;           // Custo total do treino
  narrativeKey: string;        // Chave de tradução para feedback
}

// ==================== PROGRESSO DE POSIÇÃO ====================

export interface PositionTraining {
  targetPosition: PositionDetail;
  progress: number;            // 0-100
  naturalFit: number;          // 0-100 (quão natural é a transição)
  seasonStarted: number;
  estimatedSeasonsToComplete: number;
}

// ==================== ESTADO COMPLETO DE TREINO ====================

export interface PlayerTrainingState {
  currentSession: TrainingSession | null;
  personalTrainer: PersonalTrainer | null;
  positionTraining: PositionTraining | null;
  secondaryPositions: PositionDetail[];    // Posições que já domina
  trainingHistory: TrainingHistoryEntry[];
  totalInvested: number;
  sessionsCompleted: number;
}

export interface TrainingHistoryEntry {
  season: number;
  focus: TrainingFocus;
  result: 'excellent' | 'good' | 'neutral' | 'poor' | 'injury';
  attributeChanges: Record<string, number>;
  cost: number;
}

// ==================== GRUPOS DE POSIÇÕES ====================

// Grupos para facilitar atribuição de treinos
export const POSITION_GROUPS = {
  // Por posição específica
  STRIKERS: ['ST', 'CF'] as PositionDetail[],
  WINGERS: ['LW', 'RW'] as PositionDetail[],
  ATTACKING_MIDS: ['CAM'] as PositionDetail[],
  CENTRAL_MIDS: ['CM', 'LM', 'RM'] as PositionDetail[],
  DEFENSIVE_MIDS: ['CDM'] as PositionDetail[],
  CENTER_BACKS: ['CB'] as PositionDetail[],
  FULLBACKS: ['LB', 'RB'] as PositionDetail[],
  WINGBACKS: ['LWB', 'RWB'] as PositionDetail[],
  GOALKEEPERS: ['GK'] as PositionDetail[],

  // Combinações amplas
  ALL_ATTACKERS: ['ST', 'CF', 'LW', 'RW'] as PositionDetail[],
  ALL_MIDFIELDERS: ['CAM', 'CM', 'LM', 'RM', 'CDM'] as PositionDetail[],
  ALL_DEFENDERS: ['CB', 'LB', 'RB', 'LWB', 'RWB'] as PositionDetail[],
  ALL_WIDE: ['LW', 'RW', 'LM', 'RM', 'LWB', 'RWB', 'LB', 'RB'] as PositionDetail[],
  ALL_CENTRAL: ['ST', 'CF', 'CAM', 'CM', 'CDM', 'CB'] as PositionDetail[],
  FIELD_PLAYERS: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'] as PositionDetail[],
  ALL_POSITIONS: ['GK', 'ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'] as PositionDetail[],
};

// ==================== CONSTANTES ====================

export const TRAINING_TYPES: TrainingType[] = [
  // ==========================================
  // ========== TREINOS GERAIS (TODOS) ========
  // ==========================================
  {
    id: 'clubTraining',
    nameKey: 'training.types.clubTraining',
    descriptionKey: 'training.types.clubTrainingDesc',
    icon: 'fa-users',
    primaryBoost: [],
    secondaryBoost: ['pace', 'shooting', 'passing', 'dribbling', 'defending'],
    penaltyStats: [],
    baseCostMultiplier: 0,
    duration: 4,
    // Sem forPositions = disponível para todos
  },
  {
    id: 'balanced',
    nameKey: 'training.types.balanced',
    descriptionKey: 'training.types.balancedDesc',
    icon: 'fa-balance-scale',
    primaryBoost: [],
    secondaryBoost: ['pace', 'shooting', 'passing', 'dribbling', 'defending'],
    penaltyStats: [],
    baseCostMultiplier: 1.0,
    duration: 4,
  },
  {
    id: 'scrimmage',
    nameKey: 'training.types.scrimmage',
    descriptionKey: 'training.types.scrimmageDesc',
    icon: 'fa-futbol',
    primaryBoost: ['passing', 'dribbling'],
    secondaryBoost: ['shooting', 'defending', 'pace'],
    penaltyStats: [],
    baseCostMultiplier: 0.6,
    duration: 4,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
  },
  {
    id: 'activeRest',
    nameKey: 'training.types.activeRest',
    descriptionKey: 'training.types.activeRestDesc',
    icon: 'fa-spa',
    primaryBoost: [],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 0.4,
    duration: 1,
  },
  {
    id: 'position',
    nameKey: 'training.types.position',
    descriptionKey: 'training.types.positionDesc',
    icon: 'fa-exchange-alt',
    primaryBoost: [],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 2.0,
    duration: 8,
    minAge: 17,
    maxAge: 28,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
  },

  // ==========================================
  // ========== TREINOS FÍSICOS ==============
  // ==========================================
  {
    id: 'sprints',
    nameKey: 'training.types.sprints',
    descriptionKey: 'training.types.sprintsDesc',
    icon: 'fa-running',
    primaryBoost: ['pace'],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 1.0,
    duration: 4,
    maxAge: 34,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
  },
  {
    id: 'endurance',
    nameKey: 'training.types.endurance',
    descriptionKey: 'training.types.enduranceDesc',
    icon: 'fa-heartbeat',
    primaryBoost: ['pace'],
    secondaryBoost: ['defending'],
    penaltyStats: [],
    baseCostMultiplier: 0.9,
    duration: 5,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
  },
  {
    id: 'explosiveness',
    nameKey: 'training.types.explosiveness',
    descriptionKey: 'training.types.explosivenessDesc',
    icon: 'fa-bolt',
    primaryBoost: ['pace'],
    secondaryBoost: ['shooting'],
    penaltyStats: [],
    baseCostMultiplier: 1.3,
    duration: 4,
    maxAge: 30,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'LM', 'RM', 'LWB', 'RWB', 'LB', 'RB'],
  },
  {
    id: 'gym',
    nameKey: 'training.types.gym',
    descriptionKey: 'training.types.gymDesc',
    icon: 'fa-dumbbell',
    primaryBoost: ['defending'],
    secondaryBoost: ['shooting', 'pace'],
    penaltyStats: ['dribbling'],
    baseCostMultiplier: 1.2,
    duration: 6,
    maxAge: 33,
    // GK também pode fazer academia
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'GK'],
  },
  {
    id: 'agility',
    nameKey: 'training.types.agility',
    descriptionKey: 'training.types.agilityDesc',
    icon: 'fa-wind',
    primaryBoost: ['pace', 'dribbling'],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 1.1,
    duration: 4,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'GK'],
  },
  {
    id: 'flexibility',
    nameKey: 'training.types.flexibility',
    descriptionKey: 'training.types.flexibilityDesc',
    icon: 'fa-child',
    primaryBoost: [],
    secondaryBoost: ['pace', 'dribbling'],
    penaltyStats: [],
    baseCostMultiplier: 0.5,
    duration: 2,
    // Todos podem fazer
  },

  // ==========================================
  // ========== TREINOS TÉCNICOS (LINHA) =====
  // ==========================================
  {
    id: 'shooting',
    nameKey: 'training.types.shooting',
    descriptionKey: 'training.types.shootingDesc',
    icon: 'fa-bullseye',
    primaryBoost: ['shooting'],
    secondaryBoost: ['pace'],
    penaltyStats: ['defending'],
    baseCostMultiplier: 1.2,
    duration: 4,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM'],
  },
  {
    id: 'longshots',
    nameKey: 'training.types.longshots',
    descriptionKey: 'training.types.longshotsDesc',
    icon: 'fa-meteor',
    primaryBoost: ['shooting'],
    secondaryBoost: ['passing'],
    penaltyStats: [],
    baseCostMultiplier: 1.3,
    duration: 4,
    forPositions: ['ST', 'CF', 'CAM', 'CM', 'CDM', 'LM', 'RM'],
  },
  {
    id: 'playmaking',
    nameKey: 'training.types.playmaking',
    descriptionKey: 'training.types.playmakingDesc',
    icon: 'fa-project-diagram',
    primaryBoost: ['passing'],
    secondaryBoost: ['dribbling'],
    penaltyStats: ['defending'],
    baseCostMultiplier: 1.0,
    duration: 4,
    forPositions: ['CAM', 'CM', 'CDM', 'CF'],
  },
  {
    id: 'crossing',
    nameKey: 'training.types.crossing',
    descriptionKey: 'training.types.crossingDesc',
    icon: 'fa-crosshairs',
    primaryBoost: ['passing'],
    secondaryBoost: ['pace'],
    penaltyStats: [],
    baseCostMultiplier: 1.1,
    duration: 4,
    forPositions: ['LW', 'RW', 'LM', 'RM', 'LWB', 'RWB', 'LB', 'RB'],
  },
  {
    id: 'heading',
    nameKey: 'training.types.heading',
    descriptionKey: 'training.types.headingDesc',
    icon: 'fa-arrow-up',
    primaryBoost: ['shooting', 'defending'],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 1.0,
    duration: 4,
    forPositions: ['ST', 'CF', 'CB', 'CDM'],
  },
  {
    id: 'setpieces',
    nameKey: 'training.types.setpieces',
    descriptionKey: 'training.types.setpiecesDesc',
    icon: 'fa-flag',
    primaryBoost: ['shooting', 'passing'],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 1.0,
    duration: 3,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
  },
  {
    id: 'skillMoves',
    nameKey: 'training.types.skillMoves',
    descriptionKey: 'training.types.skillMovesDesc',
    icon: 'fa-magic',
    primaryBoost: ['dribbling'],
    secondaryBoost: ['pace'],
    penaltyStats: [],
    baseCostMultiplier: 1.4,
    duration: 4,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'LM', 'RM'],
  },
  {
    id: 'firstTouch',
    nameKey: 'training.types.firstTouch',
    descriptionKey: 'training.types.firstTouchDesc',
    icon: 'fa-hand-paper',
    primaryBoost: ['dribbling'],
    secondaryBoost: ['passing'],
    penaltyStats: [],
    baseCostMultiplier: 1.2,
    duration: 4,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM'],
  },
  {
    id: 'weakFoot',
    nameKey: 'training.types.weakFoot',
    descriptionKey: 'training.types.weakFootDesc',
    icon: 'fa-shoe-prints',
    primaryBoost: ['shooting', 'passing', 'dribbling'],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 1.5,
    duration: 6,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
  },

  // ==========================================
  // ========== TREINOS TÁTICOS ==============
  // ==========================================
  {
    id: 'positioning',
    nameKey: 'training.types.positioning',
    descriptionKey: 'training.types.positioningDesc',
    icon: 'fa-map-marker-alt',
    primaryBoost: ['shooting'],
    secondaryBoost: ['pace'],
    penaltyStats: [],
    baseCostMultiplier: 1.1,
    duration: 4,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM'],
  },
  {
    id: 'marking',
    nameKey: 'training.types.marking',
    descriptionKey: 'training.types.markingDesc',
    icon: 'fa-shield-alt',
    primaryBoost: ['defending'],
    secondaryBoost: ['pace'],
    penaltyStats: ['dribbling'],
    baseCostMultiplier: 1.0,
    duration: 4,
    forPositions: ['CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM'],
  },
  {
    id: 'pressing',
    nameKey: 'training.types.pressing',
    descriptionKey: 'training.types.pressingDesc',
    icon: 'fa-compress-arrows-alt',
    primaryBoost: ['defending', 'pace'],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 1.0,
    duration: 4,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
  },
  {
    id: 'counterAttack',
    nameKey: 'training.types.counterAttack',
    descriptionKey: 'training.types.counterAttackDesc',
    icon: 'fa-forward',
    primaryBoost: ['pace'],
    secondaryBoost: ['passing', 'dribbling'],
    penaltyStats: [],
    baseCostMultiplier: 1.1,
    duration: 4,
    forPositions: ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'LM', 'RM'],
  },

  // ==========================================
  // ========== TREINOS DE ATACANTE ==========
  // ==========================================
  {
    id: 'poacher',
    nameKey: 'training.types.poacher',
    descriptionKey: 'training.types.poacherDesc',
    icon: 'fa-crosshairs',
    primaryBoost: ['shooting'],
    secondaryBoost: ['pace'],
    penaltyStats: ['passing'],
    baseCostMultiplier: 1.4,
    duration: 5,
    forPositions: ['ST', 'CF'],
  },
  {
    id: 'targetMan',
    nameKey: 'training.types.targetMan',
    descriptionKey: 'training.types.targetManDesc',
    icon: 'fa-bullseye',
    primaryBoost: ['shooting', 'defending'],
    secondaryBoost: ['passing'],
    penaltyStats: ['pace'],
    baseCostMultiplier: 1.3,
    duration: 5,
    forPositions: ['ST', 'CF'],
  },
  {
    id: 'winger',
    nameKey: 'training.types.winger',
    descriptionKey: 'training.types.wingerDesc',
    icon: 'fa-bolt',
    primaryBoost: ['pace', 'dribbling'],
    secondaryBoost: ['passing'],
    penaltyStats: ['defending'],
    baseCostMultiplier: 1.3,
    duration: 5,
    forPositions: ['LW', 'RW', 'LM', 'RM'],
  },

  // ==========================================
  // ========== TREINOS DE MEIO-CAMPO ========
  // ==========================================
  {
    id: 'boxToBox',
    nameKey: 'training.types.boxToBox',
    descriptionKey: 'training.types.boxToBoxDesc',
    icon: 'fa-arrows-alt-h',
    primaryBoost: ['pace', 'passing'],
    secondaryBoost: ['defending', 'shooting'],
    penaltyStats: [],
    baseCostMultiplier: 1.3,
    duration: 5,
    forPositions: ['CM', 'LM', 'RM', 'CDM'],
  },
  {
    id: 'playmaker',
    nameKey: 'training.types.playmaker',
    descriptionKey: 'training.types.playmakerDesc',
    icon: 'fa-brain',
    primaryBoost: ['passing', 'dribbling'],
    secondaryBoost: ['shooting'],
    penaltyStats: ['defending', 'pace'],
    baseCostMultiplier: 1.4,
    duration: 5,
    forPositions: ['CAM', 'CM', 'CF'],
  },
  {
    id: 'defensiveMid',
    nameKey: 'training.types.defensiveMid',
    descriptionKey: 'training.types.defensiveMidDesc',
    icon: 'fa-shield-alt',
    primaryBoost: ['defending', 'passing'],
    secondaryBoost: ['pace'],
    penaltyStats: ['shooting', 'dribbling'],
    baseCostMultiplier: 1.2,
    duration: 5,
    forPositions: ['CDM', 'CM'],
  },

  // ==========================================
  // ========== TREINOS DE DEFENSOR ==========
  // ==========================================
  {
    id: 'aerialDefense',
    nameKey: 'training.types.aerialDefense',
    descriptionKey: 'training.types.aerialDefenseDesc',
    icon: 'fa-arrow-up',
    primaryBoost: ['defending'],
    secondaryBoost: ['shooting'],
    penaltyStats: [],
    baseCostMultiplier: 1.1,
    duration: 4,
    forPositions: ['CB', 'CDM'],
  },
  {
    id: 'tackles',
    nameKey: 'training.types.tackles',
    descriptionKey: 'training.types.tacklesDesc',
    icon: 'fa-shoe-prints',
    primaryBoost: ['defending'],
    secondaryBoost: ['pace'],
    penaltyStats: [],
    baseCostMultiplier: 1.0,
    duration: 4,
    forPositions: ['CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM'],
  },
  {
    id: 'covering',
    nameKey: 'training.types.covering',
    descriptionKey: 'training.types.coveringDesc',
    icon: 'fa-umbrella',
    primaryBoost: ['defending'],
    secondaryBoost: ['pace', 'passing'],
    penaltyStats: [],
    baseCostMultiplier: 1.1,
    duration: 4,
    forPositions: ['CB', 'CDM'],
  },
  {
    id: 'fullback',
    nameKey: 'training.types.fullback',
    descriptionKey: 'training.types.fullbackDesc',
    icon: 'fa-arrows-alt-h',
    primaryBoost: ['pace', 'passing'],
    secondaryBoost: ['defending', 'dribbling'],
    penaltyStats: [],
    baseCostMultiplier: 1.3,
    duration: 5,
    forPositions: ['LB', 'RB', 'LWB', 'RWB'],
  },

  // ==========================================
  // ========== TREINOS DE GOLEIRO ===========
  // ==========================================
  {
    id: 'gkReflexes',
    nameKey: 'training.types.gkReflexes',
    descriptionKey: 'training.types.gkReflexesDesc',
    icon: 'fa-hand-paper',
    primaryBoost: ['reflexes'],
    secondaryBoost: ['diving'],
    penaltyStats: [],
    baseCostMultiplier: 1.2,
    duration: 4,
    forPositions: ['GK'],
  },
  {
    id: 'gkDiving',
    nameKey: 'training.types.gkDiving',
    descriptionKey: 'training.types.gkDivingDesc',
    icon: 'fa-hands',
    primaryBoost: ['diving'],
    secondaryBoost: ['reflexes'],
    penaltyStats: [],
    baseCostMultiplier: 1.2,
    duration: 4,
    forPositions: ['GK'],
  },
  {
    id: 'gkPositioning',
    nameKey: 'training.types.gkPositioning',
    descriptionKey: 'training.types.gkPositioningDesc',
    icon: 'fa-map-marker-alt',
    primaryBoost: ['positioning'],
    secondaryBoost: ['reflexes', 'handling'],
    penaltyStats: [],
    baseCostMultiplier: 1.0,
    duration: 4,
    forPositions: ['GK'],
  },
  {
    id: 'gkDistribution',
    nameKey: 'training.types.gkDistribution',
    descriptionKey: 'training.types.gkDistributionDesc',
    icon: 'fa-hands-helping',
    primaryBoost: ['handling'],
    secondaryBoost: ['passing'],
    penaltyStats: [],
    baseCostMultiplier: 1.1,
    duration: 4,
    forPositions: ['GK'],
  },
  {
    id: 'gkCrosses',
    nameKey: 'training.types.gkCrosses',
    descriptionKey: 'training.types.gkCrossesDesc',
    icon: 'fa-fist-raised',
    primaryBoost: ['handling', 'positioning'],
    secondaryBoost: [],
    penaltyStats: [],
    baseCostMultiplier: 1.1,
    duration: 4,
    forPositions: ['GK'],
  },
  {
    id: 'gkOneOnOne',
    nameKey: 'training.types.gkOneOnOne',
    descriptionKey: 'training.types.gkOneOnOneDesc',
    icon: 'fa-user-shield',
    primaryBoost: ['reflexes', 'positioning'],
    secondaryBoost: ['diving'],
    penaltyStats: [],
    baseCostMultiplier: 1.3,
    duration: 4,
    forPositions: ['GK'],
  },
];

export const TRAINER_TIERS: Record<TrainerTier, PersonalTrainer> = {
  basic: {
    tier: 'basic',
    nameKey: 'training.trainer.basic',
    costPerWeek: 2000, // Increased for balance
    effectivenessBonus: 0.0,
    specialties: [],
    injuryReduction: 0.0,
  },
  standard: {
    tier: 'standard',
    nameKey: 'training.trainer.standard',
    costPerWeek: 10000, // Increased for balance
    effectivenessBonus: 0.1,
    specialties: ['balanced'],
    injuryReduction: 0.05,
  },
  premium: {
    tier: 'premium',
    nameKey: 'training.trainer.premium',
    costPerWeek: 35000, // Increased for balance
    effectivenessBonus: 0.2,
    specialties: ['shooting', 'playmaking', 'skillMoves'],
    injuryReduction: 0.1,
  },
  elite: {
    tier: 'elite',
    nameKey: 'training.trainer.elite',
    costPerWeek: 100000, // Increased for balance
    effectivenessBonus: 0.35,
    specialties: ['shooting', 'playmaking', 'skillMoves', 'gym', 'marking'],
    injuryReduction: 0.2,
  },
  worldClass: {
    tier: 'worldClass',
    nameKey: 'training.trainer.worldClass',
    costPerWeek: 250000, // Increased for balance
    effectivenessBonus: 0.5,
    specialties: ['shooting', 'playmaking', 'skillMoves', 'gym', 'marking', 'gkReflexes'],
    injuryReduction: 0.3,
  },
};

// Slots de treino por tier de preparador (quantos treinos extras o preparador permite)
export const TRAINER_SLOTS_BONUS: Record<TrainerTier, number> = {
  basic: 0,
  standard: 1,
  premium: 1,
  elite: 2,
  worldClass: 2,
};

// Calcular máximo de slots de treino baseado na infraestrutura e preparador
// Base: estrutura dá 1-3 slots, preparador adiciona 0-2 slots
export function calculateMaxTrainingSlots(
  infrastructure: number, // 1-5
  trainerTier: TrainerTier | null
): number {
  // Infraestrutura base: 1=1slot, 2=1slot, 3=2slots, 4=2slots, 5=3slots
  const baseSlots = infrastructure <= 2 ? 1 : infrastructure <= 4 ? 2 : 3;

  // Bônus do preparador
  const trainerBonus = trainerTier ? TRAINER_SLOTS_BONUS[trainerTier] : 0;

  // Máximo de 5 slots
  return Math.min(baseSlots + trainerBonus, 5);
}

// Mapeamento de leagueTier para infraestrutura base
export const INFRASTRUCTURE_BY_LEAGUE_TIER: Record<number, ClubInfrastructure> = {
  1: { trainingFacilities: 5, youthAcademy: 4, medicalDepartment: 4, nutritionCenter: 4, recoveryCenter: 5 },
  2: { trainingFacilities: 4, youthAcademy: 3, medicalDepartment: 3, nutritionCenter: 3, recoveryCenter: 3 },
  3: { trainingFacilities: 3, youthAcademy: 3, medicalDepartment: 2, nutritionCenter: 2, recoveryCenter: 2 },
  4: { trainingFacilities: 2, youthAcademy: 2, medicalDepartment: 1, nutritionCenter: 1, recoveryCenter: 1 },
  5: { trainingFacilities: 1, youthAcademy: 1, medicalDepartment: 1, nutritionCenter: 1, recoveryCenter: 1 },
};

// Posições compatíveis para transição
export const POSITION_TRANSITIONS: Record<Position, PositionDetail[]> = {
  'Goalkeeper': ['GK'],
  'Defender': ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  'Midfielder': ['CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW'],
  'Attacker': ['ST', 'CF', 'LW', 'RW'],
};

// Dificuldade de transição entre posições (1 = fácil, 5 = muito difícil)
export const POSITION_TRANSITION_DIFFICULTY: Record<string, number> = {
  // Mesma posição base
  'CB-LB': 2, 'CB-RB': 2, 'LB-RB': 1, 'LB-LWB': 1, 'RB-RWB': 1,
  'CDM-CM': 1, 'CM-CAM': 2, 'LM-LW': 1, 'RM-RW': 1, 'LM-RM': 1,
  'ST-CF': 1, 'CF-CAM': 2, 'LW-RW': 2,
  // Transições cross-position
  'CB-CDM': 3, 'CDM-CB': 3,
  'LB-LM': 3, 'RB-RM': 3, 'LWB-LM': 2, 'RWB-RM': 2,
  'CAM-CF': 2, 'CAM-ST': 3,
  'LW-ST': 3, 'RW-ST': 3, 'LW-LM': 2, 'RW-RM': 2,
  // Transições difíceis
  'DEF-MID': 4, 'MID-ATT': 3, 'DEF-ATT': 5,
};

export const INTENSITY_MODIFIERS = {
  low: { effectiveness: 0.6, injuryRisk: 0.02, fatigue: 5 },
  medium: { effectiveness: 1.0, injuryRisk: 0.05, fatigue: 15 },
  high: { effectiveness: 1.3, injuryRisk: 0.12, fatigue: 30 },
  extreme: { effectiveness: 1.6, injuryRisk: 0.25, fatigue: 50 },
};
