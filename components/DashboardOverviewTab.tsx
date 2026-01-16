import React from "react";
import { useI18n } from "../contexts/I18nContext";
import { Icon, type IconName } from "./ui/Icon";
import type {
  Player,
  CareerLog,
  Trophies,
  Awards,
  MediaNarrative,
} from "../types";
import { PlayerTraits, MediaNarrativeBadge, Badge } from "./CareerDashboard";
import { generateMediaComments } from "../services/mediaLogic";
import {
  TransferStatusBanner,
  TrainingStatusBanner,
  ConflictStatusBanner,
} from "./PlayerStatusIndicators";

interface OverviewTabProps {
  player: Player;
  latestLog: CareerLog;
  careerHistory: CareerLog[];
  onTerminateContract?: () => void;
  onOpenTraining?: () => void;
  onOpenAgentDetails?: () => void;
  onOpenPlayerStatus?: () => void;
  onOpenSeasonStats?: () => void;
  onOpenCareerTotals?: () => void;
  onOpenHonors?: () => void;
}

const getMediaDescription = (
  narrative: MediaNarrative,
  t: (key: string) => string,
): string => {
  // v0.5.6: Usar .description em vez de sufixo Desc
  const key = `mediaNarrative.${narrative.replace(/\s+/g, "")}.description`;
  return t(key);
};

const CompactStat: React.FC<{
  label: string;
  value: string | number;
  color?: string;
}> = ({ label, value, color = "text-primary" }) => (
  <div className="text-center">
    <p className={`text-lg font-bold ${color}`}>{value}</p>
    <p className="text-xs text-muted uppercase tracking-wider mt-1">{label}</p>
  </div>
);

