import React, { useState, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import type { Player, Agent } from "../types";
import { AGENTS } from "../constants";
import { Icon, type IconName } from "./ui/Icon";

interface AgentContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onPlayerUpdate?: (player: Player) => void;
}

const AgentContractModal: React.FC<AgentContractModalProps> = ({
  isOpen,
  onClose,
  player,
  onPlayerUpdate,
}) => {
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);
  const [showAgentList, setShowAgentList] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"fire" | "renew" | null>(null);

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

  const getReputationColor = (rep: string) => {
    switch (rep) {
      case "World Class":
        return "text-amber-400";
      case "Great":
        return "text-purple-400";
      case "Good":
        return "text-blue-400";
      case "Average":
        return "text-slate-300";
      case "Poor":
        return "text-orange-400";
      default:
        return "text-slate-400";
    }
  };

  const getStyleIcon = (style: string): IconName => {
    switch (style) {
      case "Aggressive":
        return "Flame";
      case "Conservative":
        return "Shield";
      case "Balanced":
        return "Scale";
      case "Money-focused":
        return "Coins";
      case "Career-focused":
        return "TrendingUp";
      default:
        return "UserCog";
    }
  };

  const formatSalary = (salary: number) => {
    if (salary >= 1_000_000) {
      return `€${(salary / 1_000_000).toFixed(2)}M`;
    }
    if (salary >= 1_000) {
      return `€${(salary / 1_000).toFixed(0)}K`;
    }
    return `€${salary.toFixed(0)}`;
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) {
      return `€${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `€${(amount / 1_000).toFixed(0)}K`;
    }
    return `€${amount.toFixed(0)}`;
  };

  // Get available agents for hiring (different from current)
  const getAvailableAgents = (): Agent[] => {
    return AGENTS.filter(a => {
      // Can't hire same agent
      if (a.name === player.agent.name) return false;

      // Super Agent only for high rep players
      if (a.reputation === "Super Agent" && player.stats.overall < 82) return false;

      // Rookie agents less interested in established players
      if (a.reputation === "Rookie" && (player.age > 25 || player.stats.overall > 78)) return false;

      return true;
    });
  };

  const handleFireAgent = () => {
    if (!onPlayerUpdate) return;

    const availableAgents = getAvailableAgents().filter(a => a.reputation === "Average" || a.reputation === "Good");
    const newAgent = availableAgents.length > 0
      ? availableAgents[Math.floor(Math.random() * availableAgents.length)]
      : AGENTS.find(a => a.reputation === "Average") || AGENTS[0];

    const updatedPlayer = {
      ...player,
      agent: newAgent,
      agentContractLength: 2, // New contract
    };

    onPlayerUpdate(updatedPlayer);
    setConfirmAction(null);
  };

  const handleHireAgent = (newAgent: Agent) => {
    if (!onPlayerUpdate) return;

    const updatedPlayer = {
      ...player,
      agent: newAgent,
      agentContractLength: 3, // New 3 year contract
    };

    onPlayerUpdate(updatedPlayer);
    setShowAgentList(false);
  };

  const handleRenewAgentContract = () => {
    if (!onPlayerUpdate) return;

    const updatedPlayer = {
      ...player,
      agentContractLength: (player.agentContractLength || 0) + 3, // Extend by 3 years
    };

    onPlayerUpdate(updatedPlayer);
    setConfirmAction(null);
  };

  const agentContractYears = player.agentContractLength ?? 1;
  const isAgentContractExpiring = agentContractYears <= 1;

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
              <Icon name="UserCog" size={14} className="text-blue-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {t("dashboard.agentContract")}
              </span>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white p-1">
              <Icon name="X" size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[70vh] space-y-3">
          {/* Agent Info */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center border-2 border-blue-400/50">
                <Icon name="UserCog" size={24} className="text-blue-300" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-white">
                  {player.agent.name}
                </p>
                <p className={`text-sm font-semibold ${getReputationColor(player.agent.reputation)}`}>
                  {t(`agent.reputation.${player.agent.reputation}`)}
                </p>
              </div>
            </div>
          </div>

          {/* Agent Style */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={getStyleIcon(player.agent.style)} size={14} className="text-purple-400" />
              <span className="text-sm font-medium text-white">{t("agentModal.negotiationStyle")}</span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2.5">
              <p className="font-bold text-purple-300">
                {t(`agent.style.${player.agent.style}`)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t(`agentModal.styleDesc.${player.agent.style.replace(/\s+/g, "")}`)}
              </p>
            </div>
          </div>

          {/* Agent Contract */}
          <div className={`bg-slate-800/50 rounded-lg p-3 border ${isAgentContractExpiring ? "border-amber-500/50" : "border-slate-700"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Handshake" size={14} className="text-cyan-400" />
              <span className="text-sm font-medium text-white">{t("agentModal.agentContract")}</span>
              {isAgentContractExpiring && (
                <span className="ml-auto text-xs text-amber-400 animate-pulse">
                  <Icon name="TriangleAlert" size={12} className="mr-1" />
                  {t("agentModal.expiringSoon")}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-900/50 rounded-lg p-2.5">
                <span className="text-slate-400 text-sm">{t("agentModal.contractYears")}</span>
                <span className={`font-bold text-sm ${isAgentContractExpiring ? "text-amber-400" : "text-cyan-400"}`}>
                  {agentContractYears} {t("common.years")}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-900/50 rounded-lg p-2.5">
                <span className="text-slate-400 text-sm">{t("agentModal.commission")}</span>
                <span className="font-bold text-orange-400 text-sm">
                  {player.agent.feePercentage}%
                </span>
              </div>
            </div>

            {/* Agent Action Buttons */}
            {onPlayerUpdate && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => setConfirmAction("renew")}
                  className="bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Icon name="Signature" size={14} />
                  {t("agentModal.renewAgent")}
                </button>
                <button
                  onClick={() => setShowAgentList(true)}
                  className="bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Icon name="ArrowLeftRight" size={14} />
                  {t("agentModal.changeAgent")}
                </button>
              </div>
            )}
          </div>

          {/* Contract Details */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="FileText" size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-white">{t("agentModal.contractDetails")}</span>
            </div>

            {player.retired || player.team?.name === "Free Agent" ? (
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <Icon name="UserX" size={24} className="text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">{t("agentModal.noContract")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-900/50 rounded-lg p-2.5">
                  <span className="text-slate-400 text-sm">{t("agentModal.club")}</span>
                  <span className="font-bold text-white text-sm">{player.team.name}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 rounded-lg p-2.5">
                  <span className="text-slate-400 text-sm">{t("agentModal.duration")}</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {player.contractLength} {t("common.years")}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 rounded-lg p-2.5">
                  <span className="text-slate-400 text-sm">{t("agentModal.weeklySalary")}</span>
                  <span className="font-bold text-amber-400 text-sm">{formatSalary(player.wage)}/sem</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 rounded-lg p-2.5">
                  <span className="text-slate-400 text-sm">{t("agentModal.annualSalary")}</span>
                  <span className="font-bold text-amber-300 text-sm">{formatSalary(player.wage * 52)}/ano</span>
                </div>
              </div>
            )}
          </div>

          {/* Financial Overview */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="PiggyBank" size={14} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">{t("agentModal.finances")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">
                  {t("dashboard.balance")}
                </p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatMoney(player.bankBalance || 0)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">
                  {t("agentModal.marketValue")}
                </p>
                <p className="text-lg font-bold text-blue-400">
                  {formatMoney(player.marketValue || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Squad Status */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Users" size={14} className="text-violet-400" />
              <span className="text-sm font-medium text-white">{t("agentModal.squadStatus")}</span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2.5">
              <p className="font-bold text-violet-300">
                {t(`squadStatus.${player.squadStatus}`)}
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {confirmAction && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl p-4 max-w-xs w-full border border-slate-600">
              <h3 className="text-white font-bold mb-3 text-center">
                {confirmAction === "renew" ? t("agentModal.confirmRenew") : t("agentModal.confirmFire")}
              </h3>
              <p className="text-slate-300 text-sm text-center mb-4">
                {confirmAction === "renew"
                  ? t("agentModal.renewDesc", { name: player.agent.name })
                  : t("agentModal.fireDesc")
                }
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded-lg text-sm font-bold transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={confirmAction === "renew" ? handleRenewAgentContract : handleFireAgent}
                  className={`flex-1 ${confirmAction === "renew" ? "bg-cyan-600 hover:bg-cyan-500" : "bg-red-600 hover:bg-red-500"} text-white py-2 px-3 rounded-lg text-sm font-bold transition-colors`}
                >
                  {t("common.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agent Selection List */}
        {showAgentList && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl max-w-sm w-full border border-slate-600 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-slate-600">
                <h3 className="text-white font-bold">
                  {t("agentModal.selectAgent")}
                </h3>
                <button onClick={() => setShowAgentList(false)} className="text-slate-400 hover:text-white p-1">
                  <Icon name="X" size={14} />
                </button>
              </div>
              <div className="p-3 overflow-y-auto space-y-2">
                {getAvailableAgents().map((agent, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleHireAgent(agent)}
                    className="w-full bg-slate-700/50 hover:bg-slate-600 rounded-lg p-3 text-left transition-colors border border-slate-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center border border-blue-400/50">
                        <Icon name="UserCog" size={18} className="text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{agent.name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${getReputationColor(agent.reputation)}`}>
                            {t(`agent.reputation.${agent.reputation}`)}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-xs text-orange-400">{agent.feePercentage}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">{t(`agent.specialty.${agent.specialty}`)}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {getAvailableAgents().length === 0 && (
                  <p className="text-slate-400 text-center py-4 text-sm">
                    {t("agentModal.noAgentsAvailable")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentContractModal;
