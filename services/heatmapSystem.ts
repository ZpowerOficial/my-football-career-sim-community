/**
 * ⚽ FOOTBALL ANALYTICS SYSTEM — ACADEMIC & PROFESSIONAL GRADE
 * v0.5.2
 *
 * Implementa metodologias de:
 * - StatsBomb / Opta Pro (adaptado para simulação)
 * - MIT Sloan Sports Analytics
 * - FC Barcelona Innovation Hub
 *
 * Features:
 * - Event-based heatmaps com 15+ tipos de evento
 * - Expected Threat (xT) adaptado para dados simulados
 * - Kernel Density Estimation (KDE)
 * - DBSCAN clustering
 * - Percentile normalization
 */

import {
  Player,
  PositionDetail,
  ExtendedMatchStats,
  TraitName,
} from "../types";
import type {
  TacticalTendency,
  RiskTendency,
  RunningStyle,
} from "../types/expandedPlayerTypes";
import {
  getHeatmapProfileModifiers,
  StyleZoneModifier,
} from "./heatmapProfileIntegration";

// ============================================================================
// 📐 CONSTANTS & CONFIGURATION
// ============================================================================

export const HEATMAP_WIDTH = 99;
export const HEATMAP_HEIGHT = 61;

const CENTER_X = Math.floor(HEATMAP_WIDTH / 2);
const CENTER_Y = Math.floor(HEATMAP_HEIGHT / 2);

const SCALE_X = HEATMAP_WIDTH / 25;
const SCALE_Y = HEATMAP_HEIGHT / 15;
const OLD_CENTER_Y = 7.5;

// ============================================================================
// 📊 TYPE DEFINITIONS
// ============================================================================

export type EventType =
  | "pass"
  | "pass_received"
  | "carry"
  | "dribble"
  | "shot"
  | "tackle"
  | "interception"
  | "pressure"
  | "aerial"
  | "recovery"
  | "clearance"
  | "cross"
  | "through_ball"
  | "progressive_pass"
  | "progressive_carry"
  | "touch";

export interface HeatmapEvent {
  x: number;
  y: number;
  weight: number;
  type: EventType;
  progressive?: boolean;
  success?: boolean;
}

export interface Cluster {
  centroid: { x: number; y: number };
  points: HeatmapEvent[];
  density: number;
  radius: number;
  dominantEventType: EventType;
}

// ============================================================================
// 📈 EVENT WEIGHTS (StatsBomb-calibrated)
// ============================================================================

export const EVENT_WEIGHTS: Record<EventType, number> = {
  progressive_carry: 2.2,
  progressive_pass: 2.0,
  through_ball: 2.0,
  dribble: 1.8,
  carry: 1.5,
  shot: 3.0,
  tackle: 1.5,
  interception: 1.4,
  recovery: 1.2,
  clearance: 1.0,
  pressure: 0.6,
  pass: 0.8,
  pass_received: 1.0,
  touch: 0.7,
  cross: 1.6,
  aerial: 1.3,
};

const CONTEXT_MULTIPLIERS = {
  inFinalThird: 1.4,
  inOpponentBox: 1.8,
  progressive: 1.5,
  successful: 1.2,
};

// ============================================================================
// 🎯 EXPECTED THREAT (xT) MODEL
// ============================================================================

export const XT_GRID: number[][] = [
  [
    0.0, 0.0, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.004, 0.008, 0.015, 0.025,
    0.035,
  ],
  [
    0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.004, 0.008, 0.015, 0.028, 0.045,
    0.065, 0.085,
  ],
  [
    0.0002, 0.0005, 0.001, 0.0025, 0.005, 0.01, 0.02, 0.038, 0.065, 0.1, 0.145,
    0.18,
  ],
  [
    0.0003, 0.0008, 0.0018, 0.004, 0.0085, 0.017, 0.034, 0.062, 0.105, 0.16,
    0.22, 0.28,
  ],
  [
    0.0003, 0.0008, 0.0018, 0.004, 0.0085, 0.017, 0.034, 0.062, 0.105, 0.16,
    0.22, 0.28,
  ],
  [
    0.0002, 0.0005, 0.001, 0.0025, 0.005, 0.01, 0.02, 0.038, 0.065, 0.1, 0.145,
    0.18,
  ],
  [
    0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.004, 0.008, 0.015, 0.028, 0.045,
    0.065, 0.085,
  ],
  [
    0.0, 0.0, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.004, 0.008, 0.015, 0.025,
    0.035,
  ],
];

