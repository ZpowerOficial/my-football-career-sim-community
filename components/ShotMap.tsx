/**
 * ⚽ SHOT MAP COMPONENT
 * v0.5.2
 *
 * Visualização de chutes e gols no campo.
 * Design unificado com PlayerHeatmap.
 */

import React, { useMemo } from "react";
import { useI18n } from "../contexts/I18nContext";
import type { Player, SeasonStats, ExtendedMatchStats } from "../types";

interface ShotMapProps {
  player: Player;
  seasonStats?: SeasonStats;
  showGoalsOnly?: boolean;
  title?: string;
}

interface ShotData {
  x: number;
  y: number;
  isGoal: boolean;
  xG: number;
  bodyPart: "left" | "right" | "head";
  shotType: "open_play" | "set_piece" | "penalty";
}

/**
 * Generate shot positions from player stats (capped for performance)
 */
const generateShotsFromStats = (
  player: Player,
  stats?: ExtendedMatchStats,
  fallbackGoals?: number,
  fallbackShots?: number,
): ShotData[] => {
  const shots: ShotData[] = [];
  
  // Box-Muller gaussian for natural scatter (not linear)
  const gaussianRandom = (): number => {
    const u1 = Math.random() || 0.0001;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  
  // Use matchStats if available, otherwise use fallback
  const totalShots = stats?.shots || fallbackShots || 0;
  const goals = stats?.goals || fallbackGoals || 0;
  
  if (totalShots === 0 && goals === 0) return shots;
  
  const goalsInsideBox = stats?.goalsFromInsideBox || Math.floor(goals * 0.7);
  const headedGoals = stats?.headedGoals || Math.floor(goals * 0.15);
  const leftFootGoals = stats?.leftFootGoals || Math.floor(goals * 0.3);
  const penaltyGoals = stats?.penaltyGoals || 0;

  // Cap visual shots at 200 for performance but better visual density
  const estimatedShots = totalShots > 0 ? totalShots : goals * 5;
  const shotsToGenerate = Math.min(estimatedShots, 200);
  
  // 🎨 Visual Enhancement: Show more green dots to make the map feel more satisfying
  // Real stats are shown in the header, but visual representation is more generous
  // This prevents the player from feeling like they underperformed even with 400+ goals
  const realGoalRatio = estimatedShots > 0 ? goals / estimatedShots : 0;
  // Visual: boost green dots to ~30-40% of the map for better player experience
  const visualGoalRatio = Math.min(0.40, Math.max(0.25, realGoalRatio * 2.5));
  const scaledGoals = Math.round(shotsToGenerate * visualGoalRatio);

  const isWinger = ["LW", "RW", "LM", "RM"].includes(player.position);
  const isLeft = player.position.includes("L");

  for (let i = 0; i < shotsToGenerate; i++) {
    const isGoal = i < scaledGoals;
    const isInsideBox = isGoal ? i < goalsInsideBox : Math.random() < 0.65;

    let x: number, y: number;
    
    // Random center offset to break horizontal patterns
    const centerOffset = (Math.random() - 0.5) * 20;
    
    if (isInsideBox) {
      // Inside box: gaussian X around 85 with spread
      x = 85 + gaussianRandom() * 8;
      
      if (isWinger) {
        // Wingers: biased towards their side but with wide spread
        if (isLeft) {
          // LW: center around 35 with large spread (covers 15-55)
          y = 35 + centerOffset + gaussianRandom() * 15;
        } else {
          // RW: center around 65 with large spread (covers 45-85)
          y = 65 + centerOffset + gaussianRandom() * 15;
        }
      } else {
        // Central players: center around 50 with spread
        y = 50 + centerOffset + gaussianRandom() * 18;
      }
    } else {
      // Outside box: more spread
      x = 60 + Math.random() * 20 + gaussianRandom() * 5;
      
      if (isWinger) {
        if (isLeft) {
          y = 30 + centerOffset + gaussianRandom() * 18;
        } else {
          y = 70 + centerOffset + gaussianRandom() * 18;
        }
      } else {
        y = 50 + centerOffset + gaussianRandom() * 25;
      }
    }
    
    // Additional noise for organic feel
    y += (Math.random() - 0.5) * 15;
    x += gaussianRandom() * 3;
    
    // Clamp to field bounds
    x = Math.max(40, Math.min(99, x));
    y = Math.max(5, Math.min(95, y));

    let bodyPart: "left" | "right" | "head";
    if (isGoal && i < headedGoals) {
      bodyPart = "head";
    } else if (isGoal && i < headedGoals + leftFootGoals) {
      bodyPart = "left";
    } else {
      bodyPart = "right";
    }

    let shotType: "open_play" | "set_piece" | "penalty";
    if (isGoal && penaltyGoals > 0 && i >= scaledGoals - penaltyGoals) {
      shotType = "penalty";
      x = 88;
      y = 50;
    } else {
      shotType = Math.random() < 0.85 ? "open_play" : "set_piece";
    }

    const distanceFromGoal = Math.sqrt((100 - x) ** 2 + (50 - y) ** 2);
    const xG = Math.max(0.02, Math.min(0.95, 1 - distanceFromGoal / 60));

    shots.push({ x, y, isGoal, xG, bodyPart, shotType });
  }

  return shots;
};

const ShotMap: React.FC<ShotMapProps> = ({
  player,
  seasonStats,
  showGoalsOnly = false,
  title,
}) => {
  const { t } = useI18n();

  // Get REAL stats for header display
  const matchStats = seasonStats?.matchStats as ExtendedMatchStats | undefined;
  const fallbackGoals = seasonStats?.goals || 0;
  const fallbackShots = fallbackGoals * 5; // Estimate ~5 shots per goal
  const realGoals = matchStats?.goals || fallbackGoals;
  const realShots = matchStats?.shots || fallbackShots;
  const realConversionRate = realShots > 0 ? (realGoals / realShots) * 100 : 0;

  // Generate visual shots (capped for performance)
  const shots = useMemo(() => {
    const allShots = generateShotsFromStats(player, matchStats, fallbackGoals, fallbackShots);
    return showGoalsOnly ? allShots.filter((s) => s.isGoal) : allShots;
  }, [player, matchStats, fallbackGoals, fallbackShots, showGoalsOnly]);

  const avgXG =
    shots.length > 0
      ? shots.reduce((sum, s) => sum + s.xG, 0) / shots.length
      : 0;

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header - same design as PlayerHeatmap */}
      <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {title || t("analytics.shotMap")}
          </h3>
          <div className="flex gap-3 text-xs">
            <span className="text-emerald-400 font-bold">
              {realGoals} {t("goalsShort")}
            </span>
            <span className="text-slate-400">
              {realShots} {t("analytics.shotsLabel")}
            </span>
            <span className="text-amber-400 font-bold">
              {realConversionRate.toFixed(0)}%
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {t("analytics.shotMapDescription")}
        </p>
      </div>

      {/* Pitch Visualization - blue like heatmap */}
      <div className="px-4 py-4">
        <div className="relative w-full max-w-[560px] mx-auto">
          <div className="w-full aspect-[3/2] rounded-lg border border-slate-600 bg-gradient-to-b from-slate-900/70 to-slate-900/40 overflow-hidden relative">
            {/* Pitch markings - cleaner lines like heatmap style */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Penalty area */}
              <rect
                x="83"
                y="21"
                width="17"
                height="58"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.3"
              />
              {/* 6-yard box */}
              <rect
                x="94"
                y="37"
                width="6"
                height="26"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.3"
              />
              {/* Goal */}
              <rect
                x="99"
                y="44"
                width="1"
                height="12"
                fill="rgba(255,255,255,0.25)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="0.3"
              />
              {/* Penalty spot */}
              <circle cx="88" cy="50" r="0.5" fill="rgba(255,255,255,0.25)" />
              {/* D arc */}
              <path
                d="M 83 40 A 8 8 0 0 0 83 60"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.3"
              />
              {/* Halfway hint */}
              <line
                x1="0"
                y1="50"
                x2="5"
                y2="50"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.3"
              />
            </svg>

            {/* Shot markers */}
            {shots.map((shot, index) => (
              <div
                key={index}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  shot.isGoal
                    ? "bg-emerald-500 border-emerald-300 shadow-lg shadow-emerald-500/50"
                    : "bg-red-500/70 border-red-400/70"
                }`}
                style={{
                  left: `${shot.x}%`,
                  top: `${shot.y}%`,
                  width: `${Math.max(6, shot.xG * 14)}px`,
                  height: `${Math.max(6, shot.xG * 14)}px`,
                  borderWidth: "1px",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300"></div>
            <span>{t("stats.goal")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70 border border-red-400/70"></div>
            <span>{t("stats.missedShot")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>
              {t("analytics.avgXG")}: {avgXG.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShotMap;
