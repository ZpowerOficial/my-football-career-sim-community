/**
 * EVENT TRIGGERS CONFIG - v0.5.6
 * 
 * Configuração de gatilhos de eventos.
 * Separado dos tipos para seguir Single Responsibility Principle.
 * 
 * Cada trigger define:
 * - Requisitos mínimos (cash, fame, age, etc.)
 * - Contextos válidos (post_match, off_season, etc.)
 * - Curva de probabilidade (função dinâmica)
 */

import type { Player } from '../types';
import type { PersonalityScales, EventTrigger } from '../types/interactiveEventTypes';

// ============================================================================
// BALANCING CONSTANTS (Tuning Knobs)
// ============================================================================

/**
 * Constantes de balanceamento extraídas para fácil ajuste.
 * Evita "magic numbers" espalhados pelo código.
 */
export const SCANDAL_WEIGHTS = {
  // Party scandal
  PARTY_EXPOSURE_WEIGHT: 0.4,
  PARTY_DISCIPLINE_WEIGHT: 0.6,
  PARTY_BASE_CHANCE: 0.1,
  PARTY_MAX_CHANCE: 0.15,
  PARTY_YOUNG_MULTIPLIER: 1.3,
  PARTY_OLD_MULTIPLIER: 0.5,
  
  // Social media outburst
  OUTBURST_BASE_CHANCE: 0.12,
  OUTBURST_MAX_CHANCE: 0.20,
  OUTBURST_BAD_FORM_MULTIPLIER: 1.5,
  OUTBURST_TERRIBLE_FORM_MULTIPLIER: 1.2,
  
  // Tax investigation
  TAX_BASE_CHANCE: 0.01,
  TAX_MAX_CHANCE: 0.02,
  TAX_WEALTH_CAP: 50000000, // At this wealth, max chance
};

export const POSITIVE_WEIGHTS = {
  // Charity
  CHARITY_BASE_CHANCE: 0.08,
  CHARITY_MAX_CHANCE: 0.15,
  CHARITY_GOOD_FORM_MULTIPLIER: 1.3,
  
  // Business
  BUSINESS_BASE_CHANCE: 0.05,
  BUSINESS_MAX_CHANCE: 0.10,
  BUSINESS_FAME_CAP: 10000000, // Followers for max chance
};

// ============================================================================
// SCANDAL TRIGGERS
// ============================================================================

export const SCANDAL_TRIGGERS: Record<string, EventTrigger> = {
  party_scandal: {
    maxDiscipline: 60,
    minExposure: 40,
    minFame: 50000, // Need some fame for scandal to matter
    requiredContext: ['off_season', 'post_match_win'],
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // Higher exposure + lower discipline = higher scandal chance
      const base = (scales.exposure * SCANDAL_WEIGHTS.PARTY_EXPOSURE_WEIGHT) + 
                   ((100 - scales.discipline) * SCANDAL_WEIGHTS.PARTY_DISCIPLINE_WEIGHT);
      // Young players more likely
      const ageFactor = player.age < 25 
        ? SCANDAL_WEIGHTS.PARTY_YOUNG_MULTIPLIER 
        : player.age > 32 
          ? SCANDAL_WEIGHTS.PARTY_OLD_MULTIPLIER 
          : 1.0;
      return Math.min(
        SCANDAL_WEIGHTS.PARTY_MAX_CHANCE, 
        (base / 100) * SCANDAL_WEIGHTS.PARTY_BASE_CHANCE * ageFactor
      );
    },
  },
  
  social_media_outburst: {
    minVolatility: 50,
    requiredContext: ['post_match_loss'],
    requiresBadForm: true,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // Volatility + bad form + recent loss
      const volatilityFactor = scales.volatility / 100;
      const formFactor = player.form < -2 
        ? SCANDAL_WEIGHTS.OUTBURST_BAD_FORM_MULTIPLIER 
        : player.form < 0 
          ? SCANDAL_WEIGHTS.OUTBURST_TERRIBLE_FORM_MULTIPLIER 
          : 0.5;
      return Math.min(
        SCANDAL_WEIGHTS.OUTBURST_MAX_CHANCE, 
        volatilityFactor * SCANDAL_WEIGHTS.OUTBURST_BASE_CHANCE * formFactor
      );
    },
  },
  
  tax_investigation: {
    minCash: 5000000, // Only rich players
    maxDiscipline: 70,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // More money + less discipline = higher chance
      const wealthFactor = Math.min(1, (player.cash || 0) / SCANDAL_WEIGHTS.TAX_WEALTH_CAP);
      const disciplineFactor = (100 - scales.discipline) / 100;
      // Very rare event
      return Math.min(
        SCANDAL_WEIGHTS.TAX_MAX_CHANCE, 
        wealthFactor * disciplineFactor * SCANDAL_WEIGHTS.TAX_BASE_CHANCE
      );
    },
  },
  
  nightclub_incident: {
    maxDiscipline: 45,
    minExposure: 50,
    minAge: 18,
    maxAge: 30,
    requiredContext: ['off_season', 'post_match_win'],
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      const indiscipline = (100 - scales.discipline) / 100;
      const exposure = scales.exposure / 100;
      const volatility = scales.volatility / 100;
      return Math.min(0.08, indiscipline * exposure * volatility * 0.15);
    },
  },
  
  relationship_drama: {
    minFame: 100000,
    minAge: 18,
    maxAge: 35,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      const fameFactor = Math.min(1, player.socialMediaFollowers / 5000000);
      const exposureFactor = scales.exposure / 100;
      return Math.min(0.05, fameFactor * exposureFactor * 0.03);
    },
  },
};