export const getXTValue = (x: number, y: number): number => {
  const gridX = Math.floor((x / HEATMAP_WIDTH) * 12);
  const gridY = Math.floor((y / HEATMAP_HEIGHT) * 8);
  const clampedX = Math.max(0, Math.min(11, gridX));
  const clampedY = Math.max(0, Math.min(7, gridY));
  return XT_GRID[clampedY][clampedX];
};

export const applyXTBoost = (event: HeatmapEvent): number => {
  const xt = getXTValue(event.x, event.y);
  const boost = 1 + Math.log1p(xt * 10);
  return event.weight * boost;
};

// ============================================================================
// 🔧 HELPER FUNCTIONS
// ============================================================================

export const createEmptyHeatmap = (): number[][] => {
  return Array.from({ length: HEATMAP_HEIGHT }, () =>
    Array.from({ length: HEATMAP_WIDTH }, () => 0),
  );
};

const gaussianKernel = (dist: number, sigma: number): number => {
  return Math.exp(-(dist * dist) / (2 * sigma * sigma));
};

const standardDeviation = (data: number[]): number => {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.map((x) => (x - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / data.length);
};

export const applyGaussianBlur = (
  grid: number[][],
  sigma: number,
): number[][] => {
  const result = createEmptyHeatmap();
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
  const halfKernel = Math.floor(kernelSize / 2);

  const kernel: number[] = [];
  let kernelSum = 0;
  for (let i = -halfKernel; i <= halfKernel; i++) {
    const weight = gaussianKernel(i, sigma);
    kernel.push(weight);
    kernelSum += weight;
  }
  kernel.forEach((_, i) => (kernel[i] /= kernelSum));

  const temp = createEmptyHeatmap();
  for (let y = 0; y < HEATMAP_HEIGHT; y++) {
    for (let x = 0; x < HEATMAP_WIDTH; x++) {
      let sum = 0;
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const sx = Math.max(0, Math.min(HEATMAP_WIDTH - 1, x + k));
        sum += grid[y][sx] * kernel[k + halfKernel];
      }
      temp[y][x] = sum;
    }
  }

  for (let y = 0; y < HEATMAP_HEIGHT; y++) {
    for (let x = 0; x < HEATMAP_WIDTH; x++) {
      let sum = 0;
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const sy = Math.max(0, Math.min(HEATMAP_HEIGHT - 1, y + k));
        sum += temp[sy][x] * kernel[k + halfKernel];
      }
      result[y][x] = sum;
    }
  }

  return result;
};

// ============================================================================
// 🔬 KERNEL DENSITY ESTIMATION (KDE)
// ============================================================================

export const applyKDE = (
  events: HeatmapEvent[],
  bandwidth: number = 2.5,
): number[][] => {
  if (events.length === 0) return createEmptyHeatmap();

  const grid = createEmptyHeatmap();
  const bw2 = bandwidth * bandwidth;
  const range = Math.ceil(bandwidth * 3);
  const norm = 2 / (Math.PI * bw2);

  for (const ev of events) {
    const cx = ev.x;
    const cy = ev.y;
    const weight = ev.weight;

    const minX = Math.max(0, Math.floor(cx) - range);
    const maxX = Math.min(HEATMAP_WIDTH - 1, Math.ceil(cx) + range);
    const minY = Math.max(0, Math.floor(cy) - range);
    const maxY = Math.min(HEATMAP_HEIGHT - 1, Math.ceil(cy) + range);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist2 = (x - cx) ** 2 + (y - cy) ** 2;
        const u = dist2 / bw2;
        if (u < 1) {
          const k = 0.75 * (1 - u);
          grid[y][x] += weight * k * norm;
        }
      }
    }
  }

  return grid;
};

// ============================================================================
// 🎯 DBSCAN CLUSTERING
// ============================================================================

