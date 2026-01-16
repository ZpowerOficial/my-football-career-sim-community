import React from "react";
import type { Player } from "../types";
import {
  ClubTierStars,
  LeagueStrengthStars,
  PlayerStatusBadges,
} from "./CareerDashboard";
import { useI18n } from "../contexts/I18nContext";
import { translateNationality } from "../utils/i18n";
import { Icon } from "./ui/Icon";

interface PlayerHeaderProps {
  player: Player;
  overrideLeagueTier?: number;
  overrideLeagueName?: string;
}

type OverallStyle = {
  text: string;
  border: string;
  background: string;
};

const overallPalette = (overall: number): OverallStyle => {
  if (overall >= 80) {
    return {
      text: "text-yellow-200",
      border: "border-yellow-400",
      background: "bg-yellow-500/10",
    };
  }
  if (overall >= 65) {
    return {
      text: "text-amber-200",
      border: "border-amber-400",
      background: "bg-amber-500/10",
    };
  }
  return {
    text: "text-slate-200",
    border: "border-slate-400/70",
    background: "bg-slate-700/60",
  };
};

const formatAge = (player: Player): string => player.age.toString();

// Helper to safely display numbers (prevents NaN rendering)
const safeNum = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback;

const PlayerHeader: React.FC<PlayerHeaderProps> = ({
  player,
  overrideLeagueTier,
  overrideLeagueName,
}) => {
  const { t, language } = useI18n();
  const safeOverall = safeNum(player.stats.overall, 50);
  const { text, border, background } = overallPalette(safeOverall);
  const isFreeAgent = player.team?.name === "Free Agent";

  const locale = language === "pt" ? "pt-PT" : "en-GB";
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(safeNum(value, 0));

  const formatWage = (weeklyWage: number): string =>
    `${formatCurrency(safeNum(weeklyWage, 0))}${t("common.perWeekSuffix")}`;

  const formatFollowers = (followers: number): string =>
    safeNum(followers, 0).toLocaleString(locale);

  return (
    <header
      className="w-full bg-gradient-to-br from-slate-800 to-slate-900 px-3 py-2.5 sm:px-4 sm:py-3 text-white shadow-lg border-b border-slate-700"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 0.625rem)", // 0.625rem = 10px = py-2.5
      }}
    >
      {/* Linha 1: Jogador + Overall */}
      <div className="flex items-center gap-2.5 sm:gap-3 mb-2">
        {/* Overall Badge */}
        <div
          className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-lg border-2 ${border} ${background} flex-shrink-0`}
        >
          <span className={`text-xl sm:text-2xl font-bold ${text}`}>
            {safeOverall}
          </span>
        </div>

        {/* Nome + Info básica */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base sm:text-lg font-bold text-white">
            {player.name}
          </h1>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300">
            {(() => {
              const key = `positions.abbr.${player.position}`;
              const translated = t(key);
              const posAbbr = translated === key ? player.position : translated;
              return (
                <span className="font-semibold text-blue-300">{posAbbr}</span>
              );
            })()}
            <span className="text-slate-500">.</span>
            <span>{translateNationality(t, player.nationality)}</span>
            <span className="text-slate-500">.</span>
            <span>
              {formatAge(player)} {t("offers.years")}
            </span>
          </div>
        </div>

        {/* Market Value (destaque) - Desktop */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">
            {t("common.value")}
          </p>
          <p className="text-sm font-bold text-emerald-400">
            {formatCurrency(player.marketValue)}
          </p>
        </div>
      </div>

      {/* Linha 2: Clube + Detalhes */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Clube info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon name="ShieldHalf" size={12} className="text-blue-400 flex-shrink-0" />
              <span className="font-semibold text-white text-xs sm:text-sm truncate">
                {isFreeAgent ? t("common.freeAgent") : player.team.name}
              </span>
              {!isFreeAgent && <ClubTierStars team={player.team} />}
            </div>
            {!isFreeAgent && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Icon name="Flag" size={10} className="text-slate-500 flex-shrink-0" />
                <LeagueStrengthStars
                  team={player.team}
                  overrideTier={overrideLeagueTier}
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats rápidas (compactas) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Wage */}
          <div className="text-right">
            <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase">
              {t("offers.wage")}
            </p>
            {player.retired || isFreeAgent ? (
              <p className="text-[11px] sm:text-xs font-semibold text-slate-300">
                -
              </p>
            ) : (
              <p className="text-[11px] sm:text-xs font-semibold text-slate-200">
                {formatWage(player.wage)}
              </p>
            )}
          </div>

          {/* Contract */}
          <div className="text-right">
            <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase">
              {t("dashboard.contract")}
            </p>
            {player.retired || isFreeAgent ? (
              <p className="text-xs sm:text-sm font-semibold text-slate-300">
                -
              </p>
            ) : (
              <p
                className={`text-xs sm:text-sm font-bold ${player.contractLength >= 3
                    ? "text-emerald-400"
                    : player.contractLength >= 2
                      ? "text-amber-300"
                      : "text-rose-400"
                  }`}
              >
                {player.contractLength}
                {t("common.yearSuffix")}
              </p>
            )}
          </div>

          {/* Followers - Desktop */}
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase">
              {t("common.followers")}
            </p>
            <p className="text-xs font-semibold text-blue-300">
              {formatFollowers(player.socialMediaFollowers)}
            </p>
          </div>
        </div>
      </div>

      {/* Linha 3: Status + Media Narrative + Stats mobile */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-700/50">
        <div className="flex items-center gap-2 flex-wrap">
          <PlayerStatusBadges player={player} />
        </div>

        {/* Mobile only: Value + Followers - NsMEROS COMPLETOS */}
        <div className="flex flex-col gap-0.5 sm:hidden text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[10px] text-slate-400">
              {t("common.value")}:
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">
              {formatCurrency(player.marketValue)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Icon name="Users" size={10} className="text-slate-400" />
            <span className="text-[11px] font-semibold text-blue-300">
              {formatFollowers(player.socialMediaFollowers)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PlayerHeader;
