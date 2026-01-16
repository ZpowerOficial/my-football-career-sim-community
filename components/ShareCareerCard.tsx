import React, { useMemo } from "react";
import { Player, CareerLog, Awards } from "../types";
import { getNationalFlagStyle } from "../constants/nationalFlagGradients";
import enTranslations from "../locales/en.json";
import { useI18n } from "../contexts/I18nContext";
import { translateNationality } from "../utils/i18n";
import { Icon } from "./ui/Icon";

interface ShareCareerCardProps {
  player: Player;
  history: CareerLog[];
  awards: Awards;
  id?: string;
}

const safeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Premium Classic Theme - Enhanced for Maximum Impact
const THEME = {
  bg: "#0f172a", // Slate 900
  gradient: "linear-gradient(to bottom, #1e293b, #0f172a, #020617)", // Standard Slate Gradient
  text: "white",
  cardBg: "rgba(255, 255, 255, 0.08)",
  cardBgLight: "rgba(255, 255, 255, 0.12)",
  border: "rgba(255, 255, 255, 0.15)",
  borderLight: "rgba(255, 255, 255, 0.2)",
  accentGold: "#FFD700",
  accentBlue: "#3B82F6",
  shadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
};

// Trophy importance weights
const TROPHY_IMPORTANCE: Record<string, number> = {
  worldCup: 100,
  championsLeague: 90,
  libertadores: 90,
  fifaClubWorldCup: 85,
  clubWorldCup: 80,
  intercontinentalCup: 75,
  afcChampionsLeague: 70,
  cafChampionsLeague: 70,
  concacafChampionsCup: 70,
  league: 60,
  europaLeague: 50,
  copaSudamericana: 50,
  cup: 40,
};

// Award importance weights
const AWARD_IMPORTANCE: Record<string, number> = {
  worldPlayerAward: 100,
  fifaBestAward: 95,
  worldCupBestPlayer: 90,
  continentalPlayerAward: 80,
  bestGoalkeeperAward: 75, // Luva de Ouro
  leaguePlayerOfYear: 70,
  continentalCompetitionTopScorer: 65,
  topScorerAward: 60,
  continentalTopScorer: 60,
};

