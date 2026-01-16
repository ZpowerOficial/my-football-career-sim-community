import React, { useState, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { Player } from "../types";
import {
  canTerminateContract,
  terminateContract,
} from "../services/contractTermination";
import { useSwipeToClose } from "../utils/useSwipeToClose";

interface ContractTerminationModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (player: Player) => void;
}

export const ContractTerminationModal: React.FC<
  ContractTerminationModalProps
> = ({ player, isOpen, onClose, onConfirm }) => {
  const { t } = useI18n();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isProcessing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose, isProcessing]);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset, isDragging } = useSwipeToClose({
    onClose: handleClose,
    threshold: 80,
    enabled: !isProcessing,
  });

  if (!isOpen) return null;

  const canTerminate = canTerminateContract(player);
  const handleTerminate = () => {
    if (!canTerminate) return;
    setIsProcessing(true);
    const terminationStatus = terminateContract(player);
    player.contractTermination = terminationStatus;
    const oldTeam = player.team;
    player.team = {
      id: "free-agent",
      name: "Free Agent",
      reputation: 0,
      leagueTier: 9,
      country: oldTeam.country,
      isYouth: false,
      squadStrength: undefined,
    };
    player.contractLength = 0;
    player.wage = 0;
    player.yearsAtClub = 0;
    onConfirm(player);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 modal-overlay ${isClosing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-gray-900 rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden border-2 border-red-700 modal-content swipeable ${isClosing ? "modal-content-exit" : "modal-content-enter"} ${isDragging ? "modal-content-dragging" : dragOffset === 0 ? "" : "modal-content-returning"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          opacity: dragOffset > 0 ? Math.max(0.5, 1 - dragOffset / 200) : undefined,
        }}
      >
        <div className="swipe-indicator" />

        <div className="px-6 py-8">
          <div className="bg-red-900/20 border-2 border-red-600 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-300 mb-3 flex items-center gap-2">
              <span>⚠️</span>
              {t("contractTermination.simpleConsequenceTitle")}
            </h3>
            <div className="flex items-start p-3 bg-red-950/30 rounded-lg">
              <p className="text-red-300 font-semibold">
                {t("contractTermination.simpleConsequenceDesc")}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex gap-3">
          {isProcessing ? (
            <div className="flex-1 text-center py-3">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <p className="text-gray-400 mt-2">
                {t("contractTermination.processing")}
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                {t("contractTermination.cancel")}
              </button>
              <button
                onClick={handleTerminate}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                ✅ {t("contractTermination.confirmButton")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractTerminationModal;
