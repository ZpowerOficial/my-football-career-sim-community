/**
 * EXPANDED PLAYER PROFILE VIEW - v0.5.2
 *
 * Componente profissional para exibir TODOS os dados ultra-detalhados do jogador.
 * Organizado em abas para melhor navegação:
 * - Perfil: Dados biométricos, estilo de jogo, posições
 * - Técnico: 600+ atributos técnicos detalhados
 * - Físico: Atributos físicos granulares
 * - Mental: Inteligência, personalidade, performance
 * - Defensivo: Marcação, pressão, desarme
 * - Goleiro: Atributos específicos de GK (se aplicável)
 * - Ultra Nerd: Estatísticas avançadas de temporada
 */

import React, { useState, useRef, useEffect } from "react";
import type { Player, ExtendedMatchStats } from "../types";
import type {
  ExpandedPlayerData,
  TechnicalAttributes,
  PhysicalAttributes,
  MentalAttributes,
  DefensiveAttributes,
  GoalkeeperAttributes,
} from "../types/expandedPlayerTypes";
import { useI18n } from "../contexts/I18nContext";
import { Icon, type IconName } from "./ui/Icon";
import { StarRating as StarRatingComponent } from "./ui/StarRating";

interface ExpandedPlayerProfileProps {
  player: Player;
  careerStats?: ExtendedMatchStats;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

// ============================================================================
// CONSTANTES DE DESIGN
// ============================================================================

const TABS: { id: string; icon: IconName; labelKey: string }[] = [
  { id: "profile", icon: "IdCard", labelKey: "profile.tabPhysical" },
  { id: "technical", icon: "CircleDot", labelKey: "profile.tabTechnical" },
  { id: "physical", icon: "Dumbbell", labelKey: "profile.tabPhysicalAttr" },
  { id: "mental", icon: "Brain", labelKey: "profile.tabMental" },
  {
    id: "defensive",
    icon: "Shield",
    labelKey: "profile.tabDefensive",
  },
  { id: "goalkeeper", icon: "Hand", labelKey: "profile.tabGoalkeeper" },
  { id: "ultraNerd", icon: "TrendingUp", labelKey: "profile.tabUltraNerd" },
];

type TabId = (typeof TABS)[number]["id"];

// ============================================================================
// FUNÇÕES DE TRADUÇÃO DE ENUMS
// ============================================================================

const getBodyTypeTranslation = (
  bodyType: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Lean: t("profile.bodyType.lean"),
    Average: t("profile.bodyType.average"),
    Stocky: t("profile.bodyType.stocky"),
    Muscular: t("profile.bodyType.muscular"),
    Tall: t("profile.bodyType.tall"),
  };
  return map[bodyType] || bodyType;
};

const getRunningStyleTranslation = (
  style: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Explosive: t("profile.runningStyle.explosive"),
    Steady: t("profile.runningStyle.steady"),
    Endurance: t("profile.runningStyle.endurance"),
  };
  return map[style] || style;
};

const getPlayingStyleTranslation = (
  style: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Poacher: t("profile.style.poacher"),
    "Target Man": t("profile.style.targetMan"),
    "Deep-Lying Forward": t("profile.style.deepLyingForward"),
    "Complete Forward": t("profile.style.completeForward"),
    "Advanced Forward": t("profile.style.advancedForward"),
    "False 9": t("profile.style.false9"),
    "Inside Forward": t("profile.style.insideForward"),
    Trequartista: t("profile.style.trequartista"),
    "Inverted Winger": t("profile.style.invertedWinger"),
    "Traditional Winger": t("profile.style.traditionalWinger"),
    "Wide Playmaker": t("profile.style.widePlaymaker"),
    Raumdeuter: t("profile.style.raumdeuter"),
    "Advanced Playmaker": t("profile.style.advancedPlaymaker"),
    "Deep-Lying Playmaker": t("profile.style.deepLyingPlaymaker"),
    "Box-to-Box": t("profile.style.boxToBox"),
    "Ball-Winning Midfielder": t("profile.style.ballWinningMidfielder"),
    Mezzala: t("profile.style.mezzala"),
    Regista: t("profile.style.regista"),
    Carrilero: t("profile.style.carrilero"),
    "Ball-Playing Defender": t("profile.style.ballPlayingDefender"),
    Stopper: t("profile.style.stopper"),
    Sweeper: t("profile.style.sweeper"),
    "No-Nonsense Defender": t("profile.style.noNonsenseDefender"),
    "Complete Wing-Back": t("profile.style.completeWingBack"),
    "Inverted Wing-Back": t("profile.style.invertedWingBack"),
    "Defensive Full-Back": t("profile.style.defensiveFullBack"),
    "Sweeper Keeper": t("profile.style.sweeperKeeper"),
    "Traditional Keeper": t("profile.style.traditionalKeeper"),
    "Ball-Playing Keeper": t("profile.style.ballPlayingKeeper"),
  };
  return map[style] || style;
};

const getTacticalTendencyTranslation = (
  tendency: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    "Drops Deep": t("profile.tendency.dropsDeep"),
    "Attacks Depth": t("profile.tendency.attacksDepth"),
    "Floats Between Lines": t("profile.tendency.floatsBetweenLines"),
    "Hugs Touchline": t("profile.tendency.hugsTouchline"),
    "Cuts Inside": t("profile.tendency.cutsInside"),
    "Roams From Position": t("profile.tendency.roamsFromPosition"),
    "Stays Central": t("profile.tendency.staysCentral"),
    "Makes Overlapping Runs": t("profile.tendency.makesOverlappingRuns"),
    "Makes Underlapping Runs": t("profile.tendency.makesUnderlappingRuns"),
  };
  return map[tendency] || tendency;
};

const getRiskTendencyTranslation = (
  risk: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Risky: t("profile.risk.risky"),
    Conservative: t("profile.risk.conservative"),
    Balanced: t("profile.risk.balanced"),
  };
  return map[risk] || risk;
};

// ============================================================================
// SUB-COMPONENTES REUTILIZÁVEIS
// ============================================================================

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

const SectionCard: React.FC<{
  title: string;
  icon: IconName;
  colorClass?: string;
  children: React.ReactNode;
}> = ({ title, icon, colorClass = "border-l-slate-500", children }) => (
  <div
    className={`bg-slate-800/80 p-3 sm:p-4 rounded-xl shadow-lg border-l-4 ${colorClass} backdrop-blur-sm`}
  >
    <h4 className="text-sm sm:text-base font-bold mb-3 text-white flex items-center gap-2">
      <Icon name={icon} size={14} className="text-slate-400" />
      {title}
    </h4>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const AttributeBar: React.FC<{
  label: string;
  value: number;
  isKey?: boolean;
}> = ({ label, value, isKey }) => (
  <div
    className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
      isKey ? "bg-slate-700/60 ring-1 ring-white/10" : "bg-slate-900/40"
    }`}
  >
    <div className="flex justify-between items-center mb-1">
      <div className="flex items-center gap-1">
        {isKey && (
          <Icon
            name="Star"
            size={10}
            className="text-yellow-400"
            variant="solid"
          />
        )}
        <p
          className={`text-[10px] sm:text-xs ${isKey ? "text-white font-semibold" : "text-slate-300"}`}
        >
          {label}
        </p>
      </div>
      <p className={`font-bold text-xs sm:text-sm ${getTextColor(value)}`}>
        {value}
      </p>
    </div>
    <div className="w-full bg-slate-700/50 rounded-full h-1.5 sm:h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${getStatColor(value)} shadow-lg`}
        style={{
          width: `${Math.min(value, 100)}%`,
          boxShadow: `0 0 6px ${value >= 80 ? "rgba(34, 197, 94, 0.4)" : "transparent"}`,
        }}
      />
    </div>
  </div>
);

