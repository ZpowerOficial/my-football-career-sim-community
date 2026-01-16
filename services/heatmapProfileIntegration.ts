/**
 * HEATMAP PROFILE INTEGRATION - v0.5.2
 * Extracts player profile data for heatmap generation.
 */

import type { Player } from "../types";
import type {
  TacticalTendency,
  RiskTendency,
} from "../types/expandedPlayerTypes";

export interface StyleZoneModifier {
  verticalShift: number; // -1 = defensive, 0 = neutral, 1 = attacking
  spreadMultiplier: number; // How wide the player roams
  attackingIntensity: number; // Intensity in attacking third
  defensiveIntensity: number; // Intensity in defensive third
  horizontalBias: number; // -1 = central, 0 = neutral, 1 = wide
}

const DEFAULT_MODIFIER: StyleZoneModifier = {
  verticalShift: 0,
  spreadMultiplier: 1.0,
  attackingIntensity: 1.0,
  defensiveIntensity: 1.0,
  horizontalBias: 0,
};

const STYLE_MODIFIERS: Record<string, StyleZoneModifier> = {
  // === ENGLISH STYLES ===
  "Deep-Lying Playmaker": {
    verticalShift: -0.45, // Increased from -0.3
    spreadMultiplier: 0.75, // More concentrated
    attackingIntensity: 0.3,
    defensiveIntensity: 1.4,
    horizontalBias: 0,
  },
  Regista: {
    verticalShift: -0.25,
    spreadMultiplier: 0.9,
    attackingIntensity: 0.5,
    defensiveIntensity: 1.1,
    horizontalBias: 0,
  },
  "Ball-Winning Midfielder": {
    verticalShift: -0.2,
    spreadMultiplier: 1.0,
    attackingIntensity: 0.3,
    defensiveIntensity: 1.4,
    horizontalBias: 0,
  },
  Carrilero: {
    verticalShift: -0.1,
    spreadMultiplier: 1.1,
    attackingIntensity: 0.5,
    defensiveIntensity: 1.1,
    horizontalBias: 0.2,
  },
  "Box-to-Box": {
    verticalShift: 0,
    spreadMultiplier: 1.4,
    attackingIntensity: 0.9,
    defensiveIntensity: 0.9,
    horizontalBias: 0,
  },
  Mezzala: {
    verticalShift: 0.15,
    spreadMultiplier: 1.2,
    attackingIntensity: 0.9,
    defensiveIntensity: 0.6,
    horizontalBias: 0.3,
  },
  "Advanced Playmaker": {
    verticalShift: 0.2,
    spreadMultiplier: 1.0,
    attackingIntensity: 1.1,
    defensiveIntensity: 0.4,
    horizontalBias: 0,
  },
  Trequartista: {
    verticalShift: 0.3,
    spreadMultiplier: 1.1,
    attackingIntensity: 1.3,
    defensiveIntensity: 0.2,
    horizontalBias: 0,
  },
  "Inside Forward": {
    verticalShift: 0.35, // Increased from 0.2
    spreadMultiplier: 0.8,
    attackingIntensity: 1.4,
    defensiveIntensity: 0.25,
    horizontalBias: -0.5, // Increased - cuts inside more
  },
  "Traditional Winger": {
    verticalShift: 0.25, // Increased from 0.1
    spreadMultiplier: 0.7, // More concentrated
    attackingIntensity: 1.2,
    defensiveIntensity: 0.3,
    horizontalBias: 0.7, // Increased from 0.5 - stays wide
  },
  "Wide Playmaker": {
    verticalShift: 0.1,
    spreadMultiplier: 1.2,
    attackingIntensity: 0.9,
    defensiveIntensity: 0.6,
    horizontalBias: 0.3,
  },
  "Inverted Winger": {
    verticalShift: 0.15,
    spreadMultiplier: 1.0,
    attackingIntensity: 1.1,
    defensiveIntensity: 0.4,
    horizontalBias: -0.2,
  },
  Raumdeuter: {
    verticalShift: 0.25,
    spreadMultiplier: 1.3,
    attackingIntensity: 1.2,
    defensiveIntensity: 0.3,
    horizontalBias: -0.2,
  },
  Poacher: {
    verticalShift: 0.55, // Increased from 0.4
    spreadMultiplier: 0.6, // Very concentrated in box
    attackingIntensity: 1.8,
    defensiveIntensity: 0.05,
    horizontalBias: 0,
  },
  "Target Man": {
    verticalShift: 0.35,
    spreadMultiplier: 0.8,
    attackingIntensity: 1.3,
    defensiveIntensity: 0.2,
    horizontalBias: 0,
  },
  "False 9": {
    verticalShift: 0.1,
    spreadMultiplier: 1.3,
    attackingIntensity: 1.0,
    defensiveIntensity: 0.5,
    horizontalBias: 0,
  },
  "Complete Forward": {
    verticalShift: 0.25,
    spreadMultiplier: 1.1,
    attackingIntensity: 1.2,
    defensiveIntensity: 0.4,
    horizontalBias: 0,
  },
  "Advanced Forward": {
    verticalShift: 0.35,
    spreadMultiplier: 1.0,
    attackingIntensity: 1.3,
    defensiveIntensity: 0.2,
    horizontalBias: 0,
  },
  "Deep-Lying Forward": {
    verticalShift: 0.05,
    spreadMultiplier: 1.2,
    attackingIntensity: 0.8,
    defensiveIntensity: 0.5,
    horizontalBias: 0,
  },
  "Ball-Playing Defender": {
    verticalShift: -0.4,
    spreadMultiplier: 0.9,
    attackingIntensity: 0.3,
    defensiveIntensity: 1.3,
    horizontalBias: 0,
  },
  Stopper: {
    verticalShift: -0.35,
    spreadMultiplier: 0.8,
    attackingIntensity: 0.2,
    defensiveIntensity: 1.5,
    horizontalBias: 0,
  },
  Sweeper: {
    verticalShift: -0.5,
    spreadMultiplier: 1.0,
    attackingIntensity: 0.1,
    defensiveIntensity: 1.4,
    horizontalBias: 0,
  },
  "No-Nonsense Defender": {
    verticalShift: -0.45,
    spreadMultiplier: 0.7,
    attackingIntensity: 0.1,
    defensiveIntensity: 1.5,
    horizontalBias: 0,
  },
  "Complete Wing-Back": {
    verticalShift: 0.1,
    spreadMultiplier: 1.3,
    attackingIntensity: 0.9,
    defensiveIntensity: 0.8,
    horizontalBias: 0.4,
  },
  "Inverted Wing-Back": {
    verticalShift: 0.05,
    spreadMultiplier: 1.2,
    attackingIntensity: 0.8,
    defensiveIntensity: 0.9,
    horizontalBias: -0.2,
  },
  "Defensive Full-Back": {
    verticalShift: -0.2,
    spreadMultiplier: 0.85,
    attackingIntensity: 0.3,
    defensiveIntensity: 1.3,
    horizontalBias: 0.3,
  },
  "Sweeper Keeper": {
    verticalShift: 0.1,
    spreadMultiplier: 1.2,
    attackingIntensity: 0.1,
    defensiveIntensity: 1.5,
    horizontalBias: 0,
  },
  "Traditional Keeper": {
    verticalShift: -0.1,
    spreadMultiplier: 0.8,
    attackingIntensity: 0.05,
    defensiveIntensity: 1.6,
    horizontalBias: 0,
  },
  "Ball-Playing Keeper": {
    verticalShift: 0.05,
    spreadMultiplier: 1.0,
    attackingIntensity: 0.1,
    defensiveIntensity: 1.5,
    horizontalBias: 0,
  },

  // === PORTUGUESE ALIASES ===
  "Zagueiro Clássico": {
    verticalShift: -0.45,
    spreadMultiplier: 0.7,
    attackingIntensity: 0.1,
    defensiveIntensity: 1.5,
    horizontalBias: 0,
  },
  "Zagueiro Construtor": {
    verticalShift: -0.4,
    spreadMultiplier: 0.9,
    attackingIntensity: 0.3,
    defensiveIntensity: 1.3,
    horizontalBias: 0,
  },
  "Zagueiro Líbero": {
    verticalShift: -0.5,
    spreadMultiplier: 1.0,
    attackingIntensity: 0.1,
    defensiveIntensity: 1.4,
    horizontalBias: 0,
  },
  "Lateral Ofensivo": {
    verticalShift: 0.1,
    spreadMultiplier: 1.3,
    attackingIntensity: 0.9,
    defensiveIntensity: 0.7,
    horizontalBias: 0.4,
  },
  "Lateral Defensivo": {
    verticalShift: -0.2,
    spreadMultiplier: 0.85,
    attackingIntensity: 0.3,
    defensiveIntensity: 1.3,
    horizontalBias: 0.3,
  },
  "Ala Completo": {
    verticalShift: 0.1,
    spreadMultiplier: 1.3,
    attackingIntensity: 0.9,
    defensiveIntensity: 0.8,
    horizontalBias: 0.4,
  },
  "Meia Recuado": {
    verticalShift: -0.3,
    spreadMultiplier: 0.85,
    attackingIntensity: 0.4,
    defensiveIntensity: 1.2,
    horizontalBias: 0,
  },
  "Meia Armador": {
    verticalShift: 0.2,
    spreadMultiplier: 1.0,
    attackingIntensity: 1.1,
    defensiveIntensity: 0.4,
    horizontalBias: 0,
  },
  Volante: {
    verticalShift: -0.2,
    spreadMultiplier: 1.0,
    attackingIntensity: 0.3,
    defensiveIntensity: 1.4,
    horizontalBias: 0,
  },
  "Ponta de Área": {
    verticalShift: 0.2,
    spreadMultiplier: 0.9,
    attackingIntensity: 1.2,
    defensiveIntensity: 0.4,
    horizontalBias: -0.3,
  },
  "Ponta Clássico": {
    verticalShift: 0.1,
    spreadMultiplier: 0.8,
    attackingIntensity: 1.0,
    defensiveIntensity: 0.5,
    horizontalBias: 0.5,
  },
  "Ponta Tradicional": {
    verticalShift: 0.1,
    spreadMultiplier: 0.8,
    attackingIntensity: 1.0,
    defensiveIntensity: 0.5,
    horizontalBias: 0.5,
  },
  "Ponta Invertido": {
    verticalShift: 0.15,
    spreadMultiplier: 1.0,
    attackingIntensity: 1.1,
    defensiveIntensity: 0.4,
    horizontalBias: -0.2,
  },
  Centroavante: {
    verticalShift: 0.35,
    spreadMultiplier: 0.8,
    attackingIntensity: 1.3,
    defensiveIntensity: 0.2,
    horizontalBias: 0,
  },
  Finalizador: {
    verticalShift: 0.4,
    spreadMultiplier: 0.7,
    attackingIntensity: 1.5,
    defensiveIntensity: 0.1,
    horizontalBias: 0,
  },
  "Falso 9": {
    verticalShift: 0.1,
    spreadMultiplier: 1.3,
    attackingIntensity: 1.0,
    defensiveIntensity: 0.5,
    horizontalBias: 0,
  },
  "Atacante Completo": {
    verticalShift: 0.25,
    spreadMultiplier: 1.1,
    attackingIntensity: 1.2,
    defensiveIntensity: 0.4,
    horizontalBias: 0,
  },
  "Segundo Atacante": {
    verticalShift: 0.05,
    spreadMultiplier: 1.2,
    attackingIntensity: 0.8,
    defensiveIntensity: 0.5,
    horizontalBias: 0,
  },
  "Goleiro-Libero": {
    verticalShift: 0.1,
    spreadMultiplier: 1.2,
    attackingIntensity: 0.1,
    defensiveIntensity: 1.5,
    horizontalBias: 0,
  },
  "Goleiro Clássico": {
    verticalShift: -0.1,
    spreadMultiplier: 0.8,
    attackingIntensity: 0.05,
    defensiveIntensity: 1.6,
    horizontalBias: 0,
  },
};

