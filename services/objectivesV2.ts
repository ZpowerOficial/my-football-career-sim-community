import type {
  Player,
  PlayerGoal,
  ObjectiveBands,
  ObjectiveSeverity,
  ContextualCompetitionData,
} from "../types";
import { clamp } from "./utils";

// ==================== OBJECTIVES V2 (Expectations/Promises/Records/Milestones) ====================
// Design goals:
// - Coexist with legacy PlayerGoal system (fields are optional)
// - Audit-friendly with season-at-a-time simulation (no per-match history required)
// - Simulation-focused: expectations have ranges (failure/expected/stretch)

function getClubId(player: Player): string {
  return `club_${player.team.name.toLowerCase().replace(/\s/g, "_")}`;
}

function severityToPriority(sev: ObjectiveSeverity | undefined): PlayerGoal["priority"] {
  switch (sev) {
    case "high":
      return "Critical";
    case "medium":
      return "High";
    default:
      return "Medium";
  }
}

function makeBands(params: ObjectiveBands): ObjectiveBands {
  // Normalize to avoid invalid ranges (keep as optional; UI can handle missing).
  const b = { ...params };
  if (
    typeof b.expectedMin === "number" &&
    typeof b.expectedMax === "number" &&
    b.expectedMax < b.expectedMin
  ) {
    [b.expectedMin, b.expectedMax] = [b.expectedMax, b.expectedMin];
  }
  if (
    typeof b.stretchMin === "number" &&
    typeof b.stretchMax === "number" &&
    b.stretchMax < b.stretchMin
  ) {
    [b.stretchMin, b.stretchMax] = [b.stretchMax, b.stretchMin];
  }
  return b;
}

export function ensureObjectiveRecords(player: Player): Player {
  if (!player.records) player.records = {};
  if (!player.records.clubSeasonGoalsRecord) player.records.clubSeasonGoalsRecord = {};
  if (typeof player.records.playerSeasonGoalsRecord !== "number") {
    player.records.playerSeasonGoalsRecord = 0;
  }
  return player;
}

