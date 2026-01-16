import React, { useState, useMemo } from "react";
import { useI18n } from "../contexts/I18nContext";
import { Select } from "./ui/Select";
import type { HighScore, PositionDetail, Continent } from "../types";
import { Icon } from "./ui/Icon";

type SortCriteria =
  | "overall"
  | "goals"
  | "assists"
  | "matches"
  | "cleanSheets"
  | "trophies"
  | "awards";

interface LeaderboardProps {
  scores: HighScore[];
  onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ scores, onBack }) => {
  const { t } = useI18n();
  const [sortBy, setSortBy] = useState<SortCriteria>("overall");
  const [filterPosition, setFilterPosition] = useState<PositionDetail | "all">(
    "all",
  );
  const [filterContinent, setFilterContinent] = useState<Continent | "all">(
    "all",
  );

  const filteredAndSortedScores = useMemo(() => {
    let filtered = [...scores];

    if (filterPosition !== "all") {
      filtered = filtered.filter((score) => score.position === filterPosition);
    }
    if (filterContinent !== "all") {
      filtered = filtered.filter(
        (score) => score.continent === filterContinent,
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "goals":
          return (b.goals || 0) - (a.goals || 0);
        case "assists":
          return (b.assists || 0) - (a.assists || 0);
        case "matches":
          return (b.matches || 0) - (a.matches || 0);
        case "cleanSheets":
          return (b.cleanSheets || 0) - (a.cleanSheets || 0);
        case "trophies":
          return (b.trophies || 0) - (a.trophies || 0);
        case "awards":
          return (b.awards || 0) - (a.awards || 0);
        case "overall":
        default:
          return (b.score || 0) - (a.score || 0);
      }
    });
  }, [scores, sortBy, filterPosition, filterContinent]);

  const getMedalIcon = (index: number): string | null => {
    const medals = ["🥇", "🥈", "🥉"];
    return medals[index] || null;
  };

  const getRankStyle = (index: number) => {
    const styles = [
      {
        bg: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10",
        border: "border-yellow-400/50",
        glow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]",
        text: "text-yellow-100",
      },
      {
        bg: "bg-gradient-to-br from-gray-400/15 to-gray-500/10",
        border: "border-gray-400/50",
        glow: "shadow-[0_0_12px_rgba(156,163,175,0.25)]",
        text: "text-gray-100",
      },
      {
        bg: "bg-gradient-to-br from-orange-600/15 to-orange-700/10",
        border: "border-orange-500/50",
        glow: "shadow-[0_0_12px_rgba(234,88,12,0.25)]",
        text: "text-orange-100",
      },
    ];

    return (
      styles[index] || {
        bg: "bg-slate-800/30",
        border: "border-slate-700/40",
        glow: "",
        text: "text-slate-200",
      }
    );
  };

  const sortOptions = [
    { value: "overall", label: t("leaderboard.overallRating"), icon: "⭐" },
    { value: "goals", label: t("leaderboard.goalsScored"), icon: "⚽" },
    { value: "assists", label: t("leaderboard.assists"), icon: "🎯" },
    { value: "matches", label: t("leaderboard.matchesPlayed"), icon: "📅" },
    { value: "cleanSheets", label: t("leaderboard.cleanSheets"), icon: "🛡️" },
    { value: "trophies", label: t("leaderboard.trophiesWon"), icon: "🏆" },
    { value: "awards", label: t("leaderboard.individualAwards"), icon: "🏅" },
  ];

  const positions: Array<PositionDetail | "all"> = [
    "all",
    "GK",
    "CB",
    "LB",
    "RB",
    "LWB",
    "RWB",
    "CDM",
    "CM",
    "CAM",
    "LM",
    "RM",
    "LW",
    "RW",
    "CF",
    "ST",
  ];

  const continents: Array<Continent | "all"> = [
    "all",
    "Europe",
    "South America",
    "Africa",
    "Asia",
    "North America",
    "Australia",
  ];

  const getCurrentSortIcon = () => {
    return sortOptions.find((opt) => opt.value === sortBy)?.icon || "⭐";
  };

  const getCurrentSortLabel = () => {
    const option = sortOptions.find((opt) => opt.value === sortBy);
    return option ? option.label : t("leaderboard.overallRating");
  };

  // Resolve localized position abbreviation with safe fallback
  const resolvePosAbbr = (pos: PositionDetail | "all"): string => {
    if (pos === "all") return t("leaderboard.allPositions");
    const key = `positions.abbr.${pos}`;
    const translated = t(key);
    return translated === key ? String(pos) : translated;
  };

  const getPositionLabel = () => {
    return resolvePosAbbr(filterPosition);
  };

  const getDynamicScore = (score: HighScore) => {
    switch (sortBy) {
      case "goals":
        return score.goals || 0;
      case "assists":
        return score.assists || 0;
      case "matches":
        return score.matches || 0;
      case "cleanSheets":
        return score.cleanSheets || 0;
      case "trophies":
        return score.trophies || 0;
      case "awards":
        return score.awards || 0;
      case "overall":
      default:
        return score.score || 0;
    }
  };

  const getContinentLabel = () => {
    return filterContinent === "all"
      ? t("leaderboard.allRegions")
      : filterContinent;
  };

  return (
    <div
      className="bg-[#0a0f1e] rounded-2xl p-4 sm:p-5 w-full max-w-md mx-auto flex flex-col max-h-[95vh] border border-slate-800/50"
      style={{
        paddingTop: "max(1.25rem, calc(env(safe-area-inset-top) + 0.5rem))",
      }}
    >
      {/* Header */}
      <div className="text-center mb-5 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Icon
            name="Trophy"
            size={32}
            strokeColor="text-amber-400"
            fillColor="fill-amber-400/30"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-orange-500">
            {t("leaderboard.hallOfFame")}
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          {t("leaderboard.topLegendsOfAllTime")}
        </p>
      </div>

      {/* Rank By Label */}
      <div className="mb-2 flex-shrink-0">
        <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider">
          🏅 {t("leaderboard.rankBy")}
        </label>
      </div>

      {/* Main Sort Dropdown - Using Select with Lucide icons */}
      <div className="mb-4 flex-shrink-0">
        <Select<SortCriteria>
          value={sortBy}
          onChange={setSortBy}
          options={sortOptions.map((opt) => ({
            value: opt.value as SortCriteria,
            label: opt.label,
            icon:
              opt.value === "overall"
                ? "Star"
                : opt.value === "goals"
                  ? "SoccerBall"
                  : opt.value === "assists"
                    ? "Boot"
                    : opt.value === "matches"
                      ? "CalendarCheck"
                      : opt.value === "cleanSheets"
                        ? "Hand"
                        : opt.value === "trophies"
                          ? "Award"
                          : opt.value === "awards"
                            ? "Medal"
                            : "Activity",
            isLucideIcon: true,
          }))}
          accentColor="blue"
          showIcon={true}
          size="sm"
        />
      </div>

      {/* Filter Labels */}
      <div className="grid grid-cols-2 gap-3 mb-2 flex-shrink-0">
        <label className="block text-[10px] font-bold text-green-400 uppercase tracking-wider">
          🧑‍💼 {t("leaderboard.position")}
        </label>
        <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider">
          🌍 {t("leaderboard.continent")}
        </label>
      </div>

      {/* Filter Dropdowns - Using Select */}
      <div className="grid grid-cols-2 gap-3 mb-3 flex-shrink-0">
        {/* Position Filter */}
        <Select<PositionDetail | "all">
          value={filterPosition}
          onChange={setFilterPosition}
          options={[
            { value: "all" as const, label: t("leaderboard.allPositions") },
            ...positions
              .slice(1)
              .map((pos) => ({ value: pos, label: resolvePosAbbr(pos) })),
          ]}
          accentColor="green"
          size="sm"
        />

        {/* Continent Filter */}
        <Select<Continent | "all">
          value={filterContinent}
          onChange={setFilterContinent}
          options={[
            { value: "all" as const, label: t("leaderboard.allRegions") },
            ...continents
              .slice(1)
              .map((cont) => ({ value: cont, label: t(`continents.${cont}`) })),
          ]}
          accentColor="blue"
          size="sm"
        />
      </div>

      {/* Active Filters */}
      {(filterPosition !== "all" || filterContinent !== "all") && (
        <div className="flex items-center gap-2 flex-wrap mb-4 flex-shrink-0">
          <span className="text-xs text-slate-500">
            {t("leaderboard.activeFilters")}
          </span>
          {filterPosition !== "all" && (
            <button
              onClick={() => setFilterPosition("all")}
              className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400
                         px-2.5 py-1 rounded-md text-xs font-medium hover:bg-green-500/20 transition-colors"
            >
              <span>{getPositionLabel()}</span>
              <Icon name="X" size={10} />
            </button>
          )}
          {filterContinent !== "all" && (
            <button
              onClick={() => setFilterContinent("all")}
              className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400
                         px-2.5 py-1 rounded-md text-xs font-medium hover:bg-blue-500/20 transition-colors"
            >
              <span>{filterContinent}</span>
              <Icon name="X" size={10} />
            </button>
          )}
          <button
            onClick={() => {
              setFilterPosition("all");
              setFilterContinent("all");
            }}
            className="text-xs text-red-400 hover:text-red-300 font-medium ml-1"
          >
            {t("leaderboard.clearAll")}
          </button>
        </div>
      )}

      {/* Leaderboard List */}
      <div
        className="flex-1 overflow-y-auto space-y-2.5 mb-4 pr-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {filteredAndSortedScores.length > 0 ? (
          filteredAndSortedScores.slice(0, 50).map((score, index) => {
            const style = getRankStyle(index);
            const medal = getMedalIcon(index);

            return (
              <div
                key={`${score.name}-${score.score}-${index}`}
                className={`
                  ${style.bg} ${style.border} ${style.glow}
                  border rounded-lg p-3
                  transition-all duration-200
                  hover:scale-[1.02] hover:shadow-xl
                  cursor-pointer
                `}
              >
                {/* Header: Rank + Name + Score */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Rank/Medal */}
                    {medal ? (
                      <span className="text-2xl sm:text-3xl flex-shrink-0 animate-pulse">
                        {medal}
                      </span>
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-700/60 border border-slate-600/50 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-xs sm:text-sm text-slate-300">
                          {index + 1}
                        </span>
                      </div>
                    )}

                    {/* Name + Position */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-bold text-sm sm:text-base truncate ${style.text}`}
                      >
                        {score.name}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="font-semibold text-blue-400">
                          {resolvePosAbbr(score.position)}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="truncate">
                          {t(`continents.${score.continent}`)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-xl sm:text-2xl text-emerald-400">
                      {getDynamicScore(score).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {getCurrentSortLabel()}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div className="bg-slate-900/60 rounded-md px-2 py-1.5 text-center hover:bg-slate-900/80 transition-colors">
                    <p className="text-sm sm:text-base font-bold text-amber-400">
                      {score.finalOvr}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                      OVR
                    </p>
                  </div>
                  <div className="bg-slate-900/60 rounded-md px-2 py-1.5 text-center hover:bg-slate-900/80 transition-colors">
                    <p className="text-sm sm:text-base font-bold text-blue-400">
                      {score.matches}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                      {t("history.matchesShort")}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 rounded-md px-2 py-1.5 text-center hover:bg-slate-900/80 transition-colors">
                    <p className="text-sm sm:text-base font-bold text-green-400">
                      {score.goals}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                      G
                    </p>
                  </div>
                  <div className="bg-slate-900/60 rounded-md px-2 py-1.5 text-center hover:bg-slate-900/80 transition-colors">
                    <p className="text-sm sm:text-base font-bold text-purple-400">
                      {score.assists}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                      A
                    </p>
                  </div>
                </div>

                {/* Achievements + Clean Sheets */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
                  <div className="flex items-center gap-3">
                    {score.trophies > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Icon
                          name="Trophy"
                          size={14}
                          variant="solid"
                          className="text-yellow-400"
                        />
                        <span className="font-bold text-yellow-300">
                          {score.trophies}
                        </span>
                      </div>
                    )}
                    {score.awards > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Icon
                          name="Medal"
                          size={14}
                          variant="solid"
                          className="text-blue-400"
                        />
                        <span className="font-bold text-blue-300">
                          {score.awards}
                        </span>
                      </div>
                    )}
                  </div>

                  {score.cleanSheets > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Icon
                        name="Hand"
                        size={14}
                        variant="solid"
                        className="text-green-400"
                      />
                      <span className="font-bold text-green-300">
                        {score.cleanSheets}
                      </span>
                      <span className="text-slate-500 text-[10px]">CS</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <div className="mb-4">
              <Icon name="Filter" size={48} className="text-slate-700/50" />
            </div>
            <p className="text-slate-300 text-base font-semibold mb-1">
              {t("leaderboard.noLegendsFound")}
            </p>
            <p className="text-slate-500 text-sm mb-3">
              {t("leaderboard.noPlayersMatchFilters")}
            </p>
            <button
              onClick={() => {
                setFilterPosition("all");
                setFilterContinent("all");
              }}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              {t("leaderboard.clearFiltersTryAgain")}
            </button>
          </div>
        )}
      </div>

      {/* Footer Button */}
      <div className="flex-shrink-0">
        <button
          onClick={onBack}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3.5 px-6 rounded-xl text-base
                     hover:scale-[1.02] active:scale-[0.98] transform transition-all duration-200
                     shadow-lg shadow-green-500/20 flex items-center justify-center gap-2.5"
        >
          <Icon name="CirclePlus" size={20} />
          <span>{t("leaderboard.startNewCareer")}</span>
        </button>

        {/* Stats Footer */}
        {filteredAndSortedScores.length > 0 && (
          <div className="text-center mt-3">
            <p className="text-xs text-slate-500">
              {t("leaderboard.showingTopOf", {
                count: Math.min(filteredAndSortedScores.length, 50),
                total: filteredAndSortedScores.length,
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