export const findClusters = (
  events: HeatmapEvent[],
  epsilon: number = 5,
  minPoints: number = 3,
): Cluster[] => {
  const visited = new Set<number>();
  const clustered = new Set<number>();
  const clusters: Cluster[] = [];

  const getNeighbors = (idx: number): number[] => {
    const neighbors: number[] = [];
    const ev = events[idx];
    for (let i = 0; i < events.length; i++) {
      if (i === idx) continue;
      const dist = Math.sqrt(
        (events[i].x - ev.x) ** 2 + (events[i].y - ev.y) ** 2,
      );
      if (dist <= epsilon) neighbors.push(i);
    }
    return neighbors;
  };

  const expandCluster = (
    idx: number,
    neighbors: number[],
    cluster: number[],
  ): void => {
    cluster.push(idx);
    clustered.add(idx);
    const queue = [...neighbors];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current)) {
        visited.add(current);
        const currentNeighbors = getNeighbors(current);
        if (currentNeighbors.length >= minPoints) {
          for (const n of currentNeighbors) {
            if (!clustered.has(n)) queue.push(n);
          }
        }
      }
      if (!clustered.has(current)) {
        cluster.push(current);
        clustered.add(current);
      }
    }
  };

  for (let i = 0; i < events.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);
    const neighbors = getNeighbors(i);
    if (neighbors.length >= minPoints) {
      const cluster: number[] = [];
      expandCluster(i, neighbors, cluster);
      if (cluster.length > 0) {
        const clusterEvents = cluster.map((idx) => events[idx]);
        const centroidX =
          clusterEvents.reduce((sum, e) => sum + e.x, 0) / clusterEvents.length;
        const centroidY =
          clusterEvents.reduce((sum, e) => sum + e.y, 0) / clusterEvents.length;
        const totalWeight = clusterEvents.reduce((sum, e) => sum + e.weight, 0);
        let maxDist = 0;
        for (const ev of clusterEvents) {
          const dist = Math.sqrt(
            (ev.x - centroidX) ** 2 + (ev.y - centroidY) ** 2,
          );
          maxDist = Math.max(maxDist, dist);
        }
        const typeCounts = new Map<EventType, number>();
        for (const ev of clusterEvents) {
          typeCounts.set(ev.type, (typeCounts.get(ev.type) || 0) + 1);
        }
        let dominantType: EventType = "touch";
        let maxCount = 0;
        for (const [type, count] of typeCounts) {
          if (count > maxCount) {
            maxCount = count;
            dominantType = type;
          }
        }
        clusters.push({
          centroid: { x: centroidX, y: centroidY },
          points: clusterEvents,
          density: totalWeight / clusterEvents.length,
          radius: maxDist,
          dominantEventType: dominantType,
        });
      }
    }
  }

  return clusters.sort((a, b) => b.density - a.density);
};

// ============================================================================
// 📊 NORMALIZATION METHODS
// ============================================================================

export const normalizePercentile = (
  grid: number[][],
  percentile: number = 95,
): number[][] => {
  const values: number[] = [];
  for (let y = 0; y < HEATMAP_HEIGHT; y++) {
    for (let x = 0; x < HEATMAP_WIDTH; x++) {
      if (grid[y][x] > 0) values.push(grid[y][x]);
    }
  }
  if (values.length === 0) return grid;
  values.sort((a, b) => a - b);
  const idx = Math.floor((percentile / 100) * values.length);
  const maxValue = values[Math.min(idx, values.length - 1)];
  if (maxValue === 0) return grid;
  return grid.map((row) => row.map((cell) => Math.min(1, cell / maxValue)));
};

export const normalizeHeatmap = (heatmap: number[][]): number[][] => {
  let maxValue = 0;
  for (let y = 0; y < HEATMAP_HEIGHT; y++) {
    for (let x = 0; x < HEATMAP_WIDTH; x++) {
      maxValue = Math.max(maxValue, heatmap[y][x]);
    }
  }
  if (maxValue === 0) return heatmap;
  return heatmap.map((row) => row.map((cell) => cell / maxValue));
};

// ============================================================================
// 🏟️ POSITION PROFILES
// ============================================================================

interface PositionProfile {
  baseX: number;
  baseY: number;
  spreadX: number;
  spreadY: number;
  attackingBias: number;
  widthBias: number;
}

