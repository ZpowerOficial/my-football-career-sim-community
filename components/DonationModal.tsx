import React, { useState, useCallback } from "react";
import { useI18n } from "../contexts/I18nContext";
import { StripeService } from "../services/stripeService";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import { Icon } from "./ui/Icon";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // Match animation duration
  }, [onClose]);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset, isDragging } = useSwipeToClose({
    onClose: handleClose,
    threshold: 80,
  });

  const handleDonate = () => {
    StripeService.openPaymentLink();
    handleClose();
  };

  if (!isOpen) return null;

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

        {/* Header */}
        <div className="px-4 pb-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon name="Heart" size={16} variant="solid" className="text-amber-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {t("donation.title")}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed text-center">
            {t("donation.description")}
          </p>

          {/* Benefits */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-slate-300">
              <Icon name="Check" size={12} className="text-emerald-400" />
              <span>{t("donation.benefit1")}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-300">
              <Icon name="Check" size={12} className="text-emerald-400" />
              <span>{t("donation.benefit2")}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-300">
              <Icon name="Check" size={12} className="text-emerald-400" />
              <span>{t("donation.benefit3")}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-300">
              <Icon name="Check" size={12} className="text-emerald-400" />
              <span>{t("donation.benefit4")}</span>
            </div>
          </div>

          {/* Donate Button */}
          <button
            onClick={handleDonate}
            className="group w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm hover:scale-[1.02] active:scale-[0.98] transform transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            <Icon name="Heart" size={16} variant="solid" className="relative z-10" />
            <span className="relative z-10">{t("donation.donate")}</span>
          </button>

          {/* Cancel */}
          <button
            onClick={handleClose}
            className="w-full py-2 text-slate-600 hover:text-slate-400 transition-colors text-xs"
          >
            {t("donation.notNow")}
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700/50">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Icon name="Lock" size={10} />
            <span>{t("donation.securePayment")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
