/**
 * ⚽ LEAGUE COMPARISON COMPONENT
 * v0.5.2
 *
 * Compara estatísticas do jogador com a média da liga.
 * Design unificado com PlayerHeatmap.
 */

import React, { useMemo } from "react";
import { useI18n } from "../contexts/I18nContext";
import type { Player, SeasonStats, ExtendedMatchStats } from "../types";
import { Icon, type IconName } from "./ui/Icon";

interface LeagueComparisonProps {
  player: Player;
  seasonStats?: SeasonStats;
}

interface LeagueAverages {
  goalsP90: number;
  assistsP90: number;
  shotsP90: number;
  keyPassesP90: number;
  tacklesP90: number;
  interceptionsP90: number;
  dribblesP90: number;
  passAccuracy: number;
}

interface StatComparison {
  labelKey: string;
  value: number;
  leagueAvg: number;
  percentile: number;
  icon: IconName;
  colorClass: string;
}

const getDefaultLeagueAverages = (position: string): LeagueAverages => {
  if (position === "GK") {
    return {
      goalsP90: 0.0,
      assistsP90: 0.02,
      shotsP90: 0.0,
      keyPassesP90: 0.1,
      tacklesP90: 0.1,
      interceptionsP90: 0.3,
      dribblesP90: 0.0,
      passAccuracy: 78,
    };
  }
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(position)) {
    return {
      goalsP90: 0.08,
      assistsP90: 0.12,
      shotsP90: 0.5,
      keyPassesP90: 0.8,
      tacklesP90: 2.5,
      interceptionsP90: 1.8,
      dribblesP90: 0.8,
      passAccuracy: 82,
    };
  }
  if (["CDM", "CM", "CAM"].includes(position)) {
    return {
      goalsP90: 0.18,
      assistsP90: 0.22,
      shotsP90: 1.5,
      keyPassesP90: 1.8,
      tacklesP90: 1.8,
      interceptionsP90: 1.2,
      dribblesP90: 1.5,
      passAccuracy: 85,
    };
  }
  return {
    goalsP90: 0.45,
    assistsP90: 0.25,
    shotsP90: 2.8,
    keyPassesP90: 1.5,
    tacklesP90: 0.8,
    interceptionsP90: 0.5,
    dribblesP90: 2.5,
    passAccuracy: 80,
  };
};

const calculatePercentile = (value: number, avg: number): number => {
  if (avg === 0) return value > 0 ? 99 : 50;
  const ratio = value / avg;
  const percentile = 100 / (1 + Math.exp(-2 * (ratio - 1)));
  return Math.max(1, Math.min(99, Math.round(percentile)));
};

const getPercentileColor = (percentile: number): string => {
  if (percentile >= 90) return "text-emerald-400";
  if (percentile >= 75) return "text-green-400";
  if (percentile >= 50) return "text-amber-400";
  if (percentile >= 25) return "text-orange-400";
  return "text-red-400";
};

const getBarColor = (percentile: number): string => {
  if (percentile >= 75) return "bg-gradient-to-r from-emerald-500 to-green-400";
  if (percentile >= 50) return "bg-gradient-to-r from-amber-500 to-yellow-400";
  return "bg-gradient-to-r from-red-500 to-orange-400";
};

