import React from "react";
import { useI18n } from "../contexts/I18nContext";
import type {
  Player,
  CareerLog,
  SeasonStats,
  ExtendedMatchStats,
} from "../types";
import CareerEvolutionChart from "./CareerEvolutionChart";
import TrophyCabinet from "./TrophyCabinet";
import SeasonBySeasonTable from "./SeasonBySeasonTable";
import DetailedStatsView from "./DetailedStatsView";
import {
  getNationalFlagGradient,
  getNationalFlagStyle,
} from "../constants/nationalFlagGradients";
import FormGraph from "./FormGraph";
import PlayerHeatmap from "@/components/PlayerHeatmap";
import ShotMap from "@/components/ShotMap";
import LeagueComparison from "@/components/LeagueComparison";
import { getRatingColor } from "../services/ratingSystem";
import { translateCountry, translateNationality } from "@/utils/i18n";
import { Icon, type IconName } from "./ui/Icon";

interface HistoryTabProps {
  history: CareerLog[];
  player: Player;
  onTerminateContract?: () => void;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

const HISTORY_TABS: { id: string; icon: IconName; labelKey: string }[] = [
  { id: "overview", icon: "ChartPie", labelKey: "history.overview" },
  { id: "seasons", icon: "ListOrdered", labelKey: "history.seasons" },
  { id: "clubs", icon: "ShieldHalf", labelKey: "history.clubs" },
  { id: "honors", icon: "Trophy", labelKey: "history.honors" },
];

// FunÃ§Ã£o auxiliar para garantir nÃºmero vÃ¡lido
const safeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export const aggregateCareerStats = (
  history: CareerLog[],
  preferredFoot?: string,
): SeasonStats => {
  const aggregatedStats: Partial<ExtendedMatchStats> = {
    matches: 0,
    gamesStarted: 0,
    gamesAsSubstitute: 0,
    teamOfTheWeek: 0,
    rating: 0,
    goals: 0,
    expectedGoals: 0,
    goalsPerMatch: 0,
    shots: 0,
    shotsOnTarget: 0,
    shotsOnTargetPerGame: 0,
    bigChancesMissed: 0,
    bigChancesConverted: 0,
    goalConversion: 0,
    shotAccuracy: 0,
    freeKickGoals: 0,
    directFreeKicksTaken: 0,
    directFreeKickEffectiveness: 0,
    goalsFromInsideBox: 0,
    goalsFromOutsideBox: 0,
    headedGoals: 0,
    leftFootGoals: 0,
    rightFootGoals: 0,
    weakFootGoals: 0,
    penaltiesWon: 0,
    penaltyGoals: 0,
    volleyGoals: 0,
    chipGoals: 0,
    curvedGoals: 0,
    assists: 0,
    expectedAssists: 0,
    touches: 0,
    bigChancesCreated: 0,
    keyPasses: 0,
    passes: 0,
    passCompletion: 0,
    passesCompleted: 0,
    passesInOwnHalf: 0,
    passesInFinalThird: 0,
    accurateLongBalls: 0,
    longBalls: 0,
    accurateThroughBalls: 0,
    throughBalls: 0,
    accurateCrosses: 0,
    crosses: 0,
    interceptions: 0,
    tackles: 0,
    tackleSuccess: 0,
    tacklesWon: 0,
    tacklesPerGame: 0,
    ballRecoveries: 0,
    ballRecoveriesInAttack: 0,
    ballRecoveriesPerGame: 0,
    dribbledPast: 0,
    dribbledPastPerGame: 0,
    clearances: 0,
    clearancesPerGame: 0,
    headedClearances: 0,
    shotsBlocked: 0,
    successfulPressures: 0,
    shotsBlockedPerGame: 0,
    errorsLeadingToShot: 0,
    errorsLeadingToGoal: 0,
    penaltiesConceded: 0,
    dribbles: 0,
    dribblesSucceeded: 0,
    dribblesSuccessPercentage: 0,
    skillMovesCompleted: 0,
    nutmegs: 0,
    touchesInOppositionBox: 0,
    forwardPasses: 0,
    forwardPassesCompleted: 0,
    duels: 0,
    duelsWon: 0,
    duelsWonPercentage: 0,
    groundDuels: 0,
    groundDuelsWon: 0,
    groundDuelsWonPercentage: 0,
    aerialDuels: 0,
    aerialDuelsWon: 0,
    aerialDuelsWonPercentage: 0,
    headersWon: 0,
    possessionLost: 0,
    foulsCommitted: 0,
    foulsPerGame: 0,
    foulsDrawn: 0,
    offsides: 0,
    yellowCards: 0,
    redCardsFromSecondYellow: 0,
    redCards: 0,
    // Work Rate & Movement
    distanceCovered: 0,
    sprintDistanceCovered: 0,
    highIntensityRuns: 0,
    sprintsPerGame: 0,
    // Match Events
    hatTricks: 0,
    braces: 0,
    manOfTheMatch: 0,
    // Advanced Metrics
    shotCreatingActions: 0,
    goalCreatingActions: 0,
    progressiveCarries: 0,
    progressivePasses: 0,
    carriesIntoFinalThird: 0,
    carriesIntoPenaltyArea: 0,
    passesIntoPenaltyArea: 0,
    // Goalkeeper Stats
    saves: 0,
    savesPerGame: 0,
    savePercentage: 0,
    cleanSheets: 0,
    cleanSheetPercentage: 0,
    goalsConceded: 0,
    goalsConcededPerGame: 0,
    goalsPreventedVsExpected: 0,
    penaltiesFaced: 0,
    penaltiesSaved: 0,
    penaltySavePercentage: 0,
    claimedCrosses: 0,
    punchesMade: 0,
    sweeper: 0,
    distributionAccuracy: 0,
    shotsOnTargetFaced: 0,
  };

  let totalMatches = 0;
  let totalMinutes = 0;
  let totalRating = 0;
  let seasonsWithStats = 0;
  let clubGoals = 0;
  let clubAssists = 0;

  history.forEach((log) => {
    totalMatches += safeNumber(log.stats?.matchesPlayed);
    totalMinutes += safeNumber(log.stats?.minutesPlayed);
    clubGoals += safeNumber(log.stats?.goals);
    clubAssists += safeNumber(log.stats?.assists);
    if (log.stats?.matchStats) {
      seasonsWithStats++;
      totalRating +=
        safeNumber(log.stats.averageRating) *
        safeNumber(log.stats.matchesPlayed);

      const stats = log.stats.matchStats;
      // AgregaÃ§Ã£o de titular/reserva
      aggregatedStats.gamesStarted! += safeNumber(stats.gamesStarted);
      aggregatedStats.gamesAsSubstitute! += safeNumber(stats.gamesAsSubstitute);
      aggregatedStats.teamOfTheWeek =
        (aggregatedStats.teamOfTheWeek || 0) + safeNumber(stats.teamOfTheWeek);
      aggregatedStats.expectedGoals! += safeNumber(stats.expectedGoals);
      aggregatedStats.shots! += safeNumber(stats.shots);
      aggregatedStats.shotsOnTarget! += safeNumber(stats.shotsOnTarget);
      aggregatedStats.bigChancesMissed! += safeNumber(stats.bigChancesMissed);
      aggregatedStats.bigChancesConverted! += safeNumber(
        stats.bigChancesConverted,
      );
      aggregatedStats.freeKickGoals! += safeNumber(stats.freeKickGoals);
      aggregatedStats.directFreeKicksTaken! += safeNumber(
        stats.directFreeKicksTaken,
      );
      aggregatedStats.goalsFromInsideBox! += safeNumber(
        stats.goalsFromInsideBox,
      );
      aggregatedStats.goalsFromOutsideBox! += safeNumber(
        stats.goalsFromOutsideBox,
      );
      aggregatedStats.headedGoals! += safeNumber(stats.headedGoals);
      aggregatedStats.leftFootGoals! += safeNumber(stats.leftFootGoals);
      aggregatedStats.rightFootGoals! += safeNumber(stats.rightFootGoals);
      aggregatedStats.weakFootGoals! += safeNumber(stats.weakFootGoals);
      aggregatedStats.penaltiesWon! += safeNumber(stats.penaltiesWon);
      aggregatedStats.penaltyGoals! += safeNumber(stats.penaltyGoals);
      aggregatedStats.volleyGoals! += safeNumber(stats.volleyGoals);
      aggregatedStats.chipGoals! += safeNumber(stats.chipGoals);
      aggregatedStats.curvedGoals! += safeNumber(stats.curvedGoals);
      aggregatedStats.expectedAssists! += safeNumber(stats.expectedAssists);
      aggregatedStats.touches! += safeNumber(stats.touches);
      aggregatedStats.bigChancesCreated! += safeNumber(stats.bigChancesCreated);
      aggregatedStats.keyPasses! += safeNumber(stats.keyPasses);
      aggregatedStats.passes! += safeNumber(stats.passes);
      aggregatedStats.passesCompleted! += safeNumber(stats.passesCompleted);
      aggregatedStats.passesInOwnHalf! += safeNumber(stats.passesInOwnHalf);
      aggregatedStats.passesInFinalThird! += safeNumber(
        stats.passesInFinalThird,
      );
      aggregatedStats.accurateLongBalls! += safeNumber(stats.accurateLongBalls);
      aggregatedStats.longBalls! += safeNumber(stats.longBalls);
      aggregatedStats.accurateThroughBalls! += safeNumber(
        stats.accurateThroughBalls,
      );
      aggregatedStats.throughBalls! += safeNumber(stats.throughBalls);
      aggregatedStats.accurateCrosses! += safeNumber(stats.accurateCrosses);
      aggregatedStats.crosses! += safeNumber(stats.crosses);
      aggregatedStats.interceptions! += safeNumber(stats.interceptions);
      aggregatedStats.tackles! += safeNumber(stats.tackles);
      aggregatedStats.tacklesWon! += safeNumber(stats.tacklesWon);
      aggregatedStats.ballRecoveries! += safeNumber(stats.ballRecoveries);
      aggregatedStats.ballRecoveriesInAttack! += safeNumber(
        stats.ballRecoveriesInAttack,
      );
      aggregatedStats.clearances! += safeNumber(stats.clearances);
      aggregatedStats.headedClearances! += safeNumber(stats.headedClearances);
      aggregatedStats.shotsBlocked! += safeNumber(stats.shotsBlocked);
      // successfulPressures Ã© valor absoluto, pressureSuccess Ã© percentual - usar apenas successfulPressures
      aggregatedStats.successfulPressures! += safeNumber(
        stats.successfulPressures,
      );
      aggregatedStats.errorsLeadingToShot! += safeNumber(
        stats.errorsLeadingToShot,
      );
      aggregatedStats.errorsLeadingToGoal! += safeNumber(
        stats.errorsLeadingToGoal,
      );
      aggregatedStats.penaltiesConceded! += safeNumber(stats.penaltiesConceded);
      aggregatedStats.dribbles! += safeNumber(stats.dribbles);
      aggregatedStats.dribblesSucceeded! += safeNumber(stats.dribblesSucceeded);
      aggregatedStats.skillMovesCompleted! += safeNumber(
        stats.skillMovesCompleted,
      );
      aggregatedStats.nutmegs! += safeNumber(stats.nutmegs);
      aggregatedStats.touchesInOppositionBox! += safeNumber(
        stats.touchesInOppositionBox,
      );
      aggregatedStats.forwardPasses! += safeNumber(stats.forwardPasses);
      aggregatedStats.forwardPassesCompleted! += safeNumber(
        stats.forwardPassesCompleted,
      );
      // Duelos - somar totais e ganhos para recalcular percentuais depois
      aggregatedStats.duels! += safeNumber(stats.duels);
      aggregatedStats.duelsWon! += safeNumber(stats.duelsWon);
      aggregatedStats.groundDuels! += safeNumber(stats.groundDuels);
      aggregatedStats.groundDuelsWon! += safeNumber(stats.groundDuelsWon);
      aggregatedStats.aerialDuels! += safeNumber(stats.aerialDuels);
      aggregatedStats.aerialDuelsWon! += safeNumber(stats.aerialDuelsWon);
      aggregatedStats.headersWon! += safeNumber(stats.headersWon);
      aggregatedStats.dribbledPast! += safeNumber(stats.dribbledPast);
      aggregatedStats.possessionLost! += safeNumber(stats.possessionLost);
      aggregatedStats.foulsCommitted! += safeNumber(stats.foulsCommitted);
      aggregatedStats.foulsDrawn! += safeNumber(stats.foulsDrawn);
      aggregatedStats.offsides! += safeNumber(stats.offsides);
      aggregatedStats.yellowCards! += safeNumber(stats.yellowCards);
      aggregatedStats.redCards! += safeNumber(stats.redCards);
      aggregatedStats.redCardsFromSecondYellow! += safeNumber(
        stats.redCardsFromSecondYellow,
      );
      // Work Rate & Movement
      aggregatedStats.distanceCovered! += safeNumber(stats.distanceCovered);
      aggregatedStats.sprintDistanceCovered! += safeNumber(
        stats.sprintDistanceCovered,
      );
      aggregatedStats.highIntensityRuns! += safeNumber(stats.highIntensityRuns);
      // Match Events
      aggregatedStats.hatTricks! += safeNumber(stats.hatTricks);
      aggregatedStats.braces! += safeNumber(stats.braces);
      aggregatedStats.manOfTheMatch! += safeNumber(stats.manOfTheMatch);
      // Advanced Metrics
      aggregatedStats.shotCreatingActions! += safeNumber(
        stats.shotCreatingActions,
      );
      aggregatedStats.goalCreatingActions! += safeNumber(
        stats.goalCreatingActions,
      );
      aggregatedStats.progressiveCarries! += safeNumber(
        stats.progressiveCarries,
      );
      aggregatedStats.progressivePasses! += safeNumber(stats.progressivePasses);
      aggregatedStats.carriesIntoFinalThird! += safeNumber(
        stats.carriesIntoFinalThird,
      );
      aggregatedStats.carriesIntoPenaltyArea! += safeNumber(
        stats.carriesIntoPenaltyArea,
      );
      aggregatedStats.passesIntoPenaltyArea! += safeNumber(
        stats.passesIntoPenaltyArea,
      );
      // Goalkeeper Stats v0.5.3 - Use matchStats as primary (complete data), fallback to top-level for old saves
      aggregatedStats.saves! += safeNumber(stats.saves);
      // Prioritize matchStats.cleanSheets (complete), fallback to top-level
      aggregatedStats.cleanSheets! += safeNumber(stats.cleanSheets ?? log.stats?.cleanSheets);
      aggregatedStats.goalsConceded! += safeNumber(stats.goalsConceded);
      aggregatedStats.penaltiesFaced! += safeNumber(stats.penaltiesFaced);
      aggregatedStats.penaltiesSaved! += safeNumber(stats.penaltiesSaved ?? log.stats?.penaltiesSaved);
      aggregatedStats.claimedCrosses! += safeNumber(stats.claimedCrosses);
      aggregatedStats.punchesMade! += safeNumber(stats.punchesMade);
      aggregatedStats.sweeper! += safeNumber(stats.sweeper);
      aggregatedStats.shotsOnTargetFaced! += safeNumber(stats.shotsOnTargetFaced);
    }
  });

  let intlCaps = 0,
    intlGoals = 0,
    intlAssists = 0,
    intlRatingWeighted = 0,
    intlRatingMatches = 0;
  history.forEach((log) => {
    if (log.competitionData?.competitions) {
      log.competitionData.competitions
        .filter(
          (c) =>
            c.type === "International" &&
            (c.competition || "").toLowerCase() !== "friendly",
        )
        .forEach((c) => {
          intlCaps += safeNumber(c.matchesPlayed);
          intlGoals += safeNumber(c.goals);
          intlAssists += safeNumber(c.assists);
          intlRatingWeighted +=
            safeNumber(c.rating) * safeNumber(c.matchesPlayed);
          intlRatingMatches += safeNumber(c.matchesPlayed);
        });
    }
  });

  aggregatedStats.matches = totalMatches + intlCaps;
  aggregatedStats.goals = clubGoals + intlGoals;
  aggregatedStats.assists = clubAssists + intlAssists;

  // Distribuir gols internacionais proporcionalmente nos tipos de gols
  // para que as somas batam com o total
  if (intlGoals > 0 && clubGoals > 0) {
    const ratio = (clubGoals + intlGoals) / clubGoals;
    // LocalizaÃ§Ã£o: dentro/fora da Ã¡rea (mutuamente exclusivos, devem somar ao total)
    const scaledInsideBox = Math.round(
      safeNumber(aggregatedStats.goalsFromInsideBox) * ratio,
    );
    const scaledOutsideBox = Math.round(
      safeNumber(aggregatedStats.goalsFromOutsideBox) * ratio,
    );
    // Ajustar para garantir que a soma seja exata
    aggregatedStats.goalsFromOutsideBox = scaledOutsideBox;
    aggregatedStats.goalsFromInsideBox =
      aggregatedStats.goals! - scaledOutsideBox;

    // MÃ©todo: cabeÃ§a/pÃ© esquerdo/pÃ© direito (mutuamente exclusivos, devem somar ao total)
    const scaledHeaded = Math.round(
      safeNumber(aggregatedStats.headedGoals) * ratio,
    );
    const nonHeadedGoals = aggregatedStats.goals! - scaledHeaded;
    aggregatedStats.headedGoals = scaledHeaded;

    // Escalar pÃ© esquerdo e direito proporcionalmente, garantindo soma = nonHeadedGoals
    const originalLeft = safeNumber(aggregatedStats.leftFootGoals);
    const originalRight = safeNumber(aggregatedStats.rightFootGoals);
    const originalTotal = originalLeft + originalRight || 1;
    aggregatedStats.leftFootGoals = Math.round(
      (originalLeft / originalTotal) * nonHeadedGoals,
    );
    aggregatedStats.rightFootGoals =
      nonHeadedGoals - aggregatedStats.leftFootGoals!;

    // SituaÃ§Ãµes especiais: escalar proporcionalmente (nÃ£o precisam somar ao total)
    aggregatedStats.freeKickGoals = Math.round(
      safeNumber(aggregatedStats.freeKickGoals) * ratio,
    );
    aggregatedStats.directFreeKicksTaken = Math.round(
      safeNumber(aggregatedStats.directFreeKicksTaken) * ratio,
    );
    // penaltiesWon NÃƒO deve ser escalado - sÃ£o faltas sofridas, nÃ£o gols
  }

  // âœ… GARANTIR que soma dos tipos de gol = total de gols (SEMPRE, nÃ£o sÃ³ com intl)
  const totalGoals = safeNumber(aggregatedStats.goals);
  if (totalGoals > 0) {
    // Verificar e corrigir soma de gols por mÃ©todo (cabeÃ§a + pÃ© esquerdo + pÃ© direito)
    const headedGoals = safeNumber(aggregatedStats.headedGoals);
    const leftGoals = safeNumber(aggregatedStats.leftFootGoals);
    const rightGoals = safeNumber(aggregatedStats.rightFootGoals);
    const methodSum = headedGoals + leftGoals + rightGoals;

    if (methodSum !== totalGoals && methodSum > 0) {
      // Ajustar proporcionalmente
      const ratio = totalGoals / methodSum;
      aggregatedStats.headedGoals = Math.round(headedGoals * ratio);
      const nonHeaded = totalGoals - aggregatedStats.headedGoals!;
      const footSum = leftGoals + rightGoals || 1;
      aggregatedStats.leftFootGoals = Math.round(
        (leftGoals / footSum) * nonHeaded,
      );
      aggregatedStats.rightFootGoals =
        nonHeaded - aggregatedStats.leftFootGoals!;
    }

    // Verificar e corrigir soma de gols por localizaÃ§Ã£o (dentro + fora da Ã¡rea)
    const insideBox = safeNumber(aggregatedStats.goalsFromInsideBox);
    const outsideBox = safeNumber(aggregatedStats.goalsFromOutsideBox);
    const locationSum = insideBox + outsideBox;

    if (locationSum !== totalGoals && locationSum > 0) {
      const ratio = totalGoals / locationSum;
      aggregatedStats.goalsFromOutsideBox = Math.round(outsideBox * ratio);
      aggregatedStats.goalsFromInsideBox =
        totalGoals - aggregatedStats.goalsFromOutsideBox!;
    }
  }

  // Recalcular weakFootGoals baseado no pÃ© preferido (deve ser feito DEPOIS da escala)
  if (preferredFoot) {
    if (preferredFoot === "Left") {
      aggregatedStats.weakFootGoals = safeNumber(
        aggregatedStats.rightFootGoals,
      );
    } else if (preferredFoot === "Right") {
      aggregatedStats.weakFootGoals = safeNumber(aggregatedStats.leftFootGoals);
    }
  }

  const totalMatchesAll = safeNumber(aggregatedStats.matches);
  if (totalMatchesAll > 0) {
    aggregatedStats.goalConversion =
      aggregatedStats.shots! > 0
        ? (aggregatedStats.goals! / aggregatedStats.shots!) * 100
        : 0;
    aggregatedStats.passCompletion =
      aggregatedStats.passes! > 0
        ? (aggregatedStats.passesCompleted! / aggregatedStats.passes!) * 100
        : 0;
    aggregatedStats.dribblesSuccessPercentage =
      aggregatedStats.dribbles! > 0
        ? (aggregatedStats.dribblesSucceeded! / aggregatedStats.dribbles!) * 100
        : 0;
    // Calcular eficiÃªncia de faltas diretas
    aggregatedStats.directFreeKickEffectiveness =
      aggregatedStats.directFreeKicksTaken! > 0
        ? (aggregatedStats.freeKickGoals! /
          aggregatedStats.directFreeKicksTaken!) *
        100
        : 0;
    // Calcular percentuais de duelos
    aggregatedStats.duelsWonPercentage =
      aggregatedStats.duels! > 0
        ? (aggregatedStats.duelsWon! / aggregatedStats.duels!) * 100
        : 0;
    aggregatedStats.groundDuelsWonPercentage =
      aggregatedStats.groundDuels! > 0
        ? (aggregatedStats.groundDuelsWon! / aggregatedStats.groundDuels!) * 100
        : 0;
    aggregatedStats.aerialDuelsWonPercentage =
      aggregatedStats.aerialDuels! > 0
        ? (aggregatedStats.aerialDuelsWon! / aggregatedStats.aerialDuels!) * 100
        : 0;

    aggregatedStats.goalsPerMatch = aggregatedStats.goals! / totalMatchesAll;
    aggregatedStats.shotsOnTargetPerGame =
      aggregatedStats.shotsOnTarget! / totalMatchesAll;
    aggregatedStats.tacklesPerGame = aggregatedStats.tackles! / totalMatchesAll;
    // Calcular tackleSuccess (percentual de desarmes bem-sucedidos)
    aggregatedStats.tackleSuccess =
      aggregatedStats.tackles! > 0
        ? (aggregatedStats.tacklesWon! / aggregatedStats.tackles!) * 100
        : 0;
    aggregatedStats.clearancesPerGame =
      aggregatedStats.clearances! / totalMatchesAll;
    aggregatedStats.shotsBlockedPerGame =
      aggregatedStats.shotsBlocked! / totalMatchesAll;
    aggregatedStats.foulsPerGame =
      aggregatedStats.foulsCommitted! / totalMatchesAll;
    aggregatedStats.ballRecoveriesPerGame =
      aggregatedStats.ballRecoveries! / totalMatchesAll;
    // Calcular shotAccuracy
    aggregatedStats.shotAccuracy =
      aggregatedStats.shots! > 0
        ? (aggregatedStats.shotsOnTarget! / aggregatedStats.shots!) * 100
        : 0;
    // Calcular sprintsPerGame
    aggregatedStats.sprintsPerGame =
      aggregatedStats.highIntensityRuns! / totalMatchesAll;
    // Goalkeeper derived stats v0.5.3
    aggregatedStats.savesPerGame = aggregatedStats.saves! / totalMatchesAll;
    aggregatedStats.goalsConcededPerGame = aggregatedStats.goalsConceded! / totalMatchesAll;
    aggregatedStats.cleanSheetPercentage =
      totalMatchesAll > 0
        ? (aggregatedStats.cleanSheets! / totalMatchesAll) * 100
        : 0;
    aggregatedStats.savePercentage =
      aggregatedStats.shotsOnTargetFaced! > 0
        ? (aggregatedStats.saves! / aggregatedStats.shotsOnTargetFaced!) * 100
        : 0;
    aggregatedStats.penaltySavePercentage =
      aggregatedStats.penaltiesFaced! > 0
        ? (aggregatedStats.penaltiesSaved! / aggregatedStats.penaltiesFaced!) * 100
        : 0;
    // Calculate xG prevented: Expected goals - Actual goals conceded
    // Expected goals = shotsOnTargetFaced * (1 - league average save rate ~68%)
    // Positive = good (saved more than expected), Negative = bad
    const expectedGoals = aggregatedStats.shotsOnTargetFaced! > 0
      ? aggregatedStats.shotsOnTargetFaced! * 0.32 // League average ~32% of shots on target result in goals
      : aggregatedStats.goalsConceded! * 1.1; // Fallback: expect 10% fewer goals
    aggregatedStats.goalsPreventedVsExpected = expectedGoals - aggregatedStats.goalsConceded!;
    // Distribution accuracy placeholder (average if matches > 0)
    aggregatedStats.distributionAccuracy =
      totalMatchesAll > 0 ? 75 + Math.random() * 10 : 0;
  }

  // IMPORTANTE: Calcular rating mÃ©dio da carreira
  const careerRating =
    totalMatches + intlRatingMatches > 0
      ? (totalRating + intlRatingWeighted) / (totalMatches + intlRatingMatches)
      : 0;
  aggregatedStats.rating = careerRating;

  const finalSeasonStats: SeasonStats = {
    matchesPlayed: safeNumber(aggregatedStats.matches),
    gamesStarted: safeNumber(aggregatedStats.gamesStarted),
    minutesPlayed: totalMinutes,
    goals: safeNumber(aggregatedStats.goals),
    assists: safeNumber(aggregatedStats.assists),
    overall:
      history.length > 0 && history[history.length - 1]?.stats
        ? safeNumber(history[history.length - 1].stats.overall)
        : 0,
    matchesWon: 0,
    matchesDrawn: 0,
    matchesLost: 0,
    matchWinRate: 0,
    averageRating:
      totalMatches + intlRatingMatches > 0
        ? (totalRating + intlRatingWeighted) /
        (totalMatches + intlRatingMatches)
        : 0,
    seasonGoalFrequency: 0,
    seasonAssistFrequency: 0,
    careerHighGoals: false,
    careerHighAssists: false,
    monthlyAwards: 0,
    playerOfTheMatch: 0,
    teamOfTheWeek: safeNumber(aggregatedStats.teamOfTheWeek),
    hatTricks: safeNumber(aggregatedStats.hatTricks),
    matchStats: aggregatedStats as ExtendedMatchStats,
  };

  return finalSeasonStats;
};

const DashboardHistoryTab: React.FC<HistoryTabProps> = ({
  history,
  player,
  onTerminateContract,
  activeSubTab: controlledActiveTab,
  onSubTabChange,
}) => {
  const { t } = useI18n();
  const [internalActiveTab, setInternalActiveTab] = React.useState("overview");

  const activeSubTab = controlledActiveTab || internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (onSubTabChange) {
      onSubTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  // Early return with loading state when data is temporarily unavailable
  // This prevents the empty content bug during season transitions
  if (!history || !player) {
    return (
      <div className="space-y-3 pb-20">
        <div className="flex gap-1.5 bg-card p-1 rounded-lg border border-primary overflow-x-auto scrollbar-hide shadow-theme">
          {HISTORY_TABS.map((tab) => (
            <button
              key={tab.id}
              className="flex-1 min-w-[80px] py-2 rounded-md text-xs font-semibold text-muted"
              disabled
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        <div className="bg-card rounded-[1rem] border border-primary p-8 text-center animate-pulse">
          <Icon name="LoaderCircle" size={30} className="text-muted mb-3 animate-spin" />
          <p className="text-sm text-muted">{t("common.loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }
  const [activeClub, setActiveClub] = React.useState<string | null>(null);
  const [detailedSeasonStats, setDetailedSeasonStats] =
    React.useState<SeasonStats | null>(null);
  const [detailedSeasonEvents, setDetailedSeasonEvents] = React.useState<
    any[] | null
  >(null);
  const [competitionData, setCompetitionData] = React.useState<any>(null);

  const proHistory = React.useMemo(
    () => (history || []).slice(1).filter((log) => !log.team?.isYouth),
    [history],
  );
  const baseHistory = React.useMemo(
    () => (history || []).slice(1).filter((log) => log.team?.isYouth),
    [history],
  );

  const proClubTotals = React.useMemo(() => {
    return proHistory.reduce(
      (acc, log) => {
        // Use stats directly to match the table rows
        acc.matches += safeNumber(log.stats?.matchesPlayed);
        acc.goals += safeNumber(log.stats?.goals);
        acc.assists += safeNumber(log.stats?.assists);
        // v0.5.3: Use matchStats as PRIMARY source (complete data), fallback to top-level for old saves
        acc.cleanSheets += safeNumber(log.stats?.matchStats?.cleanSheets ?? log.stats?.cleanSheets);
        acc.saves += safeNumber(log.stats?.matchStats?.saves);
        return acc;
      },
      { matches: 0, goals: 0, assists: 0, cleanSheets: 0, saves: 0 },
    );
  }, [proHistory]);

  const baseClubTotals = React.useMemo(() => {
    return baseHistory.reduce(
      (acc, log) => {
        acc.matches += safeNumber(log.stats?.matchesPlayed);
        acc.goals += safeNumber(log.stats?.goals);
        acc.assists += safeNumber(log.stats?.assists);
        // v0.5.3: Use matchStats as PRIMARY source (complete data), fallback to top-level for old saves
        acc.cleanSheets += safeNumber(log.stats?.matchStats?.cleanSheets ?? log.stats?.cleanSheets);
        acc.saves += safeNumber(log.stats?.matchStats?.saves);
        return acc;
      },
      { matches: 0, goals: 0, assists: 0, cleanSheets: 0, saves: 0 },
    );
  }, [baseHistory]);

  const officialNational = React.useMemo(() => {
    let caps = 0,
      goals = 0,
      assists = 0,
      cleanSheets = 0,
      saves = 0;
    (history || []).slice(1).forEach((log) => {
      if (log.competitionData?.competitions) {
        log.competitionData.competitions
          .filter(
            (c) =>
              c.type === "International" &&
              (c.competition || "").toLowerCase() !== "friendly",
          )
          .forEach((c) => {
            caps += safeNumber(c.matchesPlayed);
            goals += safeNumber(c.goals);
            assists += safeNumber(c.assists);
            cleanSheets += safeNumber(c.cleanSheets);
            saves += safeNumber((c as any).saves); // Assuming saves might be in comp result
          });
      }
    });
    return { caps, goals, assists, cleanSheets, saves };
  }, [history]);

  // Aggregated career stats for Shot Map and League Comparison
  const aggregatedCareerStats = React.useMemo(() => {
    return aggregateCareerStats(proHistory);
  }, [proHistory]);

  // CÃ¡lculo seguro de trofÃ©us
  const totalTrophies = React.useMemo(() => {
    let count = 0;
    // Use proHistory which is already filtered (slice(1) and !isYouth)
    proHistory.forEach((log) => {
      if (log.trophies) {
        const seasonTrophies = new Set<string>();
        log.trophies.forEach((trophy) => {
          const normalizedKey = trophy
            .replace("trophiesSection.", "")
            .replace("trophy.", "");

          if (!seasonTrophies.has(normalizedKey)) {
            count++;
            seasonTrophies.add(normalizedKey);
          }
        });
      }
    });
    return count;
  }, [proHistory]);

  return (
    <div className="space-y-3 pb-20">
      {/* Sub-Tabs Navigation */}
      <div className="flex gap-1.5 bg-card p-1 rounded-lg border border-primary overflow-x-auto scrollbar-hide shadow-theme">
        {HISTORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 min-w-[80px] py-2 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${activeSubTab === tab.id
                ? "bg-accent-primary text-white shadow-lg"
                : "text-muted hover:text-primary hover:bg-[var(--bg-secondary)]"
              }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Sub-Tab Content */}
      <div className="animate-fade-in">
        {activeSubTab === "overview" && (
          <>
            {/* Career Stats - Club, National Team, and Overall Total */}
            <div className="bg-card rounded-[1rem] border border-primary overflow-hidden mb-3 shadow-theme">
              <div className="grid grid-cols-1 divide-y divide-[var(--bg-tertiary)]">
                {/* Club Career (somente profissional) */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="Shield" size={12} className="text-blue-400" />
                    {t("history.clubCareer")}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {proClubTotals.matches}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {t("labels.short.matches")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-400">
                        {player.position === "GK"
                          ? proClubTotals.cleanSheets
                          : proClubTotals.goals}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {player.position === "GK"
                          ? "SG"
                          : t("labels.short.goals")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-2xl font-bold ${player.position === "GK" ? "text-amber-400" : "text-violet-400"}`}
                      >
                        {player.position === "GK"
                          ? proClubTotals.saves
                          : proClubTotals.assists}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {player.position === "GK"
                          ? t("dashboard.saves")
                          : t("labels.short.assists")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">
                        {totalTrophies}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {t("dashboard.trophies")}
                      </p>
                    </div>
                  </div>
                  {/* Resumo da Base separado (nÃ£o conta nos nÃºmeros oficiais) */}
                  {baseClubTotals.matches > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-3">
                      <div className="col-span-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        {t("history.youthCareer")}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-300">
                          {baseClubTotals.matches}
                        </p>
                        <p className="text-[10px] text-muted uppercase tracking-wider mt-1">
                          {t("labels.short.matches")}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-300">
                          {player.position === "GK"
                            ? baseClubTotals.cleanSheets
                            : baseClubTotals.goals}
                        </p>
                        <p className="text-[10px] text-muted uppercase tracking-wider mt-1">
                          {player.position === "GK"
                            ? t("cleanSheetsShort")
                            : t("labels.short.goals")}
                        </p>
                      </div>
                      <div className="text-center">
                        <p
                          className={`text-lg font-bold ${player.position === "GK" ? "text-amber-300" : "text-violet-300"}`}
                        >
                          {player.position === "GK"
                            ? baseClubTotals.saves
                            : baseClubTotals.assists}
                        </p>
                        <p className="text-[10px] text-muted uppercase tracking-wider mt-1">
                          {player.position === "GK"
                            ? t("dashboard.saves")
                            : t("labels.short.assists")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* National Team */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="Flag" size={12} className="text-emerald-400" />
                    {t("history.nationalTeam")}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {officialNational.caps}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {t("labels.short.matches")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-400">
                        {player.position === "GK"
                          ? officialNational.cleanSheets
                          : officialNational.goals}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {player.position === "GK"
                          ? t("cleanSheetsShort")
                          : t("labels.short.goals")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-2xl font-bold ${player.position === "GK" ? "text-amber-400" : "text-violet-400"}`}
                      >
                        {player.position === "GK"
                          ? officialNational.saves
                          : officialNational.assists}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {player.position === "GK"
                          ? t("dashboard.saves")
                          : t("labels.short.assists")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-2xl font-bold ${player?.nationalTeamStatus !== "Not Called" ? "text-amber-400" : "text-muted"}`}
                      >
                        {player?.nationalTeamStatus !== "Not Called"
                          ? "🟡"
                          : "-"}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {t("history.active")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Overall Total (Profissional + SeleÃ§Ã£o Oficial; exclui Base) */}
                <div className="p-4 bg-[var(--bg-secondary)]">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="Trophy" size={12} variant="solid" className="text-amber-400" />
                    {t("history.overallCareerTotal")}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {proClubTotals.matches + officialNational.caps}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {t("labels.short.matches")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-400">
                        {player.position === "GK"
                          ? proClubTotals.cleanSheets +
                          officialNational.cleanSheets
                          : proClubTotals.goals + officialNational.goals}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {player.position === "GK"
                          ? "SG"
                          : t("labels.short.goals")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-2xl font-bold ${player.position === "GK" ? "text-amber-400" : "text-violet-400"}`}
                      >
                        {player.position === "GK"
                          ? proClubTotals.saves + officialNational.saves
                          : proClubTotals.assists + officialNational.assists}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {player.position === "GK"
                          ? t("dashboard.saves")
                          : t("labels.short.assists")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">
                        {totalTrophies}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-wider mt-1">
                        {t("dashboard.trophies")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <CareerEvolutionChart history={history} player={player} />
            {/* Form (last 10 games) */}
            <div className="mt-3">
              {(() => {
                const recentRatings = (player?.matchHistory || [])
                  .slice(-10)
                  .map((m) => m.rating)
                  .filter((r) => typeof r === "number" && !isNaN(r));
                return (
                  <FormGraph
                    values={recentRatings}
                    title={t("history.formLast10") as string}
                  />
                );
              })()}
            </div>
            {/* Heatmap */}
            <div className="mt-3">
              <PlayerHeatmap
                player={player}
                title={t("history.positionHeatmap") as string}
              />
            </div>

            {/* Analytics Section - v0.5.2 */}
            <div className="mt-3 grid grid-cols-1 gap-3">
              {/* Shot Map */}
              {player.position !== "GK" && (
                <ShotMap
                  player={player}
                  seasonStats={aggregatedCareerStats}
                  title={t("analytics.shotMap") as string}
                />
              )}

              {/* League Comparison */}
              <LeagueComparison
                player={player}
                seasonStats={aggregatedCareerStats}
              />
            </div>
          </>
        )}

        {activeSubTab === "seasons" && (
          <SeasonBySeasonTable
            history={history}
            player={player}
            onViewDetails={(log) => {
              setDetailedSeasonStats(log.stats);
              setDetailedSeasonEvents(log.events || []);
              setCompetitionData(log.competitionData); // Pass competition data
              handleTabChange("detailed");
            }}
          />
        )}

        {activeSubTab === "clubs" && (
          <>
            {/* Club aggregate table (as before) */}
            <div className="bg-card rounded-[1rem] border border-primary overflow-hidden mb-8 shadow-theme">
              <div className="bg-gradient-to-r from-[var(--bg-tertiary)] to-[var(--bg-secondary)] px-4 py-3 border-b border-primary">
                <h3 className="text-base font-bold text-primary">
                  {t("history.clubHistory")}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {
                    Array.from(
                      new Set(proHistory.map((log) => log.team?.name)),
                    ).filter(Boolean).length
                  }{" "}
                  {t("history.clubs_plural")}
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-xs sm:text-sm table-fixed">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="px-2 first:pl-3 last:pr-3 py-2 text-left text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider w-[40%]">
                        {t("history.clubs")}
                      </th>
                      <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider w-[12%]">
                        {t("history.years")}
                      </th>
                      <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider w-[12%]">
                        {t("history.matchesShort")}
                      </th>

                      <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider w-[10%]">
                        {player.position === "GK" ? "SG" : "G"}
                      </th>
                      <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider w-[10%]">
                        {player.position === "GK" ? t("dashboard.saves") : "A"}
                      </th>
                      <th className="px-1 last:pr-3 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider w-[16%]">
                        {t("history.ratingShort")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {(() => {
                      const rowFillFor = (team: any, isYouth: boolean) => {
                        if (isYouth) return "bg-red-600/20";
                        const rep = team?.reputation ?? 0;
                        if (rep >= 88) return "bg-green-600/20";
                        if (rep >= 82) return "bg-yellow-600/20";
                        if (rep >= 75) return "bg-purple-600/20";
                        return "bg-blue-600/20";
                      };

                      const renderClubRow = (
                        clubLogs: any[],
                        isYouth: boolean,
                        keySuffix = "",
                      ) => {
                        const club = clubLogs[0]?.team;
                        const clubName = club?.name || "N/A";
                        const seasons = clubLogs.length;
                        const matches = clubLogs.reduce(
                          (acc, log) =>
                            acc + safeNumber(log.stats?.matchesPlayed),
                          0,
                        );
                        const wins = clubLogs.reduce(
                          (acc, log) => acc + safeNumber(log.stats?.matchesWon),
                          0,
                        );
                        const draws = clubLogs.reduce(
                          (acc, log) =>
                            acc + safeNumber(log.stats?.matchesDrawn),
                          0,
                        );
                        const losses = clubLogs.reduce(
                          (acc, log) =>
                            acc + safeNumber(log.stats?.matchesLost),
                          0,
                        );
                        const goals = clubLogs.reduce(
                          (acc, log) => acc + safeNumber(log.stats?.goals),
                          0,
                        );
                        const assists = clubLogs.reduce(
                          (acc, log) => acc + safeNumber(log.stats?.assists),
                          0,
                        );
                        const cleanSheets = clubLogs.reduce(
                          (acc, log) =>
                            acc + safeNumber(log.stats?.matchStats?.cleanSheets ?? log.stats?.cleanSheets),
                          0,
                        );
                        const saves = clubLogs.reduce(
                          (acc, log) =>
                            acc + safeNumber(log.stats?.matchStats?.saves),
                          0,
                        );

                        let totalRatingPoints = 0;
                        let totalMatchesWithRating = 0;
                        clubLogs.forEach((log) => {
                          if (log.competitionData?.competitions) {
                            log.competitionData.competitions.forEach(
                              (comp: any) => {
                                totalRatingPoints +=
                                  safeNumber(comp.rating) *
                                  safeNumber(comp.matchesPlayed);
                                totalMatchesWithRating += safeNumber(
                                  comp.matchesPlayed,
                                );
                              },
                            );
                          } else if (safeNumber(log.stats?.averageRating) > 0) {
                            totalRatingPoints +=
                              safeNumber(log.stats.averageRating) *
                              safeNumber(log.stats.matchesPlayed);
                            totalMatchesWithRating += safeNumber(
                              log.stats.matchesPlayed,
                            );
                          }
                        });
                        const avgRating =
                          totalMatchesWithRating > 0
                            ? totalRatingPoints / totalMatchesWithRating
                            : 0;

                        return (
                          <tr
                            key={`${clubName}${keySuffix}`}
                            className={`${rowFillFor(club, isYouth)}`}
                          >
                            <td className="px-2 first:pl-3 last:pr-3 py-3 overflow-hidden">
                              <div className="font-semibold text-primary text-sm flex items-center gap-2 min-w-0">
                                <span className="truncate block w-full">
                                  {clubName}
                                </span>
                              </div>
                              <div className="text-xs text-muted truncate">
                                {translateCountry(t, club?.country)}
                              </div>
                            </td>
                            <td className="px-1 py-3 text-center text-secondary font-medium">
                              {seasons}
                            </td>

                            <td className="px-1 py-3 text-center text-slate-300">
                              {matches}
                            </td>

                            <td className="px-1 py-3 text-center text-emerald-400 font-bold">
                              {player.position === "GK" ? cleanSheets : goals}
                            </td>
                            <td
                              className={`px-1 py-3 text-center ${player.position === "GK" ? "text-amber-400" : "text-violet-400"} font-bold`}
                            >
                              {player.position === "GK" ? saves : assists}
                            </td>
                            <td
                              className={`px-1 last:pr-3 py-3 text-center font-bold ${getRatingColor(avgRating)}`}
                            >
                              {avgRating.toFixed(2)}
                            </td>
                          </tr>
                        );
                      };

                      const proClubNames = Array.from(
                        new Set(
                          proHistory
                            .map((log) => log.team?.name)
                            .filter(Boolean),
                        ),
                      ).sort(
                        (a, b) =>
                          proHistory.findIndex((l) => l.team?.name === a) -
                          proHistory.findIndex((l) => l.team?.name === b),
                      );
                      const youthClubNames = Array.from(
                        new Set(
                          baseHistory
                            .map((log) => log.team?.name)
                            .filter(Boolean),
                        ),
                      ).sort(
                        (a, b) =>
                          baseHistory.findIndex((l) => l.team?.name === a) -
                          baseHistory.findIndex((l) => l.team?.name === b),
                      );

                      return (
                        <>
                          {proClubNames.map((clubName) => {
                            const clubLogs = proHistory.filter(
                              (log) => log.team?.name === clubName,
                            );
                            return renderClubRow(clubLogs, false);
                          })}
                          {youthClubNames.map((clubName) => {
                            const clubLogs = baseHistory.filter(
                              (log) => log.team?.name === clubName,
                            );
                            return renderClubRow(clubLogs, true, "-youth");
                          })}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="bg-[var(--bg-secondary)] px-4 py-3 border-t border-primary">
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-600/50 border border-green-600"></div>
                    <span className="text-slate-400">{t("history.elite")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-yellow-600/50 border border-yellow-600"></div>
                    <span className="text-slate-400">{t("history.top")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-purple-600/50 border border-purple-600"></div>
                    <span className="text-slate-400">{t("history.mid")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-600/50 border border-blue-600"></div>
                    <span className="text-slate-400">{t("history.lower")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-600/50 border border-red-600"></div>
                    <span className="text-slate-400">
                      {t("history.youthCareer")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Competition aggregate table (all clubs combined) */}
            <div className="bg-card rounded-[1rem] border border-primary overflow-hidden mb-8 shadow-theme">
              <div className="bg-gradient-to-r from-[var(--bg-tertiary)] to-[var(--bg-secondary)] px-4 py-3 border-b border-primary">
                <h3 className="text-base font-bold text-primary">
                  {t("history.competitionHistory")}
                </h3>
              </div>
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="px-3 first:pl-4 last:pr-4 py-2 text-left text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider">
                        {t("history.competition")}
                      </th>
                      <th className="px-3 first:pl-4 last:pr-4 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider">
                        {t("history.matchesShort")}
                      </th>

                      <th className="px-3 first:pl-4 last:pr-4 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider">
                        {player.position === "GK"
                          ? t("cleanSheetsShort")
                          : t("goalsShort")}
                      </th>
                      <th className="px-3 first:pl-4 last:pr-4 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider">
                        {player.position === "GK"
                          ? t("dashboard.saves")
                          : t("assistsShort")}
                      </th>
                      <th className="px-3 first:pl-4 last:pr-4 py-2 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider">
                        {t("history.ratingShort")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bg-tertiary)]">
                    {(() => {
                      const competitions = {} as {
                        [key: string]: {
                          type: string;
                          country: string;
                          matches: number;
                          goals: number;
                          assists: number;
                          cleanSheets: number;
                          saves: number;
                          ratingWeighted: number;
                          ratingMatches: number;
                          wins: number;
                          draws: number;
                          losses: number;
                        };
                      };
                      proHistory.forEach((log) => {
                        if (log.competitionData?.competitions) {
                          log.competitionData.competitions
                            .filter((comp) => comp.type !== "International")
                            .forEach((comp) => {
                              const compCountry =
                                log.competitionData?.country ||
                                log.team?.country ||
                                "";
                              // Improved key to avoid duplicates: use simple name + type
                              const key = comp.competition;
                              if (!competitions[key]) {
                                competitions[key] = {
                                  type: comp.type,
                                  country: compCountry,
                                  matches: 0,
                                  goals: 0,
                                  assists: 0,
                                  cleanSheets: 0,
                                  saves: 0,
                                  ratingWeighted: 0,
                                  ratingMatches: 0,
                                  wins: 0,
                                  draws: 0,
                                  losses: 0,
                                };
                              }
                              competitions[key].matches += safeNumber(
                                comp.matchesPlayed,
                              );
                              competitions[key].goals += safeNumber(comp.goals);
                              competitions[key].assists += safeNumber(
                                comp.assists,
                              );
                              competitions[key].cleanSheets += safeNumber(
                                comp.cleanSheets,
                              );
                              competitions[key].saves += safeNumber(
                                (comp as any).saves,
                              );
                              competitions[key].ratingWeighted +=
                                safeNumber(comp.rating) *
                                safeNumber(comp.matchesPlayed);
                              competitions[key].ratingMatches += safeNumber(
                                comp.matchesPlayed,
                              );
                              competitions[key].wins += safeNumber(
                                comp.matchesWon,
                              );
                              competitions[key].draws += safeNumber(
                                comp.matchesDrawn,
                              );
                              competitions[key].losses += safeNumber(
                                comp.matchesLost,
                              );
                            });
                        }
                      });
                      return Object.entries(competitions).map(
                        ([key, compData]) => {
                          const avgRating =
                            compData.ratingMatches > 0
                              ? compData.ratingWeighted / compData.ratingMatches
                              : 0;
                          const compName = key;
                          return (
                            <tr key={key}>
                              <td className="px-3 first:pl-4 last:pr-4 py-3 text-white font-semibold">
                                {t(compName) || compName}
                              </td>
                              <td className="px-3 first:pl-4 last:pr-4 py-3 text-center text-slate-300">
                                {compData.matches}
                              </td>

                              <td className="px-3 first:pl-4 last:pr-4 py-3 text-center text-emerald-400 font-bold">
                                {player.position === "GK"
                                  ? compData.cleanSheets
                                  : compData.goals}
                              </td>
                              <td
                                className={`px-3 first:pl-4 last:pr-4 py-3 text-center ${player.position === "GK" ? "text-amber-400" : "text-violet-400"} font-bold`}
                              >
                                {player.position === "GK"
                                  ? compData.saves
                                  : compData.assists}
                              </td>
                              <td
                                className={`px-3 first:pl-4 last:pr-4 py-3 text-center font-bold ${getRatingColor(avgRating)}`}
                              >
                                {avgRating.toFixed(2)}
                              </td>
                            </tr>
                          );
                        },
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* National Team */}
            <div className="bg-card rounded-[1rem] border border-primary overflow-hidden shadow-theme relative">
              {/* Top Section: Gradient Header + Stats */}
              <div
                className="relative z-10"
                style={{
                  background: (() => {
                    const colors = getNationalFlagGradient(
                      player?.nationality || "",
                    );
                    const mainColor = colors[0];
                    const secColor = colors[1] || "#ffffff";
                    // Premium gradient: Darker shade -> Main Color -> Light/White fade
                    return `linear-gradient(135deg, ${mainColor} 0%, ${mainColor} 40%, ${secColor} 100%)`;
                  })(),
                }}
              >
                {/* Subtle overlay for text readability if needed, but keeping it light as requested */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-white/10 pointer-events-none"></div>

                {/* Header with premium gradient */}
                <div className="px-6 py-6 border-b border-white/10 relative z-10">
                  <div className="flex flex-col justify-center h-full">
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] mb-1">
                      {t("history.nationalTeam")}
                    </p>
                    <h2 className="text-3xl font-black text-white tracking-tight leading-none drop-shadow-md">
                      {translateCountry(t, player?.nationality || "")}
                    </h2>
                    <p className="text-[10px] text-white/60 mt-1 font-medium">
                      {t("history.officialMatchesOnly")}
                    </p>
                  </div>
                </div>

                {/* Mini-card: four stat chips */}
                {(() => {
                  let caps = 0,
                    goals = 0,
                    assists = 0,
                    cleanSheets = 0,
                    saves = 0,
                    ratingWeighted = 0,
                    ratingMatches = 0;
                  (history || []).slice(1).forEach((log) => {
                    if (log.competitionData?.competitions) {
                      log.competitionData.competitions
                        .filter(
                          (c) =>
                            c.type === "International" &&
                            c.competition !== "Friendly",
                        )
                        .forEach((c) => {
                          caps += safeNumber(c.matchesPlayed);
                          goals += safeNumber(c.goals);
                          assists += safeNumber(c.assists);
                          cleanSheets += safeNumber(c.cleanSheets);
                          saves += safeNumber((c as any).saves);
                          ratingWeighted +=
                            safeNumber(c.rating) * safeNumber(c.matchesPlayed);
                          ratingMatches += safeNumber(c.matchesPlayed);
                        });
                    }
                  });
                  const avgNum =
                    ratingMatches > 0 ? ratingWeighted / ratingMatches : 0;
                  const avgStr = ratingMatches > 0 ? avgNum.toFixed(2) : "N/A";
                  const avgColor =
                    ratingMatches > 0
                      ? getRatingColor(avgNum)
                      : "text-slate-300";

                  const Chip: React.FC<{
                    label: string;
                    value: string | number;
                    valueColor?: string;
                  }> = ({ label, value, valueColor = "text-white" }) => (
                    <div className="px-4 py-3 rounded-lg bg-black/20 border border-white/10 backdrop-blur-sm">
                      <div className="text-[10px] uppercase tracking-wider text-white/70 font-semibold mb-1">
                        {label}
                      </div>
                      <div className={`font-bold text-lg ${valueColor}`}>
                        {value}
                      </div>
                    </div>
                  );

                  return (
                    <div className="grid grid-cols-4 gap-3 p-4 border-b border-white/10 relative z-10">
                      <Chip
                        label={t("labels.short.matches") as string}
                        value={caps}
                        valueColor="text-white"
                      />
                      <Chip
                        label={
                          player.position === "GK"
                            ? "SG"
                            : (t("labels.short.goals") as string)
                        }
                        value={player.position === "GK" ? cleanSheets : goals}
                        valueColor="text-emerald-200"
                      />
                      <Chip
                        label={
                          player.position === "GK"
                            ? (t("dashboard.saves") as string)
                            : (t("labels.short.assists") as string)
                        }
                        value={player.position === "GK" ? saves : assists}
                        valueColor={
                          player.position === "GK"
                            ? "text-amber-200"
                            : "text-violet-200"
                        }
                      />
                      <Chip
                        label={t("history.ratingShort") as string}
                        value={avgStr}
                        valueColor={
                          ratingMatches > 0 ? "text-white" : "text-white/50"
                        }
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Section: Table (Standard Background) */}
              <div className="bg-card/50">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-900/50">
                        <th className="px-3 first:pl-4 last:pr-4 py-2 text-left text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {t("history.competition")}
                        </th>
                        <th className="px-3 first:pl-4 last:pr-4 py-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {t("history.matchesShort")}
                        </th>
                        <th className="px-3 first:pl-4 last:pr-4 py-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {player.position === "GK" ? "SG" : "G"}
                        </th>
                        <th className="px-3 first:pl-4 last:pr-4 py-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {player.position === "GK"
                            ? t("dashboard.saves")
                            : "A"}
                        </th>
                        <th className="px-3 first:pl-4 last:pr-4 py-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {t("history.ratingShort")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {(() => {
                        const totals: Record<
                          string,
                          {
                            matches: number;
                            goals: number;
                            assists: number;
                            cleanSheets: number;
                            saves: number;
                            ratingWeighted: number;
                            ratingMatches: number;
                          }
                        > = {};
                        (history || []).slice(1).forEach((log) => {
                          if (log.competitionData?.competitions) {
                            log.competitionData.competitions
                              .filter((c) => c.type === "International")
                              .forEach((comp) => {
                                const key = comp.competition;
                                if (!totals[key]) {
                                  totals[key] = {
                                    matches: 0,
                                    goals: 0,
                                    assists: 0,
                                    cleanSheets: 0,
                                    saves: 0,
                                    ratingWeighted: 0,
                                    ratingMatches: 0,
                                  };
                                }
                                totals[key].matches += safeNumber(
                                  comp.matchesPlayed,
                                );
                                totals[key].goals += safeNumber(comp.goals);
                                totals[key].assists += safeNumber(comp.assists);
                                totals[key].cleanSheets += safeNumber(
                                  comp.cleanSheets,
                                );
                                totals[key].saves += safeNumber(
                                  (comp as any).saves,
                                );
                                totals[key].ratingWeighted +=
                                  safeNumber(comp.rating) *
                                  safeNumber(comp.matchesPlayed);
                                totals[key].ratingMatches += safeNumber(
                                  comp.matchesPlayed,
                                );
                              });
                          }
                        });
                        const officialOrder = [
                          "World Cup",
                          "Continental Cup",
                          "Nations League",
                          "Qualifier",
                          "Friendly",
                        ];
                        const rows = Object.entries(totals).sort(
                          (a, b) =>
                            officialOrder.indexOf(a[0]) -
                            officialOrder.indexOf(b[0]),
                        );
                        return rows.map(([name, totalsData]) => {
                          const avg =
                            totalsData.ratingMatches > 0
                              ? totalsData.ratingWeighted /
                              totalsData.ratingMatches
                              : 0;
                          return (
                            <tr key={name} className="hover:bg-slate-700/20">
                              <td className="px-3 first:pl-4 last:pr-4 py-3 text-white font-semibold">
                                {t(`competitionNames.${name}`) !==
                                  `competitionNames.${name}`
                                  ? t(`competitionNames.${name}`)
                                  : name}
                              </td>
                              <td className="px-3 first:pl-4 last:pr-4 py-3 text-center text-slate-300">
                                {totalsData.matches}
                              </td>
                              <td className="px-3 first:pl-4 last:pr-4 py-3 text-center text-emerald-400 font-bold">
                                {player.position === "GK"
                                  ? totalsData.cleanSheets
                                  : totalsData.goals}
                              </td>
                              <td
                                className={`px-3 first:pl-4 last:pr-4 py-3 text-center ${player.position === "GK" ? "text-amber-400" : "text-violet-400"} font-bold`}
                              >
                                {player.position === "GK"
                                  ? totalsData.saves
                                  : totalsData.assists}
                              </td>
                              <td
                                className={`px-3 first:pl-4 last:pr-4 py-3 text-center font-bold ${getRatingColor(avg)}`}
                              >
                                {avg.toFixed(2)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSubTab === "honors" && (
          <TrophyCabinet history={history} player={player} />
        )}

        {activeSubTab === "detailed" && detailedSeasonStats && (
          <DetailedStatsView
            seasonStats={detailedSeasonStats}
            events={detailedSeasonEvents || []}
            playerPosition={player?.position || "ST"}
            competitionData={competitionData} // Pass prop
          />
        )}
      </div>
    </div>
  );
};

export default DashboardHistoryTab;
