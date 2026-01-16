/**
 * INTERACTIVE EVENT SERVICE - v0.5.6
 * 
 * Motor de Narrativa Procedural.
 * Eventos são consequências probabilísticas do estado do jogador,
 * não eventos aleatórios isolados.
 * 
 * Conceitos-chave:
 * - Triggers verificam elegibilidade
 * - Probability Curves calculam chance dinâmica
 * - Consequences criam efeitos cascata
 * - Personality Scales evoluem com escolhas
 */

import { Player, Morale } from '../types';
import { rand, clamp, gaussianRandom, updateMorale, MORALE_LEVELS } from './utils';
import {
  InteractiveEvent,
  InteractiveEventType,
  InteractiveEventState,
  EventContext,
  EventChoice,
  EventConsequence,
  ProcessedEvent,
  PersonalityScales,
  EventTrigger,
  SCANDAL_TRIGGERS,
  POSITIVE_TRIGGERS,
  EARLY_CAREER_TRIGGERS,
  createInitialEventState,
} from '../types/interactiveEventTypes';
import { EVENT_DEFINITIONS, getEventDefinition } from '../data/eventsDatabase';
import { processEventConsequences } from './eventConsequenceSystem';

// ============================================================================
// EVENT GENERATION
// ============================================================================

/**
 * Ensures player has event state initialized.
 * Uses proper type-safe access (no `as any`).
 */
export const ensureEventState = (player: Player): InteractiveEventState => {
  if (player.eventState) {
    return player.eventState;
  }
  return createInitialEventState(player.personality);
};

/**
 * Checks if a trigger's requirements are met.
 */
const checkTriggerRequirements = (
  trigger: EventTrigger,
  player: Player,
  scales: PersonalityScales,
  context: EventContext
): boolean => {
  // Context check
  if (trigger.requiredContext && !trigger.requiredContext.includes(context)) {
    return false;
  }
  
  // Cash checks
  if (trigger.minCash !== undefined && (player.cash || 0) < trigger.minCash) {
    return false;
  }
  if (trigger.maxCash !== undefined && (player.cash || 0) > trigger.maxCash) {
    return false;
  }
  
  // Fame check
  if (trigger.minFame !== undefined && player.socialMediaFollowers < trigger.minFame) {
    return false;
  }
  
  // Age checks
  if (trigger.minAge !== undefined && player.age < trigger.minAge) {
    return false;
  }
  if (trigger.maxAge !== undefined && player.age > trigger.maxAge) {
    return false;
  }
  
  // Overall check
  if (trigger.minOverall !== undefined && player.stats.overall < trigger.minOverall) {
    return false;
  }
  
  // Personality scale checks
  if (trigger.minExposure !== undefined && scales.exposure < trigger.minExposure) {
    return false;
  }
  if (trigger.maxDiscipline !== undefined && scales.discipline > trigger.maxDiscipline) {
    return false;
  }
  if (trigger.minVolatility !== undefined && scales.volatility < trigger.minVolatility) {
    return false;
  }
  
  // State checks
  if (trigger.requiresBadForm && player.form >= 0) {
    return false;
  }
  if (trigger.requiresGoodForm && player.form < 2) {
    return false;
  }
  if (trigger.requiresInjury && !player.injury) {
    return false;
  }
  
  return true;
};

/**
 * Generates random events based on player state and context.
 * This is the CORE procedural narrative function.
 */
export const generateRandomEvents = (
  player: Player,
  context: EventContext,
  seasonNumber: number,
  weekNumber: number
): InteractiveEvent[] => {
  const eventState = ensureEventState(player);
  const scales = eventState.personalityScales;
  const events: InteractiveEvent[] = [];
  
  // Combine all triggers (including early career events)
  const allTriggers = {
    ...SCANDAL_TRIGGERS,
    ...POSITIVE_TRIGGERS,
    ...EARLY_CAREER_TRIGGERS,
  };
  
  // Check each potential event
  for (const [eventType, trigger] of Object.entries(allTriggers)) {
    // Check cooldown (min 4 weeks between same event types)
    const lastWeek = eventState.lastEventWeek[eventType as InteractiveEventType] || -999;
    const weeksSinceLastEvent = (seasonNumber * 52 + weekNumber) - lastWeek;
    if (weeksSinceLastEvent < 4) continue;
    
    // Check requirements
    if (!checkTriggerRequirements(trigger, player, scales, context)) {
      continue;
    }
    
    // Calculate probability
    const probability = trigger.probabilityCurve(player, scales);
    
    // Roll dice
    if (Math.random() < probability) {
      const event = createEventFromType(
        eventType as InteractiveEventType,
        context,
        seasonNumber,
        weekNumber
      );
      if (event) {
        events.push(event);
      }
    }
  }
  
  // Limit to max 1 event per week to avoid overwhelm
  return events.slice(0, 1);
};

