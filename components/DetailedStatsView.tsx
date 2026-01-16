import React, { useState, useMemo, memo } from "react";
import { useI18n } from "../contexts/I18nContext";
import type {
  SeasonStats,
  CareerEvent,
  PositionDetail,
  MatchStats,
  ExtendedMatchStats,
} from "../types";
import { getRatingColor } from "../services/ratingSystem";
import { Icon, type IconName } from "./ui/Icon";

// Helper to safely handle numbers (prevents NaN rendering)
const safeNum = (value: number | undefined | null, fallback = 0): number =>
  value != null && Number.isFinite(value) ? value : fallback;

const STAT_HIGHLIGHTS = {
  green: "text-emerald-400",
  yellow: "text-yellow-400",
  purple: "text-violet-400",
  blue: "text-blue-400",
  red: "text-red-400",
} as const;

type HighlightColor = keyof typeof STAT_HIGHLIGHTS;

// Ícones usando Lucide ao invés de Font Awesome
const SECTION_ICONS: Record<string, IconName> = {
  events: "ClipboardList",
  general: "ChartBar",
  goalkeeping: "Hand",
  attacking: "CircleDot",
  goalTypes: "Target",
  creativity: "Lightbulb",
  passing: "Route",
  dribbling: "PersonStanding",
  defending: "ShieldHalf",
  duels: "Users",
  workRate: "Wind",
  discipline: "Square",
  errors: "CircleAlert",
};

// ==================== TYPES ====================

interface StatItemProps {
  label: string;
  value: string | number | undefined | null;
  highlight?: HighlightColor;
  showZero?: boolean;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: IconName;
  isEmpty?: boolean;
}

interface DetailedStatsViewProps {
  seasonStats: SeasonStats;
  events?: CareerEvent[];
  playerPosition?: PositionDetail;
  competitionData?: any;
}

// Garantir que goleiros nunca fiquem com estatísticas zeradas (quando dados antigos não tinham saves/concedidos)
const hydrateGoalkeeperStats = (
  stats: ExtendedMatchStats,
  playerOverall?: number,
): ExtendedMatchStats => {
  const hasGKData =
    (stats.saves ?? 0) > 0 ||
    (stats.goalsConceded ?? 0) > 0 ||
    (stats.cleanSheets ?? 0) > 0;

  if (hasGKData) return stats;

  const matches = Math.max(1, stats.matches || 0);
  const ability = Math.max(0.55, Math.min(1.05, (playerOverall ?? 78) / 100));

  const savesPerGame = Number((3.2 * (0.85 + ability * 0.6)).toFixed(2));
  const saves = Math.max(1, Math.round(savesPerGame * matches));

  const goalsConcededPerGame = Number((1.2 - ability * 0.55).toFixed(2));
  const goalsConceded = Math.max(0, Math.round(goalsConcededPerGame * matches));

  const cleanSheetRate = Math.min(0.55, 0.18 + ability * 0.35);
  const cleanSheets = Math.round(matches * cleanSheetRate);

  const shotsOnTargetFaced = saves + goalsConceded;
  const savePercentage = shotsOnTargetFaced
    ? Number(((saves / shotsOnTargetFaced) * 100).toFixed(2))
    : 0;

  const cleanSheetPercentage = Number(
    ((cleanSheets / matches) * 100 || 0).toFixed(2),
  );

  const goalsConcededPerGameSafe = matches
    ? Number((goalsConceded / matches).toFixed(2))
    : 0;
  const savesPerGameSafe = matches
    ? Number((saves / matches).toFixed(2))
    : savesPerGame;

  const distributionAccuracy = stats.distributionAccuracy ?? Number(
    (60 + ability * 25).toFixed(2),
  );

  return {
    ...stats,
    saves,
    savesPerGame: savesPerGameSafe,
    savePercentage,
    cleanSheets,
    cleanSheetPercentage,
    goalsConceded,
    goalsConcededPerGame: goalsConcededPerGameSafe,
    shotsOnTargetFaced,
    distributionAccuracy,
  };
};

interface StatConfig {
  key: keyof ExtendedMatchStats;
  labelKey: string;
  highlight?: HighlightColor;
  format?: "number" | "decimal" | "percentage";
  decimals?: number;
}

// ==================== HELPER FUNCTIONS ====================

