import React, { useState, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import type { Player, CareerLog, CompetitionResult } from "../types";
import { Icon, type IconName } from "./ui/Icon";

// Helper to safely handle numbers (prevents NaN rendering)
const safeNum = (value: number | undefined | null, fallback = 0): number =>
  value != null && Number.isFinite(value) ? value : fallback;

interface SeasonStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  latestLog: CareerLog;
}

const SeasonStatsModal: React.FC<SeasonStatsModalProps> = ({
  isOpen,
  onClose,
  player,
  latestLog,
}) => {
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset, isDragging } = useSwipeToClose({
    onClose: handleClose,
    threshold: 80,
  });

  if (!isOpen || !latestLog?.stats) return null;

  const stats = latestLog.stats;
  const matchStats = stats.matchStats;
  const isGK = player.position === "GK";
  const competitions = latestLog.competitionData?.competitions || [];
  const trophiesWon = latestLog.trophies || [];

  const getCompetitionIcon = (type: string): IconName => {
    switch (type) {
      case "League": return "Table";
      case "Cup": return "Trophy";
      case "Continental": return "Globe";
      case "International": return "Flag";
      case "State Cup": return "MapPin";
      default: return "CircleDot";
    }
  };

  const getCompetitionColor = (type: string) => {
    switch (type) {
      case "League": return "text-blue-400";
      case "Cup": return "text-amber-400";
      case "Continental": return "text-purple-400";
      case "International": return "text-green-400";
      case "State Cup": return "text-orange-400";
      default: return "text-slate-400";
    }
  };

  const CompetitionCard: React.FC<{ comp: CompetitionResult }> = ({ comp }) => {
    const getDisplayName = (competitionName: string) => {
      // Try multiple translation approaches
      // 1. Try competitionNames first (for continental competitions like "South American Champions Cup")
      let translated = t(`competitionNames.${competitionName}`);
      if (translated !== `competitionNames.${competitionName}`) return translated;

      // 2. Try direct translation (e.g., "Spanish Youth League" -> translated)
      translated = t(competitionName);
      if (translated !== competitionName) return translated;

      // 3. Try with trophy. prefix (e.g., "trophy.Spanish Youth League")
      translated = t(`trophy.${competitionName}`);
      if (translated !== `trophy.${competitionName}`) return translated;

      // 4. Try with trophiesSection. prefix
      translated = t(`trophiesSection.${competitionName}`);
      if (translated !== `trophiesSection.${competitionName}`) return translated;

      // 5. Return as is if no translation found
      return competitionName;
    };

    return (
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon name={getCompetitionIcon(comp.type)} size={12} className={getCompetitionColor(comp.type)} />
            <span className="text-sm font-semibold text-white truncate max-w-[180px]">
              {getDisplayName(comp.competition)}
            </span>
          </div>
          {comp.wonCompetition && (
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Icon name="Trophy" size={10} />
              {t("common.champion")}
            </span>
          )}
        </div>
        {comp.type === "League" && comp.position && (
          <div className="mb-2 bg-slate-900/50 rounded p-2">
            <span className="text-xs text-slate-400">{t("seasonModal.position")}: </span>
            <span className={`font-bold ${comp.position === 1 ? "text-amber-400" : comp.position <= 4 ? "text-emerald-400" : "text-slate-300"}`}>
              {comp.position}º
            </span>
            {comp.totalTeams && (
              <span className="text-xs text-slate-500"> / {comp.totalTeams}</span>
            )}
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-white">{safeNum(comp.matchesPlayed)}</p>
            <p className="text-[10px] text-slate-400">{t("common.matches")}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-400">{safeNum(comp.goals)}</p>
            <p className="text-[10px] text-slate-400">{t("common.goals")}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-violet-400">{safeNum(comp.assists)}</p>
            <p className="text-[10px] text-slate-400">{t("common.assists")}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-cyan-400">
              {safeNum(comp.rating, 6.0).toFixed(1)}
            </p>
            <p className="text-[10px] text-slate-400">{t("common.rating")}</p>
          </div>
        </div>
        {isGK && comp.cleanSheets !== undefined && comp.cleanSheets > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700/50 text-center">
            <span className="text-xs text-slate-400">{t("common.cleanSheets")}: </span>
            <span className="font-bold text-cyan-400">{comp.cleanSheets}</span>
          </div>
        )}
      </div>
    );
  };

  const StatRow: React.FC<{ label: string; value: string | number; color?: string; icon?: IconName }> = ({
    label,
    value,
    color = "text-white",
    icon,
  }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30 last:border-b-0">
      <span className="text-slate-400 text-sm flex items-center gap-2">
        {icon && <Icon name={icon} size={12} />}
        {label}
      </span>
      <span className={`font-bold text-sm ${color}`}>{value}</span>
    </div>
  );


  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-overlay ${isClosing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-slate-900/95 rounded-xl border border-slate-700/50 w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl backdrop-blur-md modal-content swipeable ${isClosing ? "modal-content-exit" : "modal-content-enter"} ${isDragging ? "modal-content-dragging" : dragOffset === 0 ? "" : "modal-content-returning"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          opacity: dragOffset > 0 ? Math.max(0.5, 1 - dragOffset / 200) : undefined,
        }}
      >
        {/* Swipe indicator */}
        <div className="swipe-indicator" />

        {/* Header */}
        <div className="border-b border-slate-700/50">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Icon name="ChartBar" size={14} className="text-cyan-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {t("dashboard.seasonPerformance")}
              </span>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white p-1">
              <Icon name="X" size={14} />
            </button>
          </div>
        </div>

        {/* Season Info */}
        <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{t("seasonModal.season")}</p>
              <p className="text-lg font-bold text-white">
                {player.age} {t("common.years")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{t("seasonModal.club")}</p>
              <p className="text-lg font-bold text-cyan-400">{latestLog.team?.name}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
          {/* Trophies won this season */}
          {trophiesWon.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-lg p-3 border border-amber-500/30">
              <h3 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-2 uppercase tracking-wider">
                <Icon name="Trophy" size={12} />
                {t("seasonModal.trophiesWon")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {trophiesWon.map((trophy, idx) => (
                  <span key={idx} className="bg-amber-500/20 text-amber-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Icon name="Medal" size={10} />
                    {t(`trophiesSection.${trophy}`) !== `trophiesSection.${trophy}` ? t(`trophiesSection.${trophy}`) : trophy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Competitions breakdown */}
          {competitions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Icon name="List" size={12} className="text-cyan-400" />
                {t("seasonModal.competitionsBreakdown")}
              </h3>
              {competitions.map((comp, idx) => (
                <CompetitionCard key={idx} comp={comp} />
              ))}
            </div>
          )}

          {/* Season Summary Stats */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
              <Icon name="CircleDot" size={12} className="text-emerald-400" />
              {t("seasonModal.seasonTotals")}
            </h3>
            <StatRow label={t("common.matches")} value={stats.matchesPlayed} icon="CalendarCheck" />
            {isGK ? (
              <>
                <StatRow label={t("common.cleanSheets")} value={stats.cleanSheets || 0} color="text-cyan-400" icon="Hand" />
                <StatRow
                  label={t("seasonModal.cleanSheetRatio")}
                  value={stats.matchesPlayed > 0 ? `${((stats.cleanSheets || 0) / stats.matchesPlayed * 100).toFixed(1)}%` : "0%"}
                  color="text-emerald-400"
                  icon="Percent"
                />
              </>
            ) : (
              <>
                <StatRow label={t("common.goals")} value={stats.goals} color="text-emerald-400" icon="SoccerBall" />
                <StatRow label={t("common.assists")} value={stats.assists} color="text-violet-400" icon="Boot" />
                <StatRow
                  label={t("seasonModal.goalsPerMatch")}
                  value={stats.matchesPlayed > 0 ? (stats.goals / stats.matchesPlayed).toFixed(2) : "0.00"}
                  color="text-amber-400"
                  icon="TrendingUp"
                />
                <StatRow
                  label={t("seasonModal.contribution")}
                  value={((stats.goals + stats.assists) / Math.max(stats.matchesPlayed, 1)).toFixed(2)}
                  color="text-cyan-400"
                  icon="Star"
                />
              </>
            )}
          </div>

          {/* Cards & Discipline */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
              <Icon name="TriangleAlert" size={12} className="text-yellow-400" />
              {t("seasonModal.discipline")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-yellow-500/10 rounded-lg p-2.5 text-center border border-yellow-500/30">
                <div className="w-5 h-7 bg-yellow-400 rounded mx-auto mb-1.5"></div>
                <p className="text-xl font-bold text-yellow-400">{matchStats?.yellowCards || 0}</p>
                <p className="text-xs text-slate-400">{t("common.yellowCards")}</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-2.5 text-center border border-red-500/30">
                <div className="w-5 h-7 bg-red-500 rounded mx-auto mb-1.5"></div>
                <p className="text-xl font-bold text-red-400">{matchStats?.redCards || 0}</p>
                <p className="text-xs text-slate-400">{t("common.redCards")}</p>
              </div>
            </div>
          </div>

          {/* Rating */}
          {stats.averageRating && (
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg p-3 border border-amber-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="Star" size={18} className="text-amber-400" />
                  <span className="font-semibold text-white text-sm">{t("seasonModal.averageRating")}</span>
                </div>
                <span className="text-2xl font-bold text-amber-400">
                  {typeof stats.averageRating === 'number' ? stats.averageRating.toFixed(2) : stats.averageRating}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonStatsModal;
