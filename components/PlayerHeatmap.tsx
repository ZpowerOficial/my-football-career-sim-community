import React from "react";
import { useI18n } from "../contexts/I18nContext";
import type { PositionDetail, Player } from "../types";

interface HeatmapProps {
  player: Player;
  title?: string;
}

// Generate organic, realistic heatmap (99x61) that looks like real player data
const generateHeatmap = (player: Player): number[][] => {
  const W = 99, H = 61;
  const SCALE_X = 99 / 25, SCALE_Y = 61 / 15;
  const centerYOld = 7.5;

  // Seeded random for consistent but varied results per player
  const playerName = player.name || "Player";
  const seed = (playerName.charCodeAt(0) || 0) + (playerName.charCodeAt(1) || 0) * 256 + (playerName.length || 0) * 65536;
  let rngState = seed || 12345;
  const seededRandom = () => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  };
  const rnd = () => seededRandom();
  const rndRange = (min: number, max: number) => min + rnd() * (max - min);
  const rndGaussian = () => {
    // Box-Muller transform for more natural clustering
    const u1 = rnd() || 0.0001;
    const u2 = rnd();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const sX = (x: number) => clamp(x * SCALE_X, 0, W - 1);
  const sY = (y: number) => clamp(y * SCALE_Y, 0, H - 1);

  type Ev = { x: number; y: number; w: number };
  const evs: Ev[] = [];
  const push = (x: number, y: number, w = 1) => evs.push({ x: clamp(x, 0, W - 1), y: clamp(y, 0, H - 1), w });

  // Refined KDE with SMALLER bandwidth for granular texture (like real heatmaps)
  const kde = (events: Ev[], baseBw = 2.0): number[][] => {
    const g = Array.from({ length: H }, () => Array.from({ length: W }, () => 0));
    for (const e of events) {
      // Smaller, tighter bandwidth for granular look
      const bw = baseBw * (0.5 + 0.5 / (1 + e.w * 0.5));
      const r = Math.ceil(bw * 2.5); // Tighter radius
      const bw2 = bw * bw;
      const minX = Math.max(0, Math.floor(e.x) - r);
      const maxX = Math.min(W - 1, Math.ceil(e.x) + r);
      const minY = Math.max(0, Math.floor(e.y) - r);
      const maxY = Math.min(H - 1, Math.ceil(e.y) + r);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - e.x, dy = y - e.y;
          const dist2 = dx * dx + dy * dy;
          // Sharper falloff for more defined edges
          const k = Math.exp(-dist2 / (1.5 * bw2));
          g[y][x] += e.w * k;
        }
      }
    }
    return g;
  };

  // Add granular texture/noise to break uniform appearance
  const addTexture = (grid: number[][]): number[][] => {
    return grid.map((row, y) => row.map((v, x) => {
      if (v <= 0) return v;
      // Add micro-variation (±20%) for texture
      const microNoise = 0.8 + rnd() * 0.4;
      // Occasional dead spots (5% chance) in medium-intensity areas
      if (v > 0.2 && v < 0.7 && rnd() < 0.05) {
        return v * 0.3 * microNoise;
      }
      // Occasional intensity spikes (3% chance)
      if (rnd() < 0.03) {
        return Math.min(1, v * 1.3) * microNoise;
      }
      return v * microNoise;
    }));
  };

  // Percentile normalization with gradient preservation
  const percentNorm = (grid: number[][], p = 0.92): number[][] => {
    const vals: number[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (grid[y][x] > 0) vals.push(grid[y][x]);
    if (vals.length === 0) return grid;
    vals.sort((a, b) => a - b);
    const cut = vals[Math.floor(vals.length * p)] || 1;

    // Apply normalization then add texture
    const normalized = grid.map(row => row.map(v => {
      if (v <= 0) return 0;
      const n = cut > 0 ? v / cut : v;
      // Steeper gradient curve for more contrast
      if (n > 1) return 0.85 + 0.15 * Math.min((n - 1) / 0.5, 1);
      // Apply gamma correction for better color distribution
      return Math.pow(n, 0.85);
    }));

    return addTexture(normalized);
  };

  // Extract stats safely
  const stats = (player.stats || {}) as Record<string, number | undefined>;
  const get = (k: string, d = 50) => Math.min(1, ((stats[k] ?? d) as number) / 100);
  const pace = get("sprintSpeed");
  const passing = get("passing");
  const stamina = get("stamina");
  const dribbling = get("dribbling");
  const finishing = get("finishing");
  const defending = get("defending");
  const positioning = get("positioning");
  const workRate = get("stamina") * 0.5 + get("aggression", 50) * 0.5;

  // Extract style safely
  const style = ((player.playerStyle || player.expandedData?.playingStyle?.primaryStyle) as string) || "";
  const secondaryStyle = ((player.expandedData?.playingStyle?.secondaryStyle) as string) || "";
  const tacticalTendencies = (player.expandedData?.playingStyle?.tacticalTendencies || []) as string[];
  const tendencies = tacticalTendencies.map((t: unknown) =>
    (typeof t === 'string' ? t : (t as { name?: string })?.name || "").toLowerCase()
  );

  const pos = ((player.position || "CM") as string).toUpperCase();

  // Position bases with slight random offset per player (asymmetry)
  const positionBases: Record<string, { x: number; y: number }> = {
    GK: { x: 2, y: centerYOld },
    CB: { x: 5.5, y: centerYOld },
    LB: { x: 6, y: 2.5 }, LWB: { x: 8, y: 2.2 },
    RB: { x: 6, y: 12.5 }, RWB: { x: 8, y: 12.8 },
    CDM: { x: 8, y: centerYOld },
    CM: { x: 11, y: centerYOld },
    CAM: { x: 15, y: centerYOld },
    LM: { x: 13, y: 2.5 }, RM: { x: 13, y: 12.5 },
    LW: { x: 17, y: 2.5 }, RW: { x: 17, y: 12.5 },
    CF: { x: 17, y: centerYOld },
    ST: { x: 19, y: centerYOld },
  };

  const rawBase = positionBases[pos] || positionBases.CM;
  // Add player-specific asymmetric bias (some players drift left/right naturally)
  const lateralBias = (rnd() - 0.5) * 2; // -1 to +1
  const base = {
    x: rawBase.x + (rnd() - 0.5) * 1.5,
    y: rawBase.y + lateralBias * 1.5
  };

  const isWide = ["LB", "RB", "LWB", "RWB", "LM", "RM", "LW", "RW"].includes(pos);
  const isDefender = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM"].includes(pos);
  const isAttacker = ["ST", "CF", "CAM", "LW", "RW"].includes(pos);
  const laneY = sY(base.y);

  // Role markers
  const isClassicWinger = ["traditional winger", "ponta clássico", "ponta tradicional"].includes(style.toLowerCase());
  const isBoxToBox = style.toLowerCase() === "box-to-box" || secondaryStyle.toLowerCase() === "box-to-box";
  const hugsTouchline = tendencies.some(t => t.includes("abraça") || t.includes("touchline"));
  const makesOverlaps = tendencies.some(t => t.includes("sobreposição") || t.includes("overlap"));

  // GK special case - COMPACT distribution in goal area
  if (pos === "GK") {
    // Main area - very tight cluster in goal area
    for (let i = 0; i < 120; i++) {
      // Concentrated in small area (x: 0-8, y: center ±15)
      const cx = sX(1.5 + Math.abs(rndGaussian()) * 1.5); // Always positive, closer to goal
      const cy = sY(centerYOld) + rndGaussian() * 5; // Narrower spread
      push(cx, cy, 0.9 + rnd() * 0.3);
    }
    // Penalty area coverage (occasional)
    for (let i = 0; i < 25; i++) {
      push(sX(3 + rnd() * 3), sY(centerYOld + rndGaussian() * 3), 0.4 + rnd() * 0.2);
    }
    // Sweeper keeper actions (if high passing)
    if (passing > 0.7) {
      for (let i = 0; i < 10; i++) {
        push(sX(5 + rnd() * 4), sY(centerYOld + rndGaussian() * 4), 0.25 + rnd() * 0.15);
      }
    }
    return percentNorm(kde(evs, 3.5), 0.85); // Tighter bandwidth
  }

  // ===== CREATE MULTIPLE ORGANIC HOTSPOTS =====

  // Determine 2-4 main activity zones based on position
  const numHotspots = 2 + Math.floor(rnd() * 3);
  const hotspots: { x: number; y: number; intensity: number; spread: number }[] = [];

  // Primary hotspot - main position
  hotspots.push({
    x: sX(base.x),
    y: laneY,
    intensity: 1.0,
    spread: isWide ? 0.6 : 0.8
  });

  // Secondary hotspot - slightly forward or back based on role
  if (isDefender) {
    hotspots.push({
      x: sX(base.x - 2 - rnd() * 2),
      y: laneY + (rnd() - 0.5) * 10,
      intensity: 0.7,
      spread: 0.7
    });
  } else if (isAttacker) {
    hotspots.push({
      x: sX(base.x + 2 + rnd() * 3),
      y: sY(centerYOld + (rnd() - 0.5) * 4),
      intensity: 0.8,
      spread: 0.6
    });
  } else {
    // Midfielder - add transition zone
    hotspots.push({
      x: sX(base.x + (rnd() - 0.3) * 4),
      y: sY(centerYOld + lateralBias * 3),
      intensity: 0.75,
      spread: 0.8
    });
  }

  // Third hotspot - defensive responsibility area
  if (!isDefender && workRate > 0.5) {
    hotspots.push({
      x: sX(6 + rnd() * 4),
      y: laneY + (rnd() - 0.5) * 8,
      intensity: 0.4 + workRate * 0.3,
      spread: 0.9
    });
  }

  // Fourth hotspot - attacking third presence for offensive players
  if (isAttacker || pos === "CAM") {
    hotspots.push({
      x: sX(19 + rnd() * 3),
      y: sY(centerYOld + rndGaussian() * 2.5),
      intensity: 0.6 + finishing * 0.3,
      spread: 0.5
    });
  }

  // ===== SECONDARY POSITIONS HOTSPOTS =====
  // Players who can play multiple positions should show heat in those areas too
  const physicalProfile = player.expandedData?.physicalProfile;
  const secondaryPositions = physicalProfile?.secondaryPositions || [];

  for (const secPos of secondaryPositions) {
    // Only add hotspot if proficiency is reasonable (> 50)
    if (secPos.proficiency > 50) {
      const secPosKey = (secPos.position || '').toUpperCase();
      const secBase = positionBases[secPosKey];

      if (secBase) {
        // Calculate lane Y for secondary position
        let secLaneY = sY(secBase.y);
        if (secPosKey.startsWith('L')) {
          secLaneY = sY(2 + (rnd() - 0.5) * 2);
        } else if (secPosKey.startsWith('R')) {
          secLaneY = sY(13 + (rnd() - 0.5) * 2);
        }

        // Intensity based on proficiency (50-100 maps to 0.3-0.7)
        const secIntensity = 0.3 + ((secPos.proficiency - 50) / 50) * 0.4;

        hotspots.push({
          x: sX(secBase.x + (rnd() - 0.5) * 2),
          y: secLaneY + (rnd() - 0.5) * 6,
          intensity: secIntensity,
          spread: 0.7
        });
      }
    }
  }

  // ===== GENERATE EVENTS FROM HOTSPOTS =====

  // Fewer events = cleaner separation between hotspots
  const totalEvents = Math.round(120 + 50 * (stamina + passing) / 2);

  for (const hotspot of hotspots) {
    const eventsForHotspot = Math.round(totalEvents * hotspot.intensity / hotspots.reduce((a, h) => a + h.intensity, 0));

    for (let i = 0; i < eventsForHotspot; i++) {
      // SMALLER spreads for more defined hotspots
      const spreadX = (4 + 3 * hotspot.spread) * (isWide ? 0.7 : 1.0);
      const spreadY = (3 + 2 * hotspot.spread) * (isWide ? 1.2 : 0.9);

      const x = hotspot.x + rndGaussian() * spreadX;
      const y = hotspot.y + rndGaussian() * spreadY;

      // Weight varies - creates natural density variation
      const weight = 0.5 + rnd() * 0.7 * hotspot.intensity;
      push(x, y, weight);
    }
  }

  // ===== ADD REALISTIC MATCH EVENTS =====

  // Transition runs (connecting hotspots)
  const transitionCount = Math.round(20 + 25 * pace);
  for (let i = 0; i < transitionCount; i++) {
    // Create paths between hotspots
    const h1 = hotspots[Math.floor(rnd() * hotspots.length)];
    const h2 = hotspots[Math.floor(rnd() * hotspots.length)];
    const t = rnd();
    const x = h1.x * (1 - t) + h2.x * t + rndGaussian() * 4;
    const y = h1.y * (1 - t) + h2.y * t + rndGaussian() * 4;
    push(x, y, 0.3 + rnd() * 0.3);
  }

  // Wide channel activity for wide players
  if (isWide) {
    const sideY = laneY < H / 2 ? 3 : H - 4;
    for (let i = 0; i < 25 + Math.round(30 * pace); i++) {
      const x = sX(12 + rnd() * 10);
      const y = sideY + rndGaussian() * 5;
      const weight = 0.5 + (hugsTouchline ? 0.3 : 0) + rnd() * 0.4;
      push(x, y, weight);
    }
  }

  // Defensive actions (tracking back, recoveries)
  const defensiveEvents = Math.round(15 + 30 * defending * workRate);
  for (let i = 0; i < defensiveEvents; i++) {
    const x = sX(4 + rnd() * 8);
    const y = laneY + rndGaussian() * 12;
    push(x, y, 0.35 + defending * 0.25);
  }

  // Set piece presence
  // Defensive corners
  for (let i = 0; i < 8 + Math.round(rnd() * 6); i++) {
    push(sX(3 + rnd() * 3), sY(centerYOld + rndGaussian() * 4), 0.4 + rnd() * 0.2);
  }
  // Attacking corners
  if (!isDefender || pos === "CB") {
    for (let i = 0; i < 5 + Math.round(rnd() * 5); i++) {
      push(sX(20 + rnd() * 3), sY(centerYOld + rndGaussian() * 3), 0.4 + positioning * 0.2);
    }
  }

  // Pressing/high line activity
  if (isAttacker || isBoxToBox) {
    for (let i = 0; i < 12 + Math.round(20 * workRate); i++) {
      const x = sX(16 + rnd() * 6);
      const y = sY(centerYOld + rndGaussian() * 5);
      push(x, y, 0.35 + rnd() * 0.25);
    }
  }

  // Sparse events in "unusual" areas (organic feel - players sometimes go everywhere)
  for (let i = 0; i < 30; i++) {
    const x = rnd() * W * 0.85;
    const y = rnd() * H;
    // Very low weight - just texture
    push(x, y, 0.05 + rnd() * 0.1);
  }

  // Micro-noise for texture (prevents perfectly smooth gradients)
  for (let i = 0; i < 80; i++) {
    const nearHotspot = hotspots[Math.floor(rnd() * hotspots.length)];
    const x = nearHotspot.x + rndGaussian() * 15;
    const y = nearHotspot.y + rndGaussian() * 12;
    push(x, y, 0.08 + rnd() * 0.15);
  }

  // ===== INTEGRATE SHOT HISTORY INTO HEATMAP =====
  // This ensures heatmap shows some activity where player shoots
  // Weight is LOW to prevent shots from dominating the heatmap over many seasons
  if (player.shotHistory && player.shotHistory.length > 0) {
    // Only use most recent 100 shots (not all 500) to prevent accumulation bias
    const recentShots = player.shotHistory.slice(-100);

    for (const shot of recentShots) {
      const shotX = shot.x;
      const shotY = shot.y;

      // LOW weight - shots should add slight heat, not dominate
      // Goals: 0.3, misses: 0.2
      const shotWeight = shot.isGoal ? 0.3 : 0.2;
      push(shotX, shotY, shotWeight);
    }
  }

  // Build final heatmap
  const grid = kde(evs, 4.5);
  return percentNorm(grid, 0.88);
};

