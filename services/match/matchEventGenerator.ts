/**
 * MATCH EVENT GENERATOR - v0.5.3
 * 
 * Centralized system for generating match events with field coordinates.
 * This is the SINGLE SOURCE OF TRUTH for player positioning data.
 * Heatmap and shot map derive from these events.
 */

import { Player, PositionDetail } from "../../types";
import { getHeatmapProfileModifiers } from "../heatmapProfileIntegration";
import type { 
  FieldCoordinate, 
  MatchEvent, 
  MatchEventType, 
  PlayerMatchEventLog,
  EventOutcome 
} from "./types";

// Grid dimensions
const GRID_WIDTH = 99;  // 0-98 (length)
const GRID_HEIGHT = 61; // 0-60 (width)

/**
 * Base positions for each role on a 99x61 grid
 * X: 0 = own goal line, 98 = opponent goal line
 * Y: 0 = left touchline, 60 = right touchline
 */
const POSITION_BASE: Record<PositionDetail, FieldCoordinate> = {
  GK: { x: 5, y: 30 },
  CB: { x: 18, y: 30 },
  LB: { x: 22, y: 8 },
  RB: { x: 22, y: 52 },
  LWB: { x: 30, y: 6 },
  RWB: { x: 30, y: 54 },
  CDM: { x: 35, y: 30 },
  CM: { x: 50, y: 30 },
  LM: { x: 50, y: 10 },
  RM: { x: 50, y: 50 },
  CAM: { x: 65, y: 30 },
  LW: { x: 75, y: 8 },
  RW: { x: 75, y: 52 },
  CF: { x: 80, y: 30 },
  ST: { x: 85, y: 30 },
};

/**
 * Spread (standard deviation) for each event type
 * Higher values = more variation in position
 */
const EVENT_SPREAD: Partial<Record<MatchEventType, { x: number; y: number }>> = {
  touch: { x: 8, y: 6 },
  pass: { x: 10, y: 8 },
  pass_received: { x: 10, y: 8 },
  shot: { x: 6, y: 8 },  // Shots are more concentrated
  tackle: { x: 12, y: 10 },
  interception: { x: 10, y: 8 },
  dribble: { x: 8, y: 6 },
  aerial_duel: { x: 6, y: 5 },
  foul_committed: { x: 12, y: 10 },
  foul_received: { x: 10, y: 8 },
  run: { x: 15, y: 12 },
  set_piece: { x: 5, y: 4 },
  defensive_position: { x: 8, y: 6 },
  pressing: { x: 12, y: 10 },
  clearance: { x: 6, y: 4 },
  cross: { x: 5, y: 3 }, // Crosses are at the edges
  key_pass: { x: 8, y: 6 },
};

/**
 * Event type affects position on field (forward/back shift)
 */
const EVENT_POSITION_MODIFIER: Partial<Record<MatchEventType, { xShift: number; yShift: number }>> = {
  touch: { xShift: 0, yShift: 0 },
  pass: { xShift: 0, yShift: 0 },
  pass_received: { xShift: 0, yShift: 0 },
  shot: { xShift: 20, yShift: 0 },  // Shots are forward
  tackle: { xShift: -8, yShift: 0 },  // Tackles are defensive
  interception: { xShift: -5, yShift: 0 },
  dribble: { xShift: 5, yShift: 0 },
  aerial_duel: { xShift: 0, yShift: 0 },
  foul_committed: { xShift: -3, yShift: 0 },
  foul_received: { xShift: 5, yShift: 0 },
  run: { xShift: 0, yShift: 0 },
  set_piece: { xShift: 0, yShift: 0 },
  defensive_position: { xShift: -10, yShift: 0 },
  pressing: { xShift: 8, yShift: 0 },
  clearance: { xShift: -15, yShift: 0 },
  cross: { xShift: 15, yShift: 0 },  // Crosses are forward
  key_pass: { xShift: 12, yShift: 0 },  // Key passes are in attacking third
};

