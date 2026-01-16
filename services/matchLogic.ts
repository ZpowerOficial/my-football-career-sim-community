import {
  Player,
  CareerEvent,
  Tactic,
  ExtendedMatchStats,
  PlayerStats,
  MatchLog,
  MatchSimulation,
} from "../types";
import { randFloat, clamp } from "./utils";
import { MatchContextEngine } from "./match/contextEngine";
import { MatchSimulationEngine } from "./match/simulationEngine";
import { SeasonStatsAggregator } from "./match/statsAggregator";
import { CareerEventGenerator } from "./match/eventGenerator";
import { CleanSheetCalculator } from "./match/cleanSheetCalculator";
import { createEmptyMatchStats } from "./match/utils";
import { BalancedGameConstants } from "./match/constants";
import {
  createEmptyHeatmap,
  accumulateHeatmap,
  HEATMAP_WIDTH,
  HEATMAP_HEIGHT,
} from "./heatmapSystem";
import { getHeatmapProfileModifiers } from "./heatmapProfileIntegration";
import { MatchEventGenerator } from "./match/matchEventGenerator";

// ==================== FUNÇÃO PRINCIPAL DE PERFORMANCE ====================

export const calculateDetailedPerformance = (
  player: Player,
  gamesPlayed: number,
  performanceModifier: number,
  tactic: Tactic,
  existingMatchLogs?: MatchLog[],
): {
  goals: number;
  assists: number;
  cleanSheets: number;
  matchStats: ExtendedMatchStats;
  events: CareerEvent[];
  matchLogs: MatchLog[];
  seasonHeatmap: number[][]; // v0.5.2: Per-match accumulated heatmap
} => {
  if (gamesPlayed === 0) {
    return {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      matchStats: createEmptyMatchStats(),
      events: [],
      matchLogs: [],
      seasonHeatmap: createEmptyHeatmap(),
    };
  }

  const matches: MatchSimulation[] = [];
  const generatedMatchLogs: MatchLog[] = [];

  // v0.5.2: Accumulate heatmap from each individual match
  let seasonHeatmap = createEmptyHeatmap();

  for (let i = 0; i < gamesPlayed; i++) {
    const context = MatchContextEngine.generateContext(player.team, i);

    let matchSim: MatchSimulation;

    // Use existing log if available to ensure consistency
    if (existingMatchLogs && existingMatchLogs[i]) {
      const log = existingMatchLogs[i];
      matchSim = MatchSimulationEngine.simulateCompleteMatch(player, context, {
        goals: log.goals,
        assists: log.assists,
        rating: log.rating,
        goalsConceded: log.opponentScore,
        // v0.5.2: Passa placar completo para gols decisivos
        teamScore: log.teamScore,
        opponentScore: log.opponentScore,
      });
    } else {
      matchSim = MatchSimulationEngine.simulateCompleteMatch(player, context);
    }

    matches.push(matchSim);

    // ========================================================================
    // 🎯 v0.5.3: SHOT HISTORY FROM MATCH EVENTS
    // ========================================================================
    // Note: Heatmap rendering is done in PlayerHeatmap.tsx using proper KDE.
    // Here we only update shotHistory from simulated events for shot map.
    
    // Generate event log for shot data only
    const eventLog = MatchEventGenerator.generateMatchEventLog(player, {
      shots: matchSim.shots,
      shotsOnTarget: matchSim.shotsOnTarget,
      goals: matchSim.goals,
      passes: matchSim.passes,
      passesCompleted: matchSim.passesCompleted,
      tackles: matchSim.tackles,
      tacklesWon: matchSim.tacklesWon,
      interceptions: matchSim.interceptions,
      dribbles: matchSim.dribbles,
      dribblesSuccessful: matchSim.dribblesSucceeded,
      clearances: matchSim.clearances,
      keyPasses: matchSim.keyPasses,
      assists: matchSim.assists,
      foulsCommitted: (matchSim as any).foulsCommitted ?? 0,
      foulsSuffered: (matchSim as any).foulsSuffered ?? 0,
      aerialDuels: matchSim.aerialDuels,
      aerialDuelsWon: matchSim.aerialDuelsWon,
      goalsInsideBox: matchSim.goalsInsideBox,
      goalsOutsideBox: matchSim.goalsOutsideBox,
    });
    
    // Update player's shot history from events
    const shotEvents = eventLog.events.filter(e => e.type === "shot");
    if (!player.shotHistory) {
      player.shotHistory = [];
    }
    for (const shot of shotEvents) {
      player.shotHistory.push({
        x: shot.position.x,
        y: shot.position.y,
        isGoal: shot.detail === "goal",
        isOnTarget: shot.detail === "goal" || shot.detail === "on_target",
        minute: shot.minute,
      });
    }
    // Limit to 500 most recent shots
    if (player.shotHistory.length > 500) {
      player.shotHistory = player.shotHistory.slice(-500);
    }
    
    // Create empty heatmap for accumulation (will be blended below)
    const matchHeatmap = createEmptyHeatmap();

    // Accumulate this match into season
    seasonHeatmap = accumulateHeatmap(seasonHeatmap, matchHeatmap);

    generatedMatchLogs.push({
      age: player.age,
      team: player.team,
      opponent: `Opponent (Rep: ${context.oppositionQuality.toFixed(0)})`,
      competition: context.matchImportance,
      goals: matchSim.goals,
      assists: matchSim.assists,
      rating: matchSim.rating,
      isNationalTeam: false,
      matchStats: matchSim,
    });
  }

  const extendedStats = SeasonStatsAggregator.aggregateSeasonStats(
    matches,
    gamesPlayed,
    player,
  );

  const cleanSheets =
    player.position === "GK"
      ? CleanSheetCalculator.calculateCleanSheets(player, gamesPlayed)
      : 0;
  const events = CareerEventGenerator.generateSeasonEvents(
    extendedStats,
    player,
    gamesPlayed,
  );

  return {
    goals: extendedStats.goals,
    assists: extendedStats.assists,
    cleanSheets,
    matchStats: extendedStats,
    events,
    matchLogs: generatedMatchLogs,
    seasonHeatmap, // v0.5.2: Return accumulated match heatmaps
  };
};

