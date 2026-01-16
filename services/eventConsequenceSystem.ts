/**
 * EVENT CONSEQUENCE SYSTEM - v1.0.0
 * 
 * Sistema expandido de consequências de eventos interativos.
 * Gera notícias, posts de rede social, manchetes e indicadores visuais
 * baseados nas escolhas do jogador nos eventos interativos.
 * 
 * Features:
 * - Gera posts de fãs na rede social
 * - Cria manchetes de imprensa
 * - Adiciona indicadores de status (querendo transferência, treino extra, etc)
 * - Integra com sistema de notícias existente
 */

import type { Player } from '../types';
import type { 
  InteractiveEventType, 
  EventConsequence,
  ProcessedEvent 
} from '../types/interactiveEventTypes';
import type { 
  Headline, 
  HeadlineType,
  PlayerSocialData 
} from '../types/socialTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface EventReaction {
  type: 'fan_post' | 'headline' | 'interview_quote' | 'social_post';
  sentiment: 'positive' | 'negative' | 'neutral' | 'controversial';
  titleKey: string;
  descriptionKey?: string;
  params?: Record<string, string | number>;
}

export interface PlayerEventFlags {
  // Transfer related
  wantsTransfer: boolean;
  transferRequestSeason?: number;
  transferRequestReason?: string;
  
  // Training related
  extraTrainingActive: boolean;
  trainingIntensity: 'normal' | 'light' | 'intense';
  
  // Media related
  mediaAvoidance: boolean;
  controversialStatements: number;
  
  // Fan related
  recentFanInteraction?: 'positive' | 'negative' | 'ignored';
  fanInteractionSeason?: number;
  
  // Club related
  conflictWithManager: boolean;
  conflictWithTeammate: boolean;
  
  // Personality/behavior
  partyReputation: boolean;
  charityActive: boolean;
  businessInvestments: number;
}

export const DEFAULT_EVENT_FLAGS: PlayerEventFlags = {
  wantsTransfer: false,
  extraTrainingActive: false,
  trainingIntensity: 'normal',
  mediaAvoidance: false,
  controversialStatements: 0,
  conflictWithManager: false,
  conflictWithTeammate: false,
  partyReputation: false,
  charityActive: false,
  businessInvestments: 0,
};

// ============================================================================
// REACTION TEMPLATES BY EVENT TYPE AND CHOICE
// ============================================================================

interface ReactionTemplate {
  headlines: Array<{ key: string; type: HeadlineType }>;
  fanPosts: Array<{ key: string; sentiment: 'positive' | 'negative' | 'neutral' }>;
  flags?: Partial<PlayerEventFlags>;
}