const ShareCareerCard: React.FC<ShareCareerCardProps> = ({
  player,
  history,
  awards,
  id = "share-career-card",
}) => {
  // Force English translations for share card
  const t = (key: string, params?: Record<string, string | number>): string => {
    let template = enTranslations[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        template = template.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return template;
  };

  // Get top trophies and awards for display
  const getTopHighlights = () => {
    const trophies: Array<{
      key: string;
      count: number;
      importance: number;
      emoji: string;
      label: string;
    }> = [];
    const individualAwards: Array<{
      key: string;
      count: number;
      importance: number;
      emoji: string;
      label: string;
    }> = [];

    // Process trophies
    if (player.trophies) {
      Object.entries(player.trophies).forEach(([key, count]) => {
        if (count > 0 && TROPHY_IMPORTANCE[key]) {
          const emoji =
            key === "worldCup"
              ? "🏆"
              : key.includes("champions") || key.includes("Champions")
                ? "🏆"
                : key.includes("libertadores")
                  ? "🏆"
                  : key.includes("league") || key === "league"
                    ? "🥇"
                    : "🏅";
          const label =
            t(`trophy.${key}`) !== `trophy.${key}`
              ? t(`trophy.${key}`)
              : key === "worldCup"
                ? "World Cup"
                : key === "championsLeague"
                  ? "European Champions Cup"
                  : key === "libertadores"
                    ? "South American Cup"
                    : key === "league"
                      ? "League Titles"
                      : key.replace(/([A-Z])/g, " $1").trim();
          trophies.push({
            key,
            count,
            importance: TROPHY_IMPORTANCE[key],
            emoji,
            label,
          });
        }
      });
    }

    // Process individual awards
    Object.entries(awards).forEach(([key, count]) => {
      if (typeof count === "number" && count > 0 && AWARD_IMPORTANCE[key]) {
        const emoji =
          key.includes("world") || key.includes("World")
            ? "🌟"
            : key.includes("Player")
              ? "⭐"
              : key.includes("Goalkeeper") || key.includes("goalkeeper")
                ? "🧤"
                : "🎖️";
        const label =
          t(`award.${key}`) !== `award.${key}`
            ? t(`award.${key}`)
            : key === "worldPlayerAward"
              ? "World Player of the Year"
              : key === "fifaBestAward"
                ? "Best of the Year"
                : key === "worldCupBestPlayer"
                  ? "WC Best Player"
                  : key === "topScorerAward"
                    ? "Top Scorer"
                    : key === "bestGoalkeeperAward"
                      ? "Golden Glove"
                      : key
                        .replace(/([A-Z])/g, " $1")
                        .replace("Award", "")
                        .trim();
        individualAwards.push({
          key,
          count,
          importance: AWARD_IMPORTANCE[key],
          emoji,
          label,
        });
      }
    });

    // Sort by importance
    trophies.sort((a, b) => b.importance - a.importance);
    individualAwards.sort((a, b) => b.importance - a.importance);

    // Get only highest importance or ties
    const topTrophies =
      trophies.length > 0
        ? trophies.filter((t) => t.importance === trophies[0].importance)
        : [];
    const topAwards =
      individualAwards.length > 0
        ? individualAwards.filter(
          (a) => a.importance === individualAwards[0].importance,
        )
        : [];

    return {
      trophies: topTrophies,
      awards: topAwards,
    };
  };

  const topHighlights = getTopHighlights();

  const {
    totalGames,
    totalGoals,
    totalAssists,
    averageRating,
    peakOverall,
    originClub,
    legendClub,
    retirementClub,
    legacyScore,
    careerTier,
    simulationYear,
  } = useMemo(() => {
    const proHistory = (history || [])
      .slice(1)
      .filter((log) => !log.team?.isYouth);

    const proClubTotals = proHistory.reduce(
      (acc, log) => {
        acc.matches += safeNumber(log.stats?.matchesPlayed);
        acc.goals += safeNumber(log.stats?.goals);
        acc.assists += safeNumber(log.stats?.assists);
        return acc;
      },
      { matches: 0, goals: 0, assists: 0 },
    );

    let intlCaps = 0,
      intlGoals = 0,
      intlAssists = 0;

    (history || []).slice(1).forEach((log) => {
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
          });
      }
    });

    const games = proClubTotals.matches + intlCaps;
    const goals = proClubTotals.goals + intlGoals;
    const assists = proClubTotals.assists + intlAssists;

    let totalRatingPoints = 0;
    let totalMatchesWithRating = 0;

    proHistory.forEach((log) => {
      const matches = safeNumber(log.stats?.matchesPlayed);
      const rating = safeNumber(log.stats?.averageRating);
      if (matches > 0 && rating > 0) {
        totalRatingPoints += rating * matches;
        totalMatchesWithRating += matches;
      }
    });

    (history || []).slice(1).forEach((log) => {
      if (log.competitionData?.competitions) {
        log.competitionData.competitions
          .filter(
            (c) =>
              c.type === "International" &&
              (c.competition || "").toLowerCase() !== "friendly",
          )
          .forEach((c) => {
            const matches = safeNumber(c.matchesPlayed);
            const rating = safeNumber(c.rating);
            if (matches > 0 && rating > 0) {
              totalRatingPoints += rating * matches;
              totalMatchesWithRating += matches;
            }
          });
      }
    });

    const avgRating =
      totalMatchesWithRating > 0
        ? (totalRatingPoints / totalMatchesWithRating).toFixed(2)
        : "N/A";

    const maxHistoryOverall = proHistory.reduce((max, h) => {
      const seasonOverall = h.stats?.overall || 0;
      return seasonOverall > max ? seasonOverall : max;
    }, 0);
    const peak = Math.max(player.stats.overall, maxHistoryOverall);

    // Calculate Legacy Score (EXACT same formula as Hall of Fame - careerLogic.ts)
    let score = 0;
    // OVR and Potential
    score += player.stats.overall * 50;
    score += player.potential * 20;
    // Stats - use player totals directly (same as Hall of Fame)
    score += (player.totalGoals || 0) * 15;
    score += (player.totalAssists || 0) * 10;
    score += (player.totalMatches || 0) * 2;
    // Trophies (weighted)
    score += (player.trophies?.worldCup || 0) * 5000;
    score += (player.trophies?.continentalCup || 0) * 3000;
    score += (player.trophies?.championsLeague || 0) * 2500;
    score += (player.trophies?.libertadores || 0) * 2000;
    score += (player.trophies?.league || 0) * 1000;
    score += (player.trophies?.cup || 0) * 400;
    // Awards (weighted)
    score += (player.awards?.worldPlayerAward || 0) * 6000;
    score += (player.awards?.topScorerAward || 0) * 800;
    score += (player.awards?.bestGoalkeeperAward || 0) * 800;
    score += (player.awards?.youngPlayerAward || 0) * 1500;
    // Reputation and Value
    score += (player.reputation || 0) * 10;
    score += (player.marketValue || 0) * 5;
    // Longevity
    score += (player.age - 14) * 50;
    score = Math.round(score);

    // Determine Career Tier (adjusted thresholds for new scoring)
    let tier = t("careerTiers.journeyman") || "Journeyman";
    if (score > 50000 || peak >= 94)
      tier = t("careerTiers.allTimeGreat") || "All-Time Great";
    else if (score > 35000 || peak >= 90)
      tier = t("careerTiers.legend") || "Legend";
    else if (score > 25000 || peak >= 86)
      tier = t("careerTiers.worldClass") || "World Class";
    else if (score > 15000 || peak >= 82)
      tier = t("careerTiers.elite") || "Elite";
    else if (score > 8000 || peak >= 78) tier = t("careerTiers.star") || "Star";
    else if (score > 4000 || peak >= 74)
      tier = t("careerTiers.establishedPro") || "Established Pro";

    // Helper to get club stats
    const getClubStats = (teamName: string) => {
      const stats = { matches: 0, goals: 0, assists: 0, trophies: 0 };
      proHistory.forEach((h) => {
        if (h.team.name === teamName) {
          stats.matches += safeNumber(h.stats?.matchesPlayed);
          stats.goals += safeNumber(h.stats?.goals);
          stats.assists += safeNumber(h.stats?.assists);
          if (h.trophies) stats.trophies += h.trophies.length;
        }
      });
      return stats;
    };

    const origin = proHistory.length > 0 ? proHistory[0].team : player.team;
    const originStats = getClubStats(origin.name);

    const retirement = player.team;
    const retirementStats = getClubStats(retirement.name);

    const clubStats = new Map<string, { team: any; matches: number }>();
    proHistory.forEach((h) => {
      const teamId = h.team.name;
      const current = clubStats.get(teamId) || { team: h.team, matches: 0 };
      current.matches += safeNumber(h.stats?.matchesPlayed);
      clubStats.set(teamId, current);
    });

    let maxMatches = -1;
    let legend = player.team;

    if (clubStats.size > 0) {
      clubStats.forEach((stats) => {
        if (stats.matches > maxMatches) {
          maxMatches = stats.matches;
          legend = stats.team;
        }
      });
    }
    const legendStats = getClubStats(legend.name);

    const currentYear = new Date().getFullYear();
    const simYear = currentYear + (player.age - 18); // Approx simulation year

    return {
      totalGames: games,
      totalGoals: goals,
      totalAssists: assists,
      averageRating: avgRating,
      peakOverall: peak,
      originClub: { ...origin, stats: originStats },
      legendClub: { ...legend, stats: legendStats },
      retirementClub: { ...retirement, stats: retirementStats },
      legacyScore: score,
      careerTier: tier,
      simulationYear: simYear,
    };
  }, [player, history]);

  const gradientStyle = getNationalFlagStyle(player.nationality);

  // Position Mapping with translations
  const positionMap: Record<string, string> = {
    ST: t("positions.ST") || "Striker",
    CF: t("positions.CF") || "Centre Forward",
    LW: t("positions.LW") || "Left Winger",
    RW: t("positions.RW") || "Right Winger",
    CAM: t("positions.CAM") || "Attacking Midfielder",
    CM: t("positions.CM") || "Central Midfielder",
    CDM: t("positions.CDM") || "Defensive Midfielder",
    LM: t("positions.LM") || "Left Midfielder",
    RM: t("positions.RM") || "Right Midfielder",
    CB: t("positions.CB") || "Centre Back",
    LB: t("positions.LB") || "Left Back",
    RB: t("positions.RB") || "Right Back",
    LWB: t("positions.LWB") || "Left Wing Back",
    RWB: t("positions.RWB") || "Right Wing Back",
    GK: t("positions.GK") || "Goalkeeper",
  };

  const fullPosition = positionMap[player.position] || player.position;

  return (
    <div
      id={id}
      style={{
        width: "1080px",
        height: "1350px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: -9999,
        background: THEME.bg,
        color: THEME.text,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
      className="flex flex-col overflow-hidden"
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{ background: THEME.gradient }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 15%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)",
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full px-10 py-8">
        {/* Header with Nationality Gradient */}
        <div
          className="text-center mb-6 relative pt-6 pb-6"
          style={{ overflow: "hidden", borderRadius: 28 }}
        >
          <div className="absolute inset-0 opacity-40" style={gradientStyle} />

          <div className="relative z-10">
            {/* Tier Badge */}
            <div
              className="inline-flex items-center gap-2.5 mb-5 px-7 py-2 rounded-full backdrop-blur-xl"
              style={{
                backgroundColor: THEME.cardBgLight,
                border: `2px solid ${THEME.accentGold}`,
                boxShadow: "0 8px 24px rgba(255, 215, 0, 0.15)",
              }}
            >
              <Icon
                name="Trophy"
                size={20}
                className="flex-shrink-0"
                style={{ color: THEME.accentGold }}
              />
              <span
                className="text-lg font-black uppercase tracking-[0.2em] whitespace-nowrap"
                style={{ color: THEME.accentGold }}
              >
                {careerTier}
              </span>
            </div>

            {/* Player Name */}
            <h1
              className="text-[58px] font-black uppercase mb-4 tracking-tighter leading-[0.95]"
              style={{
                textShadow: "0 6px 24px rgba(0, 0, 0, 0.8)",
              }}
            >
              {player.name}
            </h1>

            {/* Position & Nationality */}
            <div className="flex items-center justify-center gap-4">
              <span
                className="text-xl font-bold uppercase tracking-widest px-5 py-1.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/10"
                style={{ color: THEME.accentBlue }}
              >
                {fullPosition}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span
                className="text-2xl font-bold tracking-wide"
                style={{
                  opacity: 0.95,
                  textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
                }}
              >
                {translateNationality(t, player.nationality)}
              </span>
            </div>
          </div>
        </div>

        {/* Key Stats - Clean & Bold */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          {/* Matches */}
          <div
            className="rounded-3xl p-6 backdrop-blur-xl text-center"
            style={{
              backgroundColor: THEME.cardBg,
              border: `2px solid ${THEME.border}`,
            }}
          >
            <Icon
              name="CalendarDays"
              size={40}
              className="opacity-50 mx-auto mb-2"
              style={{ color: THEME.accentBlue }}
            />
            <div className="text-sm font-bold uppercase tracking-wider opacity-50 mb-2">
              {t("shareCard.matches")}
            </div>
            <div className="text-5xl font-black" style={{ color: THEME.text }}>
              {totalGames.toLocaleString()}
            </div>
          </div>

          {/* Goals/Clean Sheets - Highlighted */}
          <div
            className="rounded-3xl p-6 backdrop-blur-xl text-center"
            style={{
              backgroundColor: THEME.cardBgLight,
              border: `3px solid ${THEME.accentGold}`,
              boxShadow: "0 20px 50px rgba(255, 215, 0, 0.15)",
            }}
          >
            <span className="text-5xl block mb-2">
              {player.position === "GK" ? "🧤" : "⚽"}
            </span>
            <div
              className="text-sm font-black uppercase tracking-wider mb-2"
              style={{ color: THEME.accentGold }}
            >
              {player.position === "GK"
                ? t("shareCard.cleanSheets") || "Clean Sheets"
                : t("shareCard.goals") || "Goals"}
            </div>
            <div
              className="text-6xl font-black"
              style={{ color: THEME.accentGold }}
            >
              {player.position === "GK"
                ? (player.totalCleanSheets || 0).toLocaleString()
                : totalGoals.toLocaleString()}
            </div>
          </div>

          {/* Assists/Saves */}
          <div
            className="rounded-3xl p-6 backdrop-blur-xl text-center"
            style={{
              backgroundColor: THEME.cardBg,
              border: `2px solid ${THEME.border}`,
            }}
          >
            <span className="text-4xl block mb-2">
              {player.position === "GK" ? "🛡️" : "🎯"}
            </span>
            <div className="text-sm font-bold uppercase tracking-wider opacity-50 mb-2">
              {player.position === "GK"
                ? t("shareCard.saves") || "Saves"
                : t("shareCard.assists") || "Assists"}
            </div>
            <div className="text-5xl font-black" style={{ color: THEME.text }}>
              {player.position === "GK"
                ? Math.round(
                  (player.totalCleanSheets || 0) * 2.5 + totalGames * 2,
                ).toLocaleString()
                : totalAssists.toLocaleString()}
            </div>
          </div>
        </div>
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          {/* Peak Overall */}
          <div
            className="rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden"
            style={{
              backgroundColor: THEME.cardBgLight,
              border: `2px solid ${THEME.borderLight}`,
            }}
          >
            <Icon
              name="Star"
              size={128}
              className="absolute -right-4 -bottom-4 opacity-[0.05]"
              style={{ color: THEME.accentGold }}
            />
            <div className="relative z-10">
              <div className="text-base font-bold uppercase tracking-wider opacity-50 mb-3">
                {t("shareCard.peakOverall")}
              </div>
              <div
                className="text-7xl font-black leading-none"
                style={{ color: THEME.accentGold }}
              >
                {peakOverall}
              </div>
            </div>
          </div>

          {/* Average Rating */}
          <div
            className="rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden"
            style={{
              backgroundColor: THEME.cardBgLight,
              border: `2px solid ${THEME.borderLight}`,
            }}
          >
            <Icon
              name="BarChart3"
              size={128}
              className="absolute -right-4 -bottom-4 opacity-[0.05]"
              style={{ color: THEME.accentBlue }}
            />
            <div className="relative z-10">
              <div className="text-base font-bold uppercase tracking-wider opacity-50 mb-3">
                {t("shareCard.avgRating")}
              </div>
              <div
                className="text-7xl font-black leading-none"
                style={{ color: THEME.accentBlue }}
              >
                {averageRating}
              </div>
            </div>
          </div>
        </div>

        {/* Career Journey */}
        <div
          className="rounded-3xl p-5 backdrop-blur-xl mb-6"
          style={{
            backgroundColor: THEME.cardBgLight,
            border: `2px solid ${THEME.borderLight}`,
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🌍</span>
            <span className="text-base font-black uppercase tracking-wider opacity-50">
              {t("shareCard.careerJourney")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {/* Origin */}
            <div className="text-center">
              <span className="text-3xl block mb-2">🌱</span>
              <div className="text-xs font-black uppercase tracking-wider opacity-40 mb-2">
                {t("shareCard.origin")}
              </div>
              <div className="text-lg font-black leading-tight mb-1">
                {originClub.name}
              </div>
              <div className="text-xs opacity-60 font-semibold mb-2">
                {originClub.league?.name || originClub.country}
              </div>
              <div className="text-xs opacity-60 font-mono">
                {originClub.stats.matches}g • {originClub.stats.goals}g
              </div>
            </div>

            {/* Legend - Highlighted */}
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                backgroundColor: "rgba(255, 215, 0, 0.1)",
                border: `2px solid ${THEME.accentGold}`,
              }}
            >
              <span className="text-4xl block mb-2">🏆</span>
              <div
                className="text-xs font-black uppercase tracking-wider mb-2"
                style={{ color: THEME.accentGold }}
              >
                {t("shareCard.legend")}
              </div>
              <div
                className="text-xl font-black leading-tight mb-1"
                style={{ color: THEME.accentGold }}
              >
                {legendClub.name}
              </div>
              <div className="text-xs opacity-70 font-semibold mb-2">
                {legendClub.league?.name || legendClub.country}
              </div>
              <div
                className="text-xs font-bold"
                style={{ color: THEME.accentGold }}
              >
                {legendClub.stats.matches}g • {legendClub.stats.trophies} 🏆
              </div>
            </div>

            {/* Retired */}
            <div className="text-center">
              <span className="text-3xl block mb-2">🎯</span>
              <div className="text-xs font-black uppercase tracking-wider opacity-40 mb-2">
                {t("shareCard.retired")}
              </div>
              <div className="text-lg font-black leading-tight mb-1">
                {retirementClub.name}
              </div>
              <div className="text-xs opacity-60 font-semibold mb-2">
                {retirementClub.league?.name || retirementClub.country}
              </div>
              <div className="text-xs opacity-60 font-mono">
                {retirementClub.stats.matches}g • {retirementClub.stats.goals}g
              </div>
            </div>
          </div>

          {/* Close Career Journey container */}
        </div>

        {/* Career Highlights */}
        {(topHighlights.trophies.length > 0 ||
          topHighlights.awards.length > 0) && (
            <div
              className="rounded-3xl p-6 backdrop-blur-xl mb-6"
              style={{
                backgroundColor: THEME.cardBg,
                border: `2px solid ${THEME.border}`,
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⭐</span>
                <span className="text-base font-black uppercase tracking-wider opacity-50">
                  {t("shareCard.careerHighlights")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-1">
                {/* Top Trophies */}
                {topHighlights.trophies.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-40 mb-4">
                      {t("shareCard.majorTrophies")}
                    </div>
                    <div className="space-y-4">
                      {topHighlights.trophies.slice(0, 3).map((trophy) => (
                        <div
                          key={trophy.key}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-2xl flex-shrink-0">
                              {trophy.emoji}
                            </span>
                            <span className="text-lg font-bold leading-tight truncate">
                              {t(`trophy.${trophy.key}`) || trophy.label}
                            </span>
                          </div>
                          <span
                            className="text-2xl font-black flex-shrink-0"
                            style={{ color: THEME.accentGold }}
                          >
                            {trophy.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Awards */}
                {topHighlights.awards.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-40 mb-4">
                      {t("shareCard.individualAwards")}
                    </div>
                    <div className="space-y-4">
                      {topHighlights.awards.slice(0, 3).map((award) => (
                        <div
                          key={award.key}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-2xl flex-shrink-0">
                              {award.emoji}
                            </span>
                            <span className="text-lg font-bold leading-tight truncate">
                              {t(`award.${award.key}`) ||
                                t(`awardsSection.${award.key}`) ||
                                award.label}
                            </span>
                          </div>
                          <span
                            className="text-2xl font-black flex-shrink-0"
                            style={{ color: THEME.accentBlue }}
                          >
                            {award.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Footer - Clean Branding */}
        <div
          className="mt-auto pt-4 flex items-center justify-between border-t"
          style={{ borderColor: THEME.border }}
        >
          {/* App Branding */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden bg-white"
              style={{ boxShadow: "0 4px 12px rgba(255, 255, 255, 0.1)" }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1500 1500"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlSpace="preserve"
                style={{ fillRule: "evenodd", clipRule: "evenodd", strokeLinejoin: "round", strokeMiterlimit: 2 }}
              >
                <g transform="matrix(1.040742,0,0,1.040742,0.214549,0.666268)">
                  <path d="M524.534,336.698C606.756,322.653 609.712,322.878 612.302,320.291C630.051,302.559 664.139,265.459 738.455,270.997C791.598,274.956 828.032,314.813 833.849,321.178C835.337,322.805 835.724,322.26 1064.46,361.728C1079.645,364.348 1081.588,362.546 1081.974,366.437C1082.889,375.649 1080.701,530.068 1083.248,530.995C1086.467,532.168 1164.066,529.893 1164.688,532.405C1165.104,534.089 1164.946,595.003 1164.935,676.497C1164.924,761.959 1165.691,764.866 1163.326,766.209C1161.007,767.526 1100.17,801.153 1100.076,804.46C1099.58,822.019 1100.413,916.546 1099.602,918.548C1099.083,919.828 1096.963,919.933 1013.387,954.217L1010.44,955.352C981.052,967.441 985.267,976.125 934.098,1020.023C914.38,1036.939 846.178,1095.962 732.41,1154.324C727.68,1156.751 726.809,1156.042 672.741,1125.071C527.426,1041.832 467.132,965.342 455.475,960.557C411.999,942.71 350.543,921.854 349.917,917.47C349.111,911.832 351.782,805.22 348.423,802.611C345.273,800.164 285.956,767.955 285.852,765.436C285.791,763.956 285.646,533.458 285.892,532.622C287.04,528.723 361.756,534.093 361.87,529.554C362.522,503.564 361.007,365.806 362.775,364.868C364.08,364.176 427.8,353.28 433.461,352.312C463.819,347.107 494.176,341.902 524.534,336.698Z" style={{ fill: "rgb(254,254,253)" }} />
                  <path d="M1148.91,722.501C1148.897,744.135 1149.228,755.462 1148.136,756.129C1136.001,763.541 1084.688,792.394 1084.416,794.48C1083.063,804.838 1086.479,907.425 1082.356,909.186C1054.333,921.153 988.283,946.249 984.722,949.723C955.208,978.508 885.048,1056.835 732.73,1135.966C727.083,1138.9 726.022,1137.997 661.726,1100.112C547.736,1032.946 469.259,948.747 466.427,947.692C447.635,940.692 367.516,909.593 366.497,908.503C364.665,906.544 367.457,795.8 365.098,793.911C361.578,791.093 301.291,758.56 301.227,755.541C301.224,755.366 301.143,552.609 301.296,548.464C301.455,544.153 377.435,549.1 377.57,545.521C378.366,524.354 376.448,377.872 378.718,376.927C380.267,376.282 527.48,351.219 540.422,349.016C546.674,347.952 618.273,335.762 618.549,335.579C619.679,334.826 670.911,266.091 759.402,290.834C802.099,302.772 825.144,336.172 828.478,336.644C837.229,337.884 1063.41,376.082 1065.268,376.979C1068.599,378.589 1064.606,545.345 1067.498,546.505C1071.123,547.959 1148.775,544.596 1148.866,548.44C1149.196,562.361 1148.845,562.277 1148.91,722.501Z" style={{ fill: "rgb(13,13,13)" }} />
                  <path d="M711.417,316.917C726.046,320.593 726.178,319.78 739.748,326.029C743.252,327.642 751.1,320.363 762.481,319.322C767.565,318.856 768.185,320.241 771.547,316.557C772.8,315.184 813.079,340.98 814.368,355.507C815.789,371.519 816.549,371.434 814.321,387.473C813.578,392.819 835.302,420.904 834.709,425.516C834.113,430.148 830.761,456.207 814.273,480.199C810.831,485.207 816.696,469.317 813.494,469.537C781.196,471.759 780.032,473.017 778.083,475.121C756.152,498.812 748.019,502.804 749.985,505.118C759.741,516.605 768.223,517.432 761.475,519.436C629.543,558.618 552.352,393.501 665.799,320.977C679.037,312.514 705.842,304.252 704.421,308.486C702.421,314.447 702.41,314.345 702.463,314.518C702.751,315.455 703.056,315.106 711.417,316.917Z" style={{ fill: "rgb(255,255,254)" }} />
                  <g>
                    <path d="M591.918,420.492C595.888,466.135 603.062,466.14 612.535,485.486C613.94,488.355 610.886,486.733 550.55,501.671C447.18,527.264 443.142,531.21 443.082,525.514C443.003,517.919 442.111,432.52 443.592,430.566C444.604,429.231 471.912,425.262 503.474,419.369C510.508,418.056 589.518,403.302 591.635,404.315C592.802,404.874 592.213,405.29 591.918,420.492Z" style={{ fill: "rgb(255,255,0)" }} />
                    <path d="M975.431,425.898C984.968,427.569 1000.802,429.096 1000.959,432.446C1001.004,433.409 1001.136,525.742 1000.854,527.644C1000.623,529.198 999.569,528.177 931.599,511.069C923.847,509.117 858.941,492.78 834.501,487.495C827.32,485.943 854.697,465.265 853.194,411.508C853.05,406.384 850.633,403.974 854.5,404.487C857.828,404.928 969.646,424.894 975.431,425.898Z" style={{ fill: "rgb(255,255,0)" }} />
                    <path d="M972.561,897.617C963.077,908.565 911.152,968.511 839.157,1020.03C830.807,1026.006 764.454,1073.487 730.31,1088.044C727.999,1089.029 579.617,1012.469 481.463,898.536C482.174,897.08 481.819,896.698 483.507,896.568C499.547,895.333 499.527,895.332 499.548,895.335C501.262,895.616 582.889,993.583 727.398,1068.683C731.976,1071.062 858.279,1002.492 949.122,900.165C957.394,890.847 959.214,894.404 971.5,897.163L972.561,897.617Z" style={{ fill: "rgb(255,255,0)" }} />
                  </g>
                </g>
              </svg>
            </div>
            <div>
              <div className="text-xl font-black uppercase tracking-tight leading-none mb-1">
                {t("shareCard.myCareer")}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span style={{ opacity: 0.5 }}>by Zpower</span>
                <span
                  style={{
                    color: "#22c55e",
                    textShadow: "0 0 8px rgba(34, 197, 94, 0.5)",
                  }}
                >
                  • FREE TO PLAY
                </span>
              </div>
            </div>
          </div>

          {/* Legacy Score */}
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider opacity-40 mb-1">
              {t("shareCard.legacyScore")}
            </div>
            <div
              className="text-5xl font-black"
              style={{ color: THEME.accentGold }}
            >
              {legacyScore.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCareerCard;