const POSITION_PROFILES: Record<PositionDetail, PositionProfile> = {
  GK: {
    baseX: 2,
    baseY: OLD_CENTER_Y,
    spreadX: 3, // Increased from 1.5
    spreadY: 5, // Increased from 3
    attackingBias: -0.95,
    widthBias: 0,
  },
  CB: {
    baseX: 5.5,
    baseY: OLD_CENTER_Y,
    spreadX: 6, // Increased from 3
    spreadY: 6, // Increased from 3
    attackingBias: -0.65,
    widthBias: 0,
  },
  LB: {
    baseX: 8,
    baseY: 3,
    spreadX: 9, // Increased from 5
    spreadY: 4, // Increased from 2
    attackingBias: 0.1,
    widthBias: -0.8,
  },
  RB: {
    baseX: 8,
    baseY: 12,
    spreadX: 9, // Increased from 5
    spreadY: 4, // Increased from 2
    attackingBias: 0.1,
    widthBias: 0.8,
  },
  LWB: {
    baseX: 11,
    baseY: 2.5,
    spreadX: 10, // Increased from 6
    spreadY: 4, // Increased from 1.8
    attackingBias: 0.25,
    widthBias: -0.85,
  },
  RWB: {
    baseX: 11,
    baseY: 12.5,
    spreadX: 10, // Increased from 6
    spreadY: 4, // Increased from 1.8
    attackingBias: 0.25,
    widthBias: 0.85,
  },
  CDM: {
    baseX: 9,
    baseY: OLD_CENTER_Y,
    spreadX: 15, // Much bigger for defensive coverage
    spreadY: 10, // Cover full width
    attackingBias: -0.25,
    widthBias: 0,
  },
  CM: {
    baseX: 12.5,
    baseY: OLD_CENTER_Y,
    spreadX: 18, // MASSIVELY increased for Box-to-Box coverage
    spreadY: 12, // Cover full width
    attackingBias: 0,
    widthBias: 0,
  },
  CAM: {
    baseX: 16,
    baseY: OLD_CENTER_Y,
    spreadX: 14, // Bigger for creative movement
    spreadY: 10, // Cover full width
    attackingBias: 0.4,
    widthBias: 0,
  },
  LM: {
    baseX: 12,
    baseY: 3,
    spreadX: 9, // Increased from 5
    spreadY: 4, // Increased from 2
    attackingBias: 0.15,
    widthBias: -0.75,
  },
  RM: {
    baseX: 12,
    baseY: 12,
    spreadX: 9, // Increased from 5
    spreadY: 4, // Increased from 2
    attackingBias: 0.15,
    widthBias: 0.75,
  },
  LW: {
    baseX: 17,
    baseY: 3,
    spreadX: 8, // Increased from 4
    spreadY: 4, // Increased from 2.2
    attackingBias: 0.55,
    widthBias: -0.85,
  },
  RW: {
    baseX: 17,
    baseY: 12,
    spreadX: 8, // Increased from 4
    spreadY: 5, // Increased from 2.2
    attackingBias: 0.55,
    widthBias: 0.85,
  },
  CF: {
    baseX: 18,      // Slightly further back to show linkup play
    baseY: OLD_CENTER_Y,
    spreadX: 10,    // Much wider horizontal movement
    spreadY: 8,     // More vertical variation
    attackingBias: 0.6,
    widthBias: 0,
  },
  ST: {
    baseX: 19,      // Slightly further back to show movement variety
    baseY: OLD_CENTER_Y,
    spreadX: 9,     // Wider horizontal movement (drifting, runs)
    spreadY: 7,     // More vertical variation (dropping deep, runs)
    attackingBias: 0.75,
    widthBias: 0,
  },
};

// ============================================================================
// 🎮 PLAYER CONTEXT EXTRACTION
// ============================================================================

interface PlayerContext {
  workRate: number;
  stamina: number;
  hasEngine: boolean;
  tacticalTendencies: TacticalTendency[];
  riskTendency: RiskTendency;
  runningStyle: RunningStyle;
  traits: TraitName[];
  creativity: number;
  playmaking: number;
  goalScoring: number;
}

const extractPlayerContext = (player: Player): PlayerContext => {
  const workRate = Math.min(1, (player.stats.workRate || 70) / 100);
  const stamina = Math.min(1, (player.stats.stamina || 70) / 100);
  const traitNames = player.traits?.map((t) => t.name) || [];
  const hasEngine = traitNames.some(
    (t) =>
      t === "Engine" ||
      t === "Tireless Runner" ||
      t === "Second Wind" ||
      t === "Box to Box",
  );
  const expanded = player.expandedData;
  const tacticalTendencies: TacticalTendency[] =
    expanded?.playingStyle?.tacticalTendencies || [];
  const riskTendency: RiskTendency =
    expanded?.playingStyle?.riskTendency || "Balanced";
  const runningStyle: RunningStyle =
    expanded?.physicalProfile?.runningStyle || "Steady";
  const profile = player.profile;
  const creativity = (profile?.creativity || 50) / 100;
  const playmaking = (profile?.playmaking || 50) / 100;
  const goalScoring = (profile?.goalScoring || 50) / 100;

  return {
    workRate,
    stamina,
    hasEngine,
    tacticalTendencies,
    riskTendency,
    runningStyle,
    traits: traitNames,
    creativity,
    playmaking,
    goalScoring,
  };
};

// ============================================================================
// ⭐ EVENT GENERATION
// ============================================================================

