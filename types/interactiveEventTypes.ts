/**
 * INTERACTIVE EVENTS TYPES - v0.5.6
 * 
 * Sistema de eventos interativos com narrativa procedural.
 * Eventos não são aleatórios - são consequências probabilísticas do estado do jogador.
 * 
 * Conceitos-chave:
 * - Triggers: Condições que habilitam eventos
 * - Predicates: Funções que calculam probabilidade dinâmica
 * - Consequences: Efeitos cascata de escolhas
 * - Exposure/Discipline/Volatility: Escalas 0-100 (não enums binários)
 */

import type { Player } from '../types';

// ============================================================================
// PERSONALITY SCALES (0-100, not binary enums)
// ============================================================================

export interface PersonalityScales {
  /**
   * Exposure (Exposição): O quão público o jogador é.
   * 0 = Muito reservado, evita mídia
   * 100 = Ultraexposição, presente em tudo
   */
  exposure: number;
  
  /**
   * Discipline (Disciplina): O quão profissional ele é.
   * 0 = Indisciplinado, festas, polêmicas
   * 100 = Extremamente profissional
   */
  discipline: number;
  
  /**
   * Volatility (Volatilidade): Tendência a reações impulsivas.
   * 0 = Calmo, nunca reage
   * 100 = Explosivo, reage a tudo
   */
  volatility: number;
  
  /**
   * Ambition (Ambição): Desejo de sucesso e fama.
   * 0 = Satisfeito com pouco
   * 100 = Quer ser o maior de todos
   */
  ambition: number;
  
  /**
   * Generosity (Generosidade): Tendência a ajudar outros.
   * 0 = Egoísta
   * 100 = Altruísta extremo
   */
  generosity: number;
}

export const createInitialPersonalityScales = (personality: string): PersonalityScales => {
  // Base values influenced by existing personality trait
  const baseMap: Record<string, Partial<PersonalityScales>> = {
    'Professional': { discipline: 80, volatility: 20, exposure: 40 },
    'Ambitious': { ambition: 85, exposure: 60, discipline: 60 },
    'Lazy': { discipline: 30, ambition: 40, exposure: 30 },
    'Passionate': { volatility: 70, ambition: 70, exposure: 60 },
    'Leader': { discipline: 75, exposure: 55, volatility: 35 },
    'Introvert': { exposure: 25, volatility: 25, discipline: 60 },
    'Extrovert': { exposure: 75, volatility: 50, discipline: 50 },
    'Maverick': { volatility: 65, discipline: 40, exposure: 70 },
    'Loyal': { generosity: 70, discipline: 65, ambition: 50 },
    'Mercenary': { ambition: 80, generosity: 25, discipline: 55 },
  };
  
  const base = baseMap[personality] || {};
  
  return {
    exposure: base.exposure ?? 50,
    discipline: base.discipline ?? 50,
    volatility: base.volatility ?? 50,
    ambition: base.ambition ?? 50,
    generosity: base.generosity ?? 50,
  };
};

// ============================================================================
// EVENT TRIGGERS (Predicados para gatilhos)
// ============================================================================

export type EventContext = 
  | 'post_match_win'
  | 'post_match_loss'
  | 'post_match_draw'
  | 'transfer_window'
  | 'contract_negotiation'
  | 'award_ceremony'
  | 'training'
  | 'off_season'
  | 'media_event'
  | 'random';

export interface EventTrigger {
  // Minimum thresholds
  minCash?: number;
  maxCash?: number;
  minFame?: number;        // Popularity/followers
  minAge?: number;
  maxAge?: number;
  minOverall?: number;
  
  // Required contexts
  requiredContext?: EventContext[];
  
  // Personality requirements
  minExposure?: number;
  maxDiscipline?: number;  // For scandals
  minVolatility?: number;  // For outbursts
  
  // State requirements
  requiresProperty?: boolean;
  requiresVehicle?: boolean;
  requiresBadForm?: boolean;   // Form < 0
  requiresGoodForm?: boolean;  // Form > 2
  requiresInjury?: boolean;
  
  // Probability curve function (receives player, returns 0-1)
  probabilityCurve: (player: Player, scales: PersonalityScales) => number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type InteractiveEventType = 
  // Media/Social
  | 'interview_controversial'
  | 'interview_charity'
  | 'social_media_outburst'
  | 'social_media_viral'
  | 'paparazzi_encounter'
  | 'media_interview'
  