/**
 * Professional heatmap color gradient (inspired by viridis/plasma colormaps)
 * Goes from dark/transparent -> blue -> teal -> green -> yellow -> orange -> red
 */
const cellColor = (v: number): string => {
  // Clamp value
  const t = Math.max(0, Math.min(1, v));

  // Multi-stop gradient for professional appearance
  // Stops: 0.0 = transparent dark, 0.2 = dark blue, 0.4 = teal, 0.6 = green, 0.8 = yellow, 1.0 = red
  const stops = [
    { pos: 0.0, r: 15, g: 23, b: 42, a: 0.1 }, // Dark slate (nearly transparent)
    { pos: 0.15, r: 30, g: 58, b: 95, a: 0.5 }, // Dark blue
    { pos: 0.3, r: 13, g: 148, b: 136, a: 0.7 }, // Teal
    { pos: 0.45, r: 16, g: 185, b: 129, a: 0.85 }, // Emerald
    { pos: 0.6, r: 34, g: 197, b: 94, a: 0.9 }, // Green
    { pos: 0.75, r: 250, g: 204, b: 21, a: 0.92 }, // Yellow
    { pos: 0.9, r: 249, g: 115, b: 22, a: 0.95 }, // Orange
    { pos: 1.0, r: 239, g: 68, b: 68, a: 1.0 }, // Red
  ];

  // Find the two stops to interpolate between
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  // Interpolate between stops
  const range = upper.pos - lower.pos;
  const localT = range > 0 ? (t - lower.pos) / range : 0;

  const r = Math.round(lower.r + (upper.r - lower.r) * localT);
  const g = Math.round(lower.g + (upper.g - lower.g) * localT);
  const b = Math.round(lower.b + (upper.b - lower.b) * localT);
  const a = lower.a + (upper.a - lower.a) * localT;

  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
};