// Mapeia nomes internos de competições para chaves de tradução
const getCompetitionTranslationKey = (competition: string): string => {
  const competitionMap: Record<string, string> = {
    // Competições Europeias (legacy + generic)
    "Champions League": "trophiesSection.championsLeague",
    "Continental Championship": "trophiesSection.championsLeague",
    "European Champions Cup": "trophiesSection.championsLeague",
    "Europa League": "trophiesSection.europaLeague",
    "Continental Cup": "trophiesSection.europaLeague",
    "European Club Cup": "trophiesSection.europaLeague",
    "Conference League": "trophiesSection.conferenceLeague",
    "Continental League": "trophiesSection.conferenceLeague",
    "European Access Cup": "trophiesSection.conferenceLeague",
    // Sul-Americanas (legacy + generic)
    "Copa Libertadores": "trophiesSection.libertadores",
    "South American Championship": "trophiesSection.libertadores",
    "South American Champions Cup": "trophiesSection.libertadores",
    Libertadores: "trophiesSection.libertadores",
    "Copa Sudamericana": "trophiesSection.copaSudamericana",
    "South American Cup": "trophiesSection.copaSudamericana",
    "South American Club Cup": "trophiesSection.copaSudamericana",
    // Asiáticas (legacy + generic)
    "AFC Champions League": "trophiesSection.afcChampionsLeague",
    "Asian Championship": "trophiesSection.afcChampionsLeague",
    "Asian Champions Cup": "trophiesSection.afcChampionsLeague",
    "AFC Cup": "trophiesSection.afcCup",
    "Asian Cup": "trophiesSection.afcCup",
    "Asian Club Cup": "trophiesSection.afcCup",
    // Africanas (legacy + generic)
    "CAF Champions League": "trophiesSection.cafChampionsLeague",
    "African Championship": "trophiesSection.cafChampionsLeague",
    "African Champions Cup": "trophiesSection.cafChampionsLeague",
    "CAF Confederation Cup": "trophiesSection.cafConfederationCup",
    "African Cup": "trophiesSection.cafConfederationCup",
    "African Club Cup": "trophiesSection.cafConfederationCup",
    // Norte/Centro Americanas (legacy + generic)
    "CONCACAF Champions Cup": "trophiesSection.concacafChampionsCup",
    "North American Championship": "trophiesSection.concacafChampionsCup",
    "North American Champions Cup": "trophiesSection.concacafChampionsCup",
    // Copas Domésticas
    "Domestic Cup": "trophiesSection.cup",
    "League Cup": "trophiesSection.cup",
    // Outras
    "Club World Cup": "trophiesSection.clubWorldCup",
    "Intercontinental Cup": "trophiesSection.intercontinentalCup",
    League: "trophiesSection.league",
    // Seleção Nacional
    Friendly: "competition.friendly",
    Qualifier: "competition.qualifier",
    "Nations League": "trophiesSection.nationsLeague",
    "World Cup": "trophiesSection.worldCup",
    // Competições Juvenis
    "English Youth League": "trophiesSection.English Youth League",
    "English Youth Cup": "trophiesSection.English Youth Cup",
    "Spanish Youth League": "trophiesSection.Spanish Youth League",
    "Spanish Youth Cup": "trophiesSection.Spanish Youth Cup",
    "German Youth League": "trophiesSection.German Youth League",
    "German Youth Cup": "trophiesSection.German Youth Cup",
    "Italian Youth League": "trophiesSection.Italian Youth League",
    "Italian Youth Cup": "trophiesSection.Italian Youth Cup",
    "French Youth League": "trophiesSection.French Youth League",
    "French Youth Cup": "trophiesSection.French Youth Cup",
    "Portuguese Youth League": "trophiesSection.Portuguese Youth League",
    "Portuguese Youth Cup": "trophiesSection.Portuguese Youth Cup",
    "Dutch Youth League": "trophiesSection.Dutch Youth League",
    "Dutch Youth Cup": "trophiesSection.Dutch Youth Cup",
    "Brazilian U20 League": "trophiesSection.Brazilian U20 League",
    "Brazilian U20 Cup": "trophiesSection.Brazilian U20 Cup",
    "Argentine Reserve League": "trophiesSection.Argentine Reserve League",
    "Argentine Youth Cup": "trophiesSection.Argentine Youth Cup",
    "European Youth League": "trophiesSection.European Youth League",
    "São Paulo Youth Cup": "trophiesSection.São Paulo Youth Cup",
    "Youth Projection Tournament": "trophiesSection.Youth Projection Tournament",
  };

  return competitionMap[competition] || competition;
};

const formatStatValue = (
  value: number | undefined | null,
  format: "number" | "decimal" | "percentage" = "number",
  decimals: number = 2,
): string => {
  if (value === undefined || value === null) return "N/A";

  switch (format) {
    case "percentage":
      return `${value.toFixed(decimals)}%`;
    case "decimal":
      return value.toFixed(decimals);
    default:
      return value.toString();
  }
};

// ==================== STAT ITEM COMPONENT ====================

const StatItem = memo<StatItemProps>(
  ({ label, value, highlight, showZero = true }) => {
    // Se valor é 0 e não queremos mostrar zero, retorna null
    if (!showZero && (value === 0 || value === "0")) return null;

    const displayValue = value ?? "N/A";
    const valueColorClass = highlight
      ? STAT_HIGHLIGHTS[highlight]
      : "text-white";

    return (
      <div className="flex justify-between items-center py-2.5 border-b border-slate-700/30 last:border-b-0">
        <p className="text-xs sm:text-sm text-slate-400">{label}</p>
        <p className={`text-sm sm:text-base font-bold ${valueColorClass}`}>
          {displayValue}
        </p>
      </div>
    );
  },
);

StatItem.displayName = "StatItem";

// ==================== COLLAPSIBLE SECTION ====================

const CollapsibleSection = memo<CollapsibleSectionProps>(
  ({ title, children, defaultOpen = false, icon, isEmpty = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // Não renderiza se está vazio
    if (isEmpty) return null;

    return (
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
          type="button"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3">
            {icon && <Icon name={icon} size={18} className="text-slate-400" />}
            <h4 className="text-sm sm:text-base font-bold text-white">
              {title}
            </h4>
          </div>
          <Icon
            name="CaretDown"
            size={14}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Só renderiza conteúdo quando aberto - melhora performance */}
        {isOpen && <div className="p-4 animate-fade-in">{children}</div>}
      </div>
    );
  },
);

