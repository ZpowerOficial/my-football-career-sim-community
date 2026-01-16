/**
 * CONSISTENT EXPANDED DATA GENERATOR - v0.5.2
 * Generates expanded attributes consistent with overall rating.
 * Now includes: position weights + playing style + risk tendency + secondary positions
 */

import type { Player, PositionDetail, PlayerStats } from "../types";
import type { ExpandedPlayerData } from "../types/expandedPlayerTypes";
import {
  getExpectedAttributeValue,
  getAdjustedWeights,
  type PlayerProfile,
} from "../constants/positionAttributeWeights";
import { rand, clamp } from "./utils";

/**
 * Generates expanded data CONSISTENT with the player's overall rating.
 * Uses position + playing style + risk tendency + secondary positions for weights.
 */
export function generateConsistentExpandedData(
  player: Player,
  stats: PlayerStats,
): Partial<ExpandedPlayerData> {
  const position = player.position as PositionDetail;
  const overall = stats.overall;

  // Build player profile for adjusted weights
  const profile: PlayerProfile = {
    position,
    playingStyle: player.expandedData?.playingStyle?.primaryStyle as string,
    riskTendency: player.expandedData?.playingStyle?.riskTendency as string,
    secondaryPositions:
      player.expandedData?.physicalProfile?.secondaryPositions?.map((sp) => ({
        position: sp.position,
        proficiency: sp.proficiency,
      })),
  };

  // Get weights that combine position + style + risk + secondary positions
  const weights = getAdjustedWeights(profile);

  // Generate GK attributes based on position
  const isGK = position === "GK";
  const gkBase = isGK ? overall : rand(30, 50);
  const gkMultiplier = isGK ? 1.0 : 0.5;

  return {
    physicalProfile: player.expandedData?.physicalProfile ?? {
      height: rand(165, 195),
      weight: rand(60, 90),
      bmi: 22.5,
      bodyType: "Lean" as const,
      preferredFoot: stats.preferredFoot ?? ("Right" as const),
      weakFootLevel: stats.weakFoot ?? 3,
      runningStyle: "Steady" as const,
      primaryPosition: position,
      secondaryPositions: [],
    },
    playingStyle: player.expandedData?.playingStyle ?? {
      primaryStyle: "Complete Forward" as any,
      tacticalTendencies: [],
      riskTendency: "Balanced" as const,
      mediaStarLevel: clamp(Math.floor(overall / 20), 1, 5),
    },
    technicalAttributes: {
      finishing: {
        finishingInsideBox: getExpectedAttributeValue(
          overall,
          weights.finishing,
          6,
        ),
        finishingOutsideBox: getExpectedAttributeValue(
          overall,
          weights.finishing * 0.8,
          8,
        ),
        finishingOnCounter: getExpectedAttributeValue(
          overall,
          weights.finishing * 0.9,
          7,
        ),
        finishingUnderPressure: getExpectedAttributeValue(
          overall,
          weights.finishing * 0.85,
          7,
        ),
        shotPower: getExpectedAttributeValue(
          overall,
          weights.finishing * 0.9,
          8,
        ),
        placedShotAccuracy: getExpectedAttributeValue(
          overall,
          weights.finishing,
          6,
        ),
        powerShotAccuracy: getExpectedAttributeValue(
          overall,
          weights.finishing * 0.85,
          7,
        ),
        headingAccuracy: getExpectedAttributeValue(
          overall,
          weights.jumping * 0.8,
          8,
        ),
        headingPower: getExpectedAttributeValue(
          overall,
          weights.jumping * 0.7,
          8,
        ),
        volleysAndAcrobatic: getExpectedAttributeValue(
          overall,
          weights.finishing * 0.7,
          10,
        ),
        oneOnOneFinishing: getExpectedAttributeValue(
          overall,
          weights.finishing * 0.95,
          6,
        ),
      },
      ballControl: {
        firstTouchOrientated: getExpectedAttributeValue(
          overall,
          weights.ballControl,
          5,
        ),
        firstTouchUnderPressure: getExpectedAttributeValue(
          overall,
          weights.ballControl * 0.9,
          6,
        ),
        aerialControl: getExpectedAttributeValue(
          overall,
          weights.ballControl * 0.7,
          8,
        ),
        trapping: getExpectedAttributeValue(
          overall,
          weights.ballControl * 0.85,
          6,
        ),
        shielding: getExpectedAttributeValue(
          overall,
          weights.strength * 0.7,
          7,
        ),
      },
      dribbling: {
        closeControlDribbling: getExpectedAttributeValue(
          overall,
          weights.dribbling,
          5,
        ),
        speedDribbling: getExpectedAttributeValue(
          overall,
          weights.dribbling * 0.9,
          6,
        ),
        congestedSpaceDribbling: getExpectedAttributeValue(
          overall,
          weights.dribbling * 0.85,
          7,
        ),
        directionChange: getExpectedAttributeValue(
          overall,
          weights.agility * 0.9,
          6,
        ),
        skillMoves: getExpectedAttributeValue(
          overall,
          weights.dribbling * 0.8,
          10,
        ),
        flair: getExpectedAttributeValue(overall, weights.dribbling * 0.7, 12),
      },
      passing: {
        shortPassingSupport: getExpectedAttributeValue(
          overall,
          weights.passing,
          5,
        ),
        shortPassingUnderPressure: getExpectedAttributeValue(
          overall,
          weights.passing * 0.9,
          6,
        ),
        verticalPassBreakingLines: getExpectedAttributeValue(
          overall,
          weights.passing * 0.85,
          7,
        ),
        longDiagonalPass: getExpectedAttributeValue(
          overall,
          weights.passing * 0.8,
          8,
        ),
        throughBalls: getExpectedAttributeValue(
          overall,
          weights.passing * 0.9,
          7,
        ),
        crossingFromByline: getExpectedAttributeValue(
          overall,
          weights.passing * 0.7,
          10,
        ),
        crossingFromDeep: getExpectedAttributeValue(
          overall,
          weights.passing * 0.7,
          10,
        ),
        firstTimeCrossing: getExpectedAttributeValue(
          overall,
          weights.passing * 0.65,
          10,
        ),
        curveEffect: getExpectedAttributeValue(
          overall,
          weights.setPieces * 0.9,
          8,
        ),
      },
      setPieces: {
        directFreeKickPower: getExpectedAttributeValue(
          overall,
          weights.setPieces,
          10,
        ),
        directFreeKickPlacement: getExpectedAttributeValue(
          overall,
          weights.setPieces,
          10,
        ),
        indirectFreeKick: getExpectedAttributeValue(
          overall,
          weights.setPieces * 0.9,
          10,
        ),
        cornerKicking: getExpectedAttributeValue(
          overall,
          weights.setPieces * 0.85,
          10,
        ),
        penaltyTaking: getExpectedAttributeValue(
          overall,
          weights.composure * 0.9,
          8,
        ),
        throwIns: getExpectedAttributeValue(overall, 0.3, 15),
      },
    },
    physicalAttributes: {
      speed: {
        topSpeed: clamp((stats.pace ?? overall) + rand(-3, 3), 40, 99),
        accelerationInitial: clamp(
          (stats.pace ?? overall) + rand(-5, 5),
          40,
          99,
        ),
        accelerationMedium: clamp(
          (stats.pace ?? overall) + rand(-4, 4),
          40,
          99,
        ),
        sprintSpeed: clamp((stats.pace ?? overall) + rand(-3, 3), 40, 99),
      },
      endurance: {
        aerobicEndurance: clamp(
          (stats.stamina ?? overall) + rand(-5, 5),
          40,
          99,
        ),
        anaerobicEndurance: clamp(
          (stats.stamina ?? overall) + rand(-8, 8),
          40,
          99,
        ),
        stamina: stats.stamina ?? overall,
        workRate: getExpectedAttributeValue(overall, weights.workEthic, 10),
      },
      strength: {
        upperBodyStrength: clamp(
          (stats.strength ?? overall) + rand(-5, 5),
          40,
          99,
        ),
        legStrength: clamp((stats.strength ?? overall) + rand(-5, 5), 40, 99),
        bodyToBodyStrength: clamp(
          (stats.strength ?? overall) + rand(-3, 3),
          40,
          99,
        ),
        balanceInContact: clamp(
          (stats.agility ?? 70) * 0.5 +
            (stats.strength ?? 70) * 0.5 +
            rand(-5, 5),
          40,
          99,
        ),
      },
      agility: {
        lateralAgility: clamp((stats.agility ?? overall) + rand(-5, 5), 40, 99),
        reactionTime: getExpectedAttributeValue(
          overall,
          weights.agility * 0.9,
          8,
        ),
        flexibility: clamp((stats.agility ?? overall) + rand(-8, 8), 40, 99),
        coordination: getExpectedAttributeValue(
          overall,
          weights.agility * 0.85,
          8,
        ),
      },
      jumping: {
        standingVerticalJump: clamp(
          (stats.jumping ?? overall) + rand(-5, 5),
          40,
          99,
        ),
        runningVerticalJump: clamp(
          (stats.jumping ?? overall) + rand(-3, 3),
          40,
          99,
        ),
        headerTiming: getExpectedAttributeValue(
          overall,
          weights.jumping * 0.9,
          8,
        ),
      },
      robustness: {
        physicalRobustness: getExpectedAttributeValue(
          overall,
          weights.strength * 0.8,
          10,
        ),
        injuryResistance: rand(60, 90),
        recoveryRate: rand(60, 90),
        naturalFitness: rand(65, 95),
      },
    },
    goalkeeperAttributes: {
      shotStopping: {
        reflexes: getExpectedAttributeValue(gkBase, gkMultiplier, 4),
        diving: getExpectedAttributeValue(gkBase, gkMultiplier, 4),
        oneOnOneStopping: getExpectedAttributeValue(
          gkBase,
          gkMultiplier * 0.95,
          5,
        ),
        penaltySaving: getExpectedAttributeValue(
          gkBase,
          gkMultiplier * 0.85,
          7,
        ),
        longRangeShotStopping: getExpectedAttributeValue(
          gkBase,
          gkMultiplier * 0.9,
          5,
        ),
        closeRangeShotStopping: getExpectedAttributeValue(
          gkBase,
          gkMultiplier,
          4,
        ),
      },
      positioning: {
        positioning: getExpectedAttributeValue(gkBase, gkMultiplier * 0.95, 4),
        rushingOut: getExpectedAttributeValue(gkBase, gkMultiplier * 0.85, 7),
        narrowingAngles: getExpectedAttributeValue(
          gkBase,
          gkMultiplier * 0.95,
          5,
        ),
        linePositioning: getExpectedAttributeValue(
          gkBase,
          gkMultiplier * 0.9,
          5,
        ),
      },
      distribution: {
        throwing: getExpectedAttributeValue(gkBase, 0.6, 10),
        kicking: getExpectedAttributeValue(gkBase, 0.55, 10),
        passingShort: getExpectedAttributeValue(gkBase, 0.5, 12),
        passingLong: getExpectedAttributeValue(gkBase, 0.45, 12),
        goalKicks: getExpectedAttributeValue(gkBase, 0.5, 10),
      },
      commanding: {
        commandOfArea: getExpectedAttributeValue(gkBase, gkMultiplier * 0.9, 6),
        claimingCrosses: getExpectedAttributeValue(gkBase, gkMultiplier, 5),
        punching: getExpectedAttributeValue(gkBase, gkMultiplier * 0.85, 7),
        communication: getExpectedAttributeValue(gkBase, 0.6, 10),
        aerialReach: getExpectedAttributeValue(gkBase, gkMultiplier * 0.8, 8),
      },
      mentalGK: {
        concentration: getExpectedAttributeValue(gkBase, 0.85, 6),
        composure: getExpectedAttributeValue(gkBase, 0.8, 7),
        decisionMaking: getExpectedAttributeValue(gkBase, 0.75, 8),
        handling: getExpectedAttributeValue(gkBase, gkMultiplier, 5),
      },
    },
  } as Partial<ExpandedPlayerData>;
}

/**
 * Updates an existing player's expanded data to be consistent with their overall.
 * Useful for migrating existing careers.
 */
export function syncExpandedDataWithOverall(
  player: Player,
): Partial<ExpandedPlayerData> {
  return generateConsistentExpandedData(player, player.stats);
}