// Aliases to resolve duplicate style names (PT → canonical EN)
const STYLE_ALIASES: Record<string, string> = {
  // Portuguese to English mappings
  "Ponta Tradicional": "Ponta Clássico",
  "Falso 9": "False 9",
  "Atacante Móvel": "Mobile Striker",
  "Segundo Atacante": "Shadow Striker",
  "Goleiro-Libero": "Sweeper Keeper",
  "Goleiro Clássico": "Traditional Goalkeeper",
  Volante: "Ball-Winning Midfielder",
  "Meia Armador": "Advanced Playmaker",
  "Meia de Ligação": "Deep-Lying Playmaker",
  "Lateral Ofensivo": "Attacking Fullback",
  Ala: "Wing-Back",
  "Zagueiro Construtor": "Ball-Playing Defender",
  "Ponta Invertido": "Inside Forward",
};

export function getPlayingStyleZoneModifier(style: string): StyleZoneModifier {
  // Resolve alias first, then lookup in STYLE_MODIFIERS
  const resolvedStyle = STYLE_ALIASES[style] || style;
  return STYLE_MODIFIERS[resolvedStyle] || DEFAULT_MODIFIER;
}

export function extractPlayingStyle(player: Player): string | undefined {
  return player.expandedData?.playingStyle?.primaryStyle as string | undefined;
}

export function extractTacticalTendencies(player: Player): TacticalTendency[] {
  return player.expandedData?.playingStyle?.tacticalTendencies || [];
}

export function extractRiskTendency(player: Player): RiskTendency {
  return (
    (player.expandedData?.playingStyle?.riskTendency as RiskTendency) ||
    "Balanced"
  );
}

export function getHeatmapProfileModifiers(player: Player): {
  styleModifier: StyleZoneModifier;
  playingStyle: string | undefined;
  tacticalTendencies: TacticalTendency[];
  riskTendency: RiskTendency;
} {
  const playingStyle = extractPlayingStyle(player);
  const styleModifier = playingStyle
    ? getPlayingStyleZoneModifier(playingStyle)
    : DEFAULT_MODIFIER;

  return {
    styleModifier,
    playingStyle,
    tacticalTendencies: extractTacticalTendencies(player),
    riskTendency: extractRiskTendency(player),
  };
}