const generateTypedEvents = (
  events: HeatmapEvent[],
  cx: number,
  cy: number,
  spreadX: number,
  spreadY: number,
  count: number,
  eventType: EventType,
  baseWeight: number = 1,
  options: { progressive?: boolean; success?: boolean } = {},
): void => {
  let weight = baseWeight * EVENT_WEIGHTS[eventType];
  if (options.progressive) weight *= CONTEXT_MULTIPLIERS.progressive;
  if (options.success) weight *= CONTEXT_MULTIPLIERS.successful;

  const adjustedSpreadY = spreadY * 0.55;

  for (let i = 0; i < count; i++) {
    const u1 = Math.random() || 0.0001;
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

    const dirX = (Math.random() - 0.5) * 1.8;
    const dirY = (Math.random() - 0.5) * 0.9;

    const px = cx + z0 * spreadX + dirX;
    const py = cy + z1 * adjustedSpreadY + dirY;

    if (px >= 0 && px < HEATMAP_WIDTH && py >= 0 && py < HEATMAP_HEIGHT) {
      events.push({
        x: px,
        y: py,
        weight,
        type: eventType,
        progressive: options.progressive,
        success: options.success,
      });
    }
  }
};

const generateTypedEventsScaled = (
  events: HeatmapEvent[],
  cx: number,
  cy: number,
  spreadX: number,
  spreadY: number,
  count: number,
  eventType: EventType,
  baseWeight: number = 1,
  options: { progressive?: boolean; success?: boolean } = {},
): void => {
  generateTypedEvents(
    events,
    cx * SCALE_X,
    cy * SCALE_Y,
    spreadX * SCALE_X,
    spreadY * SCALE_Y,
    count,
    eventType,
    baseWeight,
    options,
  );
};

// ============================================================================
// ⭐ MAIN HEATMAP GENERATION — ACADEMIC GRADE
// ============================================================================

