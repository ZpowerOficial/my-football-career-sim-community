/**
 * UPDATE MODAL - v0.5.6
 * 
 * Modal amigável para avisar sobre atualizações disponíveis.
 * Não bloqueia o jogo - é apenas um aviso.
 */

import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { UpdateInfo, dismissUpdateForVersion, openPlayStore } from '../services/updateChecker';
import { Icon } from './ui/Icon';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

export default function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const { t } = useI18n();

  const handleUpdate = async () => {
    await openPlayStore();
    onClose();
  };

  const handleLater = () => {
    // Não dispensa permanentemente, só fecha o modal
    onClose();
  };

  const handleDismiss = () => {
    // Dispensa esta versão - não mostra mais para esta atualização
    dismissUpdateForVersion(updateInfo.latestVersion);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <Icon name="Download" size={20} className="text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {t('update.title')}
            </h2>
            <p className="text-gray-400 text-sm">
              v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-300">
            {t('update.description')}
          </p>

          {updateInfo.releaseNotes && (
            <div className="mt-4 bg-gray-900/50 rounded-lg p-3">
              <p className="text-sm text-gray-400 font-medium mb-1">
                {t('update.whatsNew')}
              </p>
              <p className="text-sm text-gray-300">{updateInfo.releaseNotes}</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleUpdate}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="Store" size={16} />
            {t('update.updateNow')}
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleLater}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
            >
              {t('update.later')}
            </button>

            <button
              onClick={handleDismiss}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
            >
              {t('update.dontShowAgain')}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-gray-500 text-xs mt-4">
          {t('update.note')}
        </p>
      </div>
    </div>
  );
}