const StatRow: React.FC<{
  label: string;
  value: string | number;
  suffix?: string;
  valueColor?: string;
}> = ({ label, value, suffix, valueColor }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30 last:border-b-0">
    <span className="text-[10px] sm:text-xs text-slate-300">{label}</span>
    <span
      className={`text-xs sm:text-sm font-bold ${valueColor || "text-white"}`}
    >
      {value}
      {suffix && (
        <span className="text-slate-500 ml-0.5 text-[10px]">{suffix}</span>
      )}
    </span>
  </div>
);

const StatNumber: React.FC<{
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  highlight?: boolean;
}> = ({ label, value, decimals = 0, suffix, highlight }) => (
  <div
    className={`p-2 rounded-lg ${highlight ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-slate-900/40"}`}
  >
    <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
    <p
      className={`text-sm sm:text-base font-bold ${highlight ? "text-emerald-400" : "text-white"}`}
    >
      {decimals > 0 ? value.toFixed(decimals) : value}
      {suffix && (
        <span className="text-slate-500 text-xs ml-0.5">{suffix}</span>
      )}
    </p>
  </div>
);

// Use the shared StarRating component with weak foot styling
const StarRating: React.FC<{ value: number; max?: number }> = ({
  value,
  max = 5,
}) => (
  <StarRatingComponent
    rating={value}
    maxStars={max}
    size={12}
    filledColor="text-yellow-400"
    emptyColor="text-slate-600"
  />
);

const PositionBadge: React.FC<{
  position: string;
  proficiency: number;
  isNatural: boolean;
}> = ({ position, proficiency, isNatural }) => {
  const getColor = (prof: number) => {
    if (prof >= 85)
      return "bg-emerald-500/20 border-emerald-500 text-emerald-400";
    if (prof >= 70) return "bg-blue-500/20 border-blue-500 text-blue-400";
    if (prof >= 55) return "bg-yellow-500/20 border-yellow-500 text-yellow-400";
    return "bg-orange-500/20 border-orange-500 text-orange-400";
  };

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg border ${getColor(proficiency)}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-xs">{position}</span>
        {isNatural && (
          <span className="text-[8px] bg-emerald-500/30 text-emerald-400 px-1 py-0.5 rounded font-medium">
            NAT
          </span>
        )}
      </div>
      <span className="font-bold text-xs">{proficiency}</span>
    </div>
  );
};

// ============================================================================
// COMPONENTES DE ABAS
// ============================================================================