CollapsibleSection.displayName = "CollapsibleSection";

// ==================== STAT SECTION RENDERER ====================

interface StatSectionProps {
  stats: ExtendedMatchStats;
  config: StatConfig[];
  t: (key: string) => string;
}

const StatSection: React.FC<StatSectionProps> = ({ stats, config, t }) => {
  return (
    <>
      {config.map(({ key, labelKey, highlight, format, decimals }) => {
        const rawValue = stats[key];
        const value =
          typeof rawValue === "number"
            ? formatStatValue(rawValue, format, decimals)
            : rawValue;

        return (
          <StatItem
            key={String(key)}
            label={t(labelKey)}
            value={value}
            highlight={highlight}
          />
        );
      })}
    </>
  );
};

// ==================== STAT CONFIGURATIONS ====================

const GENERAL_STATS: StatConfig[] = [
  {
    key: "matches",
    labelKey: "detailedStats.matchesPlayed",
    highlight: "blue",
  },
  { key: "gamesStarted", labelKey: "detailedStats.gamesStarted" },
  { key: "gamesAsSubstitute", labelKey: "detailedStats.gamesAsSubstitute" },
  { key: "minutesPlayed", labelKey: "detailedStats.minutesPlayed" },
  {
    key: "teamOfTheWeek",
    labelKey: "detailedStats.teamOfTheWeek",
    highlight: "purple",
  },
];

const GOALKEEPER_STATS: StatConfig[] = [
  {
    key: "cleanSheets",
    labelKey: "detailedStats.cleanSheets",
    highlight: "green",
  },
  {
    key: "cleanSheetPercentage",
    labelKey: "detailedStats.cleanSheetPercentage",
    format: "percentage",
    decimals: 1,
  },
  { key: "saves", labelKey: "detailedStats.saves" },
  {
    key: "savesPerGame",
    labelKey: "detailedStats.savesPerGame",
    format: "decimal",
  },
  {
    key: "savePercentage",
    labelKey: "detailedStats.savePercentage",
    format: "percentage",
    decimals: 1,
    highlight: "yellow",
  },
  {
    key: "goalsConceded",
    labelKey: "detailedStats.goalsConceded",
    highlight: "red",
  },
  {
    key: "goalsConcededPerGame",
    labelKey: "detailedStats.goalsConcededPerGame",
    format: "decimal",
  },
  {
    key: "expectedGoalsConceded",
    labelKey: "detailedStats.expectedGoalsConceded",
    format: "decimal",
  },
  {
    key: "goalsPreventedVsExpected",
    labelKey: "detailedStats.goalsPreventedVsExpected",
    format: "decimal",
  },
  { key: "shotsOnTargetFaced", labelKey: "detailedStats.shotsOnTargetFaced" },
  { key: "penaltiesFaced", labelKey: "detailedStats.penaltiesFaced" },
  {
    key: "penaltiesSaved",
    labelKey: "detailedStats.penaltiesSaved",
    highlight: "green",
  },
  {
    key: "penaltySavePercentage",
    labelKey: "detailedStats.penaltySavePercentage",
    format: "percentage",
    decimals: 1,
  },
  { key: "claimedCrosses", labelKey: "detailedStats.crossesClaimed" },
  { key: "punchesMade", labelKey: "detailedStats.punchesMade" },
  { key: "sweeper", labelKey: "detailedStats.sweeperActions" },
  {
    key: "distributionAccuracy",
    labelKey: "detailedStats.distributionAccuracy",
    format: "percentage",
    decimals: 1,
  },
];

const ATTACKING_STATS: StatConfig[] = [
  { key: "goals", labelKey: "detailedStats.goals", highlight: "green" },
  {
    key: "expectedGoals",
    labelKey: "detailedStats.expectedGoals",
    format: "decimal",
  },
  {
    key: "goalsPerMatch",
    labelKey: "detailedStats.goalsPerMatch",
    format: "decimal",
  },
  { key: "shots", labelKey: "detailedStats.shots" },
  { key: "shotsOnTarget", labelKey: "detailedStats.shotsOnTarget" },
  {
    key: "shotsOnTargetPerGame",
    labelKey: "detailedStats.shotsOnTargetPerGame",
    format: "decimal",
  },
  {
    key: "shotAccuracy",
    labelKey: "detailedStats.shotAccuracy",
    format: "percentage",
    decimals: 1,
  },
  {
    key: "goalConversion",
    labelKey: "detailedStats.goalConversion",
    format: "percentage",
    decimals: 1,
    highlight: "yellow",
  },
  { key: "bigChancesCreated", labelKey: "detailedStats.bigChancesCreated" },
  { key: "bigChancesConverted", labelKey: "detailedStats.bigChancesConverted" },
  {
    key: "bigChancesMissed",
    labelKey: "detailedStats.bigChancesMissed",
    highlight: "red",
  },
  { key: "penaltiesWon", labelKey: "detailedStats.penaltiesWon" },
];

