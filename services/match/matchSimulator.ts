import { Team } from "../../types";
import { rand, clamp, gaussianRandom } from "../utils";

export interface MatchSimulationConfig {
  homeAdvantage?: number;
  upsetFactor?: number;
  formWeight?: number;
  isNeutralVenue?: boolean;
  isCupMatch?: boolean;
  extraTimeEnabled?: boolean;
}

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homePoints: number;
  awayPoints: number;
  winner?: Team; // For cup/knockout matches
  isExtraTime?: boolean;
  isPenalties?: boolean;
  penaltyWinner?: Team;
}

const DEFAULT_CONFIG: MatchSimulationConfig = {
  homeAdvantage: 5,
  upsetFactor: 0.15,
  formWeight: 0.2,
  isNeutralVenue: false,
  isCupMatch: false,
  extraTimeEnabled: false,
};

export const simulateMatch = (
  homeTeam: Team,
  awayTeam: Team,
  homeForm: ("W" | "D" | "L")[] = [],
  awayForm: ("W" | "D" | "L")[] = [],
  customConfig: MatchSimulationConfig = {},
): MatchResult => {
  const config = { ...DEFAULT_CONFIG, ...customConfig };

  let homeStrength =
    homeTeam.reputation +
    (config.isNeutralVenue ? 0 : config.homeAdvantage || 0);
  let awayStrength = awayTeam.reputation;

  // Apply form bonus
  homeStrength += calculateFormBonus(homeForm) * (config.formWeight || 0) * 10;
  awayStrength += calculateFormBonus(awayForm) * (config.formWeight || 0) * 10;

  // Add randomness (Variance)
  // Reduced variance for more realistic results (was gaussianRandom(0, 5) in league, 8 in continental)
  // Using 4-5 provides a good balance where reputation matters but upsets happen
  const variance = config.isCupMatch ? 6 : 4.5;
  homeStrength += gaussianRandom(0, variance);
  awayStrength += gaussianRandom(0, variance);

  const strengthDiff = homeStrength - awayStrength;

  // Upset logic
  const upsetChance = config.upsetFactor || 0.15;
  const isUpset = Math.random() < upsetChance && Math.abs(strengthDiff) > 10;

  let homeGoals: number;
  let awayGoals: number;

  if (isUpset) {
    // The weaker team overperforms
    if (strengthDiff > 0) {
      // Home is stronger but upset happens -> Away wins
      awayGoals = rand(1, 3);
      homeGoals = rand(0, Math.max(0, awayGoals - 1));
    } else {
      // Away is stronger but upset happens -> Home wins
      homeGoals = rand(1, 3);
      awayGoals = rand(0, Math.max(0, homeGoals - 1));
    }
  } else {
    // Standard result based on strength difference
    // Formula: (Diff + 50) / 30 gives a base goal expectancy
    const baseHomeGoals = (strengthDiff + 50) / 30;
    const baseAwayGoals = (-strengthDiff + 50) / 30;

    homeGoals = Math.max(0, Math.round(baseHomeGoals + gaussianRandom(0, 0.8)));
    awayGoals = Math.max(0, Math.round(baseAwayGoals + gaussianRandom(0, 0.8)));
  }

  // Handle Extra Time & Penalties for Cup Matches
  let isExtraTime = false;
  let isPenalties = false;
  let penaltyWinner: Team | undefined;
  let winner: Team | undefined;

  if (config.extraTimeEnabled && homeGoals === awayGoals) {
    isExtraTime = true;
    // Simple extra time simulation
    if (Math.random() < 0.4) homeGoals += rand(0, 1);
    if (Math.random() < 0.4) awayGoals += rand(0, 1);

    if (homeGoals === awayGoals) {
      isPenalties = true;
      // Penalty shootout: slightly favor higher reputation/composure
      const homePenalties = homeTeam.reputation + rand(0, 20);
      const awayPenalties = awayTeam.reputation + rand(0, 20);
      penaltyWinner = homePenalties >= awayPenalties ? homeTeam : awayTeam;
    }
  }

  // Determine winner object
  if (homeGoals > awayGoals) winner = homeTeam;
  else if (awayGoals > homeGoals) winner = awayTeam;
  else if (penaltyWinner) winner = penaltyWinner;

  let homePoints = 0;
  let awayPoints = 0;

  if (homeGoals > awayGoals) {
    homePoints = 3;
  } else if (awayGoals > homeGoals) {
    awayPoints = 3;
  } else {
    homePoints = 1;
    awayPoints = 1;
  }

  return {
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    homeGoals,
    awayGoals,
    homePoints,
    awayPoints,
    winner,
    isExtraTime,
    isPenalties,
    penaltyWinner,
  };
};

const calculateFormBonus = (form: ("W" | "D" | "L")[]): number => {
  if (form.length === 0) return 0;

  const recentForm = form.slice(-5);
  let bonus = 0;

  recentForm.forEach((result, index) => {
    const weight = (index + 1) / recentForm.length;
    if (result === "W") bonus += 1 * weight;
    else if (result === "D") bonus += 0.3 * weight;
    else bonus -= 0.5 * weight;
  });

  return clamp(bonus / recentForm.length, -1, 1);
};
