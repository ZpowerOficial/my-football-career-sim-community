import React from "react";
import { useI18n } from "../contexts/I18nContext";
import { Icon } from "./ui/Icon";

interface PauseMenuProps {
  onResume: () => void;
  onNewCareer: () => void;
  onMainMenu: () => void;
  onShowLeaderboard: () => void;
  isFinished?: boolean;
}

const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onNewCareer,
  onMainMenu,
  onShowLeaderboard,
  isFinished = false,
}) => {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop - clicável para fechar */}
      <div className="absolute inset-0" onClick={onResume} />

      {/* Menu Card - seguindo o design do jogo */}
      <div className="relative z-10 w-[90%] max-w-sm bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white text-center flex items-center justify-center gap-2">
            <Icon
              name="CirclePause"
              size={20}
              variant="solid"
              className="text-slate-400"
            />
            {t("pauseMenu.title")}
          </h2>
        </div>

        {/* Menu Options */}
        <div className="p-4 space-y-2.5">
          {/* Continuar */}
          {!isFinished && (
            <button
              onClick={onResume}
              className="group w-full bg-gradient-to-r from-green-500 via-emerald-600 to-green-600 text-white font-bold py-3 px-5 rounded-xl text-sm hover:scale-[1.02] active:scale-[0.98] transform transition-all duration-200 shadow-lg flex items-center justify-center gap-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <Icon
                name="Play"
                size={16}
                variant="solid"
                className="relative z-10"
              />
              <span className="relative z-10">{t("pauseMenu.resume")}</span>
            </button>
          )}

          {/* Nova Carreira */}
          <button
            onClick={onNewCareer}
            className="group w-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white font-bold py-3 px-5 rounded-xl text-sm hover:scale-[1.02] active:scale-[0.98] transform transition-all duration-200 shadow-lg flex items-center justify-center gap-3 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            <Icon
              name="UserPlus"
              size={16}
              variant="solid"
              className="relative z-10"
            />
            <span className="relative z-10">{t("pauseMenu.newCareer")}</span>
          </button>

          {/* Leaderboard */}
          <button
            onClick={onShowLeaderboard}
            className="group w-full bg-slate-700/80 hover:bg-slate-600/90 active:bg-slate-800 backdrop-blur-sm transition-all duration-200 text-white font-bold py-3 px-5 rounded-xl text-sm flex items-center justify-center gap-3 shadow-lg border border-slate-600/50 hover:border-slate-500/70"
          >
            <Icon
              name="Trophy"
              size={16}
              variant="solid"
              className="text-amber-400 group-hover:scale-110 transition-transform"
            />
            <span>{t("pauseMenu.leaderboard")}</span>
          </button>

          {/* Voltar ao Menu Principal */}
          <button
            onClick={onMainMenu}
            className="w-full bg-slate-800/60 hover:bg-slate-700/70 text-slate-200 font-semibold py-3 px-5 rounded-xl text-sm transition-all border border-slate-700/50 hover:border-slate-600/70 flex items-center justify-center gap-3 backdrop-blur-sm"
          >
            <Icon
              name="House"
              size={16}
              variant="solid"
              className="text-slate-400"
            />
            <span>{t("pauseMenu.mainMenu")}</span>
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-4 pb-4">
          <p className="text-[10px] text-slate-500 text-center">
            {t("pauseMenu.tapOutside")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PauseMenu;