export class MatchEventGenerator {
  /**
   * Generate a coordinate for an event based on player profile and event type
   */
  static generateEventCoordinate(
    player: Player,
    eventType: MatchEventType
  ): FieldCoordinate {
    const pos = player.position;
    const basePos = POSITION_BASE[pos] || POSITION_BASE.CM;
    const spread = EVENT_SPREAD[eventType] || { x: 8, y: 6 };
    const modifier = EVENT_POSITION_MODIFIER[eventType] || { xShift: 0, yShift: 0 };
    
    // Get tactical profile
    const { styleModifier, tacticalTendencies } = getHeatmapProfileModifiers(player);
    
    // Start from base position
    let x = basePos.x;
    let y = basePos.y;
    
    // Apply tactical tendencies (search in ENGLISH as per type definition)
    const tendencyStrings = (tacticalTendencies || []).map(t => 
      typeof t === 'string' ? t : ''
    );
    
    // "Hugs Touchline" - push to sideline
    if (tendencyStrings.includes("Hugs Touchline")) {
      if (pos.startsWith("L")) {
        y = 3; // Left sideline
      } else if (pos.startsWith("R")) {
        y = 57; // Right sideline
      }
    }
    
    // "Stays Central" - pull to center
    if (tendencyStrings.includes("Stays Central")) {
      y = 30; // Center of field
    }
    
    // "Cuts Inside" - inside forward behavior
    if (tendencyStrings.includes("Cuts Inside")) {
      if (pos.startsWith("L")) {
        y = Math.min(y + 12, 30); // Push towards center
      } else if (pos.startsWith("R")) {
        y = Math.max(y - 12, 30); // Push towards center
      }
    }
    
    // "Attacks Depth" - push forward
    if (tendencyStrings.includes("Attacks Depth")) {
      x = Math.min(x + 10, 90);
    }
    
    // "Drops Deep" - drop back
    if (tendencyStrings.includes("Drops Deep")) {
      x = Math.max(x - 10, 10);
    }
    
    // "Makes Overlapping Runs" - wide and forward for fullbacks
    if (tendencyStrings.includes("Makes Overlapping Runs") && 
        ["LB", "RB", "LWB", "RWB"].includes(pos)) {
      x = Math.min(x + 15, 85);
    }
    
    // "Roams From Position" - add extra spread
    const roamsFromPosition = tendencyStrings.includes("Roams From Position");
    const spreadMultiplier = roamsFromPosition ? 1.5 : 1.0;
    
    // Apply style modifiers
    // verticalShift: positive = forward, negative = backward
    x += styleModifier.verticalShift * 12;
    
    // horizontalBias: positive = wide, negative = central
    if (styleModifier.horizontalBias !== 0) {
      const centerY = 30;
      const distFromCenter = y - centerY;
      // Push towards or away from center
      y = centerY + distFromCenter * (1 + styleModifier.horizontalBias * 0.4);
    }
    
    // Apply event type modifier
    x += modifier.xShift;
    y += modifier.yShift;
    
    // Apply random spread (using triangular distribution for more central clustering)
    const randomX = (Math.random() + Math.random() - 1) * spread.x * spreadMultiplier;
    const randomY = (Math.random() + Math.random() - 1) * spread.y * spreadMultiplier;
    
    x += randomX;
    y += randomY;
    
    // Clamp to field bounds
    return {
      x: Math.max(0, Math.min(GRID_WIDTH - 1, Math.round(x))),
      y: Math.max(0, Math.min(GRID_HEIGHT - 1, Math.round(y))),
    };
  }
  