// ==================== PROGRESSÃƒO DE TEMPORADA ====================

export const calculateSeasonProgression = (
  player: Player,
  matchesPlayed: number,
  performanceStats: ExtendedMatchStats,
): { statChanges: Partial<PlayerStats>; events: string[] } => {
  const statChanges: Partial<PlayerStats> = {};
  const events: string[] = [];

  if (matchesPlayed === 0) return { statChanges, events };

  const { stats, age, position, potential } = player;

  const expectedGoals =
    BalancedGameConstants.EXPECTED_GOALS_PER_MATCH[position];
  const expectedAssists =
    BalancedGameConstants.EXPECTED_ASSISTS_PER_MATCH[position];
  const goalsRatio =
    Number(performanceStats.goalsPerMatch) / Math.max(0.01, expectedGoals);
  const assistsRatio =
    Number(performanceStats.assists) /
    matchesPlayed /
    Math.max(0.01, expectedAssists);
  const performanceRatio = (goalsRatio + assistsRatio) / 2;

  let baseGrowth = 0;

  if (age < player.peakAgeEnd && potential > stats.overall) {
    const potentialGap = potential - stats.overall;
    const ageProgress = (age - 16) / (player.peakAgeEnd - 16);
    const diminishingFactor = 1 - ageProgress * 0.6;

    baseGrowth = (potentialGap / 8) * diminishingFactor;
    baseGrowth *= 0.5 + matchesPlayed / 80;
    baseGrowth *= 0.7 + performanceRatio * 0.6;
    baseGrowth *= randFloat(0.85, 1.15);
  }

  if (age > player.peakAgeEnd) {
    const yearsPostPeak = age - player.peakAgeEnd;
    baseGrowth = -Math.max(1, yearsPostPeak * 0.8) * randFloat(0.9, 1.1);
  }

  if (Math.abs(baseGrowth) >= 0.3) {
    const physicalGrowth = baseGrowth * (age <= 28 ? 1.0 : 0.6);
    const technicalGrowth = baseGrowth * 0.9;
    const mentalGrowth = baseGrowth * (age >= 25 ? 1.1 : 0.85);

    if (stats.pace !== undefined)
      statChanges.pace = clamp(stats.pace + physicalGrowth * 0.8, 10, 99);
    if (stats.shooting !== undefined)
      statChanges.shooting = clamp(
        stats.shooting + technicalGrowth * 1.0,
        10,
        99,
      );
    if (stats.passing !== undefined)
      statChanges.passing = clamp(
        stats.passing + technicalGrowth * 0.9,
        10,
        99,
      );
    if (stats.dribbling !== undefined)
      statChanges.dribbling = clamp(
        stats.dribbling + technicalGrowth * 0.85,
        10,
        99,
      );
    if (stats.defending !== undefined)
      statChanges.defending = clamp(
        stats.defending + technicalGrowth * 0.7,
        10,
        99,
      );
    if (stats.physical !== undefined)
      statChanges.physical = clamp(stats.physical + physicalGrowth, 10, 99);
    if (stats.composure !== undefined)
      statChanges.composure = clamp(stats.composure + mentalGrowth, 10, 99);

    if (baseGrowth > 1)
      events.push(
        `ðŸ’« Strong development: +${Math.round(baseGrowth)} overall growth`,
      );
    else if (baseGrowth < -1)
      events.push(
        `ðŸ“‰ Age decline: ${Math.round(baseGrowth)} overall decline`,
      );
  }

  if (performanceRatio >= 1.5)
    events.push(
      `ðŸŒŸ Outstanding season! Exceeded expectations significantly.`,
    );
  else if (performanceRatio >= 1.2)
    events.push(`âœ¨ Excellent season! Performed above expectations.`);
  else if (performanceRatio < 0.6)
    events.push(`âš ï¸ Below expectations. Needs to improve.`);

  return { statChanges, events };
};