export const generateMatchHeatmap = (
  player: Player,
  matchData: {
    goals: number;
    assists: number;
    tackles?: number;
    interceptions?: number;
    cleanSheet?: boolean;
    position?: PositionDetail;
    dribbles?: number;
    passes?: number;
    carries?: number;
    pressures?: number;
    recoveries?: number;
    crosses?: number;
  },
): number[][] => {
  const events: HeatmapEvent[] = [];
  const position = matchData.position || player.position;

  const posProfile = POSITION_PROFILES[position] || POSITION_PROFILES.CM;
  const ctx = extractPlayerContext(player);
  const { styleModifier } = getHeatmapProfileModifiers(player);

  // 1. BASE TOUCHES - spread across ENTIRE natural zone
  const touches = 50 + Math.floor(Math.random() * 30);
  generateTypedEventsScaled(
    events,
    posProfile.baseX,
    posProfile.baseY,
    posProfile.spreadX * 2.5,  // MASSIVE spread
    posProfile.spreadY * 2.0,  // MASSIVE spread
    Math.floor(touches * 0.4),
    "touch",
  );

  // 2. PASSES - wide distribution
  const passes = matchData.passes || 35;
  generateTypedEventsScaled(
    events,
    posProfile.baseX - 1,
    posProfile.baseY,
    posProfile.spreadX * 2.2,  // Much bigger
    posProfile.spreadY * 1.8,  // Much bigger
    Math.floor(passes * 0.4),
    "pass_received",
  );
  generateTypedEventsScaled(
    events,
    posProfile.baseX,
    posProfile.baseY,
    posProfile.spreadX * 2.0,  // Much bigger
    posProfile.spreadY * 1.6,  // Much bigger
    Math.floor(passes * 0.3),
    "pass",
  );

  // 3. CARRIES - progressive movements
  const carries = matchData.carries || 8;
  generateTypedEventsScaled(
    events,
    posProfile.baseX + 2,
    posProfile.baseY,
    posProfile.spreadX * 2.8,  // Very wide for carrying
    posProfile.spreadY * 1.5,  // Wide
    carries,
    "carry",
  );

  // 4. DRIBBLES
  if ((matchData.dribbles || 0) > 0) {
    generateTypedEventsScaled(
      events,
      posProfile.baseX + 3,
      posProfile.baseY,
      2.5,
      1.5,
      matchData.dribbles!,
      "dribble",
      1,
      { success: Math.random() > 0.4 },
    );
  }

  // 5. SHOTS & GOALS (reduced weight to not dominate)
  if (matchData.goals > 0) {
    for (let i = 0; i < matchData.goals; i++) {
      generateTypedEventsScaled(
        events,
        21 + (Math.random() - 0.5) * 2.5,
        OLD_CENTER_Y + (Math.random() - 0.5) * 4,
        1.5,
        1.2,
        2,  // Reduced from 3
        "shot",
        1.5,  // Reduced from 2.0 to not dominate heatmap
      );
    }
  }

  // 6. ASSISTS
  if (matchData.assists > 0) {
    for (let i = 0; i < matchData.assists; i++) {
      const isWide = Math.abs(posProfile.widthBias) > 0.4;
      const assistY = isWide
        ? posProfile.widthBias > 0
          ? 12
          : 3
        : OLD_CENTER_Y;
      generateTypedEventsScaled(
        events,
        17 + (Math.random() - 0.5) * 3,
        assistY,
        2.0,
        1.2,
        4,
        "through_ball",
        1.5,
      );
    }
  }

  // 7. DEFENSIVE ACTIONS
  if ((matchData.tackles || 0) > 0) {
    const defX = Math.min(posProfile.baseX, 10);
    generateTypedEventsScaled(
      events,
      defX,
      posProfile.baseY,
      3,
      2,
      matchData.tackles!,
      "tackle",
    );
  }
  if ((matchData.interceptions || 0) > 0) {
    generateTypedEventsScaled(
      events,
      posProfile.baseX - 1,
      posProfile.baseY,
      3.5,
      2.5,
      matchData.interceptions!,
      "interception",
    );
  }
  if ((matchData.recoveries || 0) > 0) {
    generateTypedEventsScaled(
      events,
      posProfile.baseX,
      posProfile.baseY,
      4,
      3,
      matchData.recoveries!,
      "recovery",
    );
  }

  // 8. PRESSURES
  const pressures = matchData.pressures || Math.floor(10 + Math.random() * 12);
  if (ctx.workRate > 0.5) {
    generateTypedEventsScaled(
      events,
      posProfile.baseX + 2,
      posProfile.baseY,
      posProfile.spreadX * 1.0,
      posProfile.spreadY * 0.8,
      Math.floor(pressures * ctx.workRate),
      "pressure",
    );
  }

  // 9. CROSSES
  if ((matchData.crosses || 0) > 0 && Math.abs(posProfile.widthBias) > 0.3) {
    const crossY = posProfile.widthBias > 0 ? 12 : 3;
    generateTypedEventsScaled(
      events,
      19,
      crossY,
      2,
      1,
      matchData.crosses!,
      "cross",
    );
  }

  // 10. STYLE MODIFIER
  if (
    Math.abs(styleModifier.verticalShift) > 0.1 ||
    Math.abs(styleModifier.horizontalBias) > 0.1
  ) {
    const styleCx = posProfile.baseX + styleModifier.verticalShift * 5;
    const styleCy = posProfile.baseY + styleModifier.horizontalBias * 3;
    const intensity =
      styleModifier.verticalShift > 0
        ? styleModifier.attackingIntensity
        : styleModifier.defensiveIntensity;
    generateTypedEventsScaled(
      events,
      styleCx,
      styleCy,
      2 * styleModifier.spreadMultiplier,
      1.2 * styleModifier.spreadMultiplier,
      Math.floor(8 * intensity),
      "touch",
      intensity,
    );
  }

  // 11. GK CLEAN SHEET
  if (matchData.cleanSheet && position === "GK") {
    generateTypedEventsScaled(
      events,
      2.5,
      OLD_CENTER_Y,
      1.5,
      2.5,
      20,
      "touch",
      1.5,
    );
  }

  // ================================
  // 12. REALISM: DEFENSIVE SET PIECES (all outfield players)
  // ================================
  // Every player drops back for defensive corners/free kicks
  if (position !== "GK") {
    const numDefensiveCorners = Math.floor(2 + Math.random() * 4); // 2-5 corners per match
    for (let i = 0; i < numDefensiveCorners; i++) {
      // Defensive corner: players in/near their own box
      generateTypedEventsScaled(
        events,
        3 + Math.random() * 3,  // Own penalty area (x: 3-6)
        OLD_CENTER_Y + (Math.random() - 0.5) * 8, // Spread vertically
        2.5,
        3,
        2, // 2 touches per corner
        "touch",
        0.4, // Lower weight
      );
    }
  }

  // ================================
  // 13. REALISM: BUILD-UP PLAY (all players participate)
  // ================================
  // Build-up intensity varies by position
  const buildUpIntensity = position === "GK" ? 0.2 : 
                           ["CB", "CDM"].includes(position) ? 0.8 :
                           ["LB", "RB", "LWB", "RWB", "CM"].includes(position) ? 0.6 :
                           ["CAM", "LM", "RM"].includes(position) ? 0.4 :
                           0.25; // ST, CF, LW, RW - menos mas ainda participam
  
  const buildUpTouches = Math.floor((8 + Math.random() * 8) * buildUpIntensity);

  // Receive in midfield
  generateTypedEventsScaled(
    events,
    10 + Math.random() * 4,  // Central midfield
    OLD_CENTER_Y + (Math.random() - 0.5) * 6,
    5,
    4,
    buildUpTouches,
    "pass_received",
    0.5,
  );
  
  // Short passes in own half
  generateTypedEventsScaled(
    events,
    8 + Math.random() * 5,
    OLD_CENTER_Y + (Math.random() - 0.5) * 5,
    4,
    3.5,
    Math.floor(buildUpTouches * 0.7),
    "pass",
    0.4,
  );

  // ================================
  // 14. REALISM: MIDFIELD TRANSITIONS
  // ================================
  // All players make runs through midfield during transitions
  const transitionEvents = Math.floor(3 + Math.random() * 5);
  generateTypedEventsScaled(
    events,
    12 + Math.random() * 4,  // Central midfield area
    posProfile.baseY + (Math.random() - 0.5) * 6,
    6,
    5,
    transitionEvents,
    "carry",
    0.4,
  );

  // ================================
  // 15. REALISM: WIDE MOVEMENTS (drifting)
  // ================================
  // Forwards drift wide to receive passes, create space
  if (["ST", "CF", "CAM"].includes(position)) {
    const driftIntensity = (ctx.creativity || 0.5) * 0.6 + 0.4;
    const driftEvents = Math.floor((4 + Math.random() * 5) * driftIntensity);
    
    // Drift left sometimes
    generateTypedEventsScaled(
      events,
      posProfile.baseX - 3 + Math.random() * 2,
      3 + Math.random() * 2, // Left channel
      3,
      2,
      Math.floor(driftEvents * 0.5),
      "touch",
      0.6,
    );
    // Drift right sometimes  
    generateTypedEventsScaled(
      events,
      posProfile.baseX - 3 + Math.random() * 2,
      12 - Math.random() * 2, // Right channel
      3,
      2,
      Math.floor(driftEvents * 0.5),
      "touch",
      0.6,
    );
    // Half-space left
    generateTypedEventsScaled(
      events,
      posProfile.baseX - 2,
      5 + Math.random() * 2,
      2.5,
      1.8,
      Math.floor(driftEvents * 0.3),
      "pass_received",
      0.5,
    );
    // Half-space right
    generateTypedEventsScaled(
      events,
      posProfile.baseX - 2,
      10 - Math.random() * 2,
      2.5,
      1.8,
      Math.floor(driftEvents * 0.3),
      "pass_received",
      0.5,
    );
  }

  // ================================
  // 16. REALISM: DEFENSIVE TRACKING BACK
  // ================================
  // Forwards track back on counter-attacks
  if (ctx.workRate > 0.3 && ["ST", "CF", "CAM", "LW", "RW"].includes(position)) {
    const trackBackEvents = Math.floor(ctx.workRate * 6);
    generateTypedEventsScaled(
      events,
      8 + Math.random() * 4, // Own half/midfield
      posProfile.baseY,
      5,
      4,
      trackBackEvents,
      "recovery",
      0.3,
    );
  }

  // ================================================================
  // 17. REALISM: PRESSING ALTO (for attackers)
  // ================================================================
  if (["ST", "CF", "LW", "RW"].includes(position)) {
    const pressingIntensity = ctx.workRate * 0.8 + 0.2;
    const highPressEvents = Math.floor((5 + Math.random() * 5) * pressingIntensity);
    
    // High pressing on opponent's build-up
    generateTypedEventsScaled(
      events,
      20 + Math.random() * 3,  // Opponent's defensive third
      OLD_CENTER_Y + (Math.random() - 0.5) * 8,
      4,
      5,
      highPressEvents,
      "pressure",
      0.6,
    );
  }

  // ================================================================
  // 18. REALISM: DEPTH RUNS (attackers making runs into channels)
  // ================================================================
  if (["ST", "CF"].includes(position)) {
    const depthRuns = Math.floor(3 + Math.random() * 4);
    
    // Runs through left channel
    generateTypedEventsScaled(
      events,
      20 + Math.random() * 2,
      4 + Math.random() * 2,  // Left channel
      2,
      1.5,
      Math.floor(depthRuns * 0.4),
      "touch",
      0.7,
    );
    // Runs through right channel
    generateTypedEventsScaled(
      events,
      20 + Math.random() * 2,
      11 - Math.random() * 2,  // Right channel
      2,
      1.5,
      Math.floor(depthRuns * 0.4),
      "touch",
      0.7,
    );
  }

  // 12. APPLY xT BOOST
  for (const ev of events) {
    ev.weight = applyXTBoost(ev);
  }

  // 13. ZONE CONTEXT MULTIPLIERS
  for (const ev of events) {
    if (ev.x > HEATMAP_WIDTH * 0.66)
      ev.weight *= CONTEXT_MULTIPLIERS.inFinalThird;
    if (
      ev.x > HEATMAP_WIDTH * 0.83 &&
      ev.y > HEATMAP_HEIGHT * 0.21 &&
      ev.y < HEATMAP_HEIGHT * 0.79
    ) {
      ev.weight *= CONTEXT_MULTIPLIERS.inOpponentBox;
    }
  }

  // KDE with wider spread
  let grid = applyKDE(events, 5.5);

  // Add granular noise BEFORE blur for irregular, organic texture
  // This creates the "imperfect" look of real heatmaps
  for (let y = 0; y < HEATMAP_HEIGHT; y++) {
    for (let x = 0; x < HEATMAP_WIDTH; x++) {
      if (grid[y][x] > 0.01) {
        // Multiplicative noise: varies cell values by ±25%
        const noise = 0.75 + Math.random() * 0.5;
        grid[y][x] *= noise;
        
        // Occasional "dead spots" within active areas (5% chance)
        if (Math.random() < 0.05 && grid[y][x] < 0.3) {
          grid[y][x] *= 0.3;
        }
      }
    }
  }

  // Very light blur - just enough to connect, not smooth everything
  grid = applyGaussianBlur(grid, 0.6);

  // Add edge irregularity: random boost/reduction at borders of activity
  for (let y = 1; y < HEATMAP_HEIGHT - 1; y++) {
    for (let x = 1; x < HEATMAP_WIDTH - 1; x++) {
      const val = grid[y][x];
      const neighbors = [
        grid[y-1][x], grid[y+1][x], grid[y][x-1], grid[y][x+1]
      ];
      const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / 4;
      
      // At edges (big difference from neighbors), add irregularity
      if (Math.abs(val - avgNeighbor) > 0.1) {
        grid[y][x] += (Math.random() - 0.5) * 0.15;
        grid[y][x] = Math.max(0, grid[y][x]);
      }
    }
  }

  // PERCENTILE NORMALIZATION
  return normalizePercentile(grid, 88);
};