// Card compacto para estatísticas totais de carreira
const OverviewTab: React.FC<OverviewTabProps> = ({
  player,
  latestLog,
  careerHistory,
  onTerminateContract,
  onOpenTraining,
  onOpenAgentDetails,
  onOpenPlayerStatus,
  onOpenSeasonStats,
  onOpenCareerTotals,
  onOpenHonors,
}) => {
  const { t } = useI18n();

  // Guard against undefined latestLog during state transitions
  if (!latestLog || !latestLog.stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon
            name="SoccerBall"
            size={36}
            className="text-[var(--accent-primary)] mb-3 animate-spin"
          />
          <p className="text-[var(--text-secondary)]">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const seasonStats = latestLog.stats;

  const normalizeStyle = (style?: string): string | undefined => {
    if (!style) return style;
    const map: Record<string, string> = {
      "Jovem Talento": "Emerging Talent",
      "Estrela Emergente": "Emerging Talent",
      "Atacante Completo": "Complete Forward",
      "Matador Puro": "Poacher",
      "Homem de Área": "Target Man",
      "Falso 9": "False 9",
      "Extremo Invertido": "Inverted Winger",
      "Extremo Clássico": "Traditional Winger",
      "Armador Avançado": "Advanced Playmaker",
      "Meio-campista Box-to-Box": "Box-to-Box",
      "Volante Marcador": "Ball-Winning Midfielder",
      Regista: "Regista",
      Mezzala: "Mezzala",
      "Lateral Ala": "Wing-Back",
      "Zagueiro Construtor": "Ball-Playing Defender",
      "Zagueiro Líbero": "Sweeper",
      Varredor: "Sweeper",
      "Goleiro Líbero": "Sweeper Keeper",
      "Defensor sem Firula": "Stopper",
      "Jogador Versátil": "Versatile Player",
    };
    return map[style] || style;
  };

  const styleLevel = (() => {
    const o = player.stats?.overall ?? 0;
    if (o >= 90) return "Diamond";
    if (o >= 85) return "Gold";
    if (o >= 80) return "Silver";
    return "Bronze";
  })();

  const levelBadgeClasses: Record<string, string> = {
    Diamond: "bg-cyan-400/20 border-cyan-300 text-cyan-200",
    Gold: "bg-yellow-400/20 border-yellow-300 text-yellow-100",
    Silver: "bg-slate-300/20 border-slate-300 text-slate-200",
    Bronze: "bg-orange-500/20 border-orange-400 text-orange-200",
  };

  const translateStyleName = (styleName?: string) => {
    if (!styleName) return "";
    const normalized = normalizeStyle(styleName);
    const key = (normalized || "")
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^[A-Z]/, (s) => s.toLowerCase());
    const translationKey = `playerStyle.${key}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : normalized;
  };

  const cleanTrophies = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const proHistory = (careerHistory || [])
      .slice(1)
      .filter((log) => !log.team?.isYouth);

    proHistory.forEach((log) => {
      if (log.trophies) {
        // Use a Set to prevent double counting the same trophy type in a single season
        const seasonTrophies = new Set<string>();

        log.trophies.forEach((trophy) => {
          // Normalize the trophy string to remove prefixes if present
          const normalizedKey = trophy
            .replace("trophiesSection.", "")
            .replace("trophy.", "");

          if (!seasonTrophies.has(normalizedKey)) {
            counts[normalizedKey] = (counts[normalizedKey] || 0) + 1;
            seasonTrophies.add(normalizedKey);
          }
        });
      }
    });
    return counts;
  }, [careerHistory]);

  return (
    <div className="space-y-3">
      {/* Event Status Banners */}
      <TransferStatusBanner player={player} />
      <TrainingStatusBanner player={player} />
      <ConflictStatusBanner player={player} />
      
      {/* Season Performance - Clickable */}
      <button
        onClick={onOpenSeasonStats}
        className="w-full text-left bg-card rounded-[1rem] border border-primary p-4 shadow-theme hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
      >
        <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2">
          <Icon name="ChartColumn" size={16} className="accent-secondary" />
          {t("dashboard.seasonPerformance")}
          <Icon
            name="ChevronRight"
            size={12}
            className="text-muted ml-auto group-hover:text-cyan-400 transition-colors"
          />
        </h3>

        {player.position === "GK" ? (
          <div className="grid grid-cols-4 gap-3">
            <CompactStat
              label={t("common.matchesShort")}
              value={seasonStats.matchesPlayed}
            />
            <CompactStat
              label={t("common.cleanSheetsShort")}
              value={seasonStats.cleanSheets || 0}
              color="text-cyan-400"
            />
            <CompactStat
              label={t("dashboard.csRatio")}
              value={
                seasonStats.matchesPlayed > 0
                  ? `${(((seasonStats.cleanSheets || 0) / seasonStats.matchesPlayed) * 100).toFixed(1)}%`
                  : "0.0%"
              }
              color="text-emerald-400"
            />
            <CompactStat
              label={t("dashboard.saves")}
              value={seasonStats.matchStats?.saves || 0}
              color="text-amber-400"
            />
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            <CompactStat
              label={t("common.matchesShort")}
              value={seasonStats.matchesPlayed}
            />
            <CompactStat
              label={t("common.goalsShort")}
              value={seasonStats.goals}
              color="text-emerald-400"
            />
            <CompactStat
              label={t("common.assistsShort")}
              value={seasonStats.assists}
              color="text-violet-400"
            />
            <CompactStat
              label={t("labels.short.goalsPerGame")}
              value={
                seasonStats.matchesPlayed > 0
                  ? (seasonStats.goals / seasonStats.matchesPlayed).toFixed(2)
                  : "0.00"
              }
              color="text-amber-400"
            />
            <CompactStat
              label={t("labels.short.contribution")}
              value={(
                (seasonStats.goals + seasonStats.assists) /
                Math.max(seasonStats.matchesPlayed, 1)
              ).toFixed(2)}
              color="text-cyan-400"
            />
          </div>
        )}
      </button>

      {/* Career Totals - Clickable */}
      <button
        onClick={onOpenCareerTotals}
        className="w-full text-left bg-card rounded-[1rem] border border-primary p-4 shadow-theme hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
      >
        <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2">
          <Icon name="TrendingUp" size={16} className="text-emerald-400" />
          {t("dashboard.careerTotals")}
          <Icon
            name="ChevronRight"
            size={12}
            className="text-muted ml-auto group-hover:text-emerald-400 transition-colors"
          />
        </h3>
        {player.position === "GK" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label={t("dashboard.matches")}
              value={player.totalMatches}
              color="text-blue-400"
            />
            <StatCard
              label="SG"
              value={player.totalCleanSheets || 0}
              color="text-emerald-400"
            />
            <StatCard
              label="DEF"
              value={careerHistory.reduce((acc, log) => {
                return (
                  acc +
                  (log.stats?.matchStats?.saves || 0) +
                  ((log.competitionData?.competitions || []).reduce(
                    (cAcc, comp) => cAcc + ((comp as any).saves || 0),
                    0,
                  ) || 0)
                );
              }, 0)}
              color="text-amber-400"
            />
            <StatCard
              label={t("dashboard.trophies")}
              value={Object.values(cleanTrophies).reduce((a, b) => a + b, 0)}
              color="text-violet-400"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label={t("dashboard.matches")}
              value={player.totalMatches}
              color="text-blue-400"
            />
            <StatCard
              label={t("dashboard.goals")}
              value={player.totalGoals}
              color="text-emerald-400"
            />
            <StatCard
              label={t("dashboard.assists")}
              value={player.totalAssists}
              color="text-violet-400"
            />
            <StatCard
              label={t("dashboard.trophies")}
              value={Object.values(cleanTrophies).reduce((a, b) => a + b, 0)}
              color="text-amber-400"
            />
          </div>
        )}
      </button>

      {/* Playing Style & Traits */}
      <div className="bg-card rounded-[1rem] border border-primary p-3 shadow-theme">
        <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
          <Icon
            name="Star"
            size={12}
            className="text-purple-400"
            variant="solid"
          />
          {t("dashboard.playingStyle")}
        </h3>

        <div className="space-y-3">
          {/* v0.5.6: Usar playingStyle expandido se disponível */}
          {(() => {
            // Priorizar expandedData.playingStyle, fallback para playerStyle
            const primaryStyle =
              player.expandedData?.playingStyle?.primaryStyle ||
              player.playerStyle;
            const secondaryStyle =
              player.expandedData?.playingStyle?.secondaryStyle;

            return (
              <div className="flex flex-wrap gap-2">
                {primaryStyle && (
                  <Badge
                    text={translateStyleName(primaryStyle)}
                    colorClasses={levelBadgeClasses[styleLevel]}
                    icon="Gem"
                    title={
                      t("dashboard.playingStylePrimary") ||
                      t("dashboard.playingStyleShort")
                    }
                  />
                )}
                {secondaryStyle && (
                  <Badge
                    text={translateStyleName(secondaryStyle)}
                    colorClasses="bg-slate-500/20 border-slate-400 text-slate-300"
                    icon="Diamond"
                    title={
                      t("dashboard.playingStyleSecondary") ||
                      t("dashboard.secondaryStyle")
                    }
                  />
                )}
              </div>
            );
          })()}
          <div className="h-px bg-[var(--bg-tertiary)] mx-0 my-2"></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">
              {t("dashboard.traits")}
            </div>
            <PlayerTraits player={player} />
          </div>
        </div>
      </div>
      {/* Media Narrative */}
      <div className="bg-card rounded-[1rem] border border-primary p-3 shadow-theme">
        <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
          <Icon name="Newspaper" size={12} className="text-blue-400" />
          {t("dashboard.mediaNarrative")}
        </h3>
        {(() => {
          const narrativeTextColors: Record<string, string> = {
            Prodigy: "text-cyan-300",
            "On the Rise": "text-blue-300",
            "Established Star": "text-purple-300",
            "Under Pressure": "text-orange-300",
            Journeyman: "text-slate-300",
            "Veteran Leader": "text-amber-300",
            "Forgotten Man": "text-gray-400",
            Flop: "text-rose-400",
            "Comeback Kid": "text-emerald-300",
            "Cult Hero": "text-yellow-300",
            "Hometown Hero": "text-yellow-300",
            "Polarizing Figure": "text-fuchsia-300",
            "Press Darling": "text-indigo-300",
            "System Player": "text-sky-300",
            "Injury Comeback": "text-teal-300",
          };

          const textClass =
            narrativeTextColors[player.mediaNarrative] || "text-slate-200";

          return (
            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg list-none">
              <div className="mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted mr-1.5">
                  {t("dashboard.narrative")}:
                </span>
                <span className={`text-xs font-semibold ${textClass}`}>
                  {t(
                    `mediaNarrative.${player.mediaNarrative.replace(/\s+/g, "")}.name`,
                  )}
                </span>
              </div>
              <p className="text-sm text-secondary leading-relaxed mb-2">
                {getMediaDescription(player.mediaNarrative, t)}
              </p>

              {/* Fan comments */}
              {(() => {
                // Use persistent comments if available, otherwise generate deterministically
                // The comments are now deterministic (seeded random) so they won't change on re-render
                const prev =
                  careerHistory.length > 1
                    ? careerHistory[careerHistory.length - 2]
                    : undefined;
                const comments = player.currentMediaComments?.length 
                  ? player.currentMediaComments 
                  : generateMediaComments(player, latestLog, prev, t);
                const toneClasses = {
                  positive:
                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
                  negative: "bg-rose-500/10 border-rose-500/20 text-rose-200",
                  neutral: "bg-slate-700/30 border-slate-600/50 text-slate-300",
                } as const;
                const sourceIconName = {
                  fan: "Users",
                  hater: "Frown",
                  pundit: "Mic",
                } as const;

                return (
                  <div className="space-y-1.5">
                    {comments.map((c, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded-md border ${toneClasses[c.tone]}`}
                      >
                        <Icon
                          name={
                            sourceIconName[c.source] as
                              | "Users"
                              | "Frown"
                              | "Mic"
                          }
                          size={12}
                          className="mt-0.5"
                        />
                        <p className="text-xs leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>

      {/* Player Status - Clickable */}
      <button
        onClick={onOpenPlayerStatus}
        className="w-full text-left bg-card rounded-[1rem] border border-primary p-4 shadow-theme hover:border-rose-500/50 hover:bg-rose-500/5 transition-all group"
      >
        <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2">
          <Icon name="HeartPulse" size={16} className="text-rose-400" />
          {t("dashboard.playerStatus")}
          <Icon
            name="ChevronRight"
            size={12}
            className="text-muted ml-auto group-hover:text-rose-400 transition-colors"
          />
        </h3>
        <StatusBars player={player} />
      </button>

      {/* Training Center - Clicável */}
      {onOpenTraining && !player.retired && (
        <button
          onClick={onOpenTraining}
          className="w-full text-left bg-card rounded-[1rem] border border-primary p-4 shadow-theme hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-purple-500/30 group-hover:bg-purple-500/30 transition-all">
                <Icon name="Dumbbell" size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  {t("dashboard.trainingCenter")}
                  <Icon
                    name="ChevronRight"
                    size={12}
                    className="text-muted group-hover:text-purple-400 transition-colors"
                  />
                </h3>
                <p className="text-sm text-muted">
                  {player.careerMode === "tactical"
                    ? t("dashboard.trainingAvailable")
                    : t("dashboard.trainingAuto")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wider">
                {t("dashboard.balance")}
              </p>
              <p className="font-bold text-emerald-400">
                {player.bankBalance && player.bankBalance >= 1_000_000
                  ? `€${(player.bankBalance / 1_000_000).toFixed(1)}M`
                  : player.bankBalance && player.bankBalance >= 1_000
                    ? `€${(player.bankBalance / 1_000).toFixed(0)}K`
                    : `€${(player.bankBalance || 0).toFixed(0)}`}
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Agent & Contract Section */}

      {/* Agent & Contract - Clickable */}
      <button
        onClick={onOpenAgentDetails}
        className="w-full text-left bg-card rounded-[1rem] border border-primary p-4 shadow-theme hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
      >
        <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2">
          <Icon name="UserCog" size={16} className="text-blue-400" />
          {t("dashboard.agentContract")}
          <Icon
            name="ChevronRight"
            size={12}
            className="text-muted ml-auto group-hover:text-blue-400 transition-colors"
          />
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-500/30 group-hover:bg-blue-500/30 transition-all">
            <Icon name="UserCog" size={20} className="text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-primary text-base truncate">
              {player.agent.name}
            </p>
            <p className="text-sm text-muted">
              {t("dashboard.agentDetails", {
                reputation: t(`agent.reputation.${player.agent.reputation}`),
                agent: t("dashboard.agent"),
                style: t(`agent.style.${player.agent.style}`),
                styleLabel: t("dashboard.style"),
              })}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted uppercase tracking-wider">
              {t("dashboard.contract")}
            </p>
            {player.retired || player.team?.name === "Free Agent" || player.team?.name === "Agente Livre" ? (
              <p className="font-bold text-muted text-lg">—</p>
            ) : (
              <p className="font-bold text-primary text-lg">
                {player.agentContractLength ?? 1}
                {t("common.yearSuffix")}
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Honors Preview - Clickable */}
      <HonorsPreview
        player={player}
        trophies={cleanTrophies}
        onOpenHonors={onOpenHonors}
      />

      {/* Contract Termination Button (migrado para OverviewTab) */}
      {onTerminateContract &&
        player.team.name !== "Free Agent" && player.team.name !== "Agente Livre" &&
        !player.retired &&
        player.contractLength > 0 && (
          <div className="mt-4 bg-red-950/20 border border-red-700/50 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Icon
                name="TriangleAlert"
                size={18}
                className="text-red-400 mt-0.5"
              />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-300 mb-1">
                  {t("contractTermination.title")}
                </p>
                <p className="text-[10px] text-red-400/80 mb-2 leading-relaxed">
                  {t("contractTermination.subtitle")}
                </p>
                <button
                  onClick={onTerminateContract}
                  className="w-full bg-red-900/50 hover:bg-red-800/60 border border-red-600 text-red-200 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                >
                  <Icon name="FileText" size={14} />
                  {t("contractTermination.title")}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

// Helper to safely display numbers (prevents NaN rendering)
const safeDisplay = (value: string | number): string | number => {
  if (typeof value === "number" && !Number.isFinite(value)) return 0;
  return value;
};

// Sub-components
const StatCard: React.FC<{
  label: string;
  value: string | number;
  color?: string;
}> = ({ label, value, color = "text-primary" }) => (
  <div className="bg-[var(--bg-secondary)] rounded-lg p-3 text-center border border-primary shadow-theme-sm">
    <p className={`text-xl sm:text-2xl font-bold ${color}`}>
      {safeDisplay(value)}
    </p>
    <p className="text-xs text-muted uppercase tracking-wider mt-1">{label}</p>
  </div>
);

const StatusBars: React.FC<{ player: Player }> = ({ player }) => {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <StatusBar
        label={t("dashboard.teamChemistry")}
        icon="Users"
        value={player.teamChemistry}
      />
      <StatusBar
        label={t("dashboard.clubApproval")}
        icon="ThumbsUp"
        value={player.clubApproval}
      />
    </div>
  );
};

const StatusBar: React.FC<{
  label: string;
  icon: IconName;
  value: number;
}> = ({ label, icon, value }) => {
  const getColor = () => {
    if (value >= 80)
      return {
        bg: "bg-green-500",
        text: "text-green-400",
        badge: "bg-green-600",
      };
    if (value >= 60)
      return {
        bg: "bg-yellow-500",
        text: "text-yellow-400",
        badge: "bg-yellow-600",
      };
    return { bg: "bg-red-500", text: "text-red-400", badge: "bg-red-600" };
  };

  const colors = getColor();

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <p className="text-secondary text-sm flex items-center gap-2">
          <Icon name={icon} size={14} className="text-muted" />
          {label}
        </p>
        <span
          className={`font-bold text-xs px-2 py-1 rounded-full ${colors.badge} text-white`}
        >
          {value}%
        </span>
      </div>
      <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colors.bg}`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
};

const HonorsPreview: React.FC<{
  player: Player;
  trophies: Record<string, number>;
  onOpenHonors?: () => void;
}> = ({ player, trophies, onOpenHonors }) => {
  const { t } = useI18n();

  // Get top 3 trophies
  const topTrophies = Object.entries(trophies)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Get top 3 awards
  const topAwards = Object.entries(player.awards)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const totalTrophies = Object.values(trophies).reduce((a, b) => a + b, 0);
  const totalAwards = Object.values(player.awards).reduce((a, b) => a + b, 0);

  const trophyIcons: Record<string, IconName> = {
    championsLeague: "Star",
    worldCup: "Globe",
    league: "Trophy",
    cup: "Shield",
    libertadores: "Trophy",
    afcChampionsLeague: "Star",
    clubWorldCup: "Globe",
    europaLeague: "Trophy",
    conferenceLeague: "BadgeCheck",
    copaSudamericana: "Trophy",
    continentalCup: "Globe", // Generic earth icon
    superCup: "Sun",
    stateCup: "MapPin",
    supercopaBrasil: "Award",
    recopaSudamericana: "Medal",
    fifaClubWorldCup: "Globe",
    intercontinentalCup: "Globe",
  };

  const awardIcons: Record<string, IconName> = {
    worldPlayerAward: "Trophy",
    topScorerAward: "SoccerBall",
    bestGoalkeeperAward: "Sparkles",
    youngPlayerAward: "Star",
    teamOfTheYear: "Users",
    continentalTopScorer: "Footprints",
    goalOfTheYear: "Zap",
    continentalPlayerAward: "Award",
    worldCupBestPlayer: "Globe",
    continentalCupPOTY: "Medal",
    leaguePlayerOfYear: "BadgeCheck",
    worldCupBestGoalkeeper: "Hand",
    continentalPOTY: "Award",
    leagueForwardOfYear: "Award",
    leagueMidfielderOfYear: "Award",
    leagueDefenderOfYear: "Award",
    leagueTopAssister: "Award",
    leagueRookieOfYear: "Award",
    comebackPlayerOfYear: "Award",
    worldCupTOTT: "Award",
    continentalTOTT: "Award",
    fifaBestAward: "Award",
    cupTopScorer: "Award",
    continentalCompetitionTopScorer: "Award",
  };

  // Helper to get translated trophy name
  const getTrophyName = (key: string): string => {
    // Try to find a direct translation key first
    const translationKey = `trophiesSection.${key}`;
    const translated = t(translationKey);
    if (translated && translated !== translationKey) return translated;

    // Fallback map for legacy keys or specific overrides
    const trophyMap: Record<string, string> = {
      stateChampionship: t("trophiesSection.stateCup"),
    };
    return trophyMap[key] || key.replace(/([A-Z])/g, " $1").trim();
  };

  // Helper to get translated award name
  const getAwardName = (key: string): string => {
    // Try to find a direct translation key first
    const translationKey = `awardsSection.${key}`;
    const translated = t(translationKey);
    if (translated && translated !== translationKey) return translated;

    return key.replace(/([A-Z])/g, " $1").trim();
  };

  if (totalTrophies === 0 && totalAwards === 0) {
    return null;
  }

  return (
    <button
      onClick={onOpenHonors}
      className="w-full text-left bg-card rounded-xl border border-primary p-4 shadow-theme hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
    >
      <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2">
        <Icon
          name="Trophy"
          size={16}
          className="text-amber-400"
          variant="solid"
        />
        {t("dashboard.honors")}
        <Icon
          name="ChevronRight"
          size={12}
          className="text-muted ml-auto group-hover:text-amber-400 transition-colors"
        />
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Trophies */}
        {topTrophies.length > 0 && (
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-primary shadow-theme-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon
                name="Trophy"
                size={14}
                className="text-amber-400"
                variant="solid"
              />
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                {t("dashboard.trophies")}
              </span>
            </div>
            <div className="space-y-1.5">
              {topTrophies.map(([key, count]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted truncate flex items-center gap-1.5">
                    <Icon
                      name="Trophy"
                      size={10}
                      className="text-amber-400"
                      variant="solid"
                    />
                    {getTrophyName(key)}
                  </span>
                  <span className="font-bold text-amber-400 ml-2">{count}</span>
                </div>
              ))}
              {totalTrophies > 3 && (
                <div className="text-xs text-muted text-center pt-1 border-t border-primary">
                  +
                  {totalTrophies -
                    topTrophies.reduce(
                      (sum, [_, count]) => sum + count,
                      0,
                    )}{" "}
                  {t("common.more") || "mais"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Awards */}
        {topAwards.length > 0 && (
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-primary shadow-theme-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon
                name="Trophy"
                size={14}
                className="text-purple-400"
                variant="solid"
              />
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                {t("dashboard.awards") || "Prêmios"}
              </span>
            </div>
            <div className="space-y-1.5">
              {topAwards.map(([key, count]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted truncate flex items-center gap-1.5">
                    <Icon
                      name="Trophy"
                      size={10}
                      className="text-purple-400"
                      variant="solid"
                    />
                    {getAwardName(key)}
                  </span>
                  <span className="font-bold text-purple-400 ml-2">
                    {count}
                  </span>
                </div>
              ))}
              {totalAwards > 3 && (
                <div className="text-xs text-muted text-center pt-1 border-t border-primary">
                  +
                  {totalAwards -
                    topAwards.reduce((sum, [_, count]) => sum + count, 0)}{" "}
                  {t("common.more") || "mais"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs text-muted group-hover:text-amber-300 transition-colors">
          {t("dashboard.viewFullHonors")}{" "}
          <span className="accent-secondary font-semibold">
            {t("dashboard.historyTab")}
          </span>
        </p>
      </div>
    </button>
  );
};

export default OverviewTab;
