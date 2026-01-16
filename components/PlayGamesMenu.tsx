import React, { useState, useEffect, useCallback } from "react";
import { PlayGamesService, LEADERBOARDS } from "../services/playGamesService";
import { useI18n } from "../contexts/I18nContext";
import { useSwipeToClose } from "../utils/useSwipeToClose";
import { Icon } from "./ui/Icon";

interface PlayGamesMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayGamesMenu: React.FC<PlayGamesMenuProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset, isDragging } =
    useSwipeToClose({
      onClose: handleClose,
      threshold: 80,
    });

  useEffect(() => {
    if (isOpen) {
      checkSignInStatus();
    }
  }, [isOpen]);

  const checkSignInStatus = async () => {
    const signedIn = PlayGamesService.isSignedIn();
    setIsSignedIn(signedIn);
    if (signedIn) {
      const info = PlayGamesService.getPlayerInfo();
      setPlayerName(info?.displayName || null);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const success = await PlayGamesService.signIn();
      setIsSignedIn(success);
      if (success) {
        const info = PlayGamesService.getPlayerInfo();
        setPlayerName(info?.displayName || null);
      }
    } catch (error) {
      console.error("Sign in failed:", error);
    }
    setIsLoading(false);
  };

  const handleShowLeaderboards = async () => {
    await PlayGamesService.showLeaderboards();
  };

  const handleShowAchievements = async () => {
    await PlayGamesService.showAchievements();
  };

  const handleTestLeaderboard = async () => {
    setIsLoading(true);
    try {
      // Envia uma pontuação de teste (ex: 1234 pontos)
      const score = 1234;
      const success = await PlayGamesService.submitScore(
        LEADERBOARDS.LEGACY_SCORE,
        score,
      );
      if (success) {
        alert(
          `Pontuação de teste (${score}) enviada com sucesso! Verifique o ranking em alguns minutos.`,
        );
      } else {
        alert("Falha ao enviar pontuação. Verifique se está logado.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar pontuação: " + JSON.stringify(error));
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  // Verifica se está disponível (só Android)
  if (!PlayGamesService.isAvailable()) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-overlay ${isClosing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div
          className={`bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl modal-content swipeable ${isClosing ? "modal-content-exit" : "modal-content-enter"} ${isDragging ? "modal-content-dragging" : dragOffset === 0 ? "" : "modal-content-returning"}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            transform:
              dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
            opacity:
              dragOffset > 0 ? Math.max(0.5, 1 - dragOffset / 200) : undefined,
          }}
        >
          <div className="swipe-indicator" />
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
              <Icon name="GooglePlay" size={32} className="text-slate-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {t("playGames.title")}
            </h2>
            <p className="text-slate-400 text-sm">
              {t("playGames.androidOnly")}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 modal-overlay ${isClosing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-black/50 modal-content swipeable ${isClosing ? "modal-content-exit" : "modal-content-enter"} ${isDragging ? "modal-content-dragging" : dragOffset === 0 ? "" : "modal-content-returning"}`}
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

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <Icon name="GooglePlay" size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">
            {t("playGames.title")}
          </h2>
          {isSignedIn && playerName && (
            <p className="text-emerald-400 text-sm flex items-center justify-center gap-2">
              <Icon name="CircleCheck" size={14} className="text-emerald-400" />
              {playerName}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {!isSignedIn ? (
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Icon name="Loader" size={16} className="animate-spin" />
                  {t("playGames.signingIn")}
                </>
              ) : (
                <>
                  <Icon name="Google" size={16} />
                  {t("playGames.signIn")}
                </>
              )}
            </button>
          ) : (
            <>
              {/* Leaderboards */}
              <button
                onClick={handleShowLeaderboards}
                className="w-full bg-amber-600/90 hover:bg-amber-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <Icon name="Trophy" size={18} variant="solid" />
                <span>{t("playGames.leaderboards")}</span>
              </button>

              {/* Achievements */}
              <button
                onClick={handleShowAchievements}
                className="w-full bg-purple-600/90 hover:bg-purple-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <Icon name="Medal" size={18} variant="solid" />
                <span>{t("playGames.achievements")}</span>
              </button>
            </>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-full mt-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-medium py-3 px-4 rounded-xl transition-colors border border-slate-600/30"
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
};

// Botão para abrir o menu Play Games
export const PlayGamesButton: React.FC<{ onClick: () => void }> = ({
  onClick,
}) => {
  const { t } = useI18n();

  // Só mostra se estiver no Android
  if (!PlayGamesService.isAvailable()) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="group w-full bg-slate-800/60 hover:bg-slate-700/70 text-slate-200 font-semibold py-3.5 px-6 rounded-xl text-sm transition-all border border-slate-700/50 hover:border-green-500/50 flex items-center justify-center gap-2.5 backdrop-blur-sm"
    >
      <Icon
        name="GooglePlay"
        size={18}
        className="text-green-400 group-hover:scale-110 transition-transform"
      />
      <span>{t("playGames.title")}</span>
    </button>
  );
};