// ============================================================================
// ACCUMULATION
// ============================================================================

export const accumulateHeatmap = (
  careerHeatmap: number[][] | undefined,
  matchHeatmap: number[][],
): number[][] => {
  const career = careerHeatmap || createEmptyHeatmap();
  const DECAY_FACTOR = 0.998;

  for (let y = 0; y < HEATMAP_HEIGHT; y++) {
    for (let x = 0; x < HEATMAP_WIDTH; x++) {
      career[y][x] = career[y][x] * DECAY_FACTOR + matchHeatmap[y][x];
    }
  }

  return career;
};

export const accumulateSeasonHeatmap = (
  player: Player,
  seasonMatches: number,
  seasonStats: {
    goals: number;
    assists: number;
    cleanSheets: number;
    tackles?: number;
    interceptions?: number;
    matchStats?: ExtendedMatchStats;
  },
): number[][] => {
  const careerHeatmap = player.careerHeatmap || createEmptyHeatmap();
  if (seasonMatches === 0) return careerHeatmap;

  const avgGoals = seasonStats.goals / seasonMatches;
  const avgAssists = seasonStats.assists / seasonMatches;
  const avgCleanSheets = seasonStats.cleanSheets / seasonMatches;
  const avgTackles = (seasonStats.tackles || 0) / seasonMatches;
  const avgInterceptions = (seasonStats.interceptions || 0) / seasonMatches;

  const ms = seasonStats.matchStats;
  const avgDribbles = ms ? (ms.dribbles || 0) / seasonMatches : 0;

  const seasonHeatmap = generateMatchHeatmap(player, {
    goals: avgGoals,
    assists: avgAssists,
    tackles: avgTackles,
    interceptions: avgInterceptions,
    cleanSheet: avgCleanSheets > 0.3,
    dribbles: avgDribbles,
  });

  // Scale by matches
  for (let y = 0; y < HEATMAP_HEIGHT; y++) {
    for (let x = 0; x < HEATMAP_WIDTH; x++) {
      seasonHeatmap[y][x] *= seasonMatches * 0.3;
    }
  }

  return accumulateHeatmap(careerHeatmap, seasonHeatmap);
};

// ============================================================================
// END OF FILE - All exports are inline
// ============================================================================
