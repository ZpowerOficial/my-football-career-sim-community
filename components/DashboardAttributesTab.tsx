import React from "react";
import { useI18n } from "../contexts/I18nContext";
import type { Player, PlayerStats } from "../types";
import { TRAINING_TYPES } from "../types/trainingTypes";
import { Icon, type IconName } from "./ui/Icon";

interface AttributesTabProps {
  player: Player;
}

const AttributeGroup: React.FC<{
  title: string;
  attributes: (keyof PlayerStats)[];
  stats: PlayerStats;
  player: Player;
  primaryTrainingStats?: string[];
  secondaryTrainingStats?: string[];
}> = ({ title, attributes, stats, player, primaryTrainingStats = [], secondaryTrainingStats = [] }) => {
  const getGroupColor = (groupTitle: string) => {
    switch (groupTitle) {
      case "Attacking":
        return "border-l-4 border-l-orange-500 bg-orange-500/5";
      case "Defending":
        return "border-l-4 border-l-blue-500 bg-blue-500/5";
      case "Physical":
        return "border-l-4 border-l-green-500 bg-green-500/5";
      case "Mental":
        return "border-l-4 border-l-purple-500 bg-purple-500/5";
      case "Goalkeeping":
        return "border-l-4 border-l-cyan-500 bg-cyan-500/5";
      default:
        return "border-l-4 border-l-gray-500 bg-gray-500/5";
    }
  };

  const getGroupIcon = (groupTitle: string): IconName => {
    switch (groupTitle) {
      case "Attacking":
        return "SoccerBall";
      case "Defending":
        return "ShieldHalf";
      case "Physical":
        return "Dumbbell";
      case "Mental":
        return "Brain";
      case "Goalkeeping":
        return "Hand";
      default:
        return "ChartNoAxesCombined";
    }
  };

  const { t } = useI18n();
  return (
    <div
      className={`bg-slate-800/80 p-3 sm:p-4 rounded-xl shadow-lg ${getGroupColor(title)} backdrop-blur-sm`}
    >
      <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white flex items-center gap-2">
        <Icon name={getGroupIcon(title)} size={14} className="text-gray-400" />
        {title}
      </h4>
      <div className="space-y-2.5 sm:space-y-3">
        {attributes.map((key) => {
          const value = stats[key];
          // Skip non-numeric attributes like preferredFoot
          if (typeof value !== "number") return null;
          const keyStr = key.toString();
          return (
            <AttributeBar
              key={key}
              label={keyStr}
              value={value}
              position={player.position}
              t={t}
              isPrimaryTraining={primaryTrainingStats.includes(keyStr)}
              isSecondaryTraining={secondaryTrainingStats.includes(keyStr)}
            />
          );
        })}
      </div>
    </div>
  );
};