const ProfileTab: React.FC<{
  data: ExpandedPlayerData;
  player: Player;
  t: (key: string) => string;
}> = ({ data, player, t }) => {
  const profile = data.physicalProfile;
  const style = data.playingStyle;
  const stats = player.stats;

  // Usa dados do player.stats como fonte primária (mais confiável)
  const preferredFoot = stats.preferredFoot || profile.preferredFoot || "Right";
  const weakFootValue = stats.weakFoot ?? profile.weakFootLevel ?? 3;
  const leftFinishing = stats.leftFootFinishing ?? stats.shooting ?? 50;
  const rightFinishing = stats.rightFootFinishing ?? stats.shooting ?? 50;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Perfil Físico */}
      <SectionCard
        title={t("profile.physicalProfile")}
        icon="Ruler"
        colorClass="border-l-blue-500"
      >
        <StatRow
          label={t("profile.height")}
          value={profile.height}
          suffix="cm"
        />
        <StatRow
          label={t("profile.weight")}
          value={profile.weight}
          suffix="kg"
        />
        <StatRow
          label={t("profile.bodyTypeLabel")}
          value={getBodyTypeTranslation(profile.bodyType, t)}
        />
        <StatRow
          label={t("profile.runningStyleLabel")}
          value={getRunningStyleTranslation(profile.runningStyle, t)}
        />
      </SectionCard>

      {/* Dominância de Pés - Layout igual ao DashboardAttributesTab */}
      <SectionCard
        title={t("attributes.footedness")}
        icon="Footprints"
        colorClass="border-l-amber-500"
      >
        <div className="grid grid-cols-2 gap-2 mb-2">
          {/* Pé Preferido */}
          <div className="bg-slate-900/40 p-2 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="Footprints" size={10} className="text-slate-400" />
              <p className="text-[10px] sm:text-xs text-slate-300">
                {t("attributes.preferredFoot")}
              </p>
            </div>
            <p className="text-sm sm:text-base font-bold text-white">
              {t(`attributes.foot.${preferredFoot.toLowerCase()}`)}
            </p>
          </div>

          {/* Pé Fraco */}
          <div className="bg-slate-900/40 p-2 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon
                name="Star"
                size={10}
                className="text-slate-400"
                variant="solid"
              />
              <p className="text-[10px] sm:text-xs text-slate-300">
                {t("attributes.weakFoot")}
              </p>
            </div>
            <StarRating value={weakFootValue} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Finalização Pé Esquerdo */}
          <div className="bg-slate-900/40 p-2 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="Footprints" size={10} className="text-blue-400" />
              <p className="text-[10px] sm:text-xs text-slate-300">
                {t("attributes.leftFinishing")}
              </p>
            </div>
            <p className="text-sm sm:text-base font-bold text-blue-400">
              {leftFinishing}
            </p>
          </div>

          {/* Finalização Pé Direito */}
          <div className="bg-slate-900/40 p-2 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="Footprints" size={10} className="text-emerald-400" />
              <p className="text-[10px] sm:text-xs text-slate-300">
                {t("attributes.rightFinishing")}
              </p>
            </div>
            <p className="text-sm sm:text-base font-bold text-emerald-400">
              {rightFinishing}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Estilo de Jogo */}
      <SectionCard
        title={t("profile.playingStyle")}
        icon="Gamepad2"
        colorClass="border-l-purple-500"
      >
        <StatRow
          label={t("profile.primaryStyle")}
          value={getPlayingStyleTranslation(style.primaryStyle, t)}
          valueColor="text-emerald-400"
        />
        {style.secondaryStyle && (
          <StatRow
            label={t("profile.secondaryStyle")}
            value={getPlayingStyleTranslation(style.secondaryStyle, t)}
          />
        )}
        <StatRow
          label={t("profile.riskTendency")}
          value={getRiskTendencyTranslation(style.riskTendency, t)}
          valueColor={
            style.riskTendency === "Risky"
              ? "text-red-400"
              : style.riskTendency === "Conservative"
                ? "text-blue-400"
                : "text-yellow-400"
          }
        />
        <div className="flex justify-between items-center py-1.5">
          <span className="text-[10px] sm:text-xs text-slate-300">
            {t("profile.mediaStar")}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-12 bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                style={{ width: `${style.mediaStarLevel}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">
              {style.mediaStarLevel}%
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Tendências Táticas */}
      <SectionCard
        title={t("profile.tacticalTendencies")}
        icon="Settings2"
        colorClass="border-l-green-500"
      >
        {style.tacticalTendencies.length > 0 ? (
          <div className="space-y-1">
            {style.tacticalTendencies.map((tendency, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 py-1 px-1.5 bg-slate-900/40 rounded"
              >
                <Icon
                  name="ChevronRight"
                  size={10}
                  className="text-emerald-400"
                />
                <span className="text-xs text-white">
                  {getTacticalTendencyTranslation(tendency, t)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-xs text-center py-2">
            {t("profile.noTendencies")}
          </p>
        )}
      </SectionCard>

      {/* Posições - Full Width */}
      <div className="md:col-span-2">
        <SectionCard
          title={t("profile.alternatePositions")}
          icon="MapPin"
          colorClass="border-l-cyan-500"
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/30">
            <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 px-2 py-1 rounded">
              <span className="font-bold text-sm">
                {profile.primaryPosition}
              </span>
            </div>
            <span className="text-slate-400 text-xs">
              {t("profile.mainPosition")}
            </span>
          </div>

          {profile.secondaryPositions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
              {profile.secondaryPositions.map((pos, i) => (
                <PositionBadge
                  key={i}
                  position={pos.position}
                  proficiency={pos.proficiency}
                  isNatural={pos.isNatural}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-xs text-center py-2">
              {t("profile.noSecondaryPositions")}
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

const TechnicalTab: React.FC<{
  data: TechnicalAttributes;
  t: (key: string) => string;
}> = ({ data, t }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {/* Finalização */}
    <SectionCard
      title={t("profile.finishing")}
      icon="Crosshair"
      colorClass="border-l-red-500"
    >
      <AttributeBar
        label={t("profile.finishingInsideBox")}
        value={data.finishing.finishingInsideBox}
        isKey
      />
      <AttributeBar
        label={t("profile.finishingOutsideBox")}
        value={data.finishing.finishingOutsideBox}
      />
      <AttributeBar
        label={t("profile.finishingOnCounter")}
        value={data.finishing.finishingOnCounter}
      />
      <AttributeBar
        label={t("profile.finishingUnderPressure")}
        value={data.finishing.finishingUnderPressure}
      />
      <AttributeBar
        label={t("profile.oneOnOne")}
        value={data.finishing.oneOnOneFinishing}
      />
      <AttributeBar
        label={t("profile.shotPower")}
        value={data.finishing.shotPower}
      />
      <AttributeBar
        label={t("profile.headingAccuracy")}
        value={data.finishing.headingAccuracy}
      />
      <AttributeBar
        label={t("profile.volleys")}
        value={data.finishing.volleysAndAcrobatic}
      />
    </SectionCard>

    {/* Controle de Bola */}
    <SectionCard
      title={t("profile.ballControl")}
      icon="Hand"
      colorClass="border-l-orange-500"
    >
      <AttributeBar
        label={t("profile.firstTouch")}
        value={data.ballControl.firstTouchOrientated}
        isKey
      />
      <AttributeBar
        label={t("profile.underPressure")}
        value={data.ballControl.firstTouchUnderPressure}
      />
      <AttributeBar
        label={t("profile.aerialControl")}
        value={data.ballControl.aerialControl}
      />
      <AttributeBar
        label={t("profile.trapping")}
        value={data.ballControl.trapping}
      />
      <AttributeBar
        label={t("profile.shielding")}
        value={data.ballControl.shielding}
      />
    </SectionCard>

    {/* Drible */}
    <SectionCard
      title={t("profile.dribbling")}
      icon="PersonStanding"
      colorClass="border-l-amber-500"
    >
      <AttributeBar
        label={t("profile.closeControl")}
        value={data.dribbling.closeControlDribbling}
        isKey
      />
      <AttributeBar
        label={t("profile.speedDribbling")}
        value={data.dribbling.speedDribbling}
      />
      <AttributeBar
        label={t("profile.congestedSpace")}
        value={data.dribbling.congestedSpaceDribbling}
      />
      <AttributeBar
        label={t("profile.directionChange")}
        value={data.dribbling.directionChange}
      />
      <AttributeBar
        label={t("profile.skillMoves")}
        value={data.dribbling.skillMoves}
      />
    </SectionCard>

    {/* Passes */}
    <SectionCard
      title={t("profile.passing")}
      icon="Workflow"
      colorClass="border-l-yellow-500"
    >
      <AttributeBar
        label={t("profile.shortPassing")}
        value={data.passing.shortPassingSupport}
        isKey
      />
      <AttributeBar
        label={t("profile.verticalPass")}
        value={data.passing.verticalPassBreakingLines}
      />
      <AttributeBar
        label={t("profile.longDiagonal")}
        value={data.passing.longDiagonalPass}
      />
      <AttributeBar
        label={t("profile.throughBalls")}
        value={data.passing.throughBalls}
      />
      <AttributeBar
        label={t("profile.crossing")}
        value={data.passing.crossingFromByline}
      />
      <AttributeBar
        label={t("profile.crossingDeep")}
        value={data.passing.crossingFromDeep}
      />
      <AttributeBar
        label={t("profile.curve")}
        value={data.passing.curveEffect}
      />
    </SectionCard>

    {/* Bolas Paradas */}
    <SectionCard
      title={t("profile.setPieces")}
      icon="Target"
      colorClass="border-l-lime-500"
    >
      <AttributeBar
        label={t("profile.freeKickPower")}
        value={data.setPieces.directFreeKickPower}
      />
      <AttributeBar
        label={t("profile.freeKickPlacement")}
        value={data.setPieces.directFreeKickPlacement}
        isKey
      />
      <AttributeBar
        label={t("profile.indirectFK")}
        value={data.setPieces.indirectFreeKick}
      />
      <AttributeBar
        label={t("profile.corners")}
        value={data.setPieces.cornerKicking}
      />
      <AttributeBar
        label={t("profile.penalties")}
        value={data.setPieces.penaltyTaking}
      />
      <AttributeBar
        label={t("profile.throwIns")}
        value={data.setPieces.throwIns}
      />
    </SectionCard>
  </div>
);

const PhysicalTab: React.FC<{
  data: PhysicalAttributes;
  t: (key: string) => string;
}> = ({ data, t }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {/* Velocidade */}
    <SectionCard
      title={t("profile.speed")}
      icon="Zap"
      colorClass="border-l-cyan-500"
    >
      <AttributeBar
        label={t("profile.topSpeed")}
        value={data.speed.topSpeed}
        isKey
      />
      <AttributeBar
        label={t("profile.accelerationInitial")}
        value={data.speed.accelerationInitial}
      />
      <AttributeBar
        label={t("profile.accelerationMedium")}
        value={data.speed.accelerationMedium}
      />
      <AttributeBar
        label={t("profile.sprintSpeed")}
        value={data.speed.sprintSpeed}
      />
    </SectionCard>

    {/* Resistência */}
    <SectionCard
      title={t("profile.endurance")}
      icon="HeartPulse"
      colorClass="border-l-teal-500"
    >
      <AttributeBar
        label={t("profile.aerobic")}
        value={data.endurance.aerobicEndurance}
      />
      <AttributeBar
        label={t("profile.anaerobic")}
        value={data.endurance.anaerobicEndurance}
      />
      <AttributeBar
        label={t("profile.stamina")}
        value={data.endurance.stamina}
        isKey
      />
      <AttributeBar
        label={t("profile.workRate")}
        value={data.endurance.workRate}
      />
    </SectionCard>

    {/* Força */}
    <SectionCard
      title={t("profile.strength")}
      icon="Dumbbell"
      colorClass="border-l-emerald-500"
    >
      <AttributeBar
        label={t("profile.upperBody")}
        value={data.strength.upperBodyStrength}
      />
      <AttributeBar
        label={t("profile.legStrength")}
        value={data.strength.legStrength}
      />
      <AttributeBar
        label={t("profile.bodyStrength")}
        value={data.strength.bodyToBodyStrength}
        isKey
      />
      <AttributeBar
        label={t("profile.balanceContact")}
        value={data.strength.balanceInContact}
      />
    </SectionCard>

    {/* Agilidade */}
    <SectionCard
      title={t("profile.agility")}
      icon="Wind"
      colorClass="border-l-green-500"
    >
      <AttributeBar
        label={t("profile.lateralAgility")}
        value={data.agility.lateralAgility}
        isKey
      />
      <AttributeBar
        label={t("profile.reactionTime")}
        value={data.agility.reactionTime}
      />
      <AttributeBar
        label={t("profile.flexibility")}
        value={data.agility.flexibility}
      />
      <AttributeBar
        label={t("profile.coordination")}
        value={data.agility.coordination}
      />
    </SectionCard>

    {/* Salto */}
    <SectionCard
      title={t("profile.jumping")}
      icon="ArrowUp"
      colorClass="border-l-blue-500"
    >
      <AttributeBar
        label={t("profile.standingJump")}
        value={data.jumping.standingVerticalJump}
      />
      <AttributeBar
        label={t("profile.runningJump")}
        value={data.jumping.runningVerticalJump}
        isKey
      />
      <AttributeBar
        label={t("profile.headerTiming")}
        value={data.jumping.headerTiming}
      />
    </SectionCard>

    {/* Robustez */}
    <SectionCard
      title={t("profile.robustness")}
      icon="Shield"
      colorClass="border-l-indigo-500"
    >
      <AttributeBar
        label={t("profile.physicalRobustness")}
        value={data.robustness.physicalRobustness}
      />
      <AttributeBar
        label={t("profile.injuryResistance")}
        value={data.robustness.injuryResistance}
        isKey
      />
      <AttributeBar
        label={t("profile.recoveryRate")}
        value={data.robustness.recoveryRate}
      />
      <AttributeBar
        label={t("profile.naturalFitness")}
        value={data.robustness.naturalFitness}
      />
    </SectionCard>
  </div>
);

const MentalTab: React.FC<{
  data: MentalAttributes;
  t: (key: string) => string;
}> = ({ data, t }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {/* Inteligência de Jogo */}
    <SectionCard
      title={t("profile.gameIntelligence")}
      icon="Lightbulb"
      colorClass="border-l-purple-500"
    >
      <AttributeBar
        label={t("profile.decisions")}
        value={data.gameIntelligence.decisions}
        isKey
      />
      <AttributeBar
        label={t("profile.vision")}
        value={data.gameIntelligence.vision}
        isKey
      />
      <AttributeBar
        label={t("profile.creativity")}
        value={data.gameIntelligence.creativity}
      />
      <AttributeBar
        label={t("profile.anticipation")}
        value={data.gameIntelligence.anticipation}
      />
      <AttributeBar
        label={t("profile.positioning")}
        value={data.gameIntelligence.positioning}
      />
      <AttributeBar
        label={t("profile.offBallMovement")}
        value={data.gameIntelligence.offTheBallMovement}
      />
    </SectionCard>

    {/* Personalidade */}
    <SectionCard
      title={t("profile.personality")}
      icon="User"
      colorClass="border-l-pink-500"
    >
      <AttributeBar
        label={t("profile.composure")}
        value={data.personality.composure}
        isKey
      />
      <AttributeBar
        label={t("profile.composureFinishing")}
        value={data.personality.composureInFinishing}
      />
      <AttributeBar
        label={t("profile.bravery")}
        value={data.personality.bravery}
      />
      <AttributeBar
        label={t("profile.determination")}
        value={data.personality.determination}
      />
      <AttributeBar
        label={t("profile.teamwork")}
        value={data.personality.teamwork}
      />
      <AttributeBar
        label={t("profile.leadership")}
        value={data.personality.leadershipOnPitch}
      />
      <AttributeBar
        label={t("profile.charisma")}
        value={data.personality.charismaOffPitch}
      />
      <AttributeBar
        label={t("profile.professionalism")}
        value={data.personality.professionalism}
      />
      <AttributeBar
        label={t("profile.temperament")}
        value={data.personality.temperament}
      />
    </SectionCard>

    {/* Performance */}
    <SectionCard
      title={t("profile.performance")}
      icon="TrendingUp"
      colorClass="border-l-rose-500"
    >
      <AttributeBar
        label={t("profile.consistency")}
        value={data.performance.consistency}
        isKey
      />
      <AttributeBar
        label={t("profile.bigMatch")}
        value={data.performance.bigMatchPerformance}
        isKey
      />
      <AttributeBar
        label={t("profile.adaptability")}
        value={data.performance.adaptability}
      />
      <AttributeBar
        label={t("profile.pressureHandling")}
        value={data.performance.pressureHandling}
      />
      <AttributeBar
        label={t("profile.clutchFactor")}
        value={data.performance.clutchFactor}
      />
    </SectionCard>
  </div>
);

const DefensiveTab: React.FC<{
  data: DefensiveAttributes;
  t: (key: string) => string;
}> = ({ data, t }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {/* Marcação */}
    <SectionCard
      title={t("profile.marking")}
      icon="Lock"
      colorClass="border-l-slate-500"
    >
      <AttributeBar
        label={t("profile.individualMarking")}
        value={data.marking.individualMarking}
        isKey
      />
      <AttributeBar
        label={t("profile.zonalMarking")}
        value={data.marking.zonalMarking}
      />
      <AttributeBar
        label={t("profile.trackingRuns")}
        value={data.marking.trackingRuns}
      />
      <AttributeBar
        label={t("profile.closeDownSpeed")}
        value={data.marking.closeDownSpeed}
      />
    </SectionCard>

    {/* Pressão */}
    <SectionCard
      title={t("profile.pressing")}
      icon="Minimize2"
      colorClass="border-l-zinc-500"
    >
      <AttributeBar
        label={t("profile.pressingTrigger")}
        value={data.pressing.pressingTrigger}
      />
      <AttributeBar
        label={t("profile.sustainedPressing")}
        value={data.pressing.sustainedPressing}
        isKey
      />
      <AttributeBar
        label={t("profile.pressIntensity")}
        value={data.pressing.pressIntensity}
      />
      <AttributeBar
        label={t("profile.counterPressing")}
        value={data.pressing.counterPressing}
      />
    </SectionCard>

    {/* Desarme */}
    <SectionCard
      title={t("profile.tackling")}
      icon="Footprints"
      colorClass="border-l-stone-500"
    >
      <AttributeBar
        label={t("profile.standingTackle")}
        value={data.tackling.standingTackle}
        isKey
      />
      <AttributeBar
        label={t("profile.slidingTackle")}
        value={data.tackling.slidingTackle}
      />
      <AttributeBar
        label={t("profile.tackleTiming")}
        value={data.tackling.tackleTiming}
      />
      <AttributeBar
        label={t("profile.cleanTackling")}
        value={data.tackling.cleanTackling}
      />
    </SectionCard>

    {/* Interceptação */}
    <SectionCard
      title={t("profile.interception")}
      icon="Hand"
      colorClass="border-l-neutral-500"
    >
      <AttributeBar
        label={t("profile.shortPassIntercept")}
        value={data.interception.shortPassInterception}
        isKey
      />
      <AttributeBar
        label={t("profile.longPassIntercept")}
        value={data.interception.longPassInterception}
      />
      <AttributeBar
        label={t("profile.shotBlocking")}
        value={data.interception.shotBlocking}
      />
      <AttributeBar
        label={t("profile.crossBlocking")}
        value={data.interception.crossBlocking}
      />
      <AttributeBar
        label={t("profile.readingOfPlay")}
        value={data.interception.readingOfPlay}
      />
    </SectionCard>

    {/* Posicionamento Defensivo */}
    <SectionCard
      title={t("profile.defPositioning")}
      icon="ShieldHalf"
      colorClass="border-l-gray-500"
    >
      <AttributeBar
        label={t("profile.covering")}
        value={data.defensivePositioning.covering}
        isKey
      />
      <AttributeBar
        label={t("profile.jockeying")}
        value={data.defensivePositioning.jockeying}
      />
      <AttributeBar
        label={t("profile.positionRecovery")}
        value={data.defensivePositioning.positionRecovery}
      />
      <AttributeBar
        label={t("profile.backtracking")}
        value={data.defensivePositioning.backtracking}
      />
      <AttributeBar
        label={t("profile.defensiveAwareness")}
        value={data.defensivePositioning.defensiveAwareness}
      />
    </SectionCard>
  </div>
);

const GoalkeeperTab: React.FC<{
  data?: GoalkeeperAttributes;
  t: (key: string) => string;
}> = ({ data, t }) => {
  if (!data) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-6 text-center">
        <Icon
          name="Hand"
          size={30}
          className="text-slate-600 mb-3 mx-auto block"
        />
        <p className="text-slate-400 text-sm">{t("profile.gkNotAvailable")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Defesas */}
      <SectionCard
        title={t("profile.shotStopping")}
        icon="Hand"
        colorClass="border-l-violet-500"
      >
        <AttributeBar
          label={t("profile.reflexes")}
          value={data.shotStopping.reflexes}
          isKey
        />
        <AttributeBar
          label={t("profile.diving")}
          value={data.shotStopping.diving}
          isKey
        />
        <AttributeBar
          label={t("profile.penaltySaving")}
          value={data.shotStopping.penaltySaving}
        />
        <AttributeBar
          label={t("profile.longRangeShots")}
          value={data.shotStopping.longRangeShotStopping}
        />
        <AttributeBar
          label={t("profile.closeRangeShots")}
          value={data.shotStopping.closeRangeShotStopping}
        />
      </SectionCard>

      {/* Posicionamento GK */}
      <SectionCard
        title={t("profile.gkPositioning")}
        icon="LocateFixed"
        colorClass="border-l-fuchsia-500"
      >
        <AttributeBar
          label={t("profile.positioning")}
          value={data.positioning.positioning}
          isKey
        />
        <AttributeBar
          label={t("profile.rushingOut")}
          value={data.positioning.rushingOut}
        />
        <AttributeBar
          label={t("profile.narrowingAngles")}
          value={data.positioning.narrowingAngles}
        />
        <AttributeBar
          label={t("profile.linePositioning")}
          value={data.positioning.linePositioning}
        />
      </SectionCard>

      {/* Distribuição */}
      <SectionCard
        title={t("profile.distribution")}
        icon="CircleDot"
        colorClass="border-l-sky-500"
      >
        <AttributeBar
          label={t("profile.throwing")}
          value={data.distribution.throwing}
        />
        <AttributeBar
          label={t("profile.kicking")}
          value={data.distribution.kicking}
          isKey
        />
        <AttributeBar
          label={t("profile.goalKicks")}
          value={data.distribution.goalKicks}
        />
      </SectionCard>

      {/* Comando de Área */}
      <SectionCard
        title={t("profile.commanding")}
        icon="Megaphone"
        colorClass="border-l-red-400"
      >
        <AttributeBar
          label={t("profile.commandOfArea")}
          value={data.commanding.commandOfArea}
          isKey
        />
        <AttributeBar
          label={t("profile.claimingCrosses")}
          value={data.commanding.claimingCrosses}
        />
        <AttributeBar
          label={t("profile.punching")}
          value={data.commanding.punching}
        />
        <AttributeBar
          label={t("profile.communication")}
          value={data.commanding.communication}
        />
        <AttributeBar
          label={t("profile.aerialReach")}
          value={data.commanding.aerialReach}
        />
      </SectionCard>

      {/* Mental GK */}
      <SectionCard
        title={t("profile.gkMental")}
        icon="Brain"
        colorClass="border-l-orange-400"
      >
        <AttributeBar
          label={t("profile.concentration")}
          value={data.mentalGK.concentration}
          isKey
        />
        <AttributeBar
          label={t("profile.decisionMaking")}
          value={data.mentalGK.decisionMaking}
        />
        <AttributeBar
          label={t("profile.handling")}
          value={data.mentalGK.handling}
        />
      </SectionCard>
    </div>
  );
};

const UltraNerdTab: React.FC<{
  data: ExpandedPlayerData;
  careerStats?: ExtendedMatchStats;
  player: Player;
  t: (key: string) => string;
}> = ({ data, careerStats, player, t }) => {
  const isGK = player.position === "GK";
  const isYouth = player.team?.isYouth === true;

  // Dados de temporada do expandedData
  const atk = data.attackingStats;
  const cre = data.creationStats;
  const duel = data.duelStats;
  const def = data.defensiveStats;
  const disc = data.disciplineStats;
  const phys = data.matchPhysicalStats;

  // Componente simples de item de estatística
  const StatItem: React.FC<{
    label: string;
    value: string | number | undefined;
    highlight?: boolean;
  }> = ({ label, value, highlight }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`text-xs font-bold ${highlight ? "text-emerald-400" : "text-white"}`}
      >
        {value ?? "N/A"}
      </p>
    </div>
  );

  // Seção com título
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <div className="mb-4">
      <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
        {title}
      </h4>
      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-3">
        {children}
      </div>
    </div>
  );

  // Se for youth, não mostrar estatísticas de carreira
  if (isYouth) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Icon
          name="GraduationCap"
          size={40}
          className="mb-4 opacity-50 mx-auto"
        />
        <p>
          {t("profile.youthNoStats") ||
            "Career statistics are only available for professional players"}
        </p>
        <p className="text-xs mt-2">
          {t("profile.waitForPro") ||
            "Graduate to the first team to start tracking detailed stats"}
        </p>
      </div>
    );
  }

  // Se não tiver careerStats, mostra mensagem
  if (!careerStats) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Icon name="TrendingUp" size={40} className="mb-4 opacity-50 mx-auto" />
        <p>
          {t("careerStats.noStatsAvailable") ||
            "No detailed stats available yet"}
        </p>
        <p className="text-xs mt-2">
          {t("careerStats.playMoreMatches") ||
            "Play more matches to see career statistics"}
        </p>
      </div>
    );
  }

  const stats = careerStats;

  // Helper to provide fallback for old saves without matchStats
  const safeValue = (val: number | undefined, fallback: number = 0): number => {
    return val !== undefined && !isNaN(val) ? val : fallback;
  };

  // Calculate derived values if not available
  const matches = safeValue(stats.matches);
  const goals = safeValue(stats.goals);
  const assists = safeValue(stats.assists);
  const shots = safeValue(stats.shots);
  const shotsOnTarget = safeValue(stats.shotsOnTarget);
  const gamesStarted = safeValue(
    stats.gamesStarted,
    Math.round(matches * 0.85),
  );
  // IMPORTANTE: Garantir que titular + reserva = partidas
  const gamesAsSubstitute = matches - gamesStarted;

  // Rating: usar valor real ou estimar baseado em gols/jogo
  const rawRating = safeValue(stats.rating);
  const estimatedRating =
    matches > 0 ? Math.min(8.5, 6.5 + (goals / matches) * 2) : 6.5;
  const rating = rawRating > 0 ? rawRating : estimatedRating;

  // Precisão de chute: calcular se não disponível
  const shotAccuracy =
    shots > 0
      ? safeValue(stats.shotAccuracy, (shotsOnTarget / shots) * 100)
      : 0;

  // Distância: estimar se não disponível (~10km por jogo)
  const distanceCovered = safeValue(stats.distanceCovered, matches * 10.5);
  const sprintDistanceCovered = safeValue(
    stats.sprintDistanceCovered,
    matches * 0.8,
  );

  // Stats por jogo
  const shotsPerGame = matches > 0 ? shots / matches : 0;
  const shotsOnTargetPerGame = matches > 0 ? shotsOnTarget / matches : 0;

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Geral */}
      <Section title={`📊 ${t("careerStats.general")}`}>
        <StatItem label={t("detailedStats.matches")} value={matches} />
        <StatItem label={t("detailedStats.starts")} value={gamesStarted} />
        <StatItem label={t("detailedStats.sub")} value={gamesAsSubstitute} />
        <StatItem
          label={t("detailedStats.avgRating")}
          value={rating.toFixed(2)}
          highlight
        />
        <StatItem
          label={t("detailedStats.manOfTheMatch")}
          value={safeValue(stats.manOfTheMatch)}
        />
        <StatItem
          label={t("detailedStats.teamOfTheWeek")}
          value={safeValue(stats.teamOfTheWeek)}
        />
      </Section>

      {/* Ataque - Finalizações */}
      {!isGK && (
        <Section title={`⚽ ${t("careerStats.attacking")}`}>
          <StatItem label={t("detailedStats.goals")} value={goals} highlight />
          <StatItem
            label={t("detailedStats.expectedGoals")}
            value={safeValue(stats.expectedGoals).toFixed(2)}
          />
          <StatItem
            label={t("detailedStats.goalsPerMatch")}
            value={(matches > 0 ? goals / matches : 0).toFixed(2)}
          />
          <StatItem label={t("detailedStats.shots")} value={shots} />
          <StatItem
            label={t("detailedStats.shotsPerGame")}
            value={shotsPerGame.toFixed(1)}
          />
          <StatItem
            label={t("detailedStats.shotsOnTarget")}
            value={shotsOnTarget}
          />
          <StatItem
            label={t("detailedStats.shotsOnTargetPerGame")}
            value={shotsOnTargetPerGame.toFixed(1)}
          />
          <StatItem
            label={t("detailedStats.shotAccuracy")}
            value={`${shotAccuracy.toFixed(1)}%`}
          />
          <StatItem
            label={t("detailedStats.goalConversion")}
            value={`${(shots > 0 ? (goals / shots) * 100 : 0).toFixed(1)}%`}
          />
          <StatItem
            label={t("detailedStats.bigChances")}
            value={`${safeValue(stats.bigChancesConverted)}/${safeValue(stats.bigChancesConverted) + safeValue(stats.bigChancesMissed)}`}
          />
        </Section>
      )}

      {/* Tipos de Gols - Localização */}
      {!isGK && (
        <Section title={`🥅 ${t("detailedStats.goalsByType")}`}>
          <StatItem
            label={t("detailedStats.insideBox")}
            value={safeValue(stats.goalsFromInsideBox)}
          />
          <StatItem
            label={t("detailedStats.outsideBox")}
            value={safeValue(stats.goalsFromOutsideBox)}
          />
          <StatItem
            label={t("detailedStats.headers")}
            value={safeValue(stats.headedGoals)}
          />
          <StatItem
            label={t("detailedStats.leftFoot")}
            value={safeValue(stats.leftFootGoals)}
          />
          <StatItem
            label={t("detailedStats.rightFoot")}
            value={safeValue(stats.rightFootGoals)}
          />
        </Section>
      )}

      {/* Estilos de Finalização */}
      {!isGK && (
        <Section
          title={`🎯 ${t("profile.finishingStyles") || "Finishing Styles"}`}
        >
          <StatItem
            label={t("detailedStats.volleys")}
            value={safeValue(stats.volleyGoals)}
          />
          <StatItem
            label={t("detailedStats.chipGoals") || "Chip Shots"}
            value={safeValue(stats.chipGoals)}
          />
          <StatItem
            label={t("detailedStats.curvedGoals") || "Curved Shots"}
            value={safeValue(stats.curvedGoals)}
          />
          <StatItem
            label={t("detailedStats.freeKicks")}
            value={safeValue(stats.freeKickGoals)}
          />
          <StatItem
            label={t("detailedStats.penalties")}
            value={`${safeValue(stats.penaltyGoals)}/${safeValue(stats.penaltiesWon)}`}
          />
          <StatItem
            label={t("profile.golazos") || "Golazos"}
            value={atk.golazosCount}
            highlight={atk.golazosCount > 0}
          />
        </Section>
      )}

      {/* Gols Clutch - Seção dedicada para gols decisivos */}
      {!isGK && (
        <Section title={`🎯 ${t("profile.clutchGoals") || "Clutch Goals"}`}>
          <StatItem
            label={t("profile.gameWinningGoals") || "Game Winners"}
            value={atk.gameWinningGoals}
            highlight={atk.gameWinningGoals > 0}
          />
          <StatItem
            label={t("profile.equalizerGoals") || "Equalizers"}
            value={atk.equalizerGoals}
            highlight={atk.equalizerGoals > 0}
          />
          <StatItem
            label={t("profile.goalsWhenBehind") || "When Losing/Drawing"}
            value={atk.goalsWhenDrawingOrLosing}
            highlight={atk.goalsWhenDrawingOrLosing > 0}
          />
          <StatItem
            label={t("profile.goalsOnCounter") || "Counter-Attack Goals"}
            value={atk.goalsOnCounter}
          />
        </Section>
      )}

      {/* Gols por Período de Jogo - do expandedData */}
      {!isGK && (
        <Section
          title={`⏱️ ${t("profile.goalsByPeriod") || "Goals by Period"}`}
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">0-15'</p>
              <p className="text-sm font-bold text-white">{atk.goals0to15}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">15-30'</p>
              <p className="text-sm font-bold text-white">{atk.goals15to30}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">30-45'</p>
              <p className="text-sm font-bold text-white">{atk.goals30to45}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">45-60'</p>
              <p className="text-sm font-bold text-white">{atk.goals45to60}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">60-75'</p>
              <p className="text-sm font-bold text-white">{atk.goals60to75}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 border border-emerald-500/30">
              <p className="text-[10px] text-emerald-400">75-90+'</p>
              <p className="text-sm font-bold text-emerald-400">
                {atk.goals75to90Plus}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* v0.5.2: Assistências por Período de Jogo - baseado pesquisa UFPE */}
      {!isGK && (
        <Section
          title={`⏱️ ${t("profile.assistsByPeriod") || "Assists by Period"}`}
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">0-15'</p>
              <p className="text-sm font-bold text-white">{cre.assists0to15}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">15-30'</p>
              <p className="text-sm font-bold text-white">
                {cre.assists15to30}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">30-45'</p>
              <p className="text-sm font-bold text-white">
                {cre.assists30to45}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">45-60'</p>
              <p className="text-sm font-bold text-white">
                {cre.assists45to60}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-[10px] text-slate-500">60-75'</p>
              <p className="text-sm font-bold text-white">
                {cre.assists60to75}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 border border-amber-500/30">
              <p className="text-[10px] text-amber-400">75-90+'</p>
              <p className="text-sm font-bold text-amber-400">
                {cre.assists75to90Plus}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Criatividade e Passes */}
      <Section title={`🎨 ${t("careerStats.passing")}`}>
        <StatItem
          label={t("detailedStats.assists")}
          value={safeValue(stats.assists)}
          highlight
        />
        <StatItem
          label={t("detailedStats.expectedAssists")}
          value={safeValue(stats.expectedAssists).toFixed(2)}
        />
        <StatItem
          label={t("detailedStats.bigChancesCreated")}
          value={safeValue(stats.bigChancesCreated)}
        />
        <StatItem
          label={t("detailedStats.keyPasses")}
          value={safeValue(stats.keyPasses)}
        />
        <StatItem
          label={t("profile.preAssists") || "Pre-Assists"}
          value={cre.preAssists}
        />
        <StatItem
          label={t("detailedStats.shotCreatingActions")}
          value={safeValue(stats.shotCreatingActions)}
        />
        <StatItem
          label={t("detailedStats.goalCreatingActions")}
          value={safeValue(stats.goalCreatingActions)}
        />
      </Section>

      {/* Distribuição de Passes */}
      <Section title={`➡️ ${t("detailedStats.passingDistribution")}`}>
        <StatItem
          label={t("detailedStats.totalPasses")}
          value={safeValue(stats.passes)}
        />
        <StatItem
          label={t("detailedStats.passCompletion")}
          value={`${safeValue(stats.passCompletion).toFixed(1)}%`}
        />
        <StatItem
          label={t("detailedStats.forwardPasses")}
          value={safeValue(stats.forwardPasses)}
        />
        <StatItem
          label={t("detailedStats.ownHalf")}
          value={safeValue(stats.passesInOwnHalf)}
        />
        <StatItem
          label={t("detailedStats.finalThird")}
          value={safeValue(stats.passesInFinalThird)}
        />
        <StatItem
          label={t("detailedStats.longBalls")}
          value={`${safeValue(stats.accurateLongBalls)}/${safeValue(stats.longBalls)}`}
        />
        <StatItem
          label={t("detailedStats.throughBalls")}
          value={`${safeValue(stats.accurateThroughBalls)}/${safeValue(stats.throughBalls)}`}
        />
        <StatItem
          label={t("detailedStats.crosses")}
          value={`${safeValue(stats.accurateCrosses)}/${safeValue(stats.crosses)}`}
        />
      </Section>

      {/* Dribles e Controle de Bola */}
      {!isGK && (
        <Section title={`🏃 ${t("detailedStats.dribblingBallControl")}`}>
          <StatItem
            label={t("detailedStats.successfulDribbles")}
            value={`${safeValue(stats.dribblesSucceeded)}/${safeValue(stats.dribbles)}`}
          />
          <StatItem
            label={t("detailedStats.dribbleSuccess")}
            value={`${safeValue(stats.dribblesSuccessPercentage).toFixed(1)}%`}
          />
          <StatItem
            label={t("detailedStats.progressiveCarries")}
            value={safeValue(stats.progressiveCarries)}
          />
          <StatItem
            label={t("detailedStats.carriesIntoFinalThird")}
            value={safeValue(stats.carriesIntoFinalThird)}
          />
          <StatItem
            label={t("detailedStats.carriesIntoPenArea")}
            value={safeValue(stats.carriesIntoPenaltyArea)}
          />
          <StatItem
            label={t("detailedStats.nutmegs")}
            value={safeValue(stats.nutmegs)}
            highlight={safeValue(stats.nutmegs) > 0}
          />
          <StatItem
            label={t("detailedStats.skillMoves")}
            value={safeValue(stats.skillMovesCompleted)}
          />
          <StatItem
            label={t("detailedStats.touches")}
            value={safeValue(stats.touches)}
          />
          <StatItem
            label={t("detailedStats.touchesInOppositionBox")}
            value={safeValue(stats.touchesInOppositionBox)}
          />
          <StatItem
            label={t("detailedStats.possessionLost")}
            value={safeValue(stats.possessionLost)}
          />
        </Section>
      )}

      {/* Defesa */}
      <Section title={`🛡️ ${t("careerStats.defending")}`}>
        <StatItem
          label={t("detailedStats.tackles")}
          value={`${safeValue(stats.tacklesWon)}/${safeValue(stats.tackles)}`}
        />
        <StatItem
          label={t("detailedStats.tackleSuccess")}
          value={`${safeValue(stats.tackleSuccess).toFixed(0)}%`}
        />
        <StatItem
          label={t("detailedStats.interceptions")}
          value={safeValue(stats.interceptions)}
        />
        <StatItem
          label={t("detailedStats.clearances")}
          value={safeValue(stats.clearances)}
        />
        <StatItem
          label={t("detailedStats.headedClearances")}
          value={safeValue(stats.headedClearances)}
        />
        <StatItem
          label={t("detailedStats.shotsBlocked")}
          value={safeValue(stats.shotsBlocked)}
        />
        <StatItem
          label={t("detailedStats.ballRecoveries")}
          value={safeValue(stats.ballRecoveries)}
        />
        <StatItem
          label={t("detailedStats.successfulPressures")}
          value={safeValue(stats.successfulPressures)}
        />
        <StatItem
          label={t("detailedStats.dribbledPast")}
          value={safeValue(stats.dribbledPast)}
        />
        <StatItem
          label={t("detailedStats.errorsToGoal")}
          value={safeValue(stats.errorsLeadingToGoal)}
        />
      </Section>

      {/* Duelos */}
      <Section title={`⚔️ ${t("careerStats.duels")}`}>
        <StatItem
          label={t("detailedStats.totalDuels")}
          value={`${safeValue(stats.duelsWon)}/${safeValue(stats.duels)}`}
        />
        <StatItem
          label={t("detailedStats.winRate")}
          value={`${safeValue(stats.duelsWonPercentage).toFixed(1)}%`}
        />
        <StatItem
          label={t("detailedStats.groundDuels")}
          value={`${safeValue(stats.groundDuelsWon)}/${safeValue(stats.groundDuels)}`}
        />
        <StatItem
          label={t("detailedStats.aerialDuels")}
          value={`${safeValue(stats.aerialDuelsWon)}/${safeValue(stats.aerialDuels)}`}
        />
        <StatItem
          label={t("detailedStats.headersWon")}
          value={safeValue(stats.headersWon)}
        />
        <StatItem
          label={t("detailedStats.foulsDrawn")}
          value={safeValue(stats.foulsDrawn)}
        />
      </Section>

      {/* Goleiro */}
      {isGK && (
        <Section title={`🧤 ${t("detailedStats.goalkeeping")}`}>
          <StatItem
            label={t("detailedStats.cleanSheets")}
            value={safeValue(stats.cleanSheets)}
            highlight
          />
          <StatItem
            label={t("detailedStats.saves")}
            value={safeValue(stats.saves)}
          />
          <StatItem
            label={t("detailedStats.savePercentage")}
            value={`${safeValue(stats.savePercentage).toFixed(1)}%`}
          />
          <StatItem
            label={t("detailedStats.goalsConceded")}
            value={safeValue(stats.goalsConceded)}
          />
          <StatItem
            label={t("detailedStats.xgPrevented")}
            value={safeValue(stats.goalsPreventedVsExpected).toFixed(2)}
          />
          <StatItem
            label={t("detailedStats.penaltiesFaced")}
            value={safeValue(stats.penaltiesFaced)}
          />
          <StatItem
            label={t("detailedStats.penaltiesSaved")}
            value={safeValue(stats.penaltiesSaved)}
          />
          <StatItem
            label={t("detailedStats.crossesClaimed")}
            value={safeValue(stats.claimedCrosses)}
          />
          <StatItem
            label={t("detailedStats.punchesMade")}
            value={safeValue(stats.punchesMade)}
          />
        </Section>
      )}

      {/* Disciplina */}
      <Section title={`🟨 ${t("careerStats.discipline")}`}>
        <StatItem
          label={t("detailedStats.foulsCommitted")}
          value={safeValue(stats.foulsCommitted)}
        />
        <StatItem
          label={t("detailedStats.offsides")}
          value={safeValue(stats.offsides)}
        />
        <StatItem
          label={t("detailedStats.yellowCards")}
          value={safeValue(stats.yellowCards)}
        />
        <StatItem
          label={t("detailedStats.secondYellowRed")}
          value={safeValue(stats.redCardsFromSecondYellow)}
        />
        <StatItem
          label={t("detailedStats.redCards")}
          value={safeValue(stats.redCards)}
        />
        <StatItem
          label={t("detailedStats.penaltiesConceded")}
          value={safeValue(stats.penaltiesConceded)}
        />
      </Section>

      {/* Físico e Movimento */}
      <Section title={`🏃‍♂️ ${t("detailedStats.workRateMovementTitle")}`}>
        <StatItem
          label={t("detailedStats.distanceCovered")}
          value={`${distanceCovered.toFixed(1)} km`}
        />
        <StatItem
          label={t("detailedStats.sprintDistance")}
          value={`${sprintDistanceCovered.toFixed(1)} km`}
        />
        <StatItem
          label={t("detailedStats.sprintsPerGame")}
          value={safeValue(
            stats.sprintsPerGame,
            matches > 0 ? safeValue(stats.highIntensityRuns) / matches : 0,
          ).toFixed(1)}
        />
        <StatItem
          label={t("detailedStats.highIntensityRuns")}
          value={safeValue(stats.highIntensityRuns)}
        />
      </Section>

      {/* Conquistas */}
      <Section title={`🏅 ${t("detailedStats.matchEventsAchievements")}`}>
        <StatItem
          label={t("detailedStats.hatTricks")}
          value={safeValue(stats.hatTricks)}
          highlight={safeValue(stats.hatTricks) > 0}
        />
        <StatItem
          label={t("detailedStats.braces")}
          value={safeValue(stats.braces)}
        />
        <StatItem
          label={t("detailedStats.manOfTheMatch")}
          value={safeValue(stats.manOfTheMatch)}
          highlight
        />
      </Section>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ExpandedPlayerProfileView: React.FC<ExpandedPlayerProfileProps> = ({
  player,
  careerStats,
  activeTab: controlledActiveTab,
  onTabChange,
}) => {
  const { t } = useI18n();
  const [internalActiveTab, setInternalActiveTab] = useState<string>("profile");

  const activeTab = controlledActiveTab || internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  if (!player.expandedData) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-6 text-center">
        <Icon
          name="CircleAlert"
          size={30}
          className="text-slate-600 mb-3 mx-auto block"
        />
        <p className="text-slate-400 text-sm">{t("profile.notAvailable")}</p>
        <p className="text-slate-500 text-xs mt-1">{t("profile.oldVersion")}</p>
      </div>
    );
  }

  const data = player.expandedData;
  const isGK = player.position === "GK";

  // Filtra tabs - remove Goleiro se não for GK
  const availableTabs = isGK
    ? TABS
    : TABS.filter((tab) => tab.id !== "goalkeeper");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(true);

  // Atualiza indicadores de scroll
  const updateScrollIndicators = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setShowLeftIndicator(container.scrollLeft > 10);
      setShowRightIndicator(
        container.scrollLeft <
          container.scrollWidth - container.clientWidth - 10,
      );
    }
  };

  // Verifica indicadores ao montar e quando tabs mudam
  useEffect(() => {
    updateScrollIndicators();
    // Pequeno delay para garantir que o layout está pronto
    const timer = setTimeout(updateScrollIndicators, 100);
    return () => clearTimeout(timer);
  }, [availableTabs]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab data={data} player={player} t={t} />;
      case "technical":
        return <TechnicalTab data={data.technicalAttributes} t={t} />;
      case "physical":
        return <PhysicalTab data={data.physicalAttributes} t={t} />;
      case "mental":
        return <MentalTab data={data.mentalAttributes} t={t} />;
      case "defensive":
        return <DefensiveTab data={data.defensiveAttributes} t={t} />;
      case "goalkeeper":
        return <GoalkeeperTab data={data.goalkeeperAttributes} t={t} />;
      case "ultraNerd":
        return (
          <UltraNerdTab
            data={data}
            careerStats={careerStats}
            player={player}
            t={t}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Tab Navigation with scroll indicators */}
      <div className="relative">
        {/* Left fade indicator */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none rounded-l-lg transition-opacity duration-300 ${showLeftIndicator ? "opacity-100" : "opacity-0"}`}
        />

        {/* Scrollable tabs container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-2 bg-card p-1.5 rounded-lg border border-primary overflow-x-auto scrollbar-hide shadow-theme"
          onScroll={updateScrollIndicators}
          onTouchMove={updateScrollIndicators}
        >
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center justify-center w-12 h-12 min-w-[48px] rounded-lg text-lg transition-colors duration-150 ${
                activeTab === tab.id
                  ? "bg-accent-primary text-white shadow-lg"
                  : "text-slate-400 active:bg-slate-700"
              }`}
            >
              <Icon name={tab.icon} size={20} />
            </button>
          ))}
        </div>

        {/* Right fade indicator */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none rounded-r-lg transition-opacity duration-300 ${showRightIndicator ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">{renderTabContent()}</div>
    </div>
  );
};

export default ExpandedPlayerProfileView;