// Normaliza um heatmap para visualização (máx = 1.0)
const normalizeForDisplay = (heatmap: number[][]): number[][] => {
  let maxValue = 0;
  for (let y = 0; y < heatmap.length; y++) {
    for (let x = 0; x < heatmap[y].length; x++) {
      maxValue = Math.max(maxValue, heatmap[y][x]);
    }
  }
  if (maxValue === 0) return heatmap;
  return heatmap.map((row) => row.map((cell) => cell / maxValue));
};

const PlayerHeatmap: React.FC<HeatmapProps> = ({ player, title }) => {
  const { t } = useI18n();
  const [grid, setGrid] = React.useState<number[][] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Use a web worker or timeout to avoid blocking the main thread
    const timer = setTimeout(() => {
      // Check if careerHeatmap exists AND has actual non-zero data
      if (player.careerHeatmap && player.careerHeatmap.length > 0) {
        let hasData = false;
        for (const row of player.careerHeatmap) {
          for (const cell of row) {
            if (cell > 0) {
              hasData = true;
              break;
            }
          }
          if (hasData) break;
        }
        if (hasData) {
          setGrid(normalizeForDisplay(player.careerHeatmap));
          setIsLoading(false);
          return;
        }
      }
      // Generate using KDE algorithm based on player stats and profile
      setGrid(generateHeatmap(player));
      setIsLoading(false);
    }, 10); // Small delay to allow UI to render first

    return () => clearTimeout(timer);
  }, [player]);

  if (isLoading) {
    return (
      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 px-4 py-3 border-b border-slate-700/50">
          <h3 className="text-base font-bold text-white">
            {title || t("common.positionHeatmap")}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {t("common.calculating")}
          </p>
        </div>
        <div className="px-4 py-4 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 px-4 py-3 border-b border-slate-700/50">
        <h3 className="text-base font-bold text-white">
          {title || t("common.positionHeatmap")}
        </h3>
        {(() => {
          const key = `positions.abbr.${player.position}`;
          const translated = t(key);
          const posAbbr = translated === key ? player.position : translated;
          return (
            <p className="text-xs text-slate-400 mt-1">
              {t("common.dynamicActivityZones", { position: posAbbr })}
            </p>
          );
        })()}
      </div>
      <div className="px-4 py-4">
        <div className="relative w-full max-w-[560px] mx-auto">
          {/* Pitch background */}
          <div className="w-full aspect-[3/2] rounded-lg border border-slate-600 bg-gradient-to-b from-slate-900/70 to-slate-900/40 overflow-hidden">
            {/* Grid - 1:1 mapping to internal data grid (99x61) */}
            <div
              className="absolute inset-0 p-1 grid"
              style={{
                gridTemplateColumns: `repeat(99, 1fr)`,
                gridTemplateRows: `repeat(61, 1fr)`,
              }}
            >
              {Array.from({ length: 61 }, (_, y) =>
                Array.from({ length: 99 }, (_, x) => {
                  // Direct 1:1 mapping - no interpolation, show all detail
                  const v = grid?.[y]?.[x] || 0;
                  return (
                    <div
                      key={`${x}-${y}`}
                      style={{ backgroundColor: cellColor(v), opacity: 0.95 }}
                      className="rounded-[1px]"
                    />
                  );
                }),
              ).flat()}
            </div>
            {/* SVG Pitch Markings - proper field lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Center line */}
              <line
                x1="50"
                y1="0"
                x2="50"
                y2="100"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.3"
              />
              {/* Center circle */}
              <circle
                cx="50"
                cy="50"
                r="10"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.3"
              />
              <circle cx="50" cy="50" r="0.5" fill="rgba(255,255,255,0.2)" />

              {/* Left penalty area */}
              <rect
                x="0"
                y="21"
                width="17"
                height="58"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.3"
              />
              {/* Left 6-yard box */}
              <rect
                x="0"
                y="37"
                width="6"
                height="26"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.3"
              />
              {/* Left goal */}
              <rect
                x="-1"
                y="44"
                width="1"
                height="12"
                fill="rgba(255,255,255,0.2)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.3"
              />
              {/* Left penalty spot */}
              <circle cx="12" cy="50" r="0.4" fill="rgba(255,255,255,0.2)" />
              {/* Left D arc */}
              <path
                d="M 17 40 A 8 8 0 0 1 17 60"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.3"
              />

              {/* Right penalty area */}
              <rect
                x="83"
                y="21"
                width="17"
                height="58"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.3"
              />
              {/* Right 6-yard box */}
              <rect
                x="94"
                y="37"
                width="6"
                height="26"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.3"
              />
              {/* Right goal */}
              <rect
                x="100"
                y="44"
                width="1"
                height="12"
                fill="rgba(255,255,255,0.2)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.3"
              />
              {/* Right penalty spot */}
              <circle cx="88" cy="50" r="0.4" fill="rgba(255,255,255,0.2)" />
              {/* Right D arc */}
              <path
                d="M 83 40 A 8 8 0 0 0 83 60"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.3"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerHeatmap;