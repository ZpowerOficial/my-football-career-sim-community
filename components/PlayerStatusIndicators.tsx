/**
 * PLAYER STATUS INDICATORS - v1.1.0
 * 
 * Exibe indicadores visuais baseados nas escolhas do jogador em eventos interativos.
 * Mostra status como: querendo transferência, treino intensivo, conflitos, etc.
 * 
 * v1.1.0: Banners com botão de fechar e duração de 1 temporada
 */

import React, { useState } from "react";
import type { Player } from "../types";
import { useI18n } from "../contexts/I18nContext";
import { Icon, type IconName } from "./ui/Icon";
import { getPlayerStatusIndicators } from "../services/eventConsequenceSystem";

interface PlayerStatusIndicatorsProps {
  player: Player;
  compact?: boolean;
  showAll?: boolean;
  maxItems?: number;
}

interface StatusBadgeProps {
  icon: IconName;
  label: string;
  severity: 'info' | 'warning' | 'positive' | 'negative';
  compact?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ icon, label, severity, compact }) => {
  const colorClasses = {
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    positive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    negative: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${colorClasses[severity]}`}
        title={label}
      >
        <Icon name={icon as IconName} size={10} />
        <span className="text-[10px] font-medium truncate max-w-[80px]">{label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClasses[severity]}`}>
      <Icon name={icon as IconName} size={14} />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

export const PlayerStatusIndicators: React.FC<PlayerStatusIndicatorsProps> = ({
  player,
  compact = false,
  showAll = false,
  maxItems = 3,
}) => {
  const { t } = useI18n();
  
  const indicators = getPlayerStatusIndicators(player);
  
  if (indicators.length === 0) {
    return null;
  }

  const displayIndicators = showAll ? indicators : indicators.slice(0, maxItems);
  const hiddenCount = indicators.length - displayIndicators.length;

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'gap-2'}`}>
      {displayIndicators.map((indicator, index) => (
        <StatusBadge
          key={`${indicator.type}-${index}`}
          icon={indicator.icon as IconName}
          label={t(indicator.labelKey)}
          severity={indicator.severity}
          compact={compact}
        />
      ))}
      {hiddenCount > 0 && (
        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
          <span className="text-[10px] font-medium">+{hiddenCount}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Component for showing a single prominent status (for headers/cards)
 */
export const PlayerPrimaryStatus: React.FC<{ player: Player }> = ({ player }) => {
  const { t } = useI18n();
  const indicators = getPlayerStatusIndicators(player);
  
  if (indicators.length === 0) {
    return null;
  }

  // Priority: transfer > conflict > training > others
  const priorityOrder = ['transfer', 'conflict', 'training', 'charity', 'controversy'];
  const sortedIndicators = [...indicators].sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.type);
    const bIndex = priorityOrder.indexOf(b.type);
    return aIndex - bIndex;
  });

  const primary = sortedIndicators[0];

  const colorClasses = {
    info: 'text-blue-400',
    warning: 'text-amber-400',
    positive: 'text-emerald-400',
    negative: 'text-red-400',
  };

  return (
    <div className={`flex items-center gap-1.5 ${colorClasses[primary.severity]}`}>
      <Icon name={primary.icon as IconName} size={12} />
      <span className="text-[10px] font-semibold uppercase tracking-wide">
        {t(primary.labelKey)}
      </span>
    </div>
  );
};

/**
 * Transfer status banner for club section
 * Shows only for 1 season after the request
 */
export const TransferStatusBanner: React.FC<{ player: Player; currentSeason?: number }> = ({ player, currentSeason }) => {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const flags = player.eventFlags;
  
  // Check if should show: must want transfer and be within 1 season of request
  const season = currentSeason ?? player.age - 16; // Approximate current season
  const requestSeason = flags?.transferRequestSeason ?? 0;
  const isWithinOneSeason = season - requestSeason <= 1;
  
  if (!flags?.wantsTransfer || !isWithinOneSeason || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg p-3 mb-3 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-amber-400/60 hover:text-amber-300 transition-colors"
        aria-label="Fechar"
      >
        <Icon name="X" size={14} />
      </button>
      <div className="flex items-center gap-2 pr-6">
        <Icon name="Airplane" size={16} className="text-amber-400" />
        <div>
          <p className="text-sm font-bold text-amber-300">
            {t("eventNotifications.transferRequest")}
          </p>
          {flags.transferRequestReason && (
            <p className="text-xs text-amber-400/80 mt-0.5">
              {flags.transferRequestReason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Training status indicator for training section
 * Resets each season (handled by trainingIntensity being reset)
 */
export const TrainingStatusBanner: React.FC<{ player: Player }> = ({ player }) => {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const flags = player.eventFlags;
  
  if (!flags || dismissed) {
    return null;
  }

  if (flags.extraTrainingActive || flags.trainingIntensity === 'intense') {
    return (
      <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-lg p-3 mb-3 relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-emerald-400/60 hover:text-emerald-300 transition-colors"
          aria-label="Fechar"
        >
          <Icon name="X" size={14} />
        </button>
        <div className="flex items-center gap-2 pr-6">
          <Icon name="Barbell" size={16} className="text-emerald-400" />
          <p className="text-sm font-bold text-emerald-300">
            {t("eventNotifications.trainingIntense")}
          </p>
        </div>
      </div>
    );
  }

  if (flags.trainingIntensity === 'light') {
    return (
      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-3 mb-3 relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-blue-400/60 hover:text-blue-300 transition-colors"
          aria-label="Fechar"
        >
          <Icon name="X" size={14} />
        </button>
        <div className="flex items-center gap-2 pr-6">
          <Icon name="Moon" size={16} className="text-blue-400" />
          <p className="text-sm font-bold text-blue-300">
            {t("eventNotifications.trainingLight")}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Conflict status indicator for team/squad section
 * Shows only for 1 season after the conflict
 * Only shows when explicitly set to true (not undefined or false)
 */
export const ConflictStatusBanner: React.FC<{ player: Player; currentSeason?: number }> = ({ player, currentSeason }) => {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const flags = player.eventFlags;
  
  // Early return if no flags, dismissed, or no explicit conflicts
  if (!flags || dismissed) {
    return null;
  }
  
  // Only show if conflicts are explicitly true (not undefined)
  const hasManagerConflict = flags.conflictWithManager === true;
  const hasTeammateConflict = flags.conflictWithTeammate === true;
  
  if (!hasManagerConflict && !hasTeammateConflict) {
    return null;
  }

  const conflicts = [];
  
  if (hasManagerConflict) {
    conflicts.push({
      icon: 'UserMinus' as IconName,
      label: t('status.managerConflict'),
    });
  }
  
  if (hasTeammateConflict) {
    conflicts.push({
      icon: 'Users' as IconName,
      label: t('status.teammateConflict'),
    });
  }

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg p-3 mb-3 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-red-400/60 hover:text-red-300 transition-colors"
        aria-label="Fechar"
      >
        <Icon name="X" size={14} />
      </button>
      <div className="flex items-center gap-2 pr-6">
        <Icon name="Warning" size={16} className="text-red-400" />
        <div>
          {conflicts.map((conflict, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Icon name={conflict.icon} size={12} className="text-red-300" />
              <p className="text-sm font-medium text-red-300">{conflict.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatusIndicators;