// ============================================================================
// POSITIVE TRIGGERS
// ============================================================================

export const POSITIVE_TRIGGERS: Record<string, EventTrigger> = {
  charity_opportunity: {
    minCash: 100000,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // Higher generosity + good form = more opportunities
      const generosityFactor = scales.generosity / 100;
      const formFactor = player.form > 0 ? POSITIVE_WEIGHTS.CHARITY_GOOD_FORM_MULTIPLIER : 1.0;
      return Math.min(
        POSITIVE_WEIGHTS.CHARITY_MAX_CHANCE, 
        generosityFactor * POSITIVE_WEIGHTS.CHARITY_BASE_CHANCE * formFactor
      );
    },
  },
  
  business_opportunity: {
    minFame: 500000,
    minOverall: 80,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // Fame + ambition = business opportunities
      const fameFactor = Math.min(1, player.socialMediaFollowers / POSITIVE_WEIGHTS.BUSINESS_FAME_CAP);
      const ambitionFactor = scales.ambition / 100;
      return Math.min(
        POSITIVE_WEIGHTS.BUSINESS_MAX_CHANCE, 
        fameFactor * ambitionFactor * POSITIVE_WEIGHTS.BUSINESS_BASE_CHANCE
      );
    },
  },
  
  mentor_opportunity: {
    minAge: 28,
    minOverall: 82,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      const ageFactor = Math.min(1, (player.age - 28) / 10);
      const disciplineFactor = scales.discipline / 100;
      return Math.min(0.08, ageFactor * disciplineFactor * 0.05);
    },
  },
  
  fan_interaction: {
    minFame: 10000,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      const exposureFactor = scales.exposure / 100;
      return Math.min(0.12, exposureFactor * 0.08);
    },
  },
  
  teammate_conflict: {
    minVolatility: 40,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      const volatilityFactor = scales.volatility / 100;
      const disciplineFactor = (100 - scales.discipline) / 100;
      return Math.min(0.06, volatilityFactor * disciplineFactor * 0.08);
    },
  },
  
  manager_fallout: {
    requiresBadForm: true,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      const formPenalty = Math.abs(Math.min(0, player.form)) / 5;
      const volatilityFactor = scales.volatility / 100;
      return Math.min(0.10, formPenalty * volatilityFactor * 0.12);
    },
  },
  
  interview_controversial: {
    minFame: 200000,
    minExposure: 50,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      const exposureFactor = scales.exposure / 100;
      return Math.min(0.10, exposureFactor * 0.06);
    },
  },
};

// ============================================================================
// COMBINED TRIGGERS
// ============================================================================

export const ALL_EVENT_TRIGGERS: Record<string, EventTrigger> = {
  ...SCANDAL_TRIGGERS,
  ...POSITIVE_TRIGGERS,
};

// ============================================================================
// EARLY CAREER TRIGGERS (More accessible events for new players)
// ============================================================================

export const EARLY_CAREER_TRIGGERS: Record<string, EventTrigger> = {
  // Media interview - appears early in career
  media_interview: {
    minOverall: 60,
    requiredContext: ['post_match_win', 'random'],
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // Higher chance for younger players and those with good form
      const ageFactor = player.age < 25 ? 1.5 : 1.0;
      const formFactor = player.form > 0 ? 1.3 : 1.0;
      return Math.min(0.15, 0.08 * ageFactor * formFactor);
    },
  },
  
  // Fan encounter - common event
  fan_encounter: {
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // Almost always can happen
      return 0.10;
    },
  },
  
  // Training choice - appears often
  training_decision: {
    requiredContext: ['training', 'random'],
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      return 0.12;
    },
  },
  
  // Contract discussion with agent
  agent_meeting: {
    minAge: 18,
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // More likely when contract is running low
      const contractFactor = player.contractLength <= 2 ? 2.0 : 1.0;
      return Math.min(0.15, 0.06 * contractFactor);
    },
  },
  
  // Teammate relationship event
  teammate_interaction: {
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      const chemistryFactor = player.teamChemistry < 50 ? 1.5 : 1.0;
      return Math.min(0.12, 0.07 * chemistryFactor);
    },
  },
  
  // Manager meeting
  manager_conversation: {
    requiredContext: ['random', 'post_match_loss'],
    probabilityCurve: (player: Player, scales: PersonalityScales): number => {
      // More likely if not in good standing
      const statusFactor = player.squadStatus === 'Rotation' || player.squadStatus === 'Reserve' ? 1.5 : 1.0;
      return Math.min(0.10, 0.05 * statusFactor);
    },
  },
};

// Add early career triggers to combined triggers
export const ALL_TRIGGERS: Record<string, EventTrigger> = {
  ...SCANDAL_TRIGGERS,
  ...POSITIVE_TRIGGERS,
  ...EARLY_CAREER_TRIGGERS,
};