const GOAL_TYPES_STATS: StatConfig[] = [
  {
    key: "goalsFromInsideBox",
    labelKey: "detailedStats.goalsFromInsideBox",
    highlight: "green",
  },
  {
    key: "goalsFromOutsideBox",
    labelKey: "detailedStats.goalsFromOutsideBox",
    highlight: "green",
  },
  { key: "headedGoals", labelKey: "detailedStats.headedGoals" },
  { key: "leftFootGoals", labelKey: "detailedStats.leftFootGoals" },
  { key: "rightFootGoals", labelKey: "detailedStats.rightFootGoals" },
  { key: "weakFootGoals", labelKey: "detailedStats.weakFootGoals" },
  { key: "penaltyGoals", labelKey: "detailedStats.penaltyGoals" },
  {
    key: "penaltyConversion",
    labelKey: "detailedStats.penaltyConversion",
    format: "percentage",
    decimals: 1,
  },
  { key: "freeKickGoals", labelKey: "detailedStats.freeKickGoals" },
  {
    key: "directFreeKickEffectiveness",
    labelKey: "detailedStats.directFKEffectiveness",
    format: "percentage",
    decimals: 1,
  },
  { key: "volleyGoals", labelKey: "detailedStats.volleyGoals" },
  { key: "chipGoals", labelKey: "detailedStats.chipGoals" },
  { key: "curvedGoals", labelKey: "detailedStats.curvedGoals" },
];

const CREATIVITY_STATS: StatConfig[] = [
  { key: "assists", labelKey: "detailedStats.assists", highlight: "purple" },
  {
    key: "expectedAssists",
    labelKey: "detailedStats.expectedAssists",
    format: "decimal",
  },
  {
    key: "assistsPerMatch",
    labelKey: "detailedStats.assistsPerMatch",
    format: "decimal",
  },
  { key: "keyPasses", labelKey: "detailedStats.keyPasses" },
  {
    key: "keyPassesPerGame",
    labelKey: "detailedStats.keyPassesPerGame",
    format: "decimal",
  },
  {
    key: "bigChancesCreated",
    labelKey: "detailedStats.bigChancesCreated",
    highlight: "yellow",
  },
  { key: "touches", labelKey: "detailedStats.touches" },
  {
    key: "touchesInOppositionBox",
    labelKey: "detailedStats.touchesInOppositionBox",
  },
  { key: "throughBalls", labelKey: "detailedStats.throughBalls" },
  {
    key: "accurateThroughBalls",
    labelKey: "detailedStats.accurateThroughBalls",
  },
  {
    key: "throughBallAccuracy",
    labelKey: "detailedStats.throughBallAccuracy",
    format: "percentage",
    decimals: 1,
  },
];

const PASSING_STATS: StatConfig[] = [
  { key: "passes", labelKey: "detailedStats.totalPasses" },
  { key: "passesCompleted", labelKey: "detailedStats.passesCompleted" },
  {
    key: "passCompletion",
    labelKey: "detailedStats.passCompletion",
    format: "percentage",
    decimals: 1,
    highlight: "yellow",
  },
  {
    key: "passesPerGame",
    labelKey: "detailedStats.passesPerGame",
    format: "decimal",
  },
  { key: "passesInOwnHalf", labelKey: "detailedStats.passesInOwnHalf" },
  {
    key: "passesInOppositionHalf",
    labelKey: "detailedStats.passesInOppositionHalf",
  },
  { key: "passesInFinalThird", labelKey: "detailedStats.passesInFinalThird" },
  { key: "forwardPasses", labelKey: "detailedStats.forwardPasses" },
  {
    key: "forwardPassesCompleted",
    labelKey: "detailedStats.forwardPassesCompleted",
  },
  { key: "backwardPasses", labelKey: "detailedStats.backwardPasses" },
  { key: "sidewaysPasses", labelKey: "detailedStats.sidewaysPasses" },
  { key: "longBalls", labelKey: "detailedStats.longBalls" },
  { key: "accurateLongBalls", labelKey: "detailedStats.accurateLongBalls" },
  {
    key: "longBallAccuracy",
    labelKey: "detailedStats.longBallAccuracy",
    format: "percentage",
    decimals: 1,
  },
  { key: "crosses", labelKey: "detailedStats.crosses" },
  { key: "accurateCrosses", labelKey: "detailedStats.accurateCrosses" },
  {
    key: "crossAccuracy",
    labelKey: "detailedStats.crossAccuracy",
    format: "percentage",
    decimals: 1,
  },
  { key: "corners", labelKey: "detailedStats.cornersTaken" },
  {
    key: "cornerAccuracy",
    labelKey: "detailedStats.cornerAccuracy",
    format: "percentage",
    decimals: 1,
  },
];

const DRIBBLING_STATS: StatConfig[] = [
  { key: "dribbles", labelKey: "detailedStats.dribblesAttempted" },
  { key: "dribblesSucceeded", labelKey: "detailedStats.dribblesSucceeded" },
  {
    key: "dribblesSuccessPercentage",
    labelKey: "detailedStats.dribbleSuccess",
    format: "percentage",
    decimals: 1,
    highlight: "yellow",
  },
  { key: "skillMovesCompleted", labelKey: "detailedStats.skillMovesCompleted" },
  { key: "nutmegs", labelKey: "detailedStats.nutmegs" },
  {
    key: "timesDispossessed",
    labelKey: "detailedStats.timesDispossessed",
    highlight: "red",
  },
  {
    key: "possessionLost",
    labelKey: "detailedStats.possessionLost",
    highlight: "red",
  },
  {
    key: "possessionLostInOwnHalf",
    labelKey: "detailedStats.possessionLostInOwnHalf",
    highlight: "red",
  },
  {
    key: "ballTouchesPerGame",
    labelKey: "detailedStats.ballTouchesPerGame",
    format: "decimal",
  },
  {
    key: "firstTouchSuccess",
    labelKey: "detailedStats.firstTouchSuccess",
    format: "percentage",
    decimals: 1,
  },
];

