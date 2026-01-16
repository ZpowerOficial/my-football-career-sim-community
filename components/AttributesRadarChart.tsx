/**
 * ⚽ ENHANCED ATTRIBUTES RADAR CHART
 * v0.5.2
 *
 * Radar chart estilo FIFA/FM com:
 * - Gradient fills
 * - Position-specific attributes
 * - Comparison mode
 */

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useI18n } from "../contexts/I18nContext";
import type { Player } from "../types";

// Helper to safely handle numbers (prevents NaN)
const safeNum = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback;

interface AttributesRadarChartProps {
  player: Player;
  showDetailed?: boolean;
  comparisonPlayer?: Player;
}

interface RadarDataPoint {
  subject: string;
  value: number;
  comparison?: number;
  fullMark: number;
}

/**
 * Get position-specific attributes for radar
 * Uses only attributes that exist in PlayerStats
 */
const getPositionAttributes = (
  player: Player,
  detailed: boolean,
): RadarDataPoint[] => {
  const stats = player.stats;
  const position = player.position;

  // Basic 6-point radar (FIFA style) - always available
  if (!detailed) {
    return [
      { subject: "PAC", value: stats.pace || 0, fullMark: 99 },
      { subject: "SHO", value: stats.shooting || 0, fullMark: 99 },
      { subject: "PAS", value: stats.passing || 0, fullMark: 99 },
      { subject: "DRI", value: stats.dribbling || 0, fullMark: 99 },
      { subject: "DEF", value: stats.defending || 0, fullMark: 99 },
      { subject: "PHY", value: stats.physical || 0, fullMark: 99 },
    ];
  }

  // Detailed position-specific radar (using only available attributes)
  if (position === "GK") {
    return [
      { subject: "DIV", value: stats.diving || 0, fullMark: 99 },
      { subject: "HAN", value: stats.handling || 0, fullMark: 99 },
      { subject: "REF", value: stats.reflexes || 0, fullMark: 99 },
      { subject: "POS", value: stats.positioning || 0, fullMark: 99 },
      { subject: "PHY", value: stats.physical || 0, fullMark: 99 },
      { subject: "PAS", value: stats.passing || 0, fullMark: 99 },
    ];
  }

  if (["CB", "LB", "RB", "LWB", "RWB"].includes(position)) {
    return [
      { subject: "PAC", value: stats.pace || 0, fullMark: 99 },
      { subject: "DEF", value: stats.defending || 0, fullMark: 99 },
      { subject: "HEA", value: stats.heading || 0, fullMark: 99 },
      { subject: "STR", value: stats.strength || 0, fullMark: 99 },
      { subject: "INT", value: stats.interceptions || 0, fullMark: 99 },
      { subject: "PAS", value: stats.passing || 0, fullMark: 99 },
    ];
  }

  if (["CDM", "CM", "CAM"].includes(position)) {
    return [
      { subject: "VIS", value: stats.vision || 0, fullMark: 99 },
      { subject: "PAS", value: stats.passing || 0, fullMark: 99 },
      { subject: "DRI", value: stats.dribbling || 0, fullMark: 99 },
      { subject: "SHO", value: stats.shooting || 0, fullMark: 99 },
      { subject: "STA", value: stats.stamina || 0, fullMark: 99 },
      { subject: "DEF", value: stats.defending || 0, fullMark: 99 },
    ];
  }

  // Attackers (LW, RW, LM, RM, CF, ST)
  return [
    { subject: "PAC", value: stats.pace || 0, fullMark: 99 },
    { subject: "SHO", value: stats.shooting || 0, fullMark: 99 },
    { subject: "DRI", value: stats.dribbling || 0, fullMark: 99 },
    { subject: "FIN", value: stats.finishing || 0, fullMark: 99 },
    { subject: "POS", value: stats.positioning || 0, fullMark: 99 },
    { subject: "AGI", value: stats.agility || 0, fullMark: 99 },
  ];
};

/**
 * Get color based on overall rating
 */
const getChartColor = (overall: number): { stroke: string; fill: string } => {
  if (overall >= 85) return { stroke: "#f59e0b", fill: "#f59e0b" }; // Gold
  if (overall >= 75) return { stroke: "#10b981", fill: "#10b981" }; // Green
  if (overall >= 65) return { stroke: "#3b82f6", fill: "#3b82f6" }; // Blue
  return { stroke: "#6366f1", fill: "#6366f1" }; // Purple
};

const AttributesRadarChart: React.FC<AttributesRadarChartProps> = ({
  player,
  showDetailed = false,
  comparisonPlayer,
}) => {
  const { t } = useI18n();

  const data = getPositionAttributes(player, showDetailed);
  const colors = getChartColor(player.stats.overall);

  // Add comparison data if provided
  if (comparisonPlayer) {
    const comparisonData = getPositionAttributes(
      comparisonPlayer,
      showDetailed,
    );
    data.forEach((point, index) => {
      point.comparison = comparisonData[index]?.value || 0;
    });
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.fill} stopOpacity={0.8} />
              <stop offset="100%" stopColor={colors.fill} stopOpacity={0.2} />
            </linearGradient>
            {comparisonPlayer && (
              <linearGradient
                id="comparisonGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.1} />
              </linearGradient>
            )}
          </defs>

          <PolarGrid stroke="rgba(71, 85, 105, 0.5)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "#94a3b8",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 99]}
            tick={false}
            axisLine={false}
          />

          {/* Comparison radar (background) */}
          {comparisonPlayer && (
            <Radar
              name={comparisonPlayer.name}
              dataKey="comparison"
              stroke="#64748b"
              fill="url(#comparisonGradient)"
              fillOpacity={0.4}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Main player radar */}
          <Radar
            name={player.name}
            dataKey="value"
            stroke={colors.stroke}
            fill="url(#radarGradient)"
            fillOpacity={0.6}
            strokeWidth={2}
          />

          {comparisonPlayer && (
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
          )}
        </RadarChart>
      </ResponsiveContainer>

      {/* Overall Badge */}
      <div className="absolute top-2 right-2 flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg ${
            safeNum(player.stats.overall, 50) >= 85
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-black"
              : safeNum(player.stats.overall, 50) >= 75
                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                : safeNum(player.stats.overall, 50) >= 65
                  ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
                  : "bg-gradient-to-br from-violet-400 to-violet-600 text-white"
          }`}
        >
          {safeNum(player.stats.overall, 50)}
        </div>
        <span className="text-[8px] text-muted mt-0.5 uppercase">OVR</span>
      </div>
    </div>
  );
};

export default AttributesRadarChart;