  // Scandals
  | 'party_scandal'
  | 'tax_investigation'
  | 'relationship_drama'
  | 'speeding_fine'
  | 'nightclub_incident'
  
  // Positive
  | 'charity_opportunity'
  | 'fan_interaction'
  | 'mentor_opportunity'
  | 'business_opportunity'
  | 'fan_encounter'
  
  // Career
  | 'agent_pressure'
  | 'teammate_conflict'
  | 'manager_fallout'
  | 'contract_dispute'
  | 'training_decision'
  | 'agent_meeting'
  | 'teammate_interaction'
  | 'manager_conversation';

export type ConsequenceType = 
  | 'reputation'
  | 'fans'
  | 'press'
  | 'money'
  | 'morale'
  | 'form'
  | 'discipline'      // Affects personality scale
  | 'exposure'        // Affects personality scale
  | 'followers'
  | 'sponsor_loss'
  | 'suspension'
  | 'ambition'        // Affects career ambitions
  | 'loyalty'         // Affects club loyalty
  | 'teamChemistry'   // Affects team chemistry
  | 'generosity';     // Affects generosity personality trait

export interface EventConsequence {
  type: ConsequenceType;
  value: number;          // Positive or negative
  delayed?: boolean;      // Effect appears later (next week/season)
  delayWeeks?: number;
  probability?: number;   // 0-1, for uncertain outcomes
  description?: string;   // For UI feedback
}

export interface EventChoice {
  id: string;
  labelKey: string;       // Translation key
  descriptionKey?: string;
  consequences: EventConsequence[];
  
  // Requirements to show this choice
  minDiscipline?: number;
  minCash?: number;
  
  // Personality influence on choice
  preferredByHighDiscipline?: boolean;
  preferredByHighExposure?: boolean;
}

export interface InteractiveEvent {
  id: string;
  type: InteractiveEventType;
  
  // Display
  titleKey: string;
  descriptionKey: string;
  imageType?: 'media' | 'party' | 'charity' | 'conflict' | 'business' | 'social' | 'training';
  
  // Choices
  choices: EventChoice[];
  
  // Timing
  deadline?: number;      // Weeks to decide (null = no deadline)
  seasonNumber: number;
  weekNumber: number;
  
  // Context
  context: EventContext;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  
  // Tracking
  isResolved: boolean;
  chosenOptionId?: string;
}

// ============================================================================
// PROCESSED EVENT (After choice is made)
// ============================================================================

export interface ProcessedEvent {
  eventId: string;
  eventType: InteractiveEventType;
  choiceId: string;
  seasonNumber: number;
  weekNumber: number;
  consequences: EventConsequence[];
  narrativeKey: string;   // For news/headlines
}

// ============================================================================
// EVENT STATE (Stored on Player)
// ============================================================================

export interface InteractiveEventState {
  personalityScales: PersonalityScales;
  activeEvents: InteractiveEvent[];
  eventHistory: ProcessedEvent[];
  
  // Cooldowns to prevent event spam
  lastEventWeek: Record<InteractiveEventType, number>;
  
  // Scandal tracking
  scandalCount: number;
  lastScandalSeason: number;
  
  // Reputation modifiers from events
  permanentReputationMod: number;
  temporaryMods: Array<{
    type: ConsequenceType;
    value: number;
    expiresWeek: number;
    expiresSeason: number;
  }>;
}

export const createInitialEventState = (personality: string): InteractiveEventState => ({
  personalityScales: createInitialPersonalityScales(personality),
  activeEvents: [],
  eventHistory: [],
  lastEventWeek: {} as Record<InteractiveEventType, number>,
  scandalCount: 0,
  lastScandalSeason: -1,
  permanentReputationMod: 0,
  temporaryMods: [],
});

// ============================================================================
// RE-EXPORT TRIGGERS FROM CONFIG
// ============================================================================

// Triggers have been moved to config/eventTriggers.ts for SOLID compliance
// Re-export for backward compatibility
export { SCANDAL_TRIGGERS, POSITIVE_TRIGGERS, ALL_EVENT_TRIGGERS, EARLY_CAREER_TRIGGERS } from '../config/eventTriggers';

