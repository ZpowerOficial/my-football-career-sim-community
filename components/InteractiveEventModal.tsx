import React, { useState, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import type { Player } from "../types";
import type {
  InteractiveEvent,
  EventChoice,
  EventConsequence,
  PersonalityScales,
} from "../types/interactiveEventTypes";
import {
  InteractiveEventService,
  processEventChoice,
} from "../services/interactiveEventService";
import { Icon, type IconName } from "./ui/Icon";

interface InteractiveEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: InteractiveEvent | null;
  player: Player;
  onPlayerUpdate: (player: Player) => void;
}

export const InteractiveEventModal: React.FC<InteractiveEventModalProps> = ({
  isOpen,
  onClose,
  event,
  player,
  onPlayerUpdate,
}) => {
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showConsequences, setShowConsequences] = useState(false);
  const [lastConsequences, setLastConsequences] = useState<string[]>([]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowConsequences(false);
      setSelectedChoice(null);
      setLastConsequences([]);
      onClose();
    }, 200);
  }, [onClose]);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset, isDragging } =
    useSwipeToClose({
      onClose: handleClose,
      threshold: 80,
    });

  // Check if choice is available based on requirements
  const isChoiceAvailable = useCallback(
    (choice: EventChoice): boolean => {
      if (choice.minCash && (player.cash || 0) < choice.minCash) return false;
      if (choice.minDiscipline) {
        const scales = player.eventState?.personalityScales;
        if (scales && scales.discipline < choice.minDiscipline) return false;
      }
      return true;
    },
    [player],
  );

  // Handle choice selection
  const handleChoiceSelect = useCallback(
    (choiceId: string) => {
      if (!event) return;

      setSelectedChoice(choiceId);

      // Process the choice
      const result = processEventChoice(player, event.id, choiceId);

      if (result) {
        setLastConsequences(result.immediateEffects);
        setShowConsequences(true);

        // Update player after a brief delay to show consequences
        setTimeout(() => {
          onPlayerUpdate({
            ...result.updatedPlayer,
            eventState: result.updatedEventState,
          });
        }, 1500);
      }
    },
    [event, player, onPlayerUpdate],
  );

  // Get severity color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "minor":
        return "text-blue-400";
      case "moderate":
        return "text-amber-400";
      case "major":
        return "text-orange-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-slate-400";
    }
  };

  // Get severity background
  const getSeverityBg = (severity: string): string => {
    switch (severity) {
      case "minor":
        return "bg-blue-500/20 border-blue-500/30";
      case "moderate":
        return "bg-amber-500/20 border-amber-500/30";
      case "major":
        return "bg-orange-500/20 border-orange-500/30";
      case "critical":
        return "bg-red-500/20 border-red-500/30";
      default:
        return "bg-slate-500/20 border-slate-500/30";
    }
  };

  // Get image type icon
  const getImageIcon = (imageType?: string): IconName => {
    switch (imageType) {
      case "party":
        return "Wine";
      case "media":
        return "Camera";
      case "charity":
        return "HeartHandshake";
      case "conflict":
        return "Zap";
      case "business":
        return "Briefcase";
      default:
        return "Newspaper";
    }
  };

  // Format consequence for display
  const formatConsequence = (consequence: EventConsequence): string => {
    const { type, value } = consequence;
    const sign = value >= 0 ? "+" : "";

    switch (type) {
      case "reputation":
        return `${sign}${value} ${t("events.consequences.reputation")}`;
      case "money":
        return `${sign}€${Math.abs(value).toLocaleString()}`;
      case "morale":
        return `${sign}${value} ${t("events.consequences.morale")}`;
      case "followers":
        return `${sign}${value.toLocaleString()} ${t("events.consequences.followers")}`;
      case "discipline":
        return `${sign}${value} ${t("events.consequences.discipline")}`;
      case "exposure":
        return `${sign}${value} ${t("events.consequences.exposure")}`;
      case "fans":
        return `${sign}${value} ${t("events.consequences.fans")}`;
      case "press":
        return `${sign}${value} ${t("events.consequences.press")}`;
      case "form":
        return `${sign}${value} ${t("events.consequences.form")}`;
      case "ambition":
        return `${sign}${value} ${t("events.consequences.ambition")}`;
      case "loyalty":
        return `${sign}${value} ${t("events.consequences.loyalty")}`;
      case "teamChemistry":
        return `${sign}${value} ${t("events.consequences.teamChemistry")}`;
      case "generosity":
        return `${sign}${value} ${t("events.consequences.generosity")}`;
      default:
        return `${sign}${value} ${type}`;
    }
  };

  // Get consequence color
  const getConsequenceColor = (consequence: EventConsequence): string => {
    const { type, value } = consequence;

    // Money and followers are different - more is good
    if (type === "money" || type === "followers") {
      return value >= 0 ? "text-emerald-400" : "text-red-400";
    }

    // For reputation, morale, form, discipline - more is good
    if (
      ["reputation", "morale", "form", "discipline", "fans", "press"].includes(
        type,
      )
    ) {
      return value >= 0 ? "text-emerald-400" : "text-red-400";
    }

    // For exposure - depends on context, show neutral
    if (type === "exposure") {
      return value >= 0 ? "text-amber-400" : "text-blue-400";
    }

    return "text-slate-400";
  };

  if (!isOpen || !event) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-overlay ${isClosing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
      onClick={(e) =>
        e.target === e.currentTarget && !showConsequences && handleClose()
      }
    >
      <div
        className={`bg-slate-900/95 rounded-xl border border-slate-700/50 w-full max-w-md overflow-hidden shadow-2xl backdrop-blur-md modal-content swipeable ${isClosing ? "modal-content-exit" : "modal-content-enter"} ${isDragging ? "modal-content-dragging" : dragOffset === 0 ? "" : "modal-content-returning"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          opacity:
            dragOffset > 0 ? Math.max(0.5, 1 - dragOffset / 200) : undefined,
        }}
      >
        {/* Swipe indicator */}
        <div className="swipe-indicator" />

        {/* Header with severity badge */}
        <div className="px-4 pt-2 pb-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`w-10 h-10 rounded-lg ${getSeverityBg(event.severity)} flex items-center justify-center flex-shrink-0`}
              >
                <Icon
                  name={getImageIcon(event.imageType)}
                  size={18}
                  className={getSeverityColor(event.severity)}
                />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-white block truncate">
                  {t(event.titleKey)}
                </span>
                <span
                  className={`text-xs ${getSeverityColor(event.severity)} uppercase tracking-wide`}
                >
                  {t(`events.severity.${event.severity}`)}
                </span>
              </div>
            </div>
            {!showConsequences && (
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-white transition-colors p-2 flex-shrink-0"
              >
                <Icon name="X" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Description */}
          <p className="text-slate-300 text-sm leading-relaxed">
            {t(event.descriptionKey)}
          </p>

          {/* Severity/Urgency indicator */}
          {event.severity === 'critical' && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              <Icon name="Warning" size={12} />
              <span>{t("events.urgentDecision")}</span>
            </div>
          )}
          {event.severity === 'major' && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
              <Icon name="Clock" size={12} />
              <span>{t("events.importantDecision")}</span>
            </div>
          )}

          {/* Choices or Consequences */}
          {!showConsequences ? (
            <div className="space-y-3">
              {event.choices.map((choice) => {
                const available = isChoiceAvailable(choice);
                return (
                  <button
                    key={choice.id}
                    onClick={() => available && handleChoiceSelect(choice.id)}
                    disabled={!available}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                      available
                        ? "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 cursor-pointer"
                        : "bg-slate-900/50 border-slate-800/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-white block mb-1">
                          {t(choice.labelKey)}
                        </span>
                        {/* Preview consequences */}
                        <div className="flex flex-wrap gap-2">
                          {choice.consequences.slice(0, 3).map((cons, idx) => (
                            <span
                              key={idx}
                              className={`text-xs ${getConsequenceColor(cons)} bg-slate-800/50 px-2 py-0.5 rounded`}
                            >
                              {formatConsequence(cons)}
                              {cons.probability && cons.probability < 1 && (
                                <span className="text-slate-500 ml-1">
                                  ({Math.round(cons.probability * 100)}%)
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Icon
                        name="ChevronRight"
                        size={12}
                        className="text-slate-500 mt-1"
                      />
                    </div>

                    {/* Requirement notice */}
                    {!available && choice.minCash && (
                      <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                        <Icon name="Lock" size={10} />
                        {t("events.requiresMoney", { amount: choice.minCash.toLocaleString() })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Show consequences after choice */
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                  <Icon name="Check" size={24} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {t("events.decisionMade")}
                </h3>
              </div>

              {/* Effects */}
              <div className="space-y-2">
                {lastConsequences.map((effect, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                      effect.includes("+") && !effect.includes("-")
                        ? "bg-emerald-500/10 text-emerald-400"
                        : effect.includes("-")
                          ? "bg-red-500/10 text-red-400"
                          : "bg-slate-700/50 text-slate-300"
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <Icon
                      name={
                        effect.includes("+") && !effect.includes("-")
                          ? "ArrowUp"
                          : effect.includes("-")
                            ? "ArrowDown"
                            : "Minus"
                      }
                      size={12}
                    />
                    <span>{effect}</span>
                  </div>
                ))}
              </div>

              {/* Continue button */}
              <button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-600 text-white font-bold py-3 px-6 rounded-xl text-sm hover:from-slate-600 hover:to-slate-500 transition-all duration-200"
              >
                {t("common.continue")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveEventModal;