const DEFENDING_STATS: StatConfig[] = [
  { key: "tackles", labelKey: "detailedStats.tackles" },
  { key: "tacklesWon", labelKey: "detailedStats.tacklesWon" },
  {
    key: "tacklesPerGame",
    labelKey: "detailedStats.tacklesPerGame",
    format: "decimal",
  },
  {
    key: "tackleSuccess",
    labelKey: "detailedStats.tackleSuccess",
    format: "percentage",
    decimals: 1,
    highlight: "yellow",
  },
  { key: "interceptions", labelKey: "detailedStats.interceptions" },
  {
    key: "interceptionsPerGame",
    labelKey: "detailedStats.interceptionsPerGame",
    format: "decimal",
  },
  { key: "clearances", labelKey: "detailedStats.clearances" },
  {
    key: "clearancesPerGame",
    labelKey: "detailedStats.clearancesPerGame",
    format: "decimal",
  },
  { key: "headedClearances", labelKey: "detailedStats.headedClearances" },
  { key: "shotsBlocked", labelKey: "detailedStats.shotsBlocked" },
  { key: "passesBlocked", labelKey: "detailedStats.passesBlocked" },
  {
    key: "blocksPerGame",
    labelKey: "detailedStats.blocksPerGame",
    format: "decimal",
  },
  { key: "ballRecoveries", labelKey: "detailedStats.ballRecoveries" },
  {
    key: "ballRecoveriesInAttack",
    labelKey: "detailedStats.recoveriesInAttack",
  },
  {
    key: "ballRecoveriesInMidfield",
    labelKey: "detailedStats.recoveriesInMidfield",
  },
  {
    key: "ballRecoveriesInDefence",
    labelKey: "detailedStats.recoveriesInDefence",
  },
  {
    key: "ballRecoveriesPerGame",
    labelKey: "detailedStats.recoveriesPerGame",
    format: "decimal",
  },
  { key: "lastManTackles", labelKey: "detailedStats.lastManTackles" },
  { key: "slidingTackles", labelKey: "detailedStats.slidingTackles" },
  {
    key: "slidingTackleSuccess",
    labelKey: "detailedStats.slidingTackleSuccess",
    format: "percentage",
    decimals: 1,
  },
  { key: "standingTackles", labelKey: "detailedStats.standingTackles" },
  { key: "pressuresApplied", labelKey: "detailedStats.pressuresApplied" },
  {
    key: "pressureSuccess",
    labelKey: "detailedStats.pressureSuccess",
    format: "percentage",
    decimals: 1,
  },
];

const DUELS_STATS: StatConfig[] = [
  { key: "duels", labelKey: "detailedStats.totalDuels" },
  {
    key: "duelsWonPercentage",
    labelKey: "detailedStats.duelsWonPercentage",
    format: "percentage",
    decimals: 1,
    highlight: "yellow",
  },
  { key: "groundDuels", labelKey: "detailedStats.groundDuels" },
  {
    key: "groundDuelsWonPercentage",
    labelKey: "detailedStats.groundDuelsWonPercentage",
    format: "percentage",
    decimals: 1,
  },
  { key: "aerialDuels", labelKey: "detailedStats.aerialDuels" },
  {
    key: "aerialDuelsWonPercentage",
    labelKey: "detailedStats.aerialDuelsWonPercentage",
    format: "percentage",
    decimals: 1,
  },
  { key: "headersWon", labelKey: "detailedStats.headersWon" },
  {
    key: "headersWonPercentage",
    labelKey: "detailedStats.headersWonPercentage",
    format: "percentage",
    decimals: 1,
  },
  { key: "physicalContests", labelKey: "detailedStats.physicalContests" },
  { key: "physicalContestsWon", labelKey: "detailedStats.physicalContestsWon" },
  {
    key: "dribbledPast",
    labelKey: "detailedStats.timesDribbledPast",
    highlight: "red",
  },
  {
    key: "dribbledPastPerGame",
    labelKey: "detailedStats.dribbledPastPerGame",
    format: "decimal",
  },
  {
    key: "dribbledPastInDefensiveThird",
    labelKey: "detailedStats.dribbledPastInDefensiveThird",
    highlight: "red",
  },
];

const WORK_RATE_STATS: StatConfig[] = [
  {
    key: "distanceCovered",
    labelKey: "detailedStats.distanceCovered",
    format: "decimal",
  },
  {
    key: "sprintDistanceCovered",
    labelKey: "detailedStats.sprintDistance",
    format: "decimal",
  },
  { key: "highIntensityRuns", labelKey: "detailedStats.highIntensityRuns" },
  {
    key: "sprintsPerGame",
    labelKey: "detailedStats.sprintsPerGame",
    format: "decimal",
  },
  { key: "trackingRuns", labelKey: "detailedStats.trackingRuns" },
  { key: "offensiveRuns", labelKey: "detailedStats.offensiveRuns" },
  { key: "defensiveRuns", labelKey: "detailedStats.defensiveRuns" },
  { key: "positionsOutOfPosition", labelKey: "detailedStats.outOfPosition" },
];