const AttributeBar: React.FC<{
  label: string;
  value: number;
  position: string;
  t: (key: string) => string;
  isPrimaryTraining?: boolean;
  isSecondaryTraining?: boolean;
}> = ({ label, value, position, t, isPrimaryTraining = false, isSecondaryTraining = false }) => {
  const getStatColor = (val: number) => {
    if (val >= 90) return "bg-gradient-to-r from-green-500 to-emerald-500";
    if (val >= 80) return "bg-gradient-to-r from-emerald-500 to-teal-500";
    if (val >= 70) return "bg-gradient-to-r from-blue-500 to-cyan-500";
    if (val >= 60) return "bg-gradient-to-r from-yellow-500 to-amber-500";
    if (val >= 50) return "bg-gradient-to-r from-orange-500 to-red-500";
    return "bg-gradient-to-r from-red-600 to-rose-600";
  };

  const getTextColor = (val: number) => {
    if (val >= 80) return "text-green-400";
    if (val >= 70) return "text-blue-400";
    if (val >= 60) return "text-yellow-400";
    if (val >= 50) return "text-orange-400";
    return "text-red-400";
  };

  const formatLabel = (label: string): string => {
    const labelMap: { [key: string]: string } = {
      shooting: t("attributes.shooting"),
      passing: t("attributes.passing"),
      dribbling: t("attributes.dribbling"),
      crossing: t("attributes.crossing"),
      longShots: t("attributes.longShots"),
      curve: t("attributes.curve"),
      defending: t("attributes.defending"),
      interceptions: t("attributes.interceptions"),
      aggression: t("attributes.aggression"),
      jumping: t("attributes.jumping"),
      pace: t("attributes.pace"),
      physical: t("attributes.physical"),
      stamina: t("attributes.stamina"),
      strength: t("attributes.strength"),
      agility: t("attributes.agility"),
      vision: t("attributes.vision"),
      composure: t("attributes.composure"),
      flair: "Flair",
      leadership: "Leadership",
      workRate: "Work Rate",
      positioning: t("attributes.positioning"),
      handling: t("attributes.gkHandling"),
      reflexes: t("attributes.gkReflexes"),
      diving: t("attributes.gkDiving"),
    };
    return labelMap[label] || label.charAt(0).toUpperCase() + label.slice(1);
  };

  const isKeyAttribute = (attr: string, pos: string): boolean => {
    const keyAttributes: { [key: string]: string[] } = {
      ST: ["shooting", "pace", "physical", "positioning"],
      CF: ["shooting", "passing", "dribbling", "positioning"],
      LW: ["dribbling", "pace", "crossing", "flair"],
      RW: ["dribbling", "pace", "crossing", "flair"],
      CAM: ["vision", "passing", "dribbling", "shooting"],
      CM: ["passing", "vision", "workRate", "stamina"],
      LM: ["crossing", "pace", "stamina", "dribbling"],
      RM: ["crossing", "pace", "stamina", "dribbling"],
      CDM: ["defending", "interceptions", "workRate", "stamina"],
      CB: ["defending", "strength", "jumping", "composure"],
      LB: ["crossing", "defending", "stamina", "pace"],
      RB: ["crossing", "defending", "stamina", "pace"],
      LWB: ["crossing", "stamina", "pace", "defending"],
      RWB: ["crossing", "stamina", "pace", "defending"],
      GK: ["handling", "reflexes", "diving", "positioning"],
    };
    return keyAttributes[pos]?.includes(attr) || false;
  };

  const isKey = isKeyAttribute(label, position);
  const isTraining = isPrimaryTraining || isSecondaryTraining;

  return (
    <div
      className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 ${isKey ? "bg-slate-700/60 ring-1 ring-white/10" : "bg-slate-900/40"
        } ${isTraining ? "ring-1 ring-lime-500/40" : ""}`}
    >
      <div className="flex justify-between items-center mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5">
          {isKey && (
            <Icon name="Star" size={11} variant="solid" className="text-yellow-400" />
          )}
          {isPrimaryTraining && (
            <Icon name="ArrowUp" size={11} className="text-lime-400 animate-pulse" />
          )}
          {isSecondaryTraining && !isPrimaryTraining && (
            <Icon name="ArrowUp" size={11} className="text-cyan-400 opacity-70" />
          )}
          <p
            className={`text-xs sm:text-sm ${isPrimaryTraining ? "text-lime-300 font-semibold" : isSecondaryTraining ? "text-cyan-300" : isKey ? "text-white font-semibold" : "text-slate-300"
              }`}
          >
            {formatLabel(label)}
          </p>
        </div>
        <p className={`font-bold text-sm sm:text-base ${getTextColor(value)}`}>
          {value}
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-slate-700/50 rounded-full h-2 sm:h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getStatColor(value)} shadow-lg`}
          style={{
            width: `${Math.min(value, 100)}%`,
            boxShadow: `0 0 8px ${value >= 80 ? "rgba(34, 197, 94, 0.5)" : "transparent"}`,
          }}
        ></div>
      </div>
    </div>
  );
};