  /**
   * Generate special coordinate for shots (aligned with player's activity zones)
   * Shots should occur in areas where the player naturally operates
   */
  static generateShotCoordinate(
    player: Player,
    isInsideBox: boolean
  ): FieldCoordinate {
    const pos = player.position;
    const basePos = POSITION_BASE[pos] || POSITION_BASE.CM;
    const isLeft = pos.startsWith("L");
    const isRight = pos.startsWith("R");
    
    // Box-Muller gaussian for natural scatter (not linear)
    const gaussianRandom = (): number => {
      const u1 = Math.random() || 0.0001;
      const u2 = Math.random();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    
    // Get tactical profile
    const { styleModifier, tacticalTendencies } = getHeatmapProfileModifiers(player);
    const tendencyStrings = (tacticalTendencies || []).map(t => 
      typeof t === 'string' ? t : ''
    );
    
    // Calculate Y-bias based on player's natural lane
    let baseY = basePos.y;
    
    // Apply tactical tendencies
    if (tendencyStrings.includes("Hugs Touchline")) {
      baseY = isLeft ? 8 : 52;
    }
    if (tendencyStrings.includes("Cuts Inside")) {
      baseY = isLeft ? 22 : 38;
    }
    if (tendencyStrings.includes("Stays Central")) {
      baseY = 30;
    }
    
    let x: number;
    let y: number;
    
    if (isInsideBox) {
      // Inside the box (x: 82-98) with gaussian X variation
      x = 88 + gaussianRandom() * 7;
      
      // Random center offset to BREAK horizontal line patterns
      // Each shot has its center shifted randomly
      const centerOffset = (Math.random() - 0.5) * 16; // ±8 units offset
      
      // Y position with varied center point
      if (isLeft) {
        // LW/LM - base centers vary between 18-32
        const baseCenter = 22 + centerOffset;
        y = baseCenter + gaussianRandom() * 10;
        if (tendencyStrings.includes("Cuts Inside")) {
          y = (28 + centerOffset * 0.5) + gaussianRandom() * 10;
        }
      } else if (isRight) {
        // RW/RM - base centers vary between 30-46
        const baseCenter = 38 + centerOffset;
        y = baseCenter + gaussianRandom() * 10;
        if (tendencyStrings.includes("Cuts Inside")) {
          y = (32 + centerOffset * 0.5) + gaussianRandom() * 10;
        }
      } else {
        // Central players - spread across 20-40
        y = 30 + centerOffset + gaussianRandom() * 12;
      }
    } else {
      // Outside box shots - varied center
      x = 70 + Math.random() * 18; // Uniform random for more spread
      
      const centerOffset = (Math.random() - 0.5) * 20; // ±10 units
      y = baseY + centerOffset + gaussianRandom() * 10;
      
      // Wide players who cut inside
      if ((isLeft || isRight) && tendencyStrings.includes("Cuts Inside")) {
        y = 30 + centerOffset + gaussianRandom() * 12;
      }
    }
    
    // Additional strong noise for organic feel
    y += (Math.random() - 0.5) * 10;  // ±5 uniform noise
    x += gaussianRandom() * 3;
    
    return {
      x: Math.max(0, Math.min(GRID_WIDTH - 1, Math.round(x))),
      y: Math.max(0, Math.min(GRID_HEIGHT - 1, Math.round(y))),
    };
  }
  
  /**
   * Generate coordinate for defensive actions
   */
  static generateDefensiveCoordinate(
    player: Player,
    eventType: "tackle" | "interception" | "clearance"
  ): FieldCoordinate {
    const pos = player.position;
    const basePos = POSITION_BASE[pos] || POSITION_BASE.CM;
    
    // Defensive actions happen in own half more often
    let x = Math.min(basePos.x, 50) - Math.random() * 15;
    let y = basePos.y + (Math.random() - 0.5) * 20;
    
    // Clearances are closer to goal
    if (eventType === "clearance") {
      x = 5 + Math.random() * 18;
      y = 15 + Math.random() * 30;
    }
    
    return {
      x: Math.max(0, Math.min(GRID_WIDTH - 1, Math.round(x))),
      y: Math.max(0, Math.min(GRID_HEIGHT - 1, Math.round(y))),
    };
  }
  
  /**
   * Generate a complete event log for a match
   * CRITICAL: Real players have ~5000+ tracking points per game from GPS/video
   * We generate real events PLUS thousands of positional data points
   */
  static generateMatchEventLog(
    player: Player,
    stats: {
      shots: number;
      shotsOnTarget: number;
      goals: number;
      passes: number;
      passesCompleted: number;
      tackles: number;
      tacklesWon: number;
      interceptions: number;
      dribbles: number;
      dribblesSuccessful: number;
      clearances?: number;
      keyPasses?: number;
      assists?: number;
      foulsCommitted?: number;
      foulsSuffered?: number;
      aerialDuels?: number;
      aerialDuelsWon?: number;
      goalsInsideBox?: number;
      goalsOutsideBox?: number;
    }
  ): PlayerMatchEventLog {
    const events: MatchEvent[] = [];
    const matchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const pos = player.position;
    const basePos = POSITION_BASE[pos] || POSITION_BASE.CM;
    
    // Get tactical modifiers
    const { styleModifier, tacticalTendencies } = getHeatmapProfileModifiers(player);
    const tendencyStrings = (tacticalTendencies || []).map(t => 
      typeof t === 'string' ? t : ''
    );
    
    // Calculate modified base position
    let modBaseX = basePos.x;
    let modBaseY = basePos.y;
    
    // Apply tactical tendencies
    if (tendencyStrings.includes("Hugs Touchline")) {
      modBaseY = pos.startsWith("L") ? 5 : 55;
    }
    if (tendencyStrings.includes("Stays Central")) {
      modBaseY = 30;
    }
    if (tendencyStrings.includes("Attacks Depth")) {
      modBaseX = Math.min(modBaseX + 12, 85);
    }
    if (tendencyStrings.includes("Drops Deep")) {
      modBaseX = Math.max(modBaseX - 12, 10);
    }
    if (tendencyStrings.includes("Cuts Inside")) {
      if (pos.startsWith("L")) modBaseY = Math.min(modBaseY + 15, 30);
      else if (pos.startsWith("R")) modBaseY = Math.max(modBaseY - 15, 30);
    }
    
    // Apply style modifiers
    modBaseX += styleModifier.verticalShift * 12;
    
    // Clamp base position
    modBaseX = Math.max(5, Math.min(93, modBaseX));
    modBaseY = Math.max(5, Math.min(55, modBaseY));
    
    // ========================================================================
    // GENERATE MASSIVE TRACKING POINTS (like real GPS data)
    // ========================================================================
    // A real match has ~54,000 tracking points (every 0.1s for 90min)
    // We generate 2000-3000 to create realistic heatmap
    
    const isGoalkeeper = pos === "GK";
    const isDefender = ["CB", "LB", "RB", "LWB", "RWB"].includes(pos);
    const isMidfielder = ["CDM", "CM", "CAM", "LM", "RM"].includes(pos);
    const isAttacker = ["LW", "RW", "CF", "ST"].includes(pos);
    const isWide = pos.startsWith("L") || pos.startsWith("R");
    
    // Box-Muller transform for Gaussian distribution
    const gaussianRandom = (mean: number, stdDev: number): number => {
      const u1 = Math.random() || 0.0001;
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mean + z * stdDev;
    };
    
    // Total tracking points - more for realistic density
    const totalTrackingPoints = 2500 + Math.floor(Math.random() * 1000);
    
    // ========================================================================
    // CREATE MULTIPLE ORGANIC HOTSPOTS
    // ========================================================================
    // Real players have 2-4 main activity zones with organic irregular shapes
    
    interface Hotspot {
      x: number;
      y: number;
      weight: number; // How many points to generate around this
      spreadX: number;
      spreadY: number;
    }
    
    const hotspots: Hotspot[] = [];
    
    // PRIMARY HOTSPOT - main position
    hotspots.push({
      x: modBaseX,
      y: modBaseY,
      weight: 0.45,
      spreadX: isWide ? 10 : 14,
      spreadY: isWide ? 8 : 12,
    });
    
    // SECONDARY HOTSPOT - defensive responsibility zone
    if (isDefender || isMidfielder) {
      hotspots.push({
        x: Math.max(10, modBaseX - 15 - Math.random() * 10),
        y: modBaseY + (Math.random() - 0.5) * 15,
        weight: 0.18,
        spreadX: 12,
        spreadY: 10,
      });
    } else {
      // Attackers have secondary zone slightly back and central
      hotspots.push({
        x: modBaseX - 10 - Math.random() * 15,
        y: 30 + (Math.random() - 0.5) * 15,
        weight: 0.12,
        spreadX: 10,
        spreadY: 12,
      });
    }
    
    // ATTACKING HOTSPOT - runs into attack
    if (!isGoalkeeper) {
      const attackX = isAttacker 
        ? 75 + Math.random() * 18
        : isDefender 
          ? 45 + Math.random() * 20
          : 60 + Math.random() * 25;
      const attackY = isWide 
        ? (pos.startsWith("L") ? 8 + Math.random() * 15 : 45 + Math.random() * 12)
        : 25 + Math.random() * 15;
      
      hotspots.push({
        x: Math.min(93, attackX),
        y: attackY,
        weight: isAttacker ? 0.20 : 0.10,
        spreadX: 12,
        spreadY: 10,
      });
    }
    
    // WIDE CORRIDOR HOTSPOT for wide players
    if (isWide && !isGoalkeeper) {
      const sideY = pos.startsWith("L") ? 5 + Math.random() * 8 : 52 + Math.random() * 8;
      hotspots.push({
        x: 35 + Math.random() * 40,
        y: sideY,
        weight: 0.15,
        spreadX: 18,
        spreadY: 5, // Narrow horizontal spread to stay on sideline
      });
    }
    
    // DEFENSIVE AREA HOTSPOT
    if (!isAttacker) {
      hotspots.push({
        x: 15 + Math.random() * 15,
        y: modBaseY + (Math.random() - 0.5) * 20,
        weight: isDefender ? 0.15 : 0.08,
        spreadX: 10,
        spreadY: 12,
      });
    }
    
    // Normalize weights
    const totalWeight = hotspots.reduce((sum, h) => sum + h.weight, 0);
    hotspots.forEach(h => h.weight /= totalWeight);
    
    // ========================================================================
    // GENERATE POINTS FROM HOTSPOTS (Gaussian distribution)
    // ========================================================================
    
    for (const hotspot of hotspots) {
      const pointCount = Math.floor(totalTrackingPoints * hotspot.weight);
      
      for (let i = 0; i < pointCount; i++) {
        // Gaussian distribution around hotspot center
        const px = gaussianRandom(hotspot.x, hotspot.spreadX);
        const py = gaussianRandom(hotspot.y, hotspot.spreadY);
        
        // Add slight noise for texture
        const noiseX = (Math.random() - 0.5) * 3;
        const noiseY = (Math.random() - 0.5) * 2;
        
        events.push({
          type: "run",
          minute: Math.floor(Math.random() * 90) + 1,
          position: {
            x: Math.max(0, Math.min(98, Math.round(px + noiseX))),
            y: Math.max(0, Math.min(60, Math.round(py + noiseY))),
          },
          outcome: "neutral",
        });
      }
    }
    
    // ========================================================================
    // ADD TRANSITION/MOVEMENT LINES (organic paths across field)
    // ========================================================================
    
    const transitionPaths = 8 + Math.floor(Math.random() * 12);
    for (let t = 0; t < transitionPaths; t++) {
      // Random path from one zone to another
      const startHotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
      const endHotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
      
      const pathSteps = 15 + Math.floor(Math.random() * 25);
      for (let s = 0; s < pathSteps; s++) {
        const progress = s / pathSteps;
        const px = startHotspot.x + (endHotspot.x - startHotspot.x) * progress;
        const py = startHotspot.y + (endHotspot.y - startHotspot.y) * progress;
        
        // Add perpendicular noise to make path curved
        const perpX = (Math.random() - 0.5) * 8;
        const perpY = (Math.random() - 0.5) * 6;
        
        events.push({
          type: "run",
          minute: Math.floor(Math.random() * 90) + 1,
          position: {
            x: Math.max(0, Math.min(98, Math.round(px + perpX))),
            y: Math.max(0, Math.min(60, Math.round(py + perpY))),
          },
          outcome: "neutral",
        });
      }
    }
    
    // ========================================================================
    // ADD SPARSE RANDOM ACTIVITY (organic texture everywhere)
    // ========================================================================
    
    const sparsePoints = Math.floor(totalTrackingPoints * 0.05);
    for (let i = 0; i < sparsePoints; i++) {
      // Biased random - more likely in player's half of field based on role
      let rx: number, ry: number;
      
      if (isDefender) {
        rx = Math.random() * 60; // Own half mostly
        ry = Math.random() * 60;
      } else if (isAttacker) {
        rx = 25 + Math.random() * 73; // Attacking half mostly
        ry = Math.random() * 60;
      } else {
        rx = 10 + Math.random() * 80; // Midfielders cover more
        ry = Math.random() * 60;
      }
      
      events.push({
        type: "run",
        minute: Math.floor(Math.random() * 90) + 1,
        position: {
          x: Math.max(0, Math.min(98, Math.round(rx))),
          y: Math.max(0, Math.min(60, Math.round(ry))),
        },
        outcome: "neutral",
      });
    }
    
    // ========================================================================
    // GENERATE BALL-TOUCH EVENTS (from actual stats)
    // ========================================================================
    
    // Shot events
    const goalsInsideBox = stats.goalsInsideBox || Math.floor(stats.goals * 0.7);
    let goalsRemaining = stats.goals;
    let shotsOnTargetRemaining = stats.shotsOnTarget - stats.goals;
    
    for (let i = 0; i < stats.shots; i++) {
      const isInsideBox = i < Math.ceil(stats.shots * 0.6);
      const position = this.generateShotCoordinate(player, isInsideBox);
      
      let outcome: EventOutcome = "failure";
      let detail = "off_target";
      
      if (goalsRemaining > 0 && Math.random() < (stats.goals / Math.max(1, stats.shots))) {
        outcome = "success";
        detail = "goal";
        goalsRemaining--;
      } else if (shotsOnTargetRemaining > 0 && Math.random() < 0.5) {
        detail = "on_target";
        shotsOnTargetRemaining--;
      } else if (Math.random() < 0.3) {
        detail = "blocked";
      }
      
      events.push({
        type: "shot",
        minute: Math.floor(Math.random() * 90) + 1,
        position,
        outcome,
        detail,
      });
    }
    
    // Pass events (each pass also creates a position point)
    for (let i = 0; i < stats.passes; i++) {
      const isCompleted = i < stats.passesCompleted;
      const isKeyPass = stats.keyPasses && i < stats.keyPasses;
      
      events.push({
        type: isKeyPass ? "key_pass" : "pass",
        minute: Math.floor(Math.random() * 90) + 1,
        position: this.generateEventCoordinate(player, isKeyPass ? "key_pass" : "pass"),
        outcome: isCompleted ? "success" : "failure",
        detail: stats.assists && i < stats.assists ? "assist" : undefined,
      });
    }
    
    // Tackle events
    for (let i = 0; i < stats.tackles; i++) {
      events.push({
        type: "tackle",
        minute: Math.floor(Math.random() * 90) + 1,
        position: this.generateDefensiveCoordinate(player, "tackle"),
        outcome: i < stats.tacklesWon ? "success" : "failure",
      });
    }
    
    // Interception events
    for (let i = 0; i < stats.interceptions; i++) {
      events.push({
        type: "interception",
        minute: Math.floor(Math.random() * 90) + 1,
        position: this.generateDefensiveCoordinate(player, "interception"),
        outcome: "success",
      });
    }
    
    // Dribble events
    for (let i = 0; i < stats.dribbles; i++) {
      events.push({
        type: "dribble",
        minute: Math.floor(Math.random() * 90) + 1,
        position: this.generateEventCoordinate(player, "dribble"),
        outcome: i < stats.dribblesSuccessful ? "success" : "failure",
      });
    }
    
    // Clearance events
    const clearances = stats.clearances || 0;
    for (let i = 0; i < clearances; i++) {
      events.push({
        type: "clearance",
        minute: Math.floor(Math.random() * 90) + 1,
        position: this.generateDefensiveCoordinate(player, "clearance"),
        outcome: "success",
      });
    }
    
    // Aerial duels
    const aerialDuels = stats.aerialDuels || 0;
    const aerialDuelsWon = stats.aerialDuelsWon || 0;
    for (let i = 0; i < aerialDuels; i++) {
      events.push({
        type: "aerial_duel",
        minute: Math.floor(Math.random() * 90) + 1,
        position: this.generateEventCoordinate(player, "aerial_duel"),
        outcome: i < aerialDuelsWon ? "success" : "failure",
      });
    }
    
    // Sort by minute
    events.sort((a, b) => a.minute - b.minute);
    
    return {
      matchId,
      events,
      totalTouches: events.filter(e => 
        ["pass", "dribble", "shot", "key_pass", "cross"].includes(e.type)
      ).length,
      totalPasses: stats.passes,
      totalShots: stats.shots,
      totalDefensiveActions: stats.tackles + stats.interceptions + clearances,
    };
  }
}
