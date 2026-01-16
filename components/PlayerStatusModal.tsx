import React, { useState, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import type { Player } from "../types";
import { Icon } from "./ui/Icon";

interface PlayerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

const PlayerStatusModal: React.FC<PlayerStatusModalProps> = ({
  isOpen,
  onClose,
  player,
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

  if (!isOpen) return null;

  const getMoraleColor = (morale: string) => {
    switch (morale) {
      case "Very High":
        return "text-emerald-400";
      case "High":
        return "text-green-400";
      case "Normal":
        return "text-yellow-400";
      case "Low":
        return "text-orange-400";
      case "Very Low":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const getFormColor = (form: number) => {
    if (form >= 4) return "text-emerald-400";
    if (form >= 2) return "text-green-400";
    if (form >= 0) return "text-yellow-400";
    if (form >= -2) return "text-orange-400";
    return "text-red-400";
  };

  const getFormLabel = (form: number) => {
    if (form >= 4) return t("form.worldClass");
    if (form >= 3) return t("form.excellent");
    if (form >= 2) return t("form.veryGood");
    if (form >= 1) return t("form.good");
    if (form >= 0) return t("form.average");
    if (form >= -2) return t("form.belowAverage");
    if (form >= -4) return t("form.poor");
    return t("form.terrible");
  };

  const renderProgressBar = (value: number, maxValue: number, color: string) => {
    const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
    return (
      <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  // Form is between -5 and +5, we normalize to 0-100 for display
  const normalizedForm = ((player.form + 5) / 10) * 100;

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
              <Icon name="HeartPulse" size={14} className="text-rose-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {t("dashboard.playerStatus")}
              </span>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white p-1">
              <Icon name="X" size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[70vh] space-y-3">
          {/* Form */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="TrendingUp" size={14} className="text-amber-400" />
                <span className="text-sm font-medium text-white">{t("dashboard.form")}</span>
              </div>
              <span className={`text-xl font-bold ${getFormColor(player.form)}`}>
                {player.form > 0 ? `+${player.form.toFixed(1)}` : player.form.toFixed(1)}
              </span>
            </div>
            {renderProgressBar(normalizedForm, 100, "bg-amber-500")}
            <p className={`text-xs mt-1.5 ${getFormColor(player.form)}`}>
              {getFormLabel(player.form)}
            </p>
          </div>

          {/* Morale */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="Smile" size={14} className="text-purple-400" />
                <span className="text-sm font-medium text-white">{t("dashboard.morale")}</span>
              </div>
              <span className={`text-lg font-bold ${getMoraleColor(player.morale)}`}>
                {t(`morale.${player.morale}`)}
              </span>
            </div>
          </div>

          {/* Team Chemistry */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="Users" size={14} className="text-blue-400" />
                <span className="text-sm font-medium text-white">{t("dashboard.teamChemistry")}</span>
              </div>
              <span className="text-xl font-bold text-blue-400">{player.teamChemistry}%</span>
            </div>
            {renderProgressBar(player.teamChemistry, 100, "bg-blue-500")}
          </div>

          {/* Club Approval */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="ThumbsUp" size={14} className="text-green-400" />
                <span className="text-sm font-medium text-white">{t("dashboard.clubApproval")}</span>
              </div>
              <span className="text-xl font-bold text-green-400">{player.clubApproval}%</span>
            </div>
            {renderProgressBar(player.clubApproval, 100, "bg-green-500")}
          </div>

          {/* Injury Status */}
          {player.injury && (
            <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Icon name="Hospital" size={20} className="text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-red-300 text-sm">{t("dashboard.injured")}</p>
                  <p className="text-xs text-red-400">
                    {player.injury.duration} {t("common.weeksRemaining")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Personality & Reputation */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Brain" size={14} className="text-violet-400" />
              <span className="text-sm font-medium text-white">{t("statusModal.mental")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 rounded-lg p-2.5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">
                  {t("dashboard.personality")}
                </p>
                <p className="font-semibold text-violet-300 text-sm">
                  {t(`personality.${player.personality}`)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">
                  {t("dashboard.reputation")}
                </p>
                <p className="font-semibold text-amber-300 text-sm">
                  {player.reputation}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PlayerStatusModal;