const REACTION_TEMPLATES: Record<string, Record<string, ReactionTemplate>> = {
  // Party Scandal
  party_scandal: {
    apologize: {
      headlines: [
        { key: 'events.reactions.party_scandal.apologize.headline1', type: 'neutral' },
        { key: 'events.reactions.party_scandal.apologize.headline2', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.party_scandal.apologize.fan1', sentiment: 'positive' },
        { key: 'events.reactions.party_scandal.apologize.fan2', sentiment: 'neutral' },
      ],
      flags: { partyReputation: false },
    },
    deny: {
      headlines: [
        { key: 'events.reactions.party_scandal.deny.headline1', type: 'controversy' },
        { key: 'events.reactions.party_scandal.deny.headline2', type: 'negative' },
      ],
      fanPosts: [
        { key: 'events.reactions.party_scandal.deny.fan1', sentiment: 'negative' },
        { key: 'events.reactions.party_scandal.deny.fan2', sentiment: 'neutral' },
      ],
      flags: { partyReputation: true },
    },
    ignore: {
      headlines: [
        { key: 'events.reactions.party_scandal.ignore.headline1', type: 'neutral' },
      ],
      fanPosts: [
        { key: 'events.reactions.party_scandal.ignore.fan1', sentiment: 'neutral' },
      ],
      flags: { partyReputation: true },
    },
  },

  // Fan Encounter
  fan_encounter: {
    engage: {
      headlines: [
        { key: 'events.reactions.fan_encounter.engage.headline1', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.fan_encounter.engage.fan1', sentiment: 'positive' },
        { key: 'events.reactions.fan_encounter.engage.fan2', sentiment: 'positive' },
        { key: 'events.reactions.fan_encounter.engage.fan3', sentiment: 'positive' },
      ],
      flags: { recentFanInteraction: 'positive' },
    },
    polite: {
      headlines: [],
      fanPosts: [
        { key: 'events.reactions.fan_encounter.polite.fan1', sentiment: 'positive' },
      ],
      flags: { recentFanInteraction: 'positive' },
    },
    ignore: {
      headlines: [
        { key: 'events.reactions.fan_encounter.ignore.headline1', type: 'negative' },
      ],
      fanPosts: [
        { key: 'events.reactions.fan_encounter.ignore.fan1', sentiment: 'negative' },
        { key: 'events.reactions.fan_encounter.ignore.fan2', sentiment: 'negative' },
      ],
      flags: { recentFanInteraction: 'negative' },
    },
  },

  // Fan Interaction (similar to fan_encounter)
  fan_interaction: {
    engage: {
      headlines: [
        { key: 'events.reactions.fan_interaction.engage.headline1', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.fan_interaction.engage.fan1', sentiment: 'positive' },
        { key: 'events.reactions.fan_interaction.engage.fan2', sentiment: 'positive' },
      ],
      flags: { recentFanInteraction: 'positive' },
    },
    ignore: {
      headlines: [],
      fanPosts: [
        { key: 'events.reactions.fan_interaction.ignore.fan1', sentiment: 'negative' },
      ],
      flags: { recentFanInteraction: 'negative' },
    },
  },

  // Training Decision
  training_decision: {
    extra_sessions: {
      headlines: [
        { key: 'events.reactions.training_decision.extra.headline1', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.training_decision.extra.fan1', sentiment: 'positive' },
      ],
      flags: { extraTrainingActive: true, trainingIntensity: 'intense' },
    },
    balanced: {
      headlines: [],
      fanPosts: [],
      flags: { trainingIntensity: 'normal' },
    },
    rest: {
      headlines: [],
      fanPosts: [
        { key: 'events.reactions.training_decision.rest.fan1', sentiment: 'neutral' },
      ],
      flags: { trainingIntensity: 'light' },
    },
  },

  // Agent Meeting
  agent_meeting: {
    discuss_contract: {
      headlines: [
        { key: 'events.reactions.agent_meeting.contract.headline1', type: 'neutral' },
      ],
      fanPosts: [],
    },
    focus_game: {
      headlines: [],
      fanPosts: [
        { key: 'events.reactions.agent_meeting.focus.fan1', sentiment: 'positive' },
      ],
    },
    explore_options: {
      headlines: [
        { key: 'events.reactions.agent_meeting.explore.headline1', type: 'controversy' },
        { key: 'events.reactions.agent_meeting.explore.headline2', type: 'neutral' },
      ],
      fanPosts: [
        { key: 'events.reactions.agent_meeting.explore.fan1', sentiment: 'negative' },
        { key: 'events.reactions.agent_meeting.explore.fan2', sentiment: 'neutral' },
      ],
      flags: { wantsTransfer: true },
    },
  },

  // Manager Conversation
  manager_conversation: {
    ask_chances: {
      headlines: [
        { key: 'events.reactions.manager_conversation.chances.headline1', type: 'neutral' },
      ],
      fanPosts: [],
    },
    show_commitment: {
      headlines: [
        { key: 'events.reactions.manager_conversation.commitment.headline1', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.manager_conversation.commitment.fan1', sentiment: 'positive' },
      ],
    },
    accept_role: {
      headlines: [],
      fanPosts: [],
    },
  },

  // Manager Fallout
  manager_fallout: {
    accept_criticism: {
      headlines: [
        { key: 'events.reactions.manager_fallout.accept.headline1', type: 'neutral' },
      ],
      fanPosts: [
        { key: 'events.reactions.manager_fallout.accept.fan1', sentiment: 'positive' },
      ],
      flags: { conflictWithManager: false },
    },
    defend_yourself: {
      headlines: [
        { key: 'events.reactions.manager_fallout.defend.headline1', type: 'controversy' },
      ],
      fanPosts: [
        { key: 'events.reactions.manager_fallout.defend.fan1', sentiment: 'neutral' },
      ],
      flags: { conflictWithManager: true },
    },
    request_transfer: {
      headlines: [
        { key: 'events.reactions.manager_fallout.transfer.headline1', type: 'controversy' },
        { key: 'events.reactions.manager_fallout.transfer.headline2', type: 'negative' },
      ],
      fanPosts: [
        { key: 'events.reactions.manager_fallout.transfer.fan1', sentiment: 'negative' },
        { key: 'events.reactions.manager_fallout.transfer.fan2', sentiment: 'negative' },
      ],
      flags: { wantsTransfer: true, conflictWithManager: true },
    },
  },

  // Teammate Conflict
  teammate_conflict: {
    apologize: {
      headlines: [],
      fanPosts: [
        { key: 'events.reactions.teammate_conflict.apologize.fan1', sentiment: 'positive' },
      ],
      flags: { conflictWithTeammate: false },
    },
    stand_ground: {
      headlines: [
        { key: 'events.reactions.teammate_conflict.stand.headline1', type: 'neutral' },
      ],
      fanPosts: [
        { key: 'events.reactions.teammate_conflict.stand.fan1', sentiment: 'neutral' },
      ],
      flags: { conflictWithTeammate: true },
    },
    escalate: {
      headlines: [
        { key: 'events.reactions.teammate_conflict.escalate.headline1', type: 'controversy' },
        { key: 'events.reactions.teammate_conflict.escalate.headline2', type: 'negative' },
      ],
      fanPosts: [
        { key: 'events.reactions.teammate_conflict.escalate.fan1', sentiment: 'negative' },
      ],
      flags: { conflictWithTeammate: true },
    },
  },

  // Teammate Interaction
  teammate_interaction: {
    bond: {
      headlines: [],
      fanPosts: [
        { key: 'events.reactions.teammate_interaction.bond.fan1', sentiment: 'positive' },
      ],
    },
    compete: {
      headlines: [],
      fanPosts: [],
    },
    professional: {
      headlines: [],
      fanPosts: [],
    },
  },

  // Charity Opportunity
  charity_opportunity: {
    donate_large: {
      headlines: [
        { key: 'events.reactions.charity.large.headline1', type: 'positive' },
        { key: 'events.reactions.charity.large.headline2', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.charity.large.fan1', sentiment: 'positive' },
        { key: 'events.reactions.charity.large.fan2', sentiment: 'positive' },
      ],
      flags: { charityActive: true },
    },
    donate_small: {
      headlines: [
        { key: 'events.reactions.charity.small.headline1', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.charity.small.fan1', sentiment: 'positive' },
      ],
      flags: { charityActive: true },
    },
    decline: {
      headlines: [],
      fanPosts: [],
      flags: { charityActive: false },
    },
  },

  // Business Opportunity
  business_opportunity: {
    invest: {
      headlines: [
        { key: 'events.reactions.business.invest.headline1', type: 'neutral' },
      ],
      fanPosts: [],
      flags: { businessInvestments: 1 },
    },
    partner: {
      headlines: [],
      fanPosts: [],
    },
    decline: {
      headlines: [],
      fanPosts: [],
    },
  },

  // Interview Controversial
  interview_controversial: {
    diplomatic: {
      headlines: [
        { key: 'events.reactions.interview.diplomatic.headline1', type: 'neutral' },
      ],
      fanPosts: [],
    },
    honest: {
      headlines: [
        { key: 'events.reactions.interview.honest.headline1', type: 'controversy' },
        { key: 'events.reactions.interview.honest.headline2', type: 'viral' },
      ],
      fanPosts: [
        { key: 'events.reactions.interview.honest.fan1', sentiment: 'positive' },
        { key: 'events.reactions.interview.honest.fan2', sentiment: 'negative' },
      ],
      flags: { controversialStatements: 1 },
    },
    refuse: {
      headlines: [
        { key: 'events.reactions.interview.refuse.headline1', type: 'negative' },
      ],
      fanPosts: [],
      flags: { mediaAvoidance: true },
    },
  },

  // Media Interview
  media_interview: {
    confident: {
      headlines: [
        { key: 'events.reactions.media_interview.confident.headline1', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.media_interview.confident.fan1', sentiment: 'positive' },
      ],
    },
    humble: {
      headlines: [
        { key: 'events.reactions.media_interview.humble.headline1', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.media_interview.humble.fan1', sentiment: 'positive' },
      ],
    },
    deflect: {
      headlines: [],
      fanPosts: [],
    },
  },

  // Social Media Outburst
  social_media_outburst: {
    delete_apologize: {
      headlines: [
        { key: 'events.reactions.outburst.delete.headline1', type: 'neutral' },
      ],
      fanPosts: [
        { key: 'events.reactions.outburst.delete.fan1', sentiment: 'positive' },
      ],
    },
    double_down: {
      headlines: [
        { key: 'events.reactions.outburst.double_down.headline1', type: 'controversy' },
        { key: 'events.reactions.outburst.double_down.headline2', type: 'viral' },
      ],
      fanPosts: [
        { key: 'events.reactions.outburst.double_down.fan1', sentiment: 'positive' },
        { key: 'events.reactions.outburst.double_down.fan2', sentiment: 'negative' },
      ],
      flags: { controversialStatements: 1 },
    },
  },

  // Tax Investigation
  tax_investigation: {
    cooperate: {
      headlines: [
        { key: 'events.reactions.tax.cooperate.headline1', type: 'neutral' },
      ],
      fanPosts: [],
    },
    fight: {
      headlines: [
        { key: 'events.reactions.tax.fight.headline1', type: 'controversy' },
      ],
      fanPosts: [
        { key: 'events.reactions.tax.fight.fan1', sentiment: 'negative' },
      ],
    },
    settle: {
      headlines: [
        { key: 'events.reactions.tax.settle.headline1', type: 'neutral' },
      ],
      fanPosts: [],
    },
  },

  // Nightclub Incident
  nightclub_incident: {
    apologize_publicly: {
      headlines: [
        { key: 'events.reactions.nightclub.apologize.headline1', type: 'neutral' },
      ],
      fanPosts: [
        { key: 'events.reactions.nightclub.apologize.fan1', sentiment: 'neutral' },
      ],
      flags: { partyReputation: true },
    },
    blame_others: {
      headlines: [
        { key: 'events.reactions.nightclub.blame.headline1', type: 'negative' },
        { key: 'events.reactions.nightclub.blame.headline2', type: 'controversy' },
      ],
      fanPosts: [
        { key: 'events.reactions.nightclub.blame.fan1', sentiment: 'negative' },
      ],
      flags: { partyReputation: true },
    },
  },

  // Relationship Drama
  relationship_drama: {
    stay_private: {
      headlines: [],
      fanPosts: [
        { key: 'events.reactions.relationship.private.fan1', sentiment: 'positive' },
      ],
    },
    go_public: {
      headlines: [
        { key: 'events.reactions.relationship.public.headline1', type: 'viral' },
      ],
      fanPosts: [
        { key: 'events.reactions.relationship.public.fan1', sentiment: 'positive' },
        { key: 'events.reactions.relationship.public.fan2', sentiment: 'neutral' },
      ],
    },
  },

  // Mentor Opportunity
  mentor_opportunity: {
    accept: {
      headlines: [
        { key: 'events.reactions.mentor.accept.headline1', type: 'positive' },
      ],
      fanPosts: [
        { key: 'events.reactions.mentor.accept.fan1', sentiment: 'positive' },
      ],
    },
    decline: {
      headlines: [],
      fanPosts: [],
    },
  },
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate reactions (headlines and fan posts) based on event choice
 */
export const generateEventReactions = (
  player: Player,
  eventType: InteractiveEventType,
  choiceId: string,
  seasonNumber: number
): {
  headlines: Headline[];
  fanPostKeys: Array<{ key: string; sentiment: 'positive' | 'negative' | 'neutral' }>;
  flags: Partial<PlayerEventFlags>;
} => {
  const template = REACTION_TEMPLATES[eventType]?.[choiceId];
  
  if (!template) {
    return { headlines: [], fanPostKeys: [], flags: {} };
  }

  const headlines: Headline[] = template.headlines.map((h, index) => ({
    id: `${eventType}-${choiceId}-${seasonNumber}-${index}`,
    type: h.type,
    titleKey: h.key,
    titleParams: {
      name: player.name,
      firstName: player.name.split(' ')[0],
      team: player.team?.name || '',
    },
    timestamp: Date.now(),
    seasonNumber,
  }));

  return {
    headlines,
    fanPostKeys: template.fanPosts,
    flags: template.flags || {},
  };
};

/**
 * Apply event flags to player
 */
export const applyEventFlags = (
  player: Player,
  flags: Partial<PlayerEventFlags>,
  seasonNumber: number
): Player => {
  const currentFlags = player.eventFlags || { ...DEFAULT_EVENT_FLAGS };
  
  const updatedFlags: PlayerEventFlags = {
    ...currentFlags,
    ...flags,
  };

  // Handle special cases
  if (flags.wantsTransfer) {
    updatedFlags.transferRequestSeason = seasonNumber;
  }
  if (flags.recentFanInteraction) {
    updatedFlags.fanInteractionSeason = seasonNumber;
  }
  if (flags.controversialStatements) {
    updatedFlags.controversialStatements = (currentFlags.controversialStatements || 0) + 1;
  }
  if (flags.businessInvestments) {
    updatedFlags.businessInvestments = (currentFlags.businessInvestments || 0) + 1;
  }

  return {
    ...player,
    eventFlags: updatedFlags,
  };
};

/**
 * Add headlines to player's social data
 */
export const addHeadlinesToPlayer = (
  player: Player,
  headlines: Headline[]
): Player => {
  if (!player.socialData || headlines.length === 0) {
    return player;
  }

  const existingHeadlines = player.socialData.recentHeadlines || [];
  const newHeadlines = [...headlines, ...existingHeadlines].slice(0, 15); // Keep last 15

  return {
    ...player,
    socialData: {
      ...player.socialData,
      recentHeadlines: newHeadlines,
    },
  };
};

/**
 * Process all consequences of an event choice
 */
export const processEventConsequences = (
  player: Player,
  eventType: InteractiveEventType,
  choiceId: string,
  seasonNumber: number
): {
  updatedPlayer: Player;
  reactions: ReturnType<typeof generateEventReactions>;
} => {
  const reactions = generateEventReactions(player, eventType, choiceId, seasonNumber);
  
  let updatedPlayer = player;
  
  // Apply flags
  if (Object.keys(reactions.flags).length > 0) {
    updatedPlayer = applyEventFlags(updatedPlayer, reactions.flags, seasonNumber);
  }
  
  // Add headlines
  if (reactions.headlines.length > 0) {
    updatedPlayer = addHeadlinesToPlayer(updatedPlayer, reactions.headlines);
  }

  return {
    updatedPlayer,
    reactions,
  };
};

/**
 * Get status indicators for UI display
 */
export const getPlayerStatusIndicators = (
  player: Player
): Array<{
  type: 'transfer' | 'training' | 'conflict' | 'charity' | 'controversy';
  icon: string;
  labelKey: string;
  severity: 'info' | 'warning' | 'positive' | 'negative';
}> => {
  const indicators: Array<{
    type: 'transfer' | 'training' | 'conflict' | 'charity' | 'controversy';
    icon: string;
    labelKey: string;
    severity: 'info' | 'warning' | 'positive' | 'negative';
  }> = [];

  const flags = player.eventFlags || DEFAULT_EVENT_FLAGS;

  if (flags.wantsTransfer) {
    indicators.push({
      type: 'transfer',
      icon: 'Airplane',
      labelKey: 'status.wantsTransfer',
      severity: 'warning',
    });
  }

  if (flags.extraTrainingActive || flags.trainingIntensity === 'intense') {
    indicators.push({
      type: 'training',
      icon: 'Barbell',
      labelKey: 'status.extraTraining',
      severity: 'positive',
    });
  }

  if (flags.conflictWithManager) {
    indicators.push({
      type: 'conflict',
      icon: 'UserMinus',
      labelKey: 'status.managerConflict',
      severity: 'negative',
    });
  }

  if (flags.conflictWithTeammate) {
    indicators.push({
      type: 'conflict',
      icon: 'Users',
      labelKey: 'status.teammateConflict',
      severity: 'warning',
    });
  }

  if (flags.charityActive) {
    indicators.push({
      type: 'charity',
      icon: 'HandHeart',
      labelKey: 'status.charityActive',
      severity: 'positive',
    });
  }

  if (flags.controversialStatements >= 2) {
    indicators.push({
      type: 'controversy',
      icon: 'ChatCircle',
      labelKey: 'status.controversial',
      severity: 'warning',
    });
  }

  return indicators;
};

/**
 * Reset temporary event flags at the start of a new season
 * Called during season transition to clear one-season effects
 */
export const resetSeasonalEventFlags = (
  player: Player,
  currentSeason: number
): Player => {
  const flags = player.eventFlags;
  
  if (!flags) {
    return player;
  }

  const updatedFlags: PlayerEventFlags = { ...flags };

  // Transfer request persists for 2 seasons but with increasing consequences
  // After 2 seasons, if player still hasn't moved, relationship deteriorates significantly
  if (flags.wantsTransfer && flags.transferRequestSeason !== undefined) {
    const seasonsSinceRequest = currentSeason - flags.transferRequestSeason;
    
    if (seasonsSinceRequest > 2) {
      // After 2 seasons, reset the flag but mark that there was unresolved tension
      updatedFlags.wantsTransfer = false;
      updatedFlags.transferRequestSeason = undefined;
      updatedFlags.transferRequestReason = undefined;
      // Player becomes unhappy but accepts situation (for now)
    }
    // Note: The actual forced transfer logic is handled in playerLifecycle.ts
    // This just manages the flag persistence
  }

  // Reset training intensity each season (player needs to choose again)
  updatedFlags.trainingIntensity = 'normal';
  updatedFlags.extraTrainingActive = false;

  // Reset fan interaction status each season
  if (flags.fanInteractionSeason !== undefined) {
    if (currentSeason - flags.fanInteractionSeason > 0) {
      updatedFlags.recentFanInteraction = undefined;
      updatedFlags.fanInteractionSeason = undefined;
    }
  }

  // Reset conflicts after 1 season (they don't persist forever)
  updatedFlags.conflictWithManager = false;
  updatedFlags.conflictWithTeammate = false;

  return {
    ...player,
    eventFlags: updatedFlags,
  };
};

export default {
  generateEventReactions,
  applyEventFlags,
  addHeadlinesToPlayer,
  processEventConsequences,
  getPlayerStatusIndicators,
  resetSeasonalEventFlags,
  DEFAULT_EVENT_FLAGS,
};