const AttributesTab: React.FC<AttributesTabProps> = ({ player }) => {
  const { t } = useI18n();

  // Get active training stats
  const activeTrainingType = player.activeTrainingFocus
    ? TRAINING_TYPES.find(tt => tt.id === player.activeTrainingFocus)
    : null;
  const primaryTrainingStats = activeTrainingType?.primaryBoost || [];
  const secondaryTrainingStats = activeTrainingType?.secondaryBoost || [];

  const getOrganizedAttributes = (
    position: string,
  ): {
    goalkeeping?: (keyof PlayerStats)[];
    attacking?: (keyof PlayerStats)[];
    defending?: (keyof PlayerStats)[];
    physical?: (keyof PlayerStats)[];
    mental?: (keyof PlayerStats)[];
  } => {
    const attacking: (keyof PlayerStats)[] = [
      "shooting",
      "passing",
      "dribbling",
      "crossing",
      "longShots",
      "curve",
    ];
    const defending: (keyof PlayerStats)[] = [
      "defending",
      "interceptions",
      "aggression",
      "jumping",
    ];
    const physical: (keyof PlayerStats)[] = [
      "pace",
      "physical",
      "stamina",
      "strength",
      "agility",
    ];
    const mental: (keyof PlayerStats)[] = [
      "vision",
      "composure",
      "flair",
      "leadership",
      "workRate",
      "positioning",
    ];
    const gk: (keyof PlayerStats)[] = ["handling", "reflexes", "diving"];

    if (position === "GK") return { goalkeeping: gk };

    // Atacantes - priorizar ofensiva
    if (["ST", "CF", "LW", "RW"].includes(position)) {
      return {
        attacking: attacking,
        physical: physical,
        mental: mental,
        defending: defending,
      };
    }

    // Meio-campistas - balanceado
    if (["CAM", "CM", "CDM", "LM", "RM"].includes(position)) {
      return {
        attacking: attacking,
        defending: defending,
        physical: physical,
        mental: mental,
      };
    }

    // Defensores
    return {
      defending: defending,
      physical: physical,
      mental: mental,
      attacking: attacking,
    };
  };

  const organizedAttributes = getOrganizedAttributes(player.position);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Footedness moved to ProfileTab only - removed duplicate from here */}

      {player.position === "GK" ? (
        <AttributeGroup
          title="Goalkeeping"
          attributes={organizedAttributes.goalkeeping || []}
          stats={player.stats}
          player={player}
          primaryTrainingStats={primaryTrainingStats}
          secondaryTrainingStats={secondaryTrainingStats}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {Object.entries(organizedAttributes).map(
            ([groupName, attributes]) => (
              <AttributeGroup
                key={groupName}
                title={groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                attributes={attributes}
                stats={player.stats}
                player={player}
                primaryTrainingStats={primaryTrainingStats}
                secondaryTrainingStats={secondaryTrainingStats}
              />
            ),
          )}
        </div>
      )}

      {/* Legenda */}
      <div className="bg-slate-800/60 p-3 sm:p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
        <h4 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2 sm:mb-3 flex items-center gap-2">
          <Icon name="Info" size={14} className="text-slate-400" />
          {t('attributes.legend')}
        </h4>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Icon name="Star" size={12} variant="solid" className="text-yellow-400" />
            <span className="text-slate-300">{t('attributes.keyAttribute')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            <span className="text-slate-300">{t('attributes.ratingColors')}</span>
          </div>
          {activeTrainingType && (
            <>
              <div className="flex items-center gap-2">
                <Icon name="ArrowUp" size={12} className="text-lime-400 animate-pulse" />
                <span className="text-slate-300">{t('training.primaryFocus')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="ArrowUp" size={12} className="text-cyan-400 opacity-70" />
                <span className="text-slate-300">{t('training.secondaryFocus')}</span>
              </div>
            </>
          )}
        </div>

        {/* Rating scale */}
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="grid grid-cols-5 gap-1 sm:gap-2 text-[10px] sm:text-xs text-center">
            <div>
              <div className="w-full h-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded mb-1"></div>
              <span className="text-green-400 font-semibold">90+</span>
            </div>
            <div>
              <div className="w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded mb-1"></div>
              <span className="text-blue-400 font-semibold">80-89</span>
            </div>
            <div>
              <div className="w-full h-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded mb-1"></div>
              <span className="text-yellow-400 font-semibold">70-79</span>
            </div>
            <div>
              <div className="w-full h-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded mb-1"></div>
              <span className="text-orange-400 font-semibold">60-69</span>
            </div>
            <div>
              <div className="w-full h-1.5 bg-gradient-to-r from-red-600 to-rose-600 rounded mb-1"></div>
              <span className="text-red-400 font-semibold">&lt;60</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttributesTab;