export function generateSeasonObjectivesV2(
  player: Player,
  currentSeason: number,
  context?: ContextualCompetitionData,
): PlayerGoal[] {
  const p = ensureObjectiveRecords({ ...player });
  const clubId = getClubId(p);

  const objectives: PlayerGoal[] = [];

  // Only generate once per season.
  const alreadyHasThisSeason = (p.playerGoals || []).some(
    (g) =>
      g.objectiveKind &&
      g.deadline?.kind === "season" &&
      g.deadline?.season === currentSeason &&
      // allow multiple objectives per season, but avoid duplicating whole pack
      (g.objectiveKind === "expectation" || g.objectiveKind === "promise"),
  );
  if (alreadyHasThisSeason) return [];

  const isGK = p.position === "GK";
  const isAttacker = ["ST", "CF", "LW", "RW"].includes(p.position);
  const isMid = ["CAM", "CM", "LM", "RM", "CDM"].includes(p.position);

  // ====== PLAYER EXPECTATIONS (2) ======
  // Derive baselines using reputation, squad status, and league tier.
  const clubTier = p.team.leagueTier || 3;
  const clubRep = p.team.reputation || 50;

  const statusFactor =
    p.squadStatus === "Captain" ? 1.25 : p.squadStatus === "Key Player" ? 1.15 : p.squadStatus === "Rotation" ? 0.9 : 0.75;

  const tierFactor = clamp(1.35 - (clubTier - 1) * 0.15, 0.8, 1.35);
  const repFactor = clamp(0.85 + clubRep / 200, 0.85, 1.35);

  const focus = p.seasonFocus;

  const baseGoalExpectation = Math.round(
    clamp((p.stats.shooting / 6) * statusFactor * tierFactor * repFactor, 3, 45),
  );
  const baseAssistExpectation = Math.round(
    clamp((p.stats.passing / 7) * statusFactor * tierFactor * repFactor, 2, 25),
  );

  const scoringBias = focus === "scoring" ? 1.12 : focus === "playmaking" ? 0.92 : 1.0;
  const assistBias = focus === "playmaking" ? 1.12 : focus === "scoring" ? 0.92 : 1.0;

  if (!isGK) {
    if (isAttacker) {
      const expectedMin = Math.max(5, Math.round(baseGoalExpectation * 0.8 * scoringBias));
      const expectedMax = Math.round(baseGoalExpectation * 1.15 * scoringBias);
      const stretchMin = Math.round(baseGoalExpectation * 1.3 * scoringBias);

      objectives.push({
        id: `v2_exp_goals_league_${currentSeason}_${Date.now()}`,
        description: "goals.v2.expectations.goalsLeague",
        descriptionParams: {
          club: p.team.name,
          fallbackText: `Score goals for ${p.team.name} this season. The club expects production.`,
        },
        type: "short-term",
        category: "Performance",
        isAchieved: false,
        progress: 0,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: p.team.name,
          leagueId: String(p.team.leagueTier),
          seasonStarted: currentSeason,
          requiresCurrentClub: true,
          requiresCurrentLeague: false,
        },
        priority: "High",
        difficulty: clamp(40 + clubTier * 8, 30, 85),
        estimatedSeasons: 1,
        rewards: {
          followerBoost: 0,
          moraleBoost: 0,
          reputationBoost: 0,
        },
        objectiveKind: "expectation",
        origin: "club",
        severity: p.team.leagueTier === 1 ? "high" : "medium",
        scope: "player",
        deadline: { kind: "season", season: currentSeason },
        bands: makeBands({
          failureMax: Math.max(0, expectedMin - 4),
          expectedMin,
          expectedMax,
          stretchMin,
        }),
        consequences: {
          clubApprovalDelta: 0,
          moraleDelta: 0,
          reputationDelta: 0,
          squadStatusRisk: "none",
        },
      });

      // Secondary: assists or G+A depending on focus.
      const expectedMinA = Math.max(3, Math.round(baseAssistExpectation * 0.7 * assistBias));
      const expectedMaxA = Math.round(baseAssistExpectation * 1.05 * assistBias);

      objectives.push({
        id: `v2_exp_assists_league_${currentSeason}_${Date.now()}`,
        description: "goals.v2.expectations.assistsLeague",
        descriptionParams: {
          club: p.team.name,
          fallbackText: `Create chances and provide assists for ${p.team.name} this season.`,
        },
        type: "short-term",
        category: "Performance",
        isAchieved: false,
        progress: 0,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: p.team.name,
          leagueId: String(p.team.leagueTier),
          seasonStarted: currentSeason,
          requiresCurrentClub: true,
          requiresCurrentLeague: false,
        },
        priority: "Medium",
        difficulty: clamp(35 + clubTier * 6, 25, 80),
        estimatedSeasons: 1,
        rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
        objectiveKind: "expectation",
        origin: "coach",
        severity: "medium",
        scope: "player",
        deadline: { kind: "season", season: currentSeason },
        bands: makeBands({
          failureMax: Math.max(0, expectedMinA - 3),
          expectedMin: expectedMinA,
          expectedMax: expectedMaxA,
          stretchMin: Math.round(expectedMaxA * 1.25),
        }),
        consequences: { squadStatusRisk: "none" },
      });
    } else if (isMid) {
      const expectedMinA = Math.max(4, Math.round(baseAssistExpectation * 0.85 * assistBias));
      const expectedMaxA = Math.round(baseAssistExpectation * 1.2 * assistBias);
      const stretchMinA = Math.round(baseAssistExpectation * 1.45 * assistBias);

      objectives.push({
        id: `v2_exp_assists_league_${currentSeason}_${Date.now()}`,
        description: "goals.v2.expectations.assistsLeague",
        descriptionParams: {
          club: p.team.name,
          fallbackText: `Be the creative engine for ${p.team.name}. Assists are your currency.`,
        },
        type: "short-term",
        category: "Performance",
        isAchieved: false,
        progress: 0,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: p.team.name,
          leagueId: String(p.team.leagueTier),
          seasonStarted: currentSeason,
          requiresCurrentClub: true,
          requiresCurrentLeague: false,
        },
        priority: "High",
        difficulty: clamp(40 + clubTier * 7, 30, 85),
        estimatedSeasons: 1,
        rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
        objectiveKind: "expectation",
        origin: "club",
        severity: p.team.leagueTier === 1 ? "high" : "medium",
        scope: "player",
        deadline: { kind: "season", season: currentSeason },
        bands: makeBands({
          failureMax: Math.max(0, expectedMinA - 3),
          expectedMin: expectedMinA,
          expectedMax: expectedMaxA,
          stretchMin: stretchMinA,
        }),
        consequences: { squadStatusRisk: "none" },
      });

      // Secondary: goals (midfielders still score)
      const expGmin = Math.max(2, Math.round(baseGoalExpectation * 0.5 * scoringBias));
      const expGmax = Math.round(baseGoalExpectation * 0.8 * scoringBias);
      objectives.push({
        id: `v2_exp_goals_league_${currentSeason}_${Date.now()}`,
        description: "goals.v2.expectations.goalsLeague",
        descriptionParams: {
          club: p.team.name,
          fallbackText: `Contribute goals for ${p.team.name}. Even midfielders should find the net.`,
        },
        type: "short-term",
        category: "Performance",
        isAchieved: false,
        progress: 0,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: p.team.name,
          leagueId: String(p.team.leagueTier),
          seasonStarted: currentSeason,
          requiresCurrentClub: true,
          requiresCurrentLeague: false,
        },
        priority: "Medium",
        difficulty: clamp(30 + clubTier * 6, 20, 75),
        estimatedSeasons: 1,
        rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
        objectiveKind: "expectation",
        origin: "coach",
        severity: "low",
        scope: "player",
        deadline: { kind: "season", season: currentSeason },
        bands: makeBands({
          failureMax: Math.max(0, expGmin - 2),
          expectedMin: expGmin,
          expectedMax: expGmax,
          stretchMin: Math.round(expGmax * 1.4),
        }),
        consequences: { squadStatusRisk: "none" },
      });
    } else {
      // Defenders: rating / team results can be used later. For now, use assists small + team objective will carry.
      objectives.push({
        id: `v2_exp_consistency_${currentSeason}_${Date.now()}`,
        description: "goals.v2.expectations.consistency",
        descriptionParams: {
          club: p.team.name,
          fallbackText: `Maintain consistent performances for ${p.team.name}. Reliability is key.`,
        },
        type: "short-term",
        category: "Performance",
        isAchieved: false,
        progress: 0,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: p.team.name,
          leagueId: String(p.team.leagueTier),
          seasonStarted: currentSeason,
          requiresCurrentClub: true,
          requiresCurrentLeague: false,
        },
        priority: "High",
        difficulty: clamp(35 + clubTier * 7, 25, 80),
        estimatedSeasons: 1,
        rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
        objectiveKind: "expectation",
        origin: "coach",
        severity: "medium",
        scope: "player",
        deadline: { kind: "season", season: currentSeason },
        // We measure via season rating; bands in 0-10 scale.
        bands: makeBands({
          failureMax: 6.4,
          expectedMin: 6.7,
          expectedMax: 7.3,
          stretchMin: 7.5,
        }),
        consequences: { squadStatusRisk: "none" },
      });
    }
  } else {
    // GK expectations: clean sheets proxy is totalCleanSheets (career), season data isn't passed; for now use rating.
    objectives.push({
      id: `v2_exp_gk_rating_${currentSeason}_${Date.now()}`,
      description: "goals.v2.expectations.gkRating",
      descriptionParams: {
        club: p.team.name,
        fallbackText: `Deliver strong goalkeeping performances for ${p.team.name} this season.`,
      },
      type: "short-term",
      category: "Performance",
      isAchieved: false,
      progress: 0,
      isActive: true,
      isExpired: false,
      context: {
        clubId,
        clubName: p.team.name,
        leagueId: String(p.team.leagueTier),
        seasonStarted: currentSeason,
        requiresCurrentClub: true,
        requiresCurrentLeague: false,
      },
      priority: "High",
      difficulty: clamp(40 + clubTier * 6, 30, 85),
      estimatedSeasons: 1,
      rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
      objectiveKind: "expectation",
      origin: "coach",
      severity: "medium",
      scope: "player",
      deadline: { kind: "season", season: currentSeason },
      bands: makeBands({
        failureMax: 6.3,
        expectedMin: 6.6,
        expectedMax: 7.2,
        stretchMin: 7.4,
      }),
      consequences: { squadStatusRisk: "none" },
    });
  }

  // ====== PROMISES (role guarantees) ======
  // If a club promised the player a role (Key Player etc.), expose it as a V2 objective.
  if (
    (p.roleGuaranteeSeasons && p.roleGuaranteeSeasons > 0) ||
    (p.roleGuaranteeMatches && p.roleGuaranteeMatches > 0) ||
    p.promisedSquadStatus
  ) {
    const promised = p.promisedSquadStatus || "Key Player";
    const matchesTarget =
      typeof p.roleGuaranteeMatches === "number" && p.roleGuaranteeMatches > 0
        ? p.roleGuaranteeMatches
        : promised === "Key Player"
          ? 20
          : 15;

    objectives.push({
      id: `v2_promise_role_${currentSeason}_${Date.now()}`,
      description: "goals.v2.promises.roleGuarantee",
      descriptionParams: {
        club: p.team.name,
        status: promised,
        matches: matchesTarget,
        fallbackText: `Promise to ${p.team.name}: be treated as ${promised}. Expected playing time: ${matchesTarget}+ matches this season.`,
      },
      type: "short-term",
      category: "Loyalty",
      isAchieved: false,
      progress: 0,
      isActive: true,
      isExpired: false,
      context: {
        clubId,
        clubName: p.team.name,
        leagueId: String(p.team.leagueTier),
        seasonStarted: currentSeason,
        requiresCurrentClub: true,
        requiresCurrentLeague: false,
      },
      targetValue: matchesTarget,
      currentValue: 0,
      startingValue: 0,
      priority: "Critical",
      difficulty: 70,
      estimatedSeasons: 1,
      rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
      objectiveKind: "promise",
      origin: "club",
      severity: "high",
      scope: "player",
      deadline: { kind: "season", season: currentSeason },
      bands: makeBands({
        failureMax: Math.max(0, Math.round(matchesTarget * 0.55)),
        expectedMin: Math.round(matchesTarget * 0.8),
        stretchMin: matchesTarget,
      }),
      consequences: { squadStatusRisk: "bench" },
    });
  }

  // ====== TEAM EXPECTATION (1) ======
  // Requires competition data (league position). If absent, skip.
  const league = context?.competitions?.find((c) => c.type === "League");
  const hasLeaguePosition = typeof league?.position === "number" && league.position! > 0;

  // We generate a team objective even without the position, but it will be evaluated when position exists.
  // Pick expectation based on club reputation/tier.
  const ambitious = p.team.leagueTier === 1 && p.team.reputation >= 80;
  const midTable = p.team.leagueTier <= 2 && p.team.reputation >= 65;
  const avoidRelegation = p.team.leagueTier >= 3 && p.team.reputation < 60;

  let expectedMaxPos = 0;
  let stretchMaxPos = 0;
  let failureMaxPos = 0;

  if (ambitious) {
    expectedMaxPos = 4;
    stretchMaxPos = 1;
    failureMaxPos = 8;
  } else if (midTable) {
    expectedMaxPos = 8;
    stretchMaxPos = 4;
    failureMaxPos = 12;
  } else if (avoidRelegation) {
    expectedMaxPos = 16;
    stretchMaxPos = 10;
    failureMaxPos = 18;
  } else {
    expectedMaxPos = 12;
    stretchMaxPos = 8;
    failureMaxPos = 16;
  }

  objectives.push({
    id: `v2_team_league_finish_${currentSeason}_${Date.now()}`,
    description: "goals.v2.team.leagueFinish",
    descriptionParams: {
      club: p.team.name,
      fallbackText: `Club expectation: finish the league season on target with ${p.team.name}.`,
    },
    type: "short-term",
    category: "Trophy",
    isAchieved: false,
    progress: 0,
    isActive: true,
    isExpired: false,
    context: {
      clubId,
      clubName: p.team.name,
      leagueId: String(p.team.leagueTier),
      seasonStarted: currentSeason,
      requiresCurrentClub: true,
      requiresCurrentLeague: false,
    },
    priority: ambitious ? "Critical" : "High",
    difficulty: ambitious ? 85 : midTable ? 70 : 55,
    estimatedSeasons: 1,
    rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
    objectiveKind: "expectation",
    origin: "club",
    severity: ambitious ? "high" : "medium",
    scope: "team",
    deadline: { kind: "season", season: currentSeason },
    // For team position, lower is better. We use bands with max thresholds.
    bands: makeBands({
      failureMax: failureMaxPos,
      expectedMax: expectedMaxPos,
      stretchMax: stretchMaxPos,
    }),
    currentValue: hasLeaguePosition ? league!.position : undefined,
    targetValue: expectedMaxPos,
    consequences: { squadStatusRisk: "none" },
  });

  // ====== RECORD CHASES ======
  // Club season goal record chase (dynamic). Only if attacker and already high reputation.
  if (isAttacker) {
    const clubRecord = p.records!.clubSeasonGoalsRecord![clubId] ?? 0;

    // "Historic" (91+) rare chase: only if player is elite.
    const elite = p.stats.overall >= 90 && (p.squadStatus === "Key Player" || p.squadStatus === "Captain");
    if (elite && !p.playerGoals.some((g) => g.id.startsWith("v2_record_historic_91"))) {
      objectives.push({
        id: `v2_record_historic_91_${currentSeason}_${Date.now()}`,
        description: "goals.v2.records.historicSeasonGoals",
        descriptionParams: {
          fallbackText: "Historic chase: 91+ goals in a single season. The entire football world is watching.",
        },
        type: "legacy",
        category: "Individual",
        isAchieved: false,
        progress: 0,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: p.team.name,
          leagueId: String(p.team.leagueTier),
          seasonStarted: currentSeason,
          requiresCurrentClub: false,
          requiresCurrentLeague: false,
        },
        priority: "Critical",
        difficulty: 99,
        estimatedSeasons: 1,
        rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
        objectiveKind: "legacy",
        origin: "press",
        severity: "high",
        scope: "player",
        deadline: { kind: "season", season: currentSeason },
        recordScope: "historic",
        targetValue: 91,
        currentValue: 0,
        bands: makeBands({ expectedMin: 91, expectedMax: 200 }),
        consequences: { squadStatusRisk: "none" },
      });
    }

    // Club record chase: show if record exists or reputation indicates strong club.
    if (clubRecord > 0 && !p.playerGoals.some((g) => g.id.startsWith("v2_record_club_season_goals"))) {
      objectives.push({
        id: `v2_record_club_season_goals_${currentSeason}_${Date.now()}`,
        description: "goals.v2.records.clubSeasonGoals",
        descriptionParams: {
          club: p.team.name,
          record: clubRecord,
          fallbackText: `Chase: break ${p.team.name}'s season scoring record (${clubRecord}).`,
        },
        type: "career",
        category: "Performance",
        isAchieved: false,
        progress: 0,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: p.team.name,
          leagueId: String(p.team.leagueTier),
          seasonStarted: currentSeason,
          requiresCurrentClub: true,
          requiresCurrentLeague: false,
        },
        priority: "High",
        difficulty: 85,
        estimatedSeasons: 1,
        rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
        objectiveKind: "record",
        origin: "fans",
        severity: "medium",
        scope: "player",
        deadline: { kind: "season", season: currentSeason },
        recordScope: "club",
        targetValue: clubRecord + 1,
        currentValue: 0,
        consequences: { squadStatusRisk: "none" },
      });
    }
  }

  // ====== CAREER MILESTONES (simple) ======
  // These can coexist with legacy milestones; we generate only if missing.
  const nextGoalMilestone = [50, 100, 150, 200, 250, 300, 400, 500].find((m) => p.totalGoals < m);
  if (nextGoalMilestone && !p.playerGoals.some((g) => g.id.startsWith("v2_milestone_goals_"))) {
    objectives.push({
      id: `v2_milestone_goals_${nextGoalMilestone}_${Date.now()}`,
      description: "goals.v2.milestones.careerGoals",
      descriptionParams: {
      target: nextGoalMilestone,
      fallbackText: `Career milestone: reach ${nextGoalMilestone} career goals.`,
    },
      type: "career",
      category: "Milestone",
      isAchieved: false,
      progress: clamp((p.totalGoals / nextGoalMilestone) * 100, 0, 100),
      isActive: true,
      isExpired: false,
      context: {
        seasonStarted: currentSeason,
        requiresCurrentClub: false,
        requiresCurrentLeague: false,
      },
      targetValue: nextGoalMilestone,
      currentValue: p.totalGoals,
      startingValue: p.totalGoals,
      priority: "Medium",
      difficulty: 55,
      estimatedSeasons: 3,
      rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
      objectiveKind: "milestone",
      origin: "self",
      severity: "low",
      scope: "player",
      deadline: { kind: "career" },
      consequences: { squadStatusRisk: "none" },
    });
  }

  return objectives;
}

