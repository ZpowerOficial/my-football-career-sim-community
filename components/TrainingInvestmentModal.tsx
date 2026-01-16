import React, { useState, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import type { Player } from "../types";
import {
  calculateTrainingCost,
  canAffordTraining,
  applyTrainingInvestment,
  hasAlreadyInvestedThisSeason,
} from "../services/trainingInvestment";
import { Icon, type IconName } from "./ui/Icon";

interface TrainingInvestmentModalProps {
  isOpen: boolean;
  player: Player;
  currentSeason: number;
  onClose: () => void;
  onInvest: (updatedPlayer: Player, resultMessage: string) => void;
  onDecline: () => void;
}

export const TrainingInvestmentModal: React.FC<TrainingInvestmentModalProps> = ({
  isOpen,
  player,
  currentSeason,
  onClose,
  onInvest,
  onDecline,
}) => {
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultType, setResultType] = useState<"excellent" | "good" | "neutral" | "poor">("neutral");

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowResult(false);
      onClose();
    }, 200);
  }, [onClose]);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset, isDragging } = useSwipeToClose({
    onClose: handleClose,
    threshold: 80,
  });

  const cost = calculateTrainingCost(player);
  const canAfford = canAffordTraining(player);
  const alreadyInvested = hasAlreadyInvestedThisSeason(player, currentSeason);
  const balance = player.bankBalance || 0;

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) {
      return `€${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `€${(value / 1_000).toFixed(0)}K`;
    }
    return `€${value.toFixed(0)}`;
  };

  const handleInvest = () => {
    const result = applyTrainingInvestment(player, currentSeason);

    // Determine result type and message
    const modifier = result.trainingModifier || 1.0;
    let type: "excellent" | "good" | "neutral" | "poor";
    let message: string;

    if (modifier >= 1.25) {
      type = "excellent";
      message = t("training.resultExcellent");
    } else if (modifier >= 1.10) {
      type = "good";
      message = t("training.resultGood");
    } else if (modifier >= 1.0) {
      type = "neutral";
      message = t("training.resultNeutral");
    } else {
      type = "poor";
      message = t("training.resultPoor");
    }

    setResultType(type);
    setResultMessage(message);
    setShowResult(true);

    // After showing result, call onInvest
    setTimeout(() => {
      onInvest(result, message);
    }, 2500);
  };

  const handleDecline = () => {
    onDecline();
    handleClose();
  };

  if (!isOpen) return null;

  const resultColors = {
    excellent: "from-yellow-500 to-amber-600",
    good: "from-green-500 to-emerald-600",
    neutral: "from-blue-500 to-cyan-600",
    poor: "from-red-500 to-rose-600",
  };

  const resultIcons: Record<typeof resultType, IconName> = {
    excellent: "Star",
    good: "ArrowUp",
    neutral: "Equal",
    poor: "ArrowDown",
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 modal-overlay ${isClosing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-slate-900/95 rounded-xl border border-slate-700/50 w-full max-w-sm overflow-hidden shadow-2xl backdrop-blur-md modal-content swipeable ${isClosing ? "modal-content-exit" : "modal-content-enter"} ${isDragging ? "modal-content-dragging" : dragOffset === 0 ? "" : "modal-content-returning"}`}
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

        {showResult ? (
          // Result Screen
          <div className="p-6 text-center">
            <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${resultColors[resultType]} flex items-center justify-center mb-4 animate-pulse`}>
              <Icon name={resultIcons[resultType]} size={24} variant="solid" className="text-white" />
            </div>
            <p className="text-slate-200 text-base leading-relaxed">
              {resultMessage}
            </p>
          </div>
        ) : (
          // Investment Decision Screen
          <>
            {/* Header */}
            <div className="px-4 pb-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon name="Dumbbell" size={14} className="text-purple-400" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {t("training.investTitle")}
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <p className="text-slate-300 text-sm leading-relaxed text-center">
                {t("training.investQuestion")}
              </p>

              {/* Cost Info */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{t("training.investCost", { cost: "" }).replace("€", "")}</span>
                  <span className="text-amber-400 font-bold">{formatCurrency(cost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{t("training.investBalance", { balance: "" }).replace("€", "")}</span>
                  <span className={`font-bold ${canAfford ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>

              {/* Warning messages */}
              {alreadyInvested && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-center">
                  <p className="text-amber-400 text-xs">
                    <Icon name="TriangleAlert" size={12} className="mr-1.5" />
                    {t("training.alreadyInvested")}
                  </p>
                </div>
              )}

              {!canAfford && !alreadyInvested && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-center">
                  <p className="text-red-400 text-xs">
                    <Icon name="CircleX" size={12} className="mr-1.5" />
                    {t("training.cannotAfford")}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all duration-200"
                >
                  {t("training.investNo")}
                </button>
                <button
                  onClick={handleInvest}
                  disabled={!canAfford || alreadyInvested}
                  className={`flex-1 font-bold py-3 px-4 rounded-xl text-sm transition-all duration-200 ${canAfford && !alreadyInvested
                    ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                >
                  <Icon name="Dumbbell" size={14} className="mr-1.5" />
                  {t("training.investYes")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