const DISCIPLINE_STATS: StatConfig[] = [
  { key: "foulsCommitted", labelKey: "detailedStats.foulsCommitted" },
  {
    key: "foulsPerGame",
    labelKey: "detailedStats.foulsPerGame",
    format: "decimal",
  },
  { key: "foulsDrawn", labelKey: "detailedStats.foulsDrawn" },
  {
    key: "foulsDrawnPerGame",
    labelKey: "detailedStats.foulsDrawnPerGame",
    format: "decimal",
  },
  { key: "offsides", labelKey: "detailedStats.offsides" },
  {
    key: "offsidesPerGame",
    labelKey: "detailedStats.offsidesPerGame",
    format: "decimal",
  },
  {
    key: "yellowCards",
    labelKey: "detailedStats.yellowCards",
    highlight: "yellow",
  },
  {
    key: "redCardsFromSecondYellow",
    labelKey: "detailedStats.redCardsSecondYellow",
    highlight: "red",
  },
  {
    key: "redCards",
    labelKey: "detailedStats.redCardsDirect",
    highlight: "red",
  },
  {
    key: "penaltiesConceded",
    labelKey: "detailedStats.penaltiesConceded",
    highlight: "red",
  },
];

const ERROR_STATS: StatConfig[] = [
  {
    key: "errorsLeadingToShot",
    labelKey: "detailedStats.errorsLeadingToShot",
    highlight: "red",
  },
  {
    key: "errorsLeadingToGoal",
    labelKey: "detailedStats.errorsLeadingToGoal",
    highlight: "red",
  },
  { key: "ownGoals", labelKey: "detailedStats.ownGoals", highlight: "red" },
  { key: "passesIntercepted", labelKey: "detailedStats.passesIntercepted" },
];

// ==================== EVENTS SECTION ====================

// Mapping of stat keys to translation keys
const STAT_TO_TRANSLATION_KEY: Record<string, string> = {
  pace: "attributes.pace",
  shooting: "attributes.shooting",
  passing: "attributes.passing",
  dribbling: "attributes.dribbling",
  defending: "attributes.defending",
  physical: "attributes.physical",
  finishing: "attributes.finishing",
  positioning: "attributes.positioning",
  vision: "attributes.vision",
  crossing: "attributes.crossing",
  curve: "attributes.curve",
  shortPassing: "attributes.shortPassing",
  longPassing: "attributes.longPassing",
  freeKick: "attributes.freeKick",
  shotPower: "attributes.shotPower",
  longShots: "attributes.longShots",
  volleys: "attributes.volleys",
  penalties: "attributes.penalties",
  agility: "attributes.agility",
  balance: "attributes.balance",
  reactions: "attributes.reactions",
  ballControl: "attributes.ballControl",
  composure: "attributes.composure",
  interceptions: "attributes.interceptions",
  heading: "attributes.heading",
  marking: "attributes.marking",
  standingTackle: "attributes.standingTackle",
  slidingTackle: "attributes.slidingTackle",
  jumping: "attributes.jumping",
  stamina: "attributes.stamina",
  strength: "attributes.strength",
  aggression: "attributes.aggression",
  acceleration: "attributes.acceleration",
  sprintSpeed: "attributes.sprintSpeed",
  workRate: "attributes.workRate",
  // Portuguese names that may come from corrupted source
  "Passe": "attributes.passing",
  "Drible": "attributes.dribbling",
  "Estilo": "attributes.flair",
  "Compostura": "attributes.composure",
  "Agressividade": "attributes.aggression",
  "Posicionamento": "attributes.positioning",
  "Curva": "attributes.curve",
  "Agilidade": "attributes.agility",
  "Work Rate": "attributes.workRate",
  "Chutes de Longe": "attributes.longShots",
  // Add more corrupted Portuguese mappings
  "Força": "attributes.strength",
  "Impulsão": "attributes.jumping",
  "Finalização": "attributes.finishing",
  "Interceptações": "attributes.interceptions",
  "Visão": "attributes.vision",
  "Cruzamento": "attributes.crossing",
  "Cabeceio": "attributes.heading",
  "Resistência": "attributes.stamina",
  "Aceleração": "attributes.acceleration",
  "Velocidade de Sprint": "attributes.sprintSpeed",
  "Controle de Bola": "attributes.ballControl",
  "Reações": "attributes.reactions",
  "Equilíbrio": "attributes.balance",
  "Chute Forte": "attributes.shotPower",
  "Pênaltis": "attributes.penalties",
  "Falta": "attributes.freeKick",
  "Passe Curto": "attributes.shortPassing",
  "Passe Longo": "attributes.longPassing",
  "Voleio": "attributes.volleys",
  "Carrinho": "attributes.slidingTackle",
  "Desarme": "attributes.standingTackle",
  "Marcação": "attributes.marking",
};

