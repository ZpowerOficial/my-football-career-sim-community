import React, { useState } from "react";
import { Icon } from "./ui/Icon";
import { useI18n } from "../contexts/I18nContext";

export type SeasonFocus = "scoring" | "playmaking" | "titles" | "development" | "consistency";

interface SeasonFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (focus: SeasonFocus) => void;
  initialFocus?: SeasonFocus;
}

const OPTIONS: Array<{
  id: SeasonFocus;
  titleKey: string;
  descKey: string;
  icon: any;
}> = [
  { id: "scoring", titleKey: "seasonFocus.scoring.title", descKey: "seasonFocus.scoring.description", icon: "Target" },
  { id: "playmaking", titleKey: "seasonFocus.playmaking.title", descKey: "seasonFocus.playmaking.description", icon: "Share2" },
  { id: "titles", titleKey: "seasonFocus.titles.title", descKey: "seasonFocus.titles.description", icon: "Trophy" },
  { id: "development", titleKey: "seasonFocus.development.title", descKey: "seasonFocus.development.description", icon: "TrendingUp" },
  { id: "consistency", titleKey: "seasonFocus.consistency.title", descKey: "seasonFocus.consistency.description", icon: "Shield" },
];

const SeasonFocusModal: React.FC<SeasonFocusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialFocus = "scoring",
}) => {
  const { t } = useI18n();
  const [selected, setSelected] = useState<SeasonFocus>(initialFocus);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="w-full max-w-md sm:max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-700 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white">
              {t("seasonFocus.title")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              {t("seasonFocus.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition flex-shrink-0"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          {OPTIONS.map((opt) => {
            const active = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelected(opt.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  active
                    ? "border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-900/20"
                    : "border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      active ? "bg-blue-600/30 text-blue-400" : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    <Icon name={opt.icon} size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold text-sm sm:text-base ${active ? "text-blue-100" : "text-slate-100"}`}>
                      {t(opt.titleKey)}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                      {t(opt.descKey)}
                    </div>
                  </div>
                  {active && (
                    <div className="flex-shrink-0 text-blue-400">
                      <Icon name="CheckCircle" size={20} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-900/30"
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeasonFocusModal;
