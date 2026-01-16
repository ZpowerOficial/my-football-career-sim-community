/**
 * EVENT DEFINITIONS DATABASE - v0.5.6
 * 
 * Data-Driven Event Definitions.
 * Separado do serviço para seguir o Open/Closed Principle (SOLID).
 * Novos eventos podem ser adicionados aqui sem modificar a lógica do motor.
 */

import type {
  InteractiveEvent,
  InteractiveEventType,
  EventChoice,
} from '../types/interactiveEventTypes';

// ============================================================================
// TYPE FOR EVENT DEFINITION (without runtime fields)
// ============================================================================

export type EventDefinition = Omit<
  InteractiveEvent,
  'id' | 'seasonNumber' | 'weekNumber' | 'context' | 'isResolved' | 'chosenOptionId'
>;

// ============================================================================
// EVENT DEFINITIONS DATABASE
// ============================================================================

export const EVENT_DEFINITIONS: Partial<Record<InteractiveEventType, EventDefinition>> = {
  // ─────────────────────────────────────────────────────────────────────────
  // SCANDALS
  // ─────────────────────────────────────────────────────────────────────────
  
  party_scandal: {
    type: 'party_scandal',
    titleKey: 'events.party_scandal.title',
    descriptionKey: 'events.party_scandal.description',
    imageType: 'party',
    severity: 'moderate',
    deadline: 2,
    choices: [
      {
        id: 'apologize',
        labelKey: 'events.party_scandal.choice_apologize',
        consequences: [
          { type: 'reputation', value: -3 },
          { type: 'discipline', value: 5 },
          { type: 'morale', value: -1 },
        ],
      },
      {
        id: 'deny',
        labelKey: 'events.party_scandal.choice_deny',
        consequences: [
          { type: 'reputation', value: -5, probability: 0.7 },
          { type: 'reputation', value: 2, probability: 0.3 },
          { type: 'press', value: -10 },
        ],
      },
      {
        id: 'ignore',
        labelKey: 'events.party_scandal.choice_ignore',
        consequences: [
          { type: 'reputation', value: -2 },
          { type: 'exposure', value: -3 },
        ],
      },
    ],
  },
  
  social_media_outburst: {
    type: 'social_media_outburst',
    titleKey: 'events.outburst.title',
    descriptionKey: 'events.outburst.description',
    imageType: 'media',
    severity: 'minor',
    deadline: 1,
    choices: [
      {
        id: 'delete_apologize',
        labelKey: 'events.outburst.choice_delete',
        minDiscipline: 40,
        consequences: [
          { type: 'press', value: -5 },
          { type: 'discipline', value: 3 },
        ],
      },
      {
        id: 'double_down',
        labelKey: 'events.outburst.choice_double_down',
        preferredByHighExposure: true,
        consequences: [
          { type: 'followers', value: 50000 },
          { type: 'press', value: -15 },
          { type: 'fans', value: 5 },
          { type: 'reputation', value: -5 },
          { type: 'morale', value: 2 }, // Feels good to vent
        ],
      },
    ],
  },
  
  tax_investigation: {
    type: 'tax_investigation',
    titleKey: 'events.tax.title',
    descriptionKey: 'events.tax.description',
    imageType: 'business',
    severity: 'major',
    deadline: 4,
    choices: [
      {
        id: 'cooperate',
        labelKey: 'events.tax.choice_cooperate',
        consequences: [
          { type: 'money', value: -500000 },
          { type: 'reputation', value: -3 },
          { type: 'morale', value: -2 },
        ],
      },
      {
        id: 'fight',
        labelKey: 'events.tax.choice_fight',
        minCash: 1000000,
        consequences: [
          { type: 'money', value: -200000 },
          { type: 'reputation', value: -10, probability: 0.6 },
          { type: 'reputation', value: 5, probability: 0.4 },
          { type: 'morale', value: -3 },
        ],
      },
      {
        id: 'settle',
        labelKey: 'events.tax.choice_settle',
        consequences: [
          { type: 'money', value: -800000 },
          { type: 'reputation', value: 0 },
          { type: 'morale', value: -1 },
        ],
      },
    ],
  },
  
  nightclub_incident: {
    type: 'nightclub_incident',
    titleKey: 'events.nightclub.title',
    descriptionKey: 'events.nightclub.description',
    imageType: 'party',
    severity: 'major',
    deadline: 1,
    choices: [
      {
        id: 'apologize_publicly',
        labelKey: 'events.nightclub.choice_apologize',
        consequences: [
          { type: 'reputation', value: -8 },
          { type: 'fans', value: -5 },
          { type: 'discipline', value: 3 },
          { type: 'morale', value: -3 },
        ],
      },
      {
        id: 'blame_others',
        labelKey: 'events.nightclub.choice_blame',
        consequences: [
          { type: 'reputation', value: -12, probability: 0.7 },
          { type: 'reputation', value: -3, probability: 0.3 },
          { type: 'press', value: -15 },
        ],
      },
    ],
  },
  
  relationship_drama: {
    type: 'relationship_drama',
    titleKey: 'events.relationship.title',
    descriptionKey: 'events.relationship.description',
    imageType: 'media',
    severity: 'minor',
    deadline: 3,
    choices: [
      {
        id: 'stay_private',
        labelKey: 'events.relationship.choice_private',
        consequences: [
          { type: 'exposure', value: -5 },
          { type: 'morale', value: 1 },
        ],
      },
      {
        id: 'go_public',
        labelKey: 'events.relationship.choice_public',
        consequences: [
          { type: 'followers', value: 100000 },
          { type: 'exposure', value: 10 },
          { type: 'form', value: -1 }, // Distracted
        ],
      },
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // POSITIVE OPPORTUNITIES
  // ─────────────────────────────────────────────────────────────────────────
  
  charity_opportunity: {
    type: 'charity_opportunity',
    titleKey: 'events.charity.title',
    descriptionKey: 'events.charity.description',
    imageType: 'charity',
    severity: 'minor',
    deadline: 2,
    choices: [
      {
        id: 'donate_large',
        labelKey: 'events.charity.choice_large',
        minCash: 500000,
        consequences: [
          { type: 'money', value: -250000 },
          { type: 'reputation', value: 10 },
          { type: 'fans', value: 8 },
          { type: 'morale', value: 3 },
        ],
      },
      {
        id: 'donate_small',
        labelKey: 'events.charity.choice_small',
        consequences: [
          { type: 'money', value: -50000 },
          { type: 'reputation', value: 3 },
          { type: 'fans', value: 2 },
          { type: 'morale', value: 1 },
        ],
      },
      {
        id: 'decline',
        labelKey: 'events.charity.choice_decline',
        consequences: [
          { type: 'reputation', value: -1 },
        ],
      },
    ],
  },
  
  business_opportunity: {
    type: 'business_opportunity',
    titleKey: 'events.business.title',
    descriptionKey: 'events.business.description',
    imageType: 'business',
    severity: 'moderate',
    deadline: 3,
    choices: [
      {
        id: 'invest',
        labelKey: 'events.business.choice_invest',
        minCash: 1000000,
        consequences: [
          { type: 'money', value: -500000 },
          { type: 'money', value: 750000, delayed: true, delayWeeks: 52, probability: 0.6 },
          { type: 'money', value: -500000, delayed: true, delayWeeks: 52, probability: 0.4 },
          { type: 'morale', value: 2 },
        ],
      },
      {
        id: 'partner',
        labelKey: 'events.business.choice_partner',
        consequences: [
          { type: 'money', value: 50000, delayed: true, delayWeeks: 26 },
          { type: 'exposure', value: 5 },
        ],
      },
      {
        id: 'decline',
        labelKey: 'events.business.choice_decline',
        consequences: [],
      },
    ],
  },
  
  mentor_opportunity: {
    type: 'mentor_opportunity',
    titleKey: 'events.mentor.title',
    descriptionKey: 'events.mentor.description',
    imageType: 'charity',
    severity: 'minor',
    deadline: 2,
    choices: [
      {
        id: 'accept',
        labelKey: 'events.mentor.choice_accept',
        consequences: [
          { type: 'reputation', value: 5 },
          { type: 'fans', value: 3 },
          { type: 'discipline', value: 2 },
          { type: 'morale', value: 2 },
        ],
      },
      {
        id: 'decline',
        labelKey: 'events.mentor.choice_decline',
        consequences: [],
      },
    ],
  },
  
  fan_interaction: {
    type: 'fan_interaction',
    titleKey: 'events.fan.title',
    descriptionKey: 'events.fan.description',
    imageType: 'media',
    severity: 'minor',
    deadline: 1,
    choices: [
      {
        id: 'engage',
        labelKey: 'events.fan.choice_engage',
        consequences: [
          { type: 'fans', value: 5 },
          { type: 'followers', value: 10000 },
          { type: 'morale', value: 1 },
        ],
      },
      {
        id: 'ignore',
        labelKey: 'events.fan.choice_ignore',
        consequences: [
          { type: 'fans', value: -2 },
        ],
      },
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // CAREER/CONFLICT EVENTS
  // ─────────────────────────────────────────────────────────────────────────
  
  teammate_conflict: {
    type: 'teammate_conflict',
    titleKey: 'events.teammate.title',
    descriptionKey: 'events.teammate.description',
    imageType: 'conflict',
    severity: 'moderate',
    deadline: 2,
    choices: [
      {
        id: 'apologize',
        labelKey: 'events.teammate.choice_apologize',
        consequences: [
          { type: 'discipline', value: 3 },
          { type: 'morale', value: -1 },
        ],
      },
      {
        id: 'stand_ground',
        labelKey: 'events.teammate.choice_stand',
        consequences: [
          { type: 'reputation', value: 2, probability: 0.5 },
          { type: 'reputation', value: -3, probability: 0.5 },
          { type: 'morale', value: 1 },
        ],
      },
      {
        id: 'escalate',
        labelKey: 'events.teammate.choice_escalate',
        consequences: [
          { type: 'press', value: -10 },
          { type: 'fans', value: -5 },
          { type: 'morale', value: -2 },
        ],
      },
    ],
  },
  
  manager_fallout: {
    type: 'manager_fallout',
    titleKey: 'events.manager.title',
    descriptionKey: 'events.manager.description',
    imageType: 'conflict',
    severity: 'major',
    deadline: 1,
    choices: [
      {
        id: 'accept_criticism',
        labelKey: 'events.manager.choice_accept',
        consequences: [
          { type: 'discipline', value: 5 },
          { type: 'morale', value: -2 },
        ],
      },
      {
        id: 'defend_yourself',
        labelKey: 'events.manager.choice_defend',
        consequences: [
          { type: 'press', value: -5, probability: 0.6 },
          { type: 'reputation', value: 3, probability: 0.4 },
          { type: 'morale', value: 1 },
        ],
      },
      {
        id: 'request_transfer',
        labelKey: 'events.manager.choice_transfer',
        consequences: [
          { type: 'fans', value: -10 },
          { type: 'press', value: 5 },
          { type: 'morale', value: -3 },
        ],
      },
    ],
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // INTERVIEW EVENTS
  // ─────────────────────────────────────────────────────────────────────────
  
  interview_controversial: {
    type: 'interview_controversial',
    titleKey: 'events.interview.title',
    descriptionKey: 'events.interview.description',
    imageType: 'media',
    severity: 'moderate',
    deadline: 1,
    choices: [
      {
        id: 'diplomatic',
        labelKey: 'events.interview.choice_diplomatic',
        consequences: [
          { type: 'press', value: 3 },
          { type: 'discipline', value: 2 },
        ],
      },
      {
        id: 'honest',
        labelKey: 'events.interview.choice_honest',
        consequences: [
          { type: 'reputation', value: 5, probability: 0.4 },
          { type: 'reputation', value: -5, probability: 0.6 },
          { type: 'fans', value: 5 },
          { type: 'press', value: -5 },
        ],
      },
      {
        id: 'refuse',
        labelKey: 'events.interview.choice_refuse',
        consequences: [
          { type: 'press', value: -8 },
          { type: 'exposure', value: -3 },
        ],
      },
    ],
  },
  
  // ========== EARLY CAREER EVENTS ==========
  
  media_interview: {
    type: 'media_interview',
    titleKey: 'events.mediaInterview.title',
    descriptionKey: 'events.mediaInterview.description',
    imageType: 'media',
    severity: 'minor',
    deadline: 3,
    choices: [
      {
        id: 'confident',
        labelKey: 'events.mediaInterview.choice_confident',
        consequences: [
          { type: 'exposure', value: 5 },
          { type: 'fans', value: 3 },
        ],
      },
      {
        id: 'humble',
        labelKey: 'events.mediaInterview.choice_humble',
        consequences: [
          { type: 'press', value: 5 },
          { type: 'discipline', value: 2 },
        ],
      },
      {
        id: 'deflect',
        labelKey: 'events.mediaInterview.choice_deflect',
        consequences: [
          { type: 'press', value: -2 },
        ],
      },
    ],
  },
  
  fan_encounter: {
    type: 'fan_encounter',
    titleKey: 'events.fanEncounter.title',
    descriptionKey: 'events.fanEncounter.description',
    imageType: 'social',
    severity: 'minor',
    deadline: 5,
    choices: [
      {
        id: 'engage',
        labelKey: 'events.fanEncounter.choice_engage',
        consequences: [
          { type: 'fans', value: 8 },
        ],
      },
      {
        id: 'polite',
        labelKey: 'events.fanEncounter.choice_polite',
        consequences: [
          { type: 'fans', value: 3 },
        ],
      },
      {
        id: 'ignore',
        labelKey: 'events.fanEncounter.choice_ignore',
        consequences: [
          { type: 'fans', value: -5 },
        ],
      },
    ],
  },
  
  training_decision: {
    type: 'training_decision',
    titleKey: 'events.trainingDecision.title',
    descriptionKey: 'events.trainingDecision.description',
    imageType: 'training',
    severity: 'minor',
    deadline: 3,
    choices: [
      {
        id: 'extra_sessions',
        labelKey: 'events.trainingDecision.choice_extra',
        consequences: [
          { type: 'discipline', value: 5 },
        ],
      },
      {
        id: 'balanced',
        labelKey: 'events.trainingDecision.choice_balanced',
        consequences: [
          { type: 'morale', value: 1 },
        ],
      },
      {
        id: 'rest',
        labelKey: 'events.trainingDecision.choice_rest',
        consequences: [
          { type: 'discipline', value: -3 },
        ],
      },
    ],
  },
  
  agent_meeting: {
    type: 'agent_meeting',
    titleKey: 'events.agentMeeting.title',
    descriptionKey: 'events.agentMeeting.description',
    imageType: 'business',
    severity: 'minor',
    deadline: 5,
    choices: [
      {
        id: 'discuss_contract',
        labelKey: 'events.agentMeeting.choice_contract',
        consequences: [
          { type: 'ambition', value: 3 },
        ],
      },
      {
        id: 'focus_game',
        labelKey: 'events.agentMeeting.choice_focus',
        consequences: [
          { type: 'discipline', value: 3 },
          { type: 'loyalty', value: 2 },
        ],
      },
      {
        id: 'explore_options',
        labelKey: 'events.agentMeeting.choice_explore',
        consequences: [
          { type: 'ambition', value: 5 },
          { type: 'loyalty', value: -3 },
        ],
      },
    ],
  },
  
  teammate_interaction: {
    type: 'teammate_interaction',
    titleKey: 'events.teammateInteraction.title',
    descriptionKey: 'events.teammateInteraction.description',
    imageType: 'social',
    severity: 'minor',
    deadline: 3,
    choices: [
      {
        id: 'bond',
        labelKey: 'events.teammateInteraction.choice_bond',
        consequences: [
          { type: 'teamChemistry', value: 8 },
          { type: 'generosity', value: 2 },
        ],
      },
      {
        id: 'compete',
        labelKey: 'events.teammateInteraction.choice_compete',
        consequences: [
          { type: 'ambition', value: 3 },
          { type: 'teamChemistry', value: -3 },
        ],
      },
      {
        id: 'professional',
        labelKey: 'events.teammateInteraction.choice_professional',
        consequences: [
          { type: 'discipline', value: 2 },
        ],
      },
    ],
  },
  
  manager_conversation: {
    type: 'manager_conversation',
    titleKey: 'events.managerConversation.title',
    descriptionKey: 'events.managerConversation.description',
    imageType: 'business',
    severity: 'minor',
    deadline: 2,
    choices: [
      {
        id: 'ask_chances',
        labelKey: 'events.managerConversation.choice_chances',
        consequences: [
          { type: 'ambition', value: 3 },
        ],
      },
      {
        id: 'show_commitment',
        labelKey: 'events.managerConversation.choice_commitment',
        consequences: [
          { type: 'loyalty', value: 5 },
        ],
      },
      {
        id: 'accept_role',
        labelKey: 'events.managerConversation.choice_accept',
        consequences: [
          { type: 'discipline', value: 3 },
          { type: 'morale', value: -1 },
        ],
      },
    ],
  },
};

// ============================================================================
// HELPER TO GET EVENT DEFINITION
// ============================================================================

export const getEventDefinition = (type: InteractiveEventType): EventDefinition | undefined => {
  return EVENT_DEFINITIONS[type];
};

export default EVENT_DEFINITIONS;