// Helper para traduzir descrição de evento (suporta chaves de tradução ou texto direto)
const translateEventDescription = (
  event: {
    description: string;
    descriptionParams?: Record<string, any>;
    metadata?: any;
  },
  t: (key: string, params?: Record<string, string | number>) => string,
): string => {
  const { description, descriptionParams, metadata } = event;

  // Se começa com padrão de chave de tradução (events., award., trophy., traits., traitStyles., etc.)
  if (description.match(/^(events|award|trophy|traits|traitStyles)\./)) {
    // Usa descriptionParams se existir, senão tenta metadata
    const params = descriptionParams || metadata || {};
    const translated = t(description, params);
    // Se a tradução retornar a própria chave, usar descrição original
    return translated !== description ? translated : description;
  }

  // Detecta padrão de mudança de atributo: "StatName: +X" ou "StatName: -X"
  const attrChangeMatch = description.match(/^([^:]+):\s*([+-]\d+)$/);
  if (attrChangeMatch) {
    const [, statName, change] = attrChangeMatch;
    const trimmedStatName = statName.trim();

    // Primeiro tenta o mapeamento explícito
    let translationKey = STAT_TO_TRANSLATION_KEY[trimmedStatName];

    // Se não encontrar, tenta diretamente com attributes.statName
    if (!translationKey) {
      translationKey = `attributes.${trimmedStatName}`;
    }

    const translatedStat = t(translationKey);
    // Se tradução retornou algo diferente da chave, usa a tradução
    if (translatedStat && translatedStat !== translationKey) {
      return `${translatedStat}: ${change}`;
    }

    // Fallback: retorna com primeira letra maiúscula
    const capitalizedStat = trimmedStatName.charAt(0).toUpperCase() + trimmedStatName.slice(1);
    return `${capitalizedStat}: ${change}`;
  }

  // Detecta padrão de mudança de narrativa de mídia
  const narrativeMatch = description.match(/narrativa.*muda para:\s*'([^']+)'|narrative.*shifts to:\s*'([^']+)'/i);
  if (narrativeMatch) {
    const narrative = narrativeMatch[1] || narrativeMatch[2];
    const narrativeKey = `narrative.${narrative}`;
    const translatedNarrative = t(narrativeKey);
    if (translatedNarrative !== narrativeKey) {
      return t("events.media.narrativeChange", { narrative: translatedNarrative });
    }
  }

  return description;
};