export type ObjectiveOutcome = "failed" | "met" | "stretch";

export function evaluateSeasonObjectivesV2(
  player: Player,
  currentSeason: number,
  seasonPerformance: { goals: number; assists: number; matches: number; rating: number },
  context?: ContextualCompetitionData,
): {
  updatedGoals: PlayerGoal[];
  completed: PlayerGoal[];
  storyEvents: Array<{ type: "objective_met" | "objective_failed" | "record_broken"; goal: PlayerGoal; outcome?: ObjectiveOutcome }>;
  approvalDelta: number;
  reputationDelta: number;
  moraleDelta: number;
} {
  const p = ensureObjectiveRecords({ ...player });
  const clubId = getClubId(p);

  const storyEvents: Array<{ type: "objective_met" | "objective_failed" | "record_broken"; goal: PlayerGoal; outcome?: ObjectiveOutcome }> = [];

  let approvalDelta = 0;
  let reputationDelta = 0;
  let moraleDelta = 0;

  const updatedGoals = (p.playerGoals || []).map((g) => {
    if (!g.objectiveKind) return g;

    // Only evaluate season objectives for this season.
    if (g.deadline?.kind === "season" && g.deadline.season !== currentSeason) return g;

    // Already achieved or expired.
    if (g.isAchieved || g.isExpired || !g.isActive) return g;

    let value: number | undefined = undefined;

    // Determine metric.
    if (g.id.includes("exp_goals_league")) value = seasonPerformance.goals;
    else if (g.id.includes("exp_assists_league")) value = seasonPerformance.assists;
    else if (g.id.includes("exp_consistency") || g.id.includes("gk_rating")) value = seasonPerformance.rating;
    else if (g.id.startsWith("v2_promise_role_")) value = seasonPerformance.matches;
    else if (g.id.includes("team_league_finish")) { 
      const league = context?.competitions?.find((c) => c.type === "League");
      value = typeof league?.position === "number" ? league.position : undefined;
    } else if (g.id.startsWith("v2_record_historic_91")) value = seasonPerformance.goals;
    else if (g.id.startsWith("v2_record_club_season_goals")) value = seasonPerformance.goals;
    else if (g.id.startsWith("v2_milestone_goals_")) value = p.totalGoals;

    if (typeof value !== "number") {
      // Can't evaluate yet (missing context). Keep as is.
      return g;
    }

    const bands = g.bands;

    // Compute progress.
    const target = g.targetValue;
    const progress = typeof target === "number" && target > 0 ? clamp((value / target) * 100, 0, 100) : g.progress;

    const newG: PlayerGoal = {
      ...g,
      currentValue: value,
      progress,
    };

    const sev = newG.severity || "low";
    const mixedScale = (delta: number) => {
      // Mixed model: big clubs (tier 1) harsher, small clubs softer.
      const harshness = p.team.leagueTier === 1 ? 1.15 : p.team.leagueTier >= 3 ? 0.85 : 1.0;
      return Math.round(delta * harshness);
    };

    const applyOutcome = (outcome: ObjectiveOutcome) => {
      if (outcome === "failed") {
        // Realistic penalties (not too brutal).
        const base = sev === "high" ? -10 : sev === "medium" ? -6 : -3;
        approvalDelta += mixedScale(base);
        reputationDelta += mixedScale(Math.round(base / 2));
        moraleDelta += mixedScale(-1);
        storyEvents.push({ type: "objective_failed", goal: newG, outcome });
      } else if (outcome === "met") {
        const base = sev === "high" ? 10 : sev === "medium" ? 6 : 3;
        approvalDelta += mixedScale(base);
        reputationDelta += mixedScale(Math.round(base / 2));
        moraleDelta += mixedScale(1);
        storyEvents.push({ type: "objective_met", goal: newG, outcome });
      } else if (outcome === "stretch") {
        const base = sev === "high" ? 14 : sev === "medium" ? 9 : 5;
        approvalDelta += mixedScale(base);
        reputationDelta += mixedScale(Math.round(base / 2));
        moraleDelta += mixedScale(2);
        storyEvents.push({ type: "objective_met", goal: newG, outcome });
      }
    };

    // Evaluate depending on metric direction.
    if (newG.id.includes("team_league_finish")) {
      // Lower is better. Use max thresholds.
      const pos = value;
      const stretchOk = typeof bands?.stretchMax === "number" ? pos <= bands.stretchMax : false;
      const expectedOk = typeof bands?.expectedMax === "number" ? pos <= bands.expectedMax : false;
      const failure = typeof bands?.failureMax === "number" ? pos > bands.failureMax : false;

      if (stretchOk) {
        newG.isAchieved = true;
        applyOutcome("stretch");
      } else if (expectedOk) {
        newG.isAchieved = true;
        applyOutcome("met");
      } else if (failure) {
        newG.isExpired = true;
        newG.isActive = false;
        applyOutcome("failed");
      }

      return newG;
    }

    // Normal (higher is better)
    const stretchOk = typeof bands?.stretchMin === "number" ? value >= bands.stretchMin : false;
    const expectedOk = typeof bands?.expectedMin === "number" ? value >= bands.expectedMin : false;
    const failure = typeof bands?.failureMax === "number" ? value <= bands.failureMax : false;

    if (stretchOk) {
      newG.isAchieved = true;
      applyOutcome("stretch");
    } else if (expectedOk) {
      newG.isAchieved = true;
      applyOutcome("met");
    } else if (failure && newG.deadline?.kind === "season") {
      newG.isExpired = true;
      newG.isActive = false;
      applyOutcome("failed");
    }

    return newG;
  });

  // Update records (club season goals, historic)
  if (!p.records) p.records = {};
  if (!p.records.clubSeasonGoalsRecord) p.records.clubSeasonGoalsRecord = {};

  const prevClubSeasonRecord = p.records.clubSeasonGoalsRecord[clubId] ?? 0;
  if (seasonPerformance.goals > prevClubSeasonRecord) {
    p.records.clubSeasonGoalsRecord[clubId] = seasonPerformance.goals;
    // record event
    storyEvents.push({
      type: "record_broken",
      goal: {
        id: `v2_record_update_club_${currentSeason}`,
        description: "goals.v2.records.clubSeasonGoalsBroken",
        descriptionParams: {
          club: p.team.name,
          record: seasonPerformance.goals,
          fallbackText: `Record broken: new ${p.team.name} season goal record (${seasonPerformance.goals}).`,
        },
        type: "career",
        category: "Milestone",
        isAchieved: true,
        progress: 100,
        isActive: true,
        isExpired: false,
        context: {
          clubId,
          clubName: p.team.name,
          seasonStarted: currentSeason,
          requiresCurrentClub: false,
          requiresCurrentLeague: false,
        },
        priority: "High",
        difficulty: 0,
        estimatedSeasons: 0,
        rewards: { followerBoost: 0, moraleBoost: 0, reputationBoost: 0 },
        objectiveKind: "record",
        origin: "press",
        severity: "medium",
        scope: "player",
        recordScope: "club",
      },
    });
  }

  const prevPlayerSeason = p.records.playerSeasonGoalsRecord ?? 0;
  if (seasonPerformance.goals > prevPlayerSeason) {
    p.records.playerSeasonGoalsRecord = seasonPerformance.goals;
  }

  // Merge the updated goals back.
  const completed = updatedGoals.filter((g) => g.objectiveKind && g.isAchieved);

  return {
    updatedGoals,
    completed,
    storyEvents,
    approvalDelta,
    reputationDelta,
    moraleDelta,
  };
}
