/**
 * POSITION ATTRIBUTE WEIGHTS - v0.5.2
 *
 * FIFA-style weight system for calculating overall from expanded attributes.
 * Each position has different weights for each attribute category.
 *
 * Weights range from 0.0 (irrelevant) to 1.0 (critical for position)
 */

import type { PositionDetail } from "../types";

// ============================================================================
// WEIGHT DEFINITIONS BY POSITION
// ============================================================================

export interface AttributeWeights {
  // Technical
  finishing: number;
  ballControl: number;
  dribbling: number;
  passing: number;
  setPieces: number;

  // Physical
  speed: number;
  endurance: number;
  strength: number;
  agility: number;
  jumping: number;

  // Mental
  decisionMaking: number;
  composure: number;
  leadership: number;
  workEthic: number;

  // Defensive
  marking: number;
  tackling: number;
  positioning: number;
  anticipation: number;

  // Goalkeeper (only for GK)
  reflexes: number;
  diving: number;
  handling: number;
  gkPositioning: number;
}

// Weights for each position (0-1 scale, higher = more important for overall)
export const POSITION_WEIGHTS: Record<PositionDetail, AttributeWeights> = {
  // ==================== GOALKEEPERS ====================
  GK: {
    // Technical - Low importance
    finishing: 0.02,
    ballControl: 0.15,
    dribbling: 0.05,
    passing: 0.2,
    setPieces: 0.05,
    // Physical - Medium
    speed: 0.15,
    endurance: 0.2,
    strength: 0.3,
    agility: 0.5,
    jumping: 0.4,
    // Mental - High
    decisionMaking: 0.6,
    composure: 0.7,
    leadership: 0.4,
    workEthic: 0.3,
    // Defensive - Medium
    marking: 0.1,
    tackling: 0.05,
    positioning: 0.5,
    anticipation: 0.6,
    // Goalkeeper - CRITICAL
    reflexes: 1.0,
    diving: 1.0,
    handling: 0.9,
    gkPositioning: 0.95,
  },

  // ==================== DEFENDERS ====================
  CB: {
    finishing: 0.1,
    ballControl: 0.35,
    dribbling: 0.2,
    passing: 0.45,
    setPieces: 0.15,
    speed: 0.5,
    endurance: 0.55,
    strength: 0.85, // HIGH
    agility: 0.45,
    jumping: 0.8, // HIGH - Headers
    decisionMaking: 0.7,
    composure: 0.75,
    leadership: 0.6,
    workEthic: 0.55,
    marking: 0.95, // CRITICAL
    tackling: 0.9, // CRITICAL
    positioning: 0.9, // CRITICAL
    anticipation: 0.85,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  LB: {
    finishing: 0.15,
    ballControl: 0.55,
    dribbling: 0.6,
    passing: 0.65,
    setPieces: 0.3,
    speed: 0.85, // HIGH - Overlapping runs
    endurance: 0.8, // HIGH - Up and down
    strength: 0.55,
    agility: 0.7,
    jumping: 0.45,
    decisionMaking: 0.6,
    composure: 0.55,
    leadership: 0.35,
    workEthic: 0.75,
    marking: 0.7,
    tackling: 0.75,
    positioning: 0.7,
    anticipation: 0.65,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  RB: {
    finishing: 0.15,
    ballControl: 0.55,
    dribbling: 0.6,
    passing: 0.65,
    setPieces: 0.3,
    speed: 0.85,
    endurance: 0.8,
    strength: 0.55,
    agility: 0.7,
    jumping: 0.45,
    decisionMaking: 0.6,
    composure: 0.55,
    leadership: 0.35,
    workEthic: 0.75,
    marking: 0.7,
    tackling: 0.75,
    positioning: 0.7,
    anticipation: 0.65,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  LWB: {
    finishing: 0.25,
    ballControl: 0.65,
    dribbling: 0.7,
    passing: 0.7,
    setPieces: 0.4,
    speed: 0.9, // VERY HIGH
    endurance: 0.85,
    strength: 0.5,
    agility: 0.75,
    jumping: 0.4,
    decisionMaking: 0.55,
    composure: 0.5,
    leadership: 0.3,
    workEthic: 0.8,
    marking: 0.55,
    tackling: 0.6,
    positioning: 0.55,
    anticipation: 0.55,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  RWB: {
    finishing: 0.25,
    ballControl: 0.65,
    dribbling: 0.7,
    passing: 0.7,
    setPieces: 0.4,
    speed: 0.9,
    endurance: 0.85,
    strength: 0.5,
    agility: 0.75,
    jumping: 0.4,
    decisionMaking: 0.55,
    composure: 0.5,
    leadership: 0.3,
    workEthic: 0.8,
    marking: 0.55,
    tackling: 0.6,
    positioning: 0.55,
    anticipation: 0.55,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  // ==================== MIDFIELDERS ====================
  CDM: {
    finishing: 0.2,
    ballControl: 0.6,
    dribbling: 0.45,
    passing: 0.75, // HIGH
    setPieces: 0.25,
    speed: 0.55,
    endurance: 0.75,
    strength: 0.75,
    agility: 0.55,
    jumping: 0.55,
    decisionMaking: 0.8, // HIGH
    composure: 0.75,
    leadership: 0.55,
    workEthic: 0.7,
    marking: 0.85, // HIGH
    tackling: 0.9, // CRITICAL
    positioning: 0.85, // HIGH
    anticipation: 0.8,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  CM: {
    finishing: 0.4,
    ballControl: 0.7,
    dribbling: 0.6,
    passing: 0.85, // CRITICAL
    setPieces: 0.4,
    speed: 0.55,
    endurance: 0.8, // HIGH
    strength: 0.55,
    agility: 0.6,
    jumping: 0.45,
    decisionMaking: 0.85, // CRITICAL
    composure: 0.75,
    leadership: 0.5,
    workEthic: 0.7,
    marking: 0.55,
    tackling: 0.6,
    positioning: 0.7,
    anticipation: 0.7,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  LM: {
    finishing: 0.45,
    ballControl: 0.7,
    dribbling: 0.75,
    passing: 0.75,
    setPieces: 0.5,
    speed: 0.8,
    endurance: 0.75,
    strength: 0.45,
    agility: 0.7,
    jumping: 0.4,
    decisionMaking: 0.65,
    composure: 0.6,
    leadership: 0.35,
    workEthic: 0.65,
    marking: 0.45,
    tackling: 0.45,
    positioning: 0.55,
    anticipation: 0.55,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  RM: {
    finishing: 0.45,
    ballControl: 0.7,
    dribbling: 0.75,
    passing: 0.75,
    setPieces: 0.5,
    speed: 0.8,
    endurance: 0.75,
    strength: 0.45,
    agility: 0.7,
    jumping: 0.4,
    decisionMaking: 0.65,
    composure: 0.6,
    leadership: 0.35,
    workEthic: 0.65,
    marking: 0.45,
    tackling: 0.45,
    positioning: 0.55,
    anticipation: 0.55,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  CAM: {
    finishing: 0.7, // HIGH
    ballControl: 0.85, // CRITICAL
    dribbling: 0.85, // CRITICAL
    passing: 0.9, // CRITICAL
    setPieces: 0.6,
    speed: 0.6,
    endurance: 0.6,
    strength: 0.4,
    agility: 0.75,
    jumping: 0.35,
    decisionMaking: 0.9, // CRITICAL
    composure: 0.8,
    leadership: 0.4,
    workEthic: 0.5,
    marking: 0.25,
    tackling: 0.25,
    positioning: 0.6,
    anticipation: 0.65,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  // ==================== FORWARDS ====================
  LW: {
    finishing: 0.7,
    ballControl: 0.8,
    dribbling: 0.9, // CRITICAL
    passing: 0.7,
    setPieces: 0.45,
    speed: 0.9, // CRITICAL
    endurance: 0.6,
    strength: 0.4,
    agility: 0.85,
    jumping: 0.4,
    decisionMaking: 0.7,
    composure: 0.7,
    leadership: 0.25,
    workEthic: 0.5,
    marking: 0.2,
    tackling: 0.2,
    positioning: 0.65,
    anticipation: 0.6,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  RW: {
    finishing: 0.7,
    ballControl: 0.8,
    dribbling: 0.9,
    passing: 0.7,
    setPieces: 0.45,
    speed: 0.9,
    endurance: 0.6,
    strength: 0.4,
    agility: 0.85,
    jumping: 0.4,
    decisionMaking: 0.7,
    composure: 0.7,
    leadership: 0.25,
    workEthic: 0.5,
    marking: 0.2,
    tackling: 0.2,
    positioning: 0.65,
    anticipation: 0.6,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  CF: {
    finishing: 0.85, // CRITICAL
    ballControl: 0.75,
    dribbling: 0.7,
    passing: 0.65,
    setPieces: 0.35,
    speed: 0.65,
    endurance: 0.55,
    strength: 0.6,
    agility: 0.65,
    jumping: 0.55,
    decisionMaking: 0.8,
    composure: 0.85, // HIGH
    leadership: 0.35,
    workEthic: 0.5,
    marking: 0.15,
    tackling: 0.15,
    positioning: 0.85, // CRITICAL
    anticipation: 0.75,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },

  ST: {
    finishing: 0.95, // CRITICAL
    ballControl: 0.65,
    dribbling: 0.55,
    passing: 0.45,
    setPieces: 0.3,
    speed: 0.7,
    endurance: 0.5,
    strength: 0.7,
    agility: 0.6,
    jumping: 0.7, // Headers
    decisionMaking: 0.7,
    composure: 0.85, // HIGH
    leadership: 0.3,
    workEthic: 0.45,
    marking: 0.1,
    tackling: 0.1,
    positioning: 0.9, // CRITICAL
    anticipation: 0.8,
    reflexes: 0.0,
    diving: 0.0,
    handling: 0.0,
    gkPositioning: 0.0,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get attribute weights for a position, with fallback to CM
 */
export function getPositionWeights(position: string): AttributeWeights {
  return POSITION_WEIGHTS[position as PositionDetail] || POSITION_WEIGHTS.CM;
}

/**
 * Get the top N most important attributes for a position
 */
export function getKeyAttributes(position: string, topN: number = 5): string[] {
  const weights = getPositionWeights(position);
  const entries = Object.entries(weights);
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, topN).map(([key]) => key);
}

/**
 * Get minimum expected value for an attribute given overall and position weight
 * Used to ensure expanded attributes are consistent with overall
 */
export function getExpectedAttributeValue(
  overall: number,
  weight: number,
  variance: number = 5,
): number {
  // Weight 1.0 = attribute should be close to overall
  // Weight 0.5 = attribute can be ~10 points below overall
  // Weight 0.0 = attribute can be very low
  const baseValue = overall * weight + overall * 0.3 * (1 - weight);
  const minValue = Math.max(40, baseValue - variance);
  const maxValue = Math.min(99, baseValue + variance);
  return Math.round(minValue + Math.random() * (maxValue - minValue));
}

// ============================================================================
// PLAYING STYLE MODIFIERS
// ============================================================================

/**
 * Each playing style modifies certain attribute weights.
 * Values are ADDITIVE to position weights (can be negative).
 * Format: { attributeName: modifier }
 */
export const PLAYING_STYLE_MODIFIERS: Record<
  string,
  Partial<AttributeWeights>
> = {
  // === FORWARDS ===
  Poacher: {
    finishing: 0.15, // Extra emphasis on finishing
    positioning: 0.1, // Needs excellent positioning
    speed: 0.05,
    passing: -0.1, // Less emphasis on passing
    dribbling: -0.05,
  },
  "Target Man": {
    strength: 0.2, // Physical presence
    jumping: 0.15, // Aerial ability
    ballControl: 0.1, // Hold-up play
    speed: -0.15, // Less reliant on pace
    dribbling: -0.1,
  },
  "Deep-Lying Forward": {
    passing: 0.15, // Link-up play
    ballControl: 0.1,
    decisionMaking: 0.1,
    finishing: -0.05, // Less emphasis on pure finishing
  },
  "Complete Forward": {
    finishing: 0.08,
    strength: 0.08,
    passing: 0.05,
    dribbling: 0.05,
    jumping: 0.05,
    // Balanced - no negative mods
  },
  "Advanced Forward": {
    speed: 0.1,
    finishing: 0.1,
    positioning: 0.08,
    passing: 0.05,
  },
  "False 9": {
    passing: 0.15, // Playmaking
    dribbling: 0.12,
    decisionMaking: 0.12,
    ballControl: 0.1,
    finishing: -0.1, // Drops deep, less pure finishing
    positioning: -0.05, // Unconventional positioning
  },

  // === WINGERS ===
  "Inside Forward": {
    finishing: 0.15, // Cuts inside to score
    dribbling: 0.1,
    speed: 0.05,
    passing: -0.05, // Less crossing
  },
  "Traditional Winger": {
    speed: 0.12,
    passing: 0.1, // Crossing
    dribbling: 0.08,
    finishing: -0.1, // Provides, doesn't score
  },
  "Wide Playmaker": {
    passing: 0.15,
    decisionMaking: 0.12,
    ballControl: 0.08,
    speed: -0.08,
  },
  "Inverted Winger": {
    dribbling: 0.12,
    finishing: 0.1,
    passing: 0.08,
    speed: 0.05,
  },
  Raumdeuter: {
    positioning: 0.15, // Space interpretation
    finishing: 0.12,
    decisionMaking: 0.1,
    dribbling: -0.1, // Not a dribbler
    passing: -0.08,
  },

  // === MIDFIELDERS ===
  "Advanced Playmaker": {
    passing: 0.15,
    decisionMaking: 0.12,
    ballControl: 0.1,
    finishing: 0.05,
    tackling: -0.1,
  },
  "Deep-Lying Playmaker": {
    passing: 0.18, // Elite passing
    decisionMaking: 0.12,
    composure: 0.1,
    speed: -0.1,
    finishing: -0.1,
  },
  "Box-to-Box": {
    endurance: 0.15, // High stamina
    tackling: 0.08,
    passing: 0.05,
    finishing: 0.05,
    strength: 0.05,
  },
  "Ball-Winning Midfielder": {
    tackling: 0.18,
    marking: 0.15,
    strength: 0.1,
    positioning: 0.08,
    passing: -0.08,
    dribbling: -0.1,
  },
  Mezzala: {
    dribbling: 0.12,
    passing: 0.1,
    finishing: 0.08,
    endurance: 0.05,
  },
  Regista: {
    passing: 0.2, // Elite long passing
    decisionMaking: 0.15,
    composure: 0.12,
    speed: -0.12,
    tackling: -0.1,
  },
  Carrilero: {
    endurance: 0.15,
    positioning: 0.1,
    tackling: 0.08,
    passing: 0.05,
    dribbling: -0.1,
  },

  // === DEFENDERS ===
  "Ball-Playing Defender": {
    passing: 0.15,
    ballControl: 0.1,
    composure: 0.08,
    tackling: -0.05,
  },
  Stopper: {
    tackling: 0.15,
    strength: 0.12,
    marking: 0.1,
    passing: -0.1,
    agility: -0.05,
  },
  Sweeper: {
    positioning: 0.15,
    decisionMaking: 0.12,
    speed: 0.08,
    tackling: -0.08,
  },
  "No-Nonsense Defender": {
    tackling: 0.12,
    strength: 0.12,
    jumping: 0.1,
    composure: -0.05,
    passing: -0.12,
    dribbling: -0.15,
  },
  "Complete Wing-Back": {
    speed: 0.1,
    passing: 0.1,
    dribbling: 0.08,
    tackling: 0.05,
    endurance: 0.1,
  },
  "Inverted Wing-Back": {
    passing: 0.12,
    dribbling: 0.1,
    decisionMaking: 0.08,
    tackling: 0.05,
  },
  "Defensive Full-Back": {
    tackling: 0.12,
    marking: 0.12,
    positioning: 0.1,
    passing: -0.08,
    dribbling: -0.1,
  },

  // === GOALKEEPERS ===
  "Sweeper Keeper": {
    speed: 0.12, // Rushes out
    passing: 0.15, // Distribution
    decisionMaking: 0.1,
    reflexes: -0.05,
  },
  "Traditional Keeper": {
    reflexes: 0.1,
    diving: 0.1,
    handling: 0.08,
    gkPositioning: 0.08,
    speed: -0.1,
    passing: -0.08,
  },
  "Ball-Playing Keeper": {
    passing: 0.18, // Neuer-style
    ballControl: 0.12,
    composure: 0.1,
    diving: -0.05,
  },
};

// ============================================================================
// RISK TENDENCY MODIFIERS
// ============================================================================

export const RISK_TENDENCY_MODIFIERS: Record<
  string,
  Partial<AttributeWeights>
> = {
  Risky: {
    dribbling: 0.1,
    finishing: 0.05,
    passing: 0.05, // Attempts bold passes
    composure: -0.08, // Less composed
    positioning: -0.05, // Takes risks positionally
  },
  Balanced: {
    // No modifications - baseline
  },
  Conservative: {
    composure: 0.1,
    positioning: 0.08,
    tackling: 0.05,
    dribbling: -0.08,
    finishing: -0.05, // Safer plays
  },
};

// ============================================================================
// SECONDARY POSITION INFLUENCE
// ============================================================================

/**
 * Secondary positions add partial weight influence
 */
export function getSecondaryPositionInfluence(
  secondaryPositions: { position: string; proficiency: number }[],
): Partial<AttributeWeights> {
  const influence: Partial<AttributeWeights> = {};

  for (const secondary of secondaryPositions) {
    const secWeights = POSITION_WEIGHTS[secondary.position as PositionDetail];
    if (!secWeights) continue;

    // Secondary positions influence weights based on proficiency (0-100)
    const factor = (secondary.proficiency / 100) * 0.3; // Max 30% influence

    for (const [key, value] of Object.entries(secWeights)) {
      const attr = key as keyof AttributeWeights;
      const current = influence[attr] || 0;
      influence[attr] = current + value * factor;
    }
  }

  return influence;
}

// ============================================================================
// COMBINED WEIGHT CALCULATOR
// ============================================================================

export interface PlayerProfile {
  position: string;
  playingStyle?: string;
  riskTendency?: string;
  secondaryPositions?: { position: string; proficiency: number }[];
}

/**
 * Get adjusted weights combining position, style, risk, and secondary positions
 */
export function getAdjustedWeights(profile: PlayerProfile): AttributeWeights {
  // Start with position weights
  const baseWeights = { ...getPositionWeights(profile.position) };

  // Apply playing style modifiers
  if (profile.playingStyle && PLAYING_STYLE_MODIFIERS[profile.playingStyle]) {
    const styleModifiers = PLAYING_STYLE_MODIFIERS[profile.playingStyle];
    for (const [key, modifier] of Object.entries(styleModifiers)) {
      const attr = key as keyof AttributeWeights;
      baseWeights[attr] = Math.max(
        0,
        Math.min(1, baseWeights[attr] + (modifier || 0)),
      );
    }
  }

  // Apply risk tendency modifiers
  if (profile.riskTendency && RISK_TENDENCY_MODIFIERS[profile.riskTendency]) {
    const riskModifiers = RISK_TENDENCY_MODIFIERS[profile.riskTendency];
    for (const [key, modifier] of Object.entries(riskModifiers)) {
      const attr = key as keyof AttributeWeights;
      baseWeights[attr] = Math.max(
        0,
        Math.min(1, baseWeights[attr] + (modifier || 0)),
      );
    }
  }

  // Apply secondary position influence
  if (profile.secondaryPositions && profile.secondaryPositions.length > 0) {
    const secondaryInfluence = getSecondaryPositionInfluence(
      profile.secondaryPositions,
    );
    for (const [key, modifier] of Object.entries(secondaryInfluence)) {
      const attr = key as keyof AttributeWeights;
      // Secondary positions blend in partially
      baseWeights[attr] = Math.max(
        0,
        Math.min(1, baseWeights[attr] * 0.8 + (modifier || 0) * 0.2),
      );
    }
  }

  return baseWeights;
}
