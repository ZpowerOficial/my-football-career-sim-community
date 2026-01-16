import React, { useState, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import type { Player, CareerLog } from "../types";
import { Icon, type IconName } from "./ui/Icon";

interface CareerTotalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  careerHistory: CareerLog[];
}

const CareerTotalsModal: React.FC<CareerTotalsModalProps> = ({
  isOpen,
  onClose,
  player,
  careerHistory,
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

  const isGK = player.position === "GK";

  // Calculate career stats
  const careerStats = React.useMemo(() => {
    const proHistory = (careerHistory || []).slice(1).filter((log) => !log.team?.isYouth);

    let totalMatches = 0;
    let totalGoals = 0;
    let totalAssists = 0;
    let totalCleanSheets = 0;
    let totalSaves = 0;
    let totalYellowCards = 0;
    let totalRedCards = 0;
    let totalShots = 0;
    let totalShotsOnTarget = 0;
    let totalPasses = 0;
    let totalKeyPasses = 0;
    let totalDribbles = 0;
    let totalTackles = 0;
    let totalInterceptions = 0;
    let totalRating = 0;
    let ratingCount = 0;

    proHistory.forEach((log) => {
      if (log.stats) {
        totalMatches += log.stats.matchesPlayed || 0;
        totalGoals += log.stats.goals || 0;
        totalAssists += log.stats.assists || 0;
        totalCleanSheets += log.stats.cleanSheets || 0;
        totalYellowCards += log.stats.matchStats?.yellowCards || 0;
        totalRedCards += log.stats.matchStats?.redCards || 0;

        if (log.stats.averageRating && log.stats.matchesPlayed > 0) {
          totalRating += (log.stats.averageRating as number) * log.stats.matchesPlayed;
          ratingCount += log.stats.matchesPlayed;
        }

        if (log.stats.matchStats) {
          totalSaves += log.stats.matchStats.saves || 0;
          totalShots += log.stats.matchStats.shots || 0;
          totalShotsOnTarget += log.stats.matchStats.shotsOnTarget || 0;
          totalPasses += log.stats.matchStats.passes || 0;
          totalKeyPasses += log.stats.matchStats.keyPasses || 0;
          totalDribbles += log.stats.matchStats.dribbles || 0;
          totalTackles += log.stats.matchStats.tackles || 0;
          totalInterceptions += log.stats.matchStats.interceptions || 0;
        }
      }
    });

    return {
      seasons: proHistory.length,
      clubs: new Set(proHistory.map((l) => l.team?.name).filter(Boolean)).size,
      matches: totalMatches,
      goals: totalGoals,
      assists: totalAssists,
      cleanSheets: totalCleanSheets,
      saves: totalSaves,
      yellowCards: totalYellowCards,
      redCards: totalRedCards,
      shots: totalShots,
      shotsOnTarget: totalShotsOnTarget,
      passes: totalPasses,
      keyPasses: totalKeyPasses,
      dribbles: totalDribbles,
      tackles: totalTackles,
      interceptions: totalInterceptions,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
    };
  }, [careerHistory]);

  if (!isOpen) return null;

  const StatCard: React.FC<{ label: string; value: string | number; color?: string; icon?: IconName }> = ({
    label,
    value,
    color = "text-white",
    icon,
  }) => (
    <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
      {icon && <Icon name={icon} size={18} className={`${color} mb-1`} />}
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-overlay ${isClosing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-slate-900/95 rounded-xl border border-slate-700/50 w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl backdrop-blur-md modal-content swipeable ${isClosing ? "modal-content-exit" : "modal-content-enter"} ${isDragging ? "modal-content-dragging" : dragOffset === 0 ? "" : "modal-content-returning"}`}
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
              <Icon name="TrendingUp" size={14} className="text-emerald-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {t("dashboard.careerTotals")}
              </span>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white p-1">
              <Icon name="X" size={14} />
            </button>
          </div>
        </div>

        {/* Career Overview */}
        <div className="p-3 bg-slate-800/50 border-b border-slate-700/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{careerStats.seasons}</p>
              <p className="text-xs text-slate-400 uppercase">{t("careerModal.seasons")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{careerStats.clubs}</p>
              <p className="text-xs text-slate-400 uppercase">{t("careerModal.clubs")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{player.age}</p>
              <p className="text-xs text-slate-400 uppercase">{t("careerModal.age")}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
          {/* Main Stats */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              {t("careerModal.mainStats")}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatCard label={t("common.matchesAbbr") || "M"} value={careerStats.matches} />
              {isGK ? (
                <>
                  <StatCard label={t("common.cleanSheetsAbbr") || "CS"} value={careerStats.cleanSheets} />
                  <StatCard label={t("common.savesAbbr") || "SV"} value={careerStats.saves} />
                  <StatCard
                    label={t("common.cleanSheetRatioAbbr") || "CS%"}
                    value={careerStats.matches > 0 ? `${((careerStats.cleanSheets / careerStats.matches) * 100).toFixed(0)}%` : "0%"}
                  />
                </>
              ) : (
                <>
                  <StatCard label={t("common.goalsAbbr") || "G"} value={careerStats.goals} color="text-emerald-400" />
                  <StatCard label={t("common.assistsAbbr") || "A"} value={careerStats.assists} color="text-sky-400" />
                  <StatCard label="G+A" value={careerStats.goals + careerStats.assists} />
                </>
              )}
            </div>
          </div>

          {/* Per Match Averages */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">
              {t("careerModal.perMatchAverages")}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {isGK ? (
                <>
                  <StatCard
                    label={t("careerModal.savesPerMatch")}
                    value={(careerStats.matches > 0 ? careerStats.saves / careerStats.matches : 0).toFixed(1)}
                    color="text-amber-400"
                  />
                  <StatCard
                    label={t("careerModal.csPerMatch")}
                    value={(careerStats.matches > 0 ? careerStats.cleanSheets / careerStats.matches : 0).toFixed(2)}
                    color="text-cyan-400"
                  />
                  <StatCard
                    label={t("seasonModal.averageRating")}
                    value={careerStats.avgRating.toFixed(2)}
                    color="text-amber-400"
                  />
                </>
              ) : (
                <>
                  <StatCard
                    label={t("careerModal.goalsPerMatch")}
                    value={(careerStats.matches > 0 ? careerStats.goals / careerStats.matches : 0).toFixed(2)}
                    color="text-emerald-400"
                  />
                  <StatCard
                    label={t("careerModal.assistsPerMatch")}
                    value={(careerStats.matches > 0 ? careerStats.assists / careerStats.matches : 0).toFixed(2)}
                    color="text-violet-400"
                  />
                  <StatCard
                    label={t("seasonModal.averageRating")}
                    value={careerStats.avgRating.toFixed(2)}
                    color="text-amber-400"
                  />
                </>
              )}
            </div>
          </div>

          {/* Detailed Stats (for outfield players) */}
          {!isGK && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">
                {t("careerModal.detailedStats")}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <StatCard label={t("common.shotsAbbr") || "FIN"} value={careerStats.shots} color="text-slate-300" />
                <StatCard label={t("common.passesAbbr") || "PAS"} value={careerStats.passes} color="text-slate-300" />
                <StatCard label={t("common.dribblesAbbr") || "DRI"} value={careerStats.dribbles} color="text-slate-300" />
                <StatCard label={t("common.tacklesAbbr") || "DES"} value={careerStats.tackles} color="text-slate-300" />
                <StatCard label={t("common.interceptionsAbbr") || "INT"} value={careerStats.interceptions} color="text-slate-300" />
                <StatCard label={t("common.keyPassesAbbr") || "PD"} value={careerStats.keyPasses} color="text-slate-300" />
              </div>
            </div>
          )}

          {/* Discipline */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">
              {t("seasonModal.discipline")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-yellow-500/10 rounded-lg p-2.5 text-center border border-yellow-500/30">
                <div className="w-5 h-7 bg-yellow-400 rounded mx-auto mb-1.5"></div>
                <p className="text-xl font-bold text-yellow-400">{careerStats.yellowCards}</p>
                <p className="text-xs text-slate-400">{t("common.yellowCards")}</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-2.5 text-center border border-red-500/30">
                <div className="w-5 h-7 bg-red-500 rounded mx-auto mb-1.5"></div>
                <p className="text-xl font-bold text-red-400">{careerStats.redCards}</p>
                <p className="text-xs text-slate-400">{t("common.redCards")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerTotalsModal;