// ============================================================================
// EVENT CREATION (Now uses external database)
// ============================================================================

/**
 * Creates a fully-formed event from a type.
 * Uses EVENT_DEFINITIONS from external database (Open/Closed Principle).
 */
const createEventFromType = (
  type: InteractiveEventType,
  context: EventContext,
  seasonNumber: number,
  weekNumber: number
): InteractiveEvent | null => {
  const eventId = `${type}-${seasonNumber}-${weekNumber}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Get definition from external database
  const def = getEventDefinition(type);
  if (!def) return null;
  
  return {
    id: eventId,
    ...def,
    seasonNumber,
    weekNumber,
    context,
    isResolved: false,
  };
};

// ============================================================================
// EVENT PROCESSING
// ============================================================================

export interface EventProcessingResult {
  updatedPlayer: Player;
  updatedEventState: InteractiveEventState;
  processedEvent: ProcessedEvent;
  immediateEffects: string[];
  delayedEffects: EventConsequence[];
}

/**
 * Processes the player's choice for an event.
 */
export const processEventChoice = (
  player: Player,
  eventId: string,
  choiceId: string
): EventProcessingResult | null => {
  const eventState = ensureEventState(player);
  const event = eventState.activeEvents.find(e => e.id === eventId);
  
  if (!event || event.isResolved) {
    return null;
  }
  
  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) {
    return null;
  }
  
  // Apply consequences
  let updatedPlayer = { ...player };
  const scales = { ...eventState.personalityScales };
  const immediateEffects: string[] = [];
  const delayedEffects: EventConsequence[] = [];
  
  for (const consequence of choice.consequences) {
    // Check probability for uncertain outcomes
    if (consequence.probability !== undefined && Math.random() > consequence.probability) {
      continue;
    }
    
    // Handle delayed effects
    if (consequence.delayed) {
      delayedEffects.push(consequence);
      continue;
    }
    
    // Apply immediate effects
    applyConsequence(updatedPlayer, scales, consequence, immediateEffects);
  }
  
  // Update personality scales on player
  eventState.personalityScales = scales;
  
  // Mark event as resolved
  const updatedActiveEvents = eventState.activeEvents.map(e =>
    e.id === eventId ? { ...e, isResolved: true, chosenOptionId: choiceId } : e
  );
  
  // Create processed event for history
  const processedEvent: ProcessedEvent = {
    eventId,
    eventType: event.type,
    choiceId,
    seasonNumber: event.seasonNumber,
    weekNumber: event.weekNumber,
    consequences: choice.consequences,
    narrativeKey: `events.${event.type}.narrative_${choiceId}`,
  };
  
  // Update event state
  const updatedEventState: InteractiveEventState = {
    ...eventState,
    personalityScales: scales,
    activeEvents: updatedActiveEvents.filter(e => !e.isResolved),
    eventHistory: [...eventState.eventHistory, processedEvent],
    lastEventWeek: {
      ...eventState.lastEventWeek,
      [event.type]: event.seasonNumber * 52 + event.weekNumber,
    },
  };
  
  // Update scandal count if applicable
  if (['party_scandal', 'tax_investigation', 'social_media_outburst', 'nightclub_incident'].includes(event.type)) {
    updatedEventState.scandalCount++;
    updatedEventState.lastScandalSeason = event.seasonNumber;
  }
  
  // Process extended consequences (headlines, fan posts, flags)
  const { updatedPlayer: playerWithConsequences, reactions } = processEventConsequences(
    updatedPlayer,
    event.type,
    choiceId,
    event.seasonNumber
  );
  
  // Use player with all consequences applied
  updatedPlayer = playerWithConsequences;
  
  // Add headline descriptions to immediate effects for display
  if (reactions.headlines.length > 0) {
    immediateEffects.push(`📰 ${reactions.headlines.length} headline(s) generated`);
  }
  if (reactions.fanPostKeys.length > 0) {
    immediateEffects.push(`💬 Fan reactions incoming`);
  }
  
  return {
    updatedPlayer,
    updatedEventState,
    processedEvent,
    immediateEffects,
    delayedEffects,
  };
};

/**
 * Applies a single consequence to the player.
 * BUG FIX: Now properly updates morale using updateMorale utility.
 */
const applyConsequence = (
  player: Player,
  scales: PersonalityScales,
  consequence: EventConsequence,
  effects: string[]
): void => {
  const { type, value } = consequence;
  
  switch (type) {
    case 'reputation':
      player.reputation = clamp(player.reputation + value, 0, 100);
      effects.push(`Reputation ${value >= 0 ? '+' : ''}${value}`);
      break;
      
    case 'fans':
      if (player.socialData?.relationships) {
        player.socialData.relationships.fansSentiment = clamp(
          player.socialData.relationships.fansSentiment + value, 0, 100
        );
      }
      effects.push(`Fan relationship ${value >= 0 ? '+' : ''}${value}`);
      break;
      
    case 'press':
      if (player.socialData?.relationships) {
        player.socialData.relationships.pressSentiment = clamp(
          player.socialData.relationships.pressSentiment + value, 0, 100
        );
      }
      effects.push(`Press relationship ${value >= 0 ? '+' : ''}${value}`);
      break;
      
    case 'money':
      player.cash = Math.max(0, (player.cash || 0) + value);
      effects.push(`Money ${value >= 0 ? '+' : ''}€${Math.abs(value).toLocaleString()}`);
      break;
      
    case 'morale':
      // BUG FIX: Actually update morale using the existing utility function
      const direction: 'up' | 'down' = value >= 0 ? 'up' : 'down';
      const steps = Math.abs(value);
      // Apply morale change step by step
      for (let i = 0; i < steps; i++) {
        player.morale = updateMorale(player.morale, direction);
      }
      effects.push(`Morale ${value >= 0 ? '+' : ''}${value}`);
      break;
      
    case 'form':
      player.form = clamp(player.form + value, -5, 5);
      effects.push(`Form ${value >= 0 ? '+' : ''}${value}`);
      break;
      
    case 'discipline':
      scales.discipline = clamp(scales.discipline + value, 0, 100);
      effects.push(`Discipline ${value >= 0 ? '+' : ''}${value}`);
      break;
      
    case 'exposure':
      scales.exposure = clamp(scales.exposure + value, 0, 100);
      effects.push(`Exposure ${value >= 0 ? '+' : ''}${value}`);
      break;
      
    case 'followers':
      player.socialMediaFollowers = Math.max(0, player.socialMediaFollowers + value);
      effects.push(`Followers ${value >= 0 ? '+' : ''}${value.toLocaleString()}`);
      break;
      
    case 'sponsor_loss':
      // Handle sponsor loss in future iteration
      effects.push(`Sponsor contract terminated`);
      break;
      
    case 'suspension':
      // Handle suspension in future iteration
      effects.push(`Suspended for ${Math.abs(value)} matches`);
      break;
  }
};

// ============================================================================
// GET ACTIVE EVENTS
// ============================================================================

/**
 * Returns all pending events that need player decision.
 */
export const getActiveEvents = (player: Player): InteractiveEvent[] => {
  const eventState = ensureEventState(player);
  return eventState.activeEvents.filter(e => !e.isResolved);
};

/**
 * Checks if player has any urgent events (deadline soon).
 */
export const hasUrgentEvents = (player: Player, currentWeek: number): boolean => {
  const events = getActiveEvents(player);
  return events.some(e => {
    if (!e.deadline) return false;
    const weeksRemaining = e.weekNumber + e.deadline - currentWeek;
    return weeksRemaining <= 1;
  });
};

/**
 * Adds a generated event to the player's active events.
 */
export const addEventToPlayer = (player: Player, event: InteractiveEvent): Player => {
  const eventState = ensureEventState(player);
  return {
    ...player,
    eventState: {
      ...eventState,
      activeEvents: [...eventState.activeEvents, event],
    },
  };
};

// ============================================================================
// EXPORT
// ============================================================================

export const InteractiveEventService = {
  ensureEventState,
  generateRandomEvents,
  processEventChoice,
  getActiveEvents,
  hasUrgentEvents,
  addEventToPlayer,
};

export default InteractiveEventService;
