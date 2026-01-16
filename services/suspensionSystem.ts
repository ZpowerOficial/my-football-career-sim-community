/**
 * SUSPENSION SYSTEM - v0.5.2
 *
 * Manages player suspensions after red card expulsions.
 * Suspensions only affect the same competition type where the red card occurred.
 *
 * Standard: 1 match suspension per red card
 */

import { Player, CompetitionType, Suspensions } from "../types";

/**
 * Default suspensions object with all counters at 0
 */
export const getDefaultSuspensions = (): Suspensions => ({
  league: 0,
  cup: 0,
  continental: 0,
  stateCup: 0,
  international: 0,
});

/**
 * Maps CompetitionType to the corresponding suspension key
 */
export const getSuspensionKey = (
  competitionType: CompetitionType,
): keyof Suspensions => {
  switch (competitionType) {
    case "League":
      return "league";
    case "Cup":
      return "cup";
    case "Continental":
      return "continental";
    case "State Cup":
      return "stateCup";
    case "International":
      return "international";
    default:
      return "league"; // Default fallback
  }
};

/**
 * Apply a suspension after a red card.
 * Standard: 1 match suspension per red card.
 *
 * @param player - The player who received the red card
 * @param competitionType - The competition type where the red card occurred
 * @returns Updated player with incremented suspension counter
 */
export const applySuspensionFromRedCard = (
  player: Player,
  competitionType: CompetitionType,
): Player => {
  const key = getSuspensionKey(competitionType);
  const currentSuspensions = player.suspensions || getDefaultSuspensions();

  return {
    ...player,
    suspensions: {
      ...currentSuspensions,
      [key]: currentSuspensions[key] + 1,
    },
  };
};

/**
 * Check if a player is suspended for a given competition type.
 * If suspended, decrements the counter (player serves the suspension).
 *
 * @param player - The player to check
 * @param competitionType - The competition type to check
 * @returns Object with suspension status and updated player
 */
export const checkAndDecrementSuspension = (
  player: Player,
  competitionType: CompetitionType,
): { isSuspended: boolean; updatedPlayer: Player } => {
  const key = getSuspensionKey(competitionType);
  const currentSuspensions = player.suspensions || getDefaultSuspensions();
  const suspensionCount = currentSuspensions[key];

  if (suspensionCount > 0) {
    // Player is suspended - decrement and return
    return {
      isSuspended: true,
      updatedPlayer: {
        ...player,
        suspensions: {
          ...currentSuspensions,
          [key]: suspensionCount - 1,
        },
      },
    };
  }

  // Player is not suspended
  return {
    isSuspended: false,
    updatedPlayer: player,
  };
};

/**
 * Get the total suspension count across all competitions
 */
export const getTotalSuspensions = (player: Player): number => {
  const suspensions = player.suspensions || getDefaultSuspensions();
  return (
    suspensions.league +
    suspensions.cup +
    suspensions.continental +
    suspensions.stateCup +
    suspensions.international
  );
};

/**
 * Check if player has any active suspension
 */
export const hasAnySuspension = (player: Player): boolean => {
  return getTotalSuspensions(player) > 0;
};

/**
 * Reset all suspensions (e.g., at start of new season if needed)
 */
export const resetAllSuspensions = (player: Player): Player => {
  return {
    ...player,
    suspensions: getDefaultSuspensions(),
  };
};
