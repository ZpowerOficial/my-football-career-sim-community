import { Tactic } from '../../types';

export interface MatchContext {
  oppositionQuality: number;
  oppositionTactic: Tactic;
  homeAdvantage: boolean;
  matchImportance: 'Friendly' | 'League' | 'Cup' | 'Continental' | 'Derby';
  weatherConditions: 'Perfect' | 'Rainy' | 'Windy' | 'Cold';
  matchMinute: number;
  fatigue: number;
  teamMomentum: number;
}

export interface PlayerCapabilityMatrix {
  goalkeeping: any;
  attacking: AttackingCapabilities;
  passing: PassingCapabilities;
  defensive: DefensiveCapabilities;
  physical: PhysicalCapabilities;
  mental: MentalCapabilities;
  technical: TechnicalCapabilities;
}

export interface AttackingCapabilities {
  finishingPower: number;
  positioningIQ: number;
  movementOffBall: number;
  composureInBox: number;
  weakFootAbility: number;
  headingThreat: number;
}

export interface PassingCapabilities {
  shortPassReliability: number;
  longPassAccuracy: number;
  visionCreativity: number;
  throughBallTiming: number;
  crossingQuality: number;
  passUnderPressure: number;
}

export interface DefensiveCapabilities {
  tacklingTiming: number;
  interceptionReading: number;
  aerialDominance: number;
  positioningDefense: number;
  aggressionControlled: number;
  recoverySpeed: number;
}

export interface PhysicalCapabilities {
  sprintSpeed: number;
  acceleration: number;
  stamina: number;
  strength: number;
  agility: number;
  balance: number;
  jumping: number;
}

export interface MentalCapabilities {
  confidence: number;
  composure: number;
  concentration: number;
  decisionMaking: number;
  workRate: number;
  bigGameMentality: number;
  leadership: number;
}

export interface TechnicalCapabilities {
  ballControl: number;
  dribbleControl: number;
  dribbleSpeed: number;
  firstTouch: number;
  weakFootProficiency: number;
}

// ==================== MATCH EVENT TYPES ====================

export interface FieldCoordinate {
  x: number;
  y: number;
}

export type MatchEventType = 
  | 'goal'
  | 'assist'
  | 'shot'
  | 'shot_on_target'
  | 'shot_off_target'
  | 'shot_blocked'
  | 'key_pass'
  | 'dribble'
  | 'cross'
  | 'tackle'
  | 'interception'
  | 'clearance'
  | 'aerial_duel'
  | 'foul'
  | 'foul_committed'
  | 'foul_received'
  | 'yellow_card'
  | 'red_card'
  | 'save'
  | 'possession'
  | 'pass'
  | 'pass_received'
  | 'touch'
  | 'run'
  | 'set_piece'
  | 'defensive_position'
  | 'pressing';

export type EventOutcome = 'success' | 'failure' | 'neutral';

export type ShotDetail = 'on_target' | 'off_target' | 'blocked' | 'goal' | 'assist';

export interface MatchEvent {
  type: MatchEventType;
  minute: number;
  position: FieldCoordinate;
  outcome: EventOutcome;
  xG?: number;
  assistedBy?: boolean;
  detail?: ShotDetail | string;
}

export interface PlayerMatchEventLog {
  events: MatchEvent[];
  heatmapData?: number[][];
  matchMinutes?: number;
  positionPlayed?: string;
  matchId?: string;
  totalTouches?: number;
  totalPasses?: number;
  totalShots?: number;
  totalDefensiveActions?: number;
}