const LeagueComparison: React.FC<LeagueComparisonProps> = ({
  player,
  seasonStats,
}) => {
  const { t } = useI18n();

  const comparisons = useMemo((): StatComparison[] => {
    const stats = seasonStats?.matchStats as ExtendedMatchStats | undefined;
    const matches = seasonStats?.matchesPlayed || 1;
    const minutes = seasonStats?.minutesPlayed || matches * 75;
    const p90Factor = 90 / (minutes / matches);

    const avgData = getDefaultLeagueAverages(player.position);

    const goalsP90 =
      ((stats?.goals || seasonStats?.goals || 0) / matches) * p90Factor;
    const assistsP90 =
      ((stats?.assists || seasonStats?.assists || 0) / matches) * p90Factor;
    const shotsP90 = ((stats?.shots || 0) / matches) * p90Factor;
    const keyPassesP90 = ((stats?.keyPasses || 0) / matches) * p90Factor;
    const tacklesP90 = ((stats?.tackles || 0) / matches) * p90Factor;
    const interceptionsP90 =
      ((stats?.interceptions || 0) / matches) * p90Factor;
    const dribblesP90 = ((stats?.dribbles || 0) / matches) * p90Factor;
    const passAccuracy = stats?.passCompletion || 80;

    const results: StatComparison[] = [];

    if (player.position !== "GK") {
      results.push({
        labelKey: "stats.goalsP90",
        value: goalsP90,
        leagueAvg: avgData.goalsP90,
        percentile: calculatePercentile(goalsP90, avgData.goalsP90),
        icon: "SoccerBall",
        colorClass: "text-emerald-400",
      });
      results.push({
        labelKey: "stats.assistsP90",
        value: assistsP90,
        leagueAvg: avgData.assistsP90,
        percentile: calculatePercentile(assistsP90, avgData.assistsP90),
        icon: "Boot",
        colorClass: "text-violet-400",
      });
    }

    if (["ST", "CF", "LW", "RW", "CAM"].includes(player.position)) {
      results.push({
        labelKey: "stats.shotsP90",
        value: shotsP90,
        leagueAvg: avgData.shotsP90,
        percentile: calculatePercentile(shotsP90, avgData.shotsP90),
        icon: "Crosshair",
        colorClass: "text-amber-400",
      });
      results.push({
        labelKey: "stats.dribblesP90",
        value: dribblesP90,
        leagueAvg: avgData.dribblesP90,
        percentile: calculatePercentile(dribblesP90, avgData.dribblesP90),
        icon: "PersonStanding",
        colorClass: "text-cyan-400",
      });
    }

    if (["CDM", "CM", "CAM", "LM", "RM"].includes(player.position)) {
      results.push({
        labelKey: "stats.keyPassesP90",
        value: keyPassesP90,
        leagueAvg: avgData.keyPassesP90,
        percentile: calculatePercentile(keyPassesP90, avgData.keyPassesP90),
        icon: "Key",
        colorClass: "text-blue-400",
      });
    }

    if (["CB", "LB", "RB", "CDM", "LWB", "RWB"].includes(player.position)) {
      results.push({
        labelKey: "stats.tacklesP90",
        value: tacklesP90,
        leagueAvg: avgData.tacklesP90,
        percentile: calculatePercentile(tacklesP90, avgData.tacklesP90),
        icon: "Footprints",
        colorClass: "text-orange-400",
      });
      results.push({
        labelKey: "stats.interceptionsP90",
        value: interceptionsP90,
        leagueAvg: avgData.interceptionsP90,
        percentile: calculatePercentile(
          interceptionsP90,
          avgData.interceptionsP90,
        ),
        icon: "Hand",
        colorClass: "text-red-400",
      });
    }

    results.push({
      labelKey: "stats.passAccuracy",
      value: passAccuracy,
      leagueAvg: avgData.passAccuracy,
      percentile: calculatePercentile(passAccuracy, avgData.passAccuracy),
      icon: "Target",
      colorClass: "text-green-400",
    });

    return results;
  }, [player, seasonStats]);

  const overallPercentile = useMemo(() => {
    if (comparisons.length === 0) return 50;
    return Math.round(
      comparisons.reduce((sum, c) => sum + c.percentile, 0) /
      comparisons.length,
    );
  }, [comparisons]);

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header - same design as PlayerHeatmap */}
      <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {t("analytics.leagueComparison")}
          </h3>
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold ${getPercentileColor(overallPercentile)} bg-white/10`}
          >
            Top {100 - overallPercentile}% {t("analytics.overall")}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {t("analytics.leagueComparisonDescription")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="px-4 py-4 space-y-3">
        {comparisons.map((stat, index) => (
          <div key={index} className="relative">
            {/* Label Row */}
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2 text-xs">
                <Icon name={stat.icon} size={12} className={`${stat.colorClass} w-4`} />
                <span className="text-slate-300">{t(stat.labelKey)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {stat.value.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${getPercentileColor(stat.percentile)} bg-white/10`}
                >
                  Top {100 - stat.percentile}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(stat.percentile)}`}
                style={{ width: `${stat.percentile}%` }}
              />
            </div>

            {/* League Average Marker */}
            <div
              className="absolute bottom-0 w-0.5 h-2.5 bg-white/40"
              style={{ left: "50%", transform: "translateX(-50%)" }}
              title={`${t("analytics.leagueAverage")}: ${stat.leagueAvg.toFixed(2)}`}
            />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex justify-center gap-4 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-white/40 mr-1"></span>
            {t("analytics.leagueAverage")}
          </span>
          <span className="text-emerald-400">90%+ {t("analytics.elite")}</span>
          <span className="text-amber-400">50-89% {t("analytics.good")}</span>
          <span className="text-red-400">
            &lt;50% {t("analytics.belowAvg")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LeagueComparison;