interface EventsSectionProps {
  events?: CareerEvent[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

const EventsSection: React.FC<EventsSectionProps> = ({ events, t }) => (
  <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
    <div className="px-4 py-3 bg-slate-900/40 flex items-center gap-3">
      <i className={`${SECTION_ICONS.events} text-lg text-slate-400`} />
      <h4 className="text-sm sm:text-base font-bold text-white">
        {t("history.seasonEvents")}
      </h4>
    </div>
    <div className="p-4">
      {events && events.length > 0 ? (
        <ul className="space-y-2">
          {events.map((ev, idx) => (
            <li
              key={`event-${idx}`}
              className="text-xs sm:text-sm text-slate-200 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-purple-400 before:font-bold"
            >
              {translateEventDescription(ev as any, t)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-400 text-xs sm:text-sm">
          {t("detailedStats.noEventsRecorded")}
        </p>
      )}
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

const DetailedStatsView: React.FC<DetailedStatsViewProps> = ({
  seasonStats,
  events,
  playerPosition,
  competitionData,
}) => {
  const { t } = useI18n();
  const isGoalkeeper = playerPosition === "GK";

  const stats = useMemo(() => {
    if (!seasonStats.matchStats) return undefined;
    return isGoalkeeper
      ? hydrateGoalkeeperStats(seasonStats.matchStats, seasonStats.overall)
      : seasonStats.matchStats;
  }, [isGoalkeeper, seasonStats.matchStats, seasonStats.overall]);

  if (!stats) {
    return (
      <div className="text-center py-10 text-slate-400">
        {t("detailedStats.noStatsAvailable")}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {/* Events */}
      <EventsSection events={events} t={t} />

      {/* Competition Logs */}
      {competitionData?.competitions &&
        competitionData.competitions.length > 0 && (
          <CollapsibleSection
            title={t("history.competitions") || "Competitions"}
            defaultOpen={true}
            icon="Trophy"
          >
            <div className="space-y-3">
              {competitionData.competitions.map((comp: any, idx: number) => {
                const isWinner = comp.wonCompetition;
                const isFinalist = comp.reachedFinal;
                const isLeague = comp.type === "League";

                let resultText = "";
                let resultColor = "text-slate-400";

                if (isWinner) {
                  resultText = t("common.winner") || "Winner";
                  resultColor = "text-amber-400";
                } else if (isFinalist) {
                  resultText = t("common.finalist") || "Finalist";
                  resultColor = "text-slate-300";
                } else if (isLeague) {
                  resultText = `${t("common.position") || "Pos"}: ${comp.position}`;
                  resultColor =
                    comp.position === 1 ? "text-amber-400" : "text-white";
                } else if (comp.roundReached) {
                  // Mostrar fase específica baseado em roundReached
                  const roundMap: Record<string, string> = {
                    "Group Stage": t("common.groupStage") || "Group Stage",
                    "League Phase": t("common.leaguePhase") || "League Phase",
                    Playoff: t("common.playoffRound") || "Playoff",
                    R32: t("common.round32") || "Round of 32",
                    R16: t("common.round16") || "Round of 16",
                    QF: t("common.quarterFinals") || "Quarter-Finals",
                    SF: t("common.semiFinals") || "Semi-Finals",
                    Final: t("common.finalist") || "Finalist",
                    Winner: t("common.winner") || "Winner",
                  };
                  resultText = roundMap[comp.roundReached] || comp.roundReached;
                  resultColor = comp.reachedKnockout
                    ? "text-blue-400"
                    : "text-slate-400";
                } else if (comp.reachedKnockout) {
                  resultText = t("common.knockoutStage") || "Knockout Stage";
                } else {
                  resultText = t("common.groupStage") || "Group Stage";
                }

                return (
                  <div
                    key={idx}
                    className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-bold text-white text-sm">
                          {t(getCompetitionTranslationKey(comp.competition)) ||
                            comp.competition}
                        </h5>
                        <p className={`text-xs font-semibold ${resultColor}`}>
                          {resultText}
                        </p>
                      </div>
                      {isWinner && (
                        <Icon name="Trophy" size={16} variant="solid" className="text-amber-400" />
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-slate-800/50 rounded p-1.5">
                        <div className="text-[10px] text-slate-400 uppercase">
                          {t("labels.short.matches")}
                        </div>
                        <div className="text-sm font-bold text-white">
                          {comp.matchesPlayed}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-1.5">
                        <div className="text-[10px] text-slate-400 uppercase">
                          {t("labels.short.goals")}
                        </div>
                        <div className="text-sm font-bold text-emerald-400">
                          {comp.goals}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-1.5">
                        <div className="text-[10px] text-slate-400 uppercase">
                          {t("labels.short.assists")}
                        </div>
                        <div className="text-sm font-bold text-violet-400">
                          {safeNum(comp.assists)}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-1.5">
                        <div className="text-[10px] text-slate-400 uppercase">
                          {t("history.ratingShort")}
                        </div>
                        <div
                          className={`text-sm font-bold ${getRatingColor(safeNum(comp.rating, 6.0))}`}
                        >
                          {safeNum(comp.rating, 6.0).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

      {/* General Stats */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/40 flex items-center gap-3">
          <i className={`${SECTION_ICONS.general} text-lg text-slate-400`} />
          <h4 className="text-sm sm:text-base font-bold text-white">
            {t("detailedStats.generalStats")}
          </h4>
        </div>
        <div className="p-4">
          <StatSection stats={stats!} config={GENERAL_STATS} t={t} />
          <StatItem
            label={t("detailedStats.averageRating")}
            value={seasonStats.averageRating?.toFixed(2)}
            highlight="yellow"
          />
        </div>
      </div>

      {/* Goalkeeper Stats */}
      {isGoalkeeper && (
        <CollapsibleSection
          title={t("detailedStats.goalkeeping")}
          defaultOpen={true}
          icon={SECTION_ICONS.goalkeeping}
        >
          <StatSection stats={stats!} config={GOALKEEPER_STATS} t={t} />
        </CollapsibleSection>
      )}

      {/* Outfield Player Stats */}
      {!isGoalkeeper && (
        <>
          <CollapsibleSection
            title={t("detailedStats.attacking")}
            defaultOpen={true}
            icon={SECTION_ICONS.attacking}
          >
            <StatSection stats={stats!} config={ATTACKING_STATS} t={t} />
          </CollapsibleSection>

          <CollapsibleSection
            title={t("detailedStats.goalTypes")}
            icon={SECTION_ICONS.goalTypes}
          >
            <StatSection stats={stats!} config={GOAL_TYPES_STATS} t={t} />
          </CollapsibleSection>

          <CollapsibleSection
            title={t("detailedStats.creativityPassing")}
            icon={SECTION_ICONS.creativity}
          >
            <StatSection stats={stats!} config={CREATIVITY_STATS} t={t} />
          </CollapsibleSection>

          <CollapsibleSection
            title={t("detailedStats.passingStats")}
            icon={SECTION_ICONS.passing}
          >
            <StatSection stats={stats!} config={PASSING_STATS} t={t} />
          </CollapsibleSection>

          <CollapsibleSection
            title={t("detailedStats.dribblingBallControl")}
            icon={SECTION_ICONS.dribbling}
          >
            <StatSection stats={stats!} config={DRIBBLING_STATS} t={t} />
          </CollapsibleSection>
        </>
      )}

      {/* Stats for all positions */}
      <CollapsibleSection
        title={t("detailedStats.defending")}
        icon={SECTION_ICONS.defending}
      >
        <StatSection stats={stats!} config={DEFENDING_STATS} t={t} />
      </CollapsibleSection>

      <CollapsibleSection
        title={t("detailedStats.duelsContests")}
        icon={SECTION_ICONS.duels}
      >
        <StatSection stats={stats!} config={DUELS_STATS} t={t} />
      </CollapsibleSection>

      <CollapsibleSection
        title={t("detailedStats.workRateMovement")}
        icon={SECTION_ICONS.workRate}
      >
        <StatSection stats={stats!} config={WORK_RATE_STATS} t={t} />
      </CollapsibleSection>

      <CollapsibleSection
        title={t("detailedStats.discipline")}
        icon={SECTION_ICONS.discipline}
      >
        <StatSection stats={stats!} config={DISCIPLINE_STATS} t={t} />
      </CollapsibleSection>

      <CollapsibleSection
        title={t("detailedStats.errorsMistakes")}
        icon={SECTION_ICONS.errors}
      >
        <StatSection stats={stats!} config={ERROR_STATS} t={t} />
      </CollapsibleSection>
    </div>
  );
};

export default memo(DetailedStatsView);
