import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import type {
  Player,
  CareerLog,
  Offer,
  Tactic,
  Trophies,
  Awards,
  SquadStatus,
  TraitName,
  MediaNarrative,
  Team,
} from "../types";
import { TRAIT_ICONS } from "../constants";
import { useI18n } from "../contexts/I18nContext";
import { translateCountry } from "../utils/i18n";
import { getLeagueName } from "../utils/competitionNames";
import {
  LEAGUES,
  getTeamsByTier,
  calculateLeagueReputation,
  LeagueData,
} from "../constants/leagues";
import { RIVALRIES } from "../constants/game";
import { getClubStars } from "../utils/functions";

import PlayerHeader from "./PlayerHeader";
import OverviewTab from "./DashboardOverviewTab";
import SocialMediaView from "./SocialMediaView";
import GoalsTab from "./DashboardGoalsTab";
import HistoryTab, { aggregateCareerStats } from "./DashboardHistoryTab";
import ExpandedPlayerProfileView from "./ExpandedPlayerProfileView";

import ContractTerminationModal from "./ContractTerminationModal";
import PlayerStatusModal from "./PlayerStatusModal";
import AgentContractModal from "./AgentContractModal";
import SeasonStatsModal from "./SeasonStatsModal";
import CareerTotalsModal from "./CareerTotalsModal";
import ShareCareerCard from "./ShareCareerCard";
import { shareCareerCard } from "../services/shareService";

import InteractiveEventModal from "./InteractiveEventModal";
import { Icon, type IconName } from "./ui/Icon";
import { StarRating } from "./ui/StarRating";
import LazyTab from "./ui/LazyTab";

import type { InteractiveEvent } from "../types/interactiveEventTypes";

// ==================== ERROR BOUNDARY ====================

class TabErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    t?: (key: string) => string;
  },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    t?: (key: string) => string;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[TabErrorBoundary] Error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      const errorMessage = t
        ? t("common.somethingWentWrong")
        : "Something went wrong. Please switch tabs.";

      return (
        this.props.fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Icon
                name="TriangleAlert"
                size={40}
                className="text-yellow-400 mb-3"
              />
              <p className="text-slate-300">{errorMessage}</p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// ==================== CONSTANTS ====================

const TABS = ["overview", "social", "profile", "goals", "history"] as const;
type TabType = (typeof TABS)[number];

const SWIPE_CONFIG = {
  minDistance: 50, // Reduced for easier swipe
  maxTime: 500, // Increased for slower swipes
  maxVerticalMovement: 60,
} as const;

// ==================== ANIMATED NUMBER ====================

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 600,
  className,
  prefix = "",
  suffix = "",
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    prevValueRef.current = value;

    if (startValue === endValue) return;

    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const currentAnimatedValue = Math.floor(
        easeProgress * (endValue - startValue) + startValue,
      );
      setDisplayValue(currentAnimatedValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

// ==================== BADGE COMPONENTS ====================

interface BadgeProps {
  text: string;
  colorClasses: string;
  icon?: IconName;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  colorClasses,
  icon,
  title,
}) => (
  <span
    className={`text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border ${colorClasses} flex-shrink-0 inline-flex items-center`}
    title={title}
  >
    {icon && <Icon name={icon} size={12} className="mr-1 sm:mr-1.5" />}
    <span className="truncate">{text}</span>
  </span>
);

// ==================== CLUB TIER STARS ====================

interface ClubTierStarsProps {
  team: Team;
  className?: string;
}

export const ClubTierStars: React.FC<ClubTierStarsProps> = ({
  team,
  className = "",
}) => {
  const stars = useMemo(() => getClubStars(team.reputation), [team.reputation]);

  return (
    <div title={`${stars.toFixed(1)} stars (${team.name})`}>
      <StarRating
        rating={stars}
        maxStars={5}
        size={12}
        filledColor="text-yellow-400"
        emptyColor="text-slate-700"
        className={className}
      />
    </div>
  );
};

// ==================== LEAGUE STRENGTH STARS (REFACTORED) ====================

interface LeagueStrengthStarsProps {
  team: Team;
  className?: string;
  overrideTier?: number;
}

export const LeagueStrengthStars: React.FC<LeagueStrengthStarsProps> = ({
  team,
  className = "",
  overrideTier,
}) => {
  const { t } = useI18n();
  const tierToUse = overrideTier ?? team.leagueTier;

  const leagueStars = useMemo(() => {
    const league = LEAGUES[team.country];
    if (!league) return 3; // fallback

    // Get teams from the same tier
    const sameTierTeams = getTeamsByTier(league, tierToUse);
    if (sameTierTeams.length < 5) return 3;

    // Sort by reputation
    const sorted = [...sameTierTeams].sort(
      (a, b) => b.reputation - a.reputation,
    );

    // Top 5 and rest
    const top5 = sorted.slice(0, 5);
    const restTeams = sorted.slice(5);

    // Convert each team's reputation to stars using getClubStars
    const top5Stars = top5.map((t) => getClubStars(t.reputation));
    const restStars = restTeams.map((t) => getClubStars(t.reputation));

    // Base stars = average of top 5 elite teams
    const top5AvgStars = top5Stars.reduce((sum, s) => sum + s, 0) / 5;

    // Calculate rest average (if exists)
    const restAvgStars =
      restTeams.length > 0
        ? restStars.reduce((sum, s) => sum + s, 0) / restTeams.length
        : top5AvgStars - 1;

    // Gap between elite and rest
    const gap = top5AvgStars - restAvgStars;

    // Adjustment based on gap:
    // - Gap < 1.5  → +0.5⭐ (very competitive/deep league)
    // - Gap 1.5-2.0 → no change (normal)
    // - Gap > 2.0  → -0.5⭐ (unequal league, elite too far ahead)
    let adjustment = 0;
    if (gap < 1.5) {
      adjustment = 0.5; // Liga profunda e competitiva
    } else if (gap > 2.0) {
      adjustment = -0.5; // Liga desigual
    }
    // Gap 1.5-2.0 = sem ajuste

    const finalStars = top5AvgStars + adjustment;

    // Round to nearest 0.5, clamped 0.5-5
    return Math.min(5, Math.max(0.5, Math.round(finalStars * 2) / 2));
  }, [team.country, tierToUse]);

  const displayCountry = translateCountry(t, team.country);

  return (
    <div
      className={`flex items-center text-yellow-400 text-xs flex-shrink-0 gap-1 ${className}`}
      title={`${getLeagueName(t, team.country, tierToUse)} (${leagueStars} stars)`}
    >
      <span className="text-slate-400 text-[10px] font-medium">
        {getLeagueName(t, team.country, tierToUse)}
      </span>
      <Icon name="Star" size={12} variant="solid" />
      <span className="font-bold">{leagueStars}</span>
    </div>
  );
};

// ==================== MEDIA NARRATIVE BADGE ====================

const NARRATIVE_INFO: Record<
  MediaNarrative,
  { color: string; icon: IconName }
> = {
  Prodigy: {
    color: "bg-cyan-400/20 border-cyan-300 text-cyan-200",
    icon: "Zap",
  },
  "On the Rise": {
    color: "bg-blue-400/20 border-blue-300 text-blue-200",
    icon: "TrendingUp",
  },
  "Established Star": {
    color: "bg-purple-400/20 border-purple-300 text-purple-200",
    icon: "Star",
  },
  "Under Pressure": {
    color: "bg-orange-400/20 border-orange-300 text-orange-200",
    icon: "Weight",
  },
  Journeyman: {
    color: "bg-slate-500/20 border-slate-400 text-slate-200",
    icon: "Briefcase",
  },
  "Veteran Leader": {
    color: "bg-amber-400/20 border-amber-300 text-amber-200",
    icon: "Crown",
  },
  "Forgotten Man": {
    color: "bg-gray-500/20 border-gray-400 text-gray-200",
    icon: "Ghost",
  },
  Flop: {
    color: "bg-rose-500/20 border-rose-400 text-rose-200",
    icon: "ThumbsDown",
  },
  "Comeback Kid": {
    color: "bg-emerald-400/20 border-emerald-300 text-emerald-200",
    icon: "PersonStanding",
  },
  "Cult Hero": {
    color: "bg-yellow-400/20 border-yellow-300 text-yellow-100",
    icon: "HeartHandshake",
  },
  "Hometown Hero": {
    color: "bg-yellow-400/20 border-yellow-300 text-yellow-100",
    icon: "House",
  },
  "Polarizing Figure": {
    color: "bg-fuchsia-400/20 border-fuchsia-300 text-fuchsia-200",
    icon: "Drama",
  },
  "Press Darling": {
    color: "bg-indigo-400/20 border-indigo-300 text-indigo-200",
    icon: "Newspaper",
  },
  "System Player": {
    color: "bg-sky-400/20 border-sky-300 text-sky-200",
    icon: "Network",
  },
  "Injury Comeback": {
    color: "bg-teal-400/20 border-teal-300 text-teal-200",
    icon: "HeartPulse",
  },
};

interface MediaNarrativeBadgeProps {
  narrative: MediaNarrative;
}

export const MediaNarrativeBadge: React.FC<MediaNarrativeBadgeProps> = ({
  narrative,
}) => {
  const { t } = useI18n();
  const info = NARRATIVE_INFO[narrative] || NARRATIVE_INFO["Journeyman"];

  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border ${info.color} flex-shrink-0 inline-flex items-center`}
      title={t("common.mediaNarrativeTitle")}
    >
      <i className={`${info.icon} mr-1 sm:mr-1.5`} />
      <span className="hidden xs:inline sm:inline">
        {t(`narrative.${narrative}`)}
      </span>
    </span>
  );
};

// ==================== PLAYER STATUS BADGES ====================

const STATUS_INFO: Record<SquadStatus, { color: string; icon: IconName }> = {
  "Key Player": {
    color: "bg-green-500/20 border-green-400 text-green-300",
    icon: "Key",
  },
  Rotation: {
    color: "bg-blue-500/20 border-blue-400 text-blue-300",
    icon: "RotateCw",
  },
  Prospect: {
    color: "bg-purple-500/20 border-purple-400 text-purple-300",
    icon: "Sprout",
  },
  Reserve: {
    color: "bg-gray-500/20 border-gray-400 text-gray-300",
    icon: "Clock",
  },
  Surplus: {
    color: "bg-red-500/20 border-red-400 text-red-300",
    icon: "ArrowDown",
  },
  Captain: {
    color: "bg-yellow-500/20 border-yellow-400 text-yellow-300",
    icon: "Crown",
  },
};

const MORALE_INFO: Record<Player["morale"], { color: string }> = {
  "Very High": { color: "bg-cyan-400/20 border-cyan-300 text-cyan-200" },
  High: { color: "bg-green-400/20 border-green-300 text-green-200" },
  Normal: { color: "bg-gray-400/20 border-gray-300 text-gray-200" },
  Low: { color: "bg-orange-400/20 border-orange-300 text-orange-200" },
  "Very Low": { color: "bg-red-400/20 border-red-300 text-red-200" },
};

interface PlayerStatusBadgesProps {
  player: Player;
}

export const PlayerStatusBadges: React.FC<PlayerStatusBadgesProps> = ({
  player,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <Badge
        text={t(`squadStatus.${player.squadStatus}`)}
        colorClasses={STATUS_INFO[player.squadStatus].color}
        icon={STATUS_INFO[player.squadStatus].icon}
        title={t("common.squadStatusTitle")}
      />
      <Badge
        text={t(`morale.${player.morale}`)}
        colorClasses={MORALE_INFO[player.morale].color}
        icon="Brain"
        title={t("common.moraleTitle")}
      />
      {player.injury && (
        <Badge
          text={t("dashboard.injured")}
          colorClasses="bg-red-600/30 border-red-500 text-red-300"
          icon="Briefcase"
        />
      )}
    </div>
  );
};

// ==================== PLAYER TRAITS ====================

const TRAIT_LEVEL_CONFIG = {
  Diamond: {
    color: "bg-cyan-400/20 border-cyan-300 text-cyan-200",
    badge: "◆",
  },
  Gold: {
    color: "bg-yellow-400/20 border-yellow-300 text-yellow-100",
    badge: "★",
  },
  Silver: {
    color: "bg-slate-300/20 border-slate-300 text-slate-200",
    badge: "◉",
  },
  Bronze: {
    color: "bg-orange-500/20 border-orange-400 text-orange-200",
    badge: "●",
  },
} as const;

interface PlayerTraitsProps {
  player: Player;
}

export const PlayerTraits: React.FC<PlayerTraitsProps> = ({ player }) => {
  const { t } = useI18n();
  const [expandedTrait, setExpandedTrait] = useState<string | null>(null);

  const translateTraitName = useCallback(
    (name: string): string => {
      const camel = name
        .toLowerCase()
        .replace(/[^a-z0-9]+([a-z0-9])/g, (_, c) => c.toUpperCase())
        .replace(/[^a-z0-9]/g, "");

      const attempts = [
        `traits.${name}`, // Nested JSON format: traits."One-Club Man"
        `trait.${name}`, // Flat format: trait.One-Club Man
        `trait.${camel}.name`,
        `trait.${camel}`,
        `characteristic.${name}`,
      ];

      for (const key of attempts) {
        const result = t(key);
        if (result !== key) return result;
      }

      return name;
    },
    [t],
  );

  // Helper to translate trait description (which may be a translation key like traitStyles.*)
  const translateTraitDescription = useCallback(
    (description: string): string => {
      // If description looks like a translation key, try to translate it
      if (description.match(/^(traitStyles|traits)\./)) {
        const translated = t(description);
        if (translated !== description) {
          return translated;
        }
      }
      return description;
    },
    [t],
  );

  if (!player.traits || player.traits.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center py-1.5">
        {t("noSpecialTraits")}
      </div>
    );
  }

  return (
    <div className="-mt-1">
      <div className="flex flex-wrap gap-1.5 items-center">
        {player.traits.map((trait) => {
          const isNegative = trait.name === "Injury Prone";
          const levelConfig =
            TRAIT_LEVEL_CONFIG[trait.level as keyof typeof TRAIT_LEVEL_CONFIG];
          const colorClasses = isNegative
            ? "bg-red-500/20 border-red-400 text-red-300"
            : levelConfig?.color ||
              "bg-slate-500/20 border-slate-400 text-slate-200";

          return (
            <button
              key={trait.name}
              onClick={() =>
                setExpandedTrait((prev) =>
                  prev === trait.name ? null : trait.name,
                )
              }
              className="transition-all duration-200 active:scale-95 hover:scale-105"
              type="button"
            >
              <Badge
                text={`${translateTraitName(trait.name)} ${levelConfig?.badge || ""}`}
                colorClasses={colorClasses}
                icon={
                  (TRAIT_ICONS[trait.name as TraitName] as IconName) ||
                  undefined
                }
                title={`${translateTraitName(trait.name)} (${t(`tier.${trait.level.toUpperCase()}`)})`}
              />
            </button>
          );
        })}
      </div>

      {expandedTrait && (
        <div className="mt-2 p-2 bg-slate-800/50 rounded-md border border-slate-700/50 animate-fade-in">
          <p className="text-[10px] text-slate-300 leading-relaxed">
            {translateTraitDescription(
              player.traits.find((t) => t.name === expandedTrait)
                ?.description || "",
            )}
          </p>
        </div>
      )}
    </div>
  );
};

// ==================== TROPHY DISPLAY ====================

interface TrophyDisplayProps {
  trophies: Trophies;
}

export const TrophyDisplay: React.FC<TrophyDisplayProps> = ({ trophies }) => {
  const { t } = useI18n();

  const trophyConfig: Record<string, { name: string; icon: IconName }> =
    useMemo(
      () => ({
        league: { name: t("trophy.league"), icon: "Trophy" },
        cup: { name: t("trophy.cup"), icon: "ShieldHalf" },
        championsLeague: {
          name: t("trophy.championsLeague"),
          icon: "Star",
        },
        libertadores: {
          name: t("trophy.libertadores"),
          icon: "Globe",
        },
        afcChampionsLeague: {
          name: t("trophy.afcChampionsLeague"),
          icon: "Globe",
        },
        clubWorldCup: {
          name: t("trophy.clubWorldCup"),
          icon: "Trophy",
        },
        worldCup: { name: t("trophy.worldCup"), icon: "Globe" },
        continentalCup: {
          name: t("trophy.continentalCup"),
          icon: "Globe",
        },
        europaLeague: {
          name: t("trophy.europaLeague"),
          icon: "Sparkles",
        },
        conferenceLeague: {
          name: t("trophy.conferenceLeague"),
          icon: "BadgeCheck",
        },
        copaSudamericana: {
          name: t("trophy.copaSudamericana"),
          icon: "Globe",
        },
        superCup: { name: t("trophy.superCup"), icon: "Sun" },
        stateCup: {
          name: t("trophy.stateCup"),
          icon: "MapPin",
        },
        supercopaBrasil: {
          name: t("trophy.supercopaBrasil"),
          icon: "Award",
        },
        recopaSudamericana: {
          name: t("trophy.recopaSudamericana"),
          icon: "Medal",
        },
        fifaClubWorldCup: {
          name: t("trophy.fifaClubWorldCup"),
          icon: "Globe",
        },
        intercontinentalCup: {
          name: t("trophy.intercontinentalCup"),
          icon: "Globe",
        },
      }),
      [t],
    );

  const wonTrophies = useMemo(
    () =>
      Object.entries(trophies)
        .filter(([_, count]) => (count as number) > 0)
        .map(([key, count]) => ({
          key: key as keyof Trophies,
          count: count as number,
        })),
    [trophies],
  );

  if (wonTrophies.length === 0) {
    return <span className="text-sm text-gray-400">{t("noTrophiesYet")}</span>;
  }

  return (
    <div className="flex flex-col items-start gap-2 text-sm text-yellow-300">
      {wonTrophies.map(({ key, count }) => (
        <div key={key} className="flex items-center gap-2">
          <Icon
            name={trophyConfig[key]?.icon || "Trophy"}
            size={16}
            variant="solid"
            className="w-4 text-center"
          />
          <span className="font-bold">{count}x</span>
          <span className="text-slate-300">
            {trophyConfig[key]?.name || String(key)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ==================== AWARD DISPLAY ====================

interface AwardDisplayProps {
  awards: Awards;
}

export const AwardDisplay: React.FC<AwardDisplayProps> = ({ awards }) => {
  const { t } = useI18n();

  const awardConfig: { key: string; name: string; icon: IconName }[] = useMemo(
    () => [
      {
        key: "ballonDor",
        name: t("award.ballonDor"),
        icon: "CircleDot",
      },
      {
        key: "goldenBoot",
        name: t("award.goldenBoot"),
        icon: "Footprints",
      },
      {
        key: "goldenGlove",
        name: t("award.goldenGlove"),
        icon: "Sparkles",
      },
      {
        key: "goldenBoy",
        name: t("award.goldenBoy"),
        icon: "Baby",
      },
      {
        key: "teamOfTheYear",
        name: t("award.teamOfTheYear"),
        icon: "Users",
      },
    ],
    [t],
  );

  const wonAwards = useMemo(
    () =>
      awardConfig.filter(
        (award) => (awards[award.key as keyof Awards] as number) > 0,
      ),
    [awards, awardConfig],
  );

  if (wonAwards.length === 0) return null;

  return (
    <div className="flex flex-col items-start gap-2 text-sm text-yellow-400">
      {wonAwards.map((award) => (
        <div key={award.key} className="flex items-center gap-2">
          <Icon name={award.icon} size={14} className="w-4 text-center" />
          <span className="font-bold">
            {awards[award.key as keyof Awards] as number}x
          </span>
          <span className="text-slate-300">{award.name}</span>
        </div>
      ))}
    </div>
  );
};

// ==================== TAB BUTTON ====================

interface TabButtonProps {
  text: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  text,
  icon,
  isActive,
  onClick,
}) => (
  <button
    onClick={onClick}
    type="button"
    className={`flex-1 min-w-[80px] py-2.5 sm:py-3 text-sm font-semibold transition-all duration-200 focus:outline-none transform active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 ${
      isActive
        ? "accent-secondary border-b-2 border-[var(--accent-secondary)]"
        : "text-muted hover:text-secondary"
    }`}
  >
    <Icon name={icon} size={16} className="text-current" />
    <span className="hidden xs:inline">{text}</span>
  </button>
);

// ==================== SQUAD STATUS TAG ====================

interface SquadStatusTagProps {
  status: SquadStatus;
}

const SquadStatusTag: React.FC<SquadStatusTagProps> = ({ status }) => {
  const { t } = useI18n();

  const statusColors: Record<SquadStatus, string> = {
    "Key Player": "bg-green-500/20 text-green-300 border-green-400/30",
    Rotation: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    Prospect: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    Reserve: "bg-gray-500/20 text-gray-300 border-gray-400/30",
    Surplus: "bg-red-500/20 text-red-300 border-red-400/30",
    Captain: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
  };

  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColors[status]} flex-shrink-0`}
    >
      {t(`squadStatus.${status}`)}
    </span>
  );
};

// ==================== ACTION BAR ====================

interface ActionBarProps {
  transferOffers: Offer[];
  onAcceptOffer: (offer: Offer) => void;
  onStay: () => void;
  onNextSeason: () => void;
  player: Player;
  isForcedToMove: boolean;
  onTerminateContract?: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  transferOffers,
  onAcceptOffer,
  onStay,
  onNextSeason,
  player,
  isForcedToMove,
}) => {
  const { t } = useI18n();
  const isFreeAgent = player.team?.name === "Free Agent";

  if (transferOffers.length > 0) {
    return (
      <div className="animate-fade-in">
        <h3 className="text-center font-semibold mb-3 text-slate-200 flex items-center justify-center gap-2">
          <Icon name="MailOpen" size={16} className="text-blue-400" />
          {t("offersReceived")}
        </h3>

        <div
          className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-hide mb-3 pr-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {transferOffers.map((offer, index) => {
            const wageDiff =
              offer.type === "transfer"
                ? Number(offer.wage || 0) - player.wage
                : 0;

            // Check rivalry intensity (0-100)
            const rivalry = RIVALRIES.find(
              (r: { team1: string; team2: string; intensity: number }) =>
                (r.team1 === player.team.name && r.team2 === offer.team.name) ||
                (r.team2 === player.team.name && r.team1 === offer.team.name),
            );
            const rivalryIntensity = rivalry?.intensity || 0;

            // Determine rivalry level for styling
            const isTraitor = rivalryIntensity === 100; // Real vs Barça, Boca vs River
            const isHistoricRival =
              rivalryIntensity >= 90 && rivalryIntensity < 100;
            const isRival = rivalryIntensity >= 80 && rivalryIntensity < 90;
            const hasRivalry = rivalryIntensity >= 80;

            // Get rivalry badge text and color
            const getRivalryBadge = () => {
              if (isTraitor)
                return {
                  text: t("events.transfer.traitor"),
                  color: "bg-red-700",
                  pulse: true,
                };
              if (isHistoricRival)
                return {
                  text: t("events.transfer.historicRival"),
                  color: "bg-red-600",
                  pulse: false,
                };
              if (isRival)
                return {
                  text: t("events.transfer.rival"),
                  color: "bg-orange-600",
                  pulse: false,
                };
              return null;
            };
            const badge = getRivalryBadge();

            return (
              <div
                key={`offer-${index}`}
                className={`p-2.5 sm:p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2 animate-fade-in-up transition-colors ${
                  isTraitor
                    ? "bg-red-900/50 border-2 border-red-500 shadow-lg shadow-red-500/30"
                    : isHistoricRival
                      ? "bg-red-900/30 border-2 border-red-500/70 hover:border-red-400"
                      : isRival
                        ? "bg-orange-900/20 border-2 border-orange-500/60 hover:border-orange-400"
                        : "bg-slate-800/80 border border-slate-700/60 hover:border-slate-600/80"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p
                      className={`font-bold truncate ${isTraitor ? "text-red-300" : hasRivalry ? "text-red-300" : "text-slate-200"}`}
                    >
                      {offer.team.name}
                    </p>
                    {badge && (
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badge.color} text-white ${badge.pulse ? "animate-pulse" : ""}`}
                      >
                        ⚔️ {badge.text}
                      </span>
                    )}
                    <ClubTierStars team={offer.team} />
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span
                      className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                        offer.type === "loan"
                          ? "bg-blue-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {offer.type === "loan"
                        ? t("offer.type.loan")
                        : t("offer.type.transfer")}
                    </span>
                    <SquadStatusTag status={offer.expectedSquadStatus} />
                    {offer.type === "transfer" &&
                      (() => {
                        const newWage = Number(offer.wage || 0);
                        const currentWage = player.wage || 1;
                        const percentChange = Math.round(
                          ((newWage - currentWage) / currentWage) * 100,
                        );
                        const isPositive = wageDiff > 0;
                        // Only show % if it's reasonable (<1000%)
                        const showPercent = Math.abs(percentChange) < 1000;

                        return (
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}
                            >
                              {t("common.currencySymbol")}
                              {newWage.toLocaleString("pt-BR")}
                              {t("common.perWeekSuffix")}
                            </span>
                            {showPercent && (
                              <span
                                className={`text-[9px] font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}
                              >
                                {isPositive ? "+" : ""}
                                {percentChange}%
                              </span>
                            )}
                          </span>
                        );
                      })()}
                  </div>
                </div>
                <button
                  onClick={() => onAcceptOffer(offer)}
                  type="button"
                  className="sm:ml-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-95 transform transition text-white font-bold text-sm py-2 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <Icon name="Check" size={14} />
                  {t("accept")}
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {!isForcedToMove ? (
            <button
              onClick={onStay}
              type="button"
              className="w-full bg-slate-600 hover:bg-slate-500 active:bg-slate-700 transition-colors text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Icon name="House" size={14} />
              {t("stayAt", { team: player.team.name })}
            </button>
          ) : (
            <div className="text-center text-sm text-amber-400 p-3 bg-amber-900/20 rounded-lg border border-amber-700/50 flex items-start gap-2">
              <Icon
                name="TriangleAlert"
                size={14}
                className="flex-shrink-0 mt-0.5"
              />
              <span>{t("forcedMoveMessage")}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!isFreeAgent && (
        <button
          onClick={onNextSeason}
          type="button"
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 active:from-green-700 active:to-blue-700 transition-all text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"
        >
          <Icon name="FastForward" size={14} />
          {t("dashboard.nextSeason")}
        </button>
      )}
    </div>
  );
};

// ==================== FINISHED BAR ====================

interface FinishedBarProps {
  onShowLeaderboard: () => void;
  onRestart: () => void;
  onShare: () => void;
  isSharing: boolean;
}

const FinishedBar: React.FC<FinishedBarProps> = ({
  onShowLeaderboard,
  onRestart,
  onShare,
  isSharing,
}) => {
  const { t } = useI18n();

  return (
    <div className="text-center animate-fade-in">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Icon name="FlagTriangleRight" size={24} className="text-emerald-400" />
        <p className="text-lg font-bold text-secondary">
          {t("dashboard.careerFinished")}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onShowLeaderboard}
          type="button"
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:from-blue-700 active:to-purple-700 transition-all text-white font-bold py-3 px-4 rounded-lg shadow-theme-lg flex items-center justify-center gap-2"
        >
          <Icon name="Trophy" size={14} variant="solid" />
          {t("setup.leaderboard")}
        </button>
        <button
          onClick={onRestart}
          type="button"
          className="flex-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] active:bg-[var(--bg-primary)] transition-colors text-primary font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 border border-primary shadow-theme"
        >
          <Icon name="RotateCw" size={14} />
          {t("dashboard.playAgain")}
        </button>
      </div>
      <div className="mt-2">
        <button
          onClick={onShare}
          disabled={isSharing}
          type="button"
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 transition-all text-white font-bold py-3 px-4 rounded-lg shadow-theme-lg flex items-center justify-center gap-2"
        >
          {isSharing ? (
            <Icon name="Loader" size={14} className="animate-spin" />
          ) : (
            <Icon name="Share2" size={14} />
          )}
          {t("share")}
        </button>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

interface CareerDashboardProps {
  player: Player;
  careerHistory: CareerLog[];
  transferOffers: Offer[];
  tactic: Tactic;
  onNextSeason: () => void;
  onAcceptOffer: (offer: Offer) => void;
  onStay: () => void;
  onRestart: () => void;
  isFinished: boolean;
  isSimulating: boolean;
  onShowLeaderboard: () => void;
  onTacticChange: (tactic: Tactic) => void;
  isForcedToMove: boolean;
  onConfirmContractTermination?: (player: Player) => void;
  onOpenTraining?: () => void;
  onPlayerUpdate?: (player: Player) => void;
}

// Persist history tab selection across re-renders/seasons
let savedHistorySubTab = "overview";
let savedExpandedProfileTab = "profile";

const CareerDashboard: React.FC<CareerDashboardProps> = (props) => {
  const {
    player,
    careerHistory,
    transferOffers,
    onAcceptOffer,
    onStay,
    onNextSeason,
    isFinished,
    isSimulating,
    isForcedToMove,
    onShowLeaderboard,
    onRestart,
    onConfirmContractTermination,
    onOpenTraining,
    onPlayerUpdate,
  } = props;

  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [activeHistorySubTab, setActiveHistorySubTab] =
    useState(savedHistorySubTab);

  const handleHistorySubTabChange = useCallback((tab: string) => {
    savedHistorySubTab = tab;
    setActiveHistorySubTab(tab);
  }, []);

  const [activeExpandedProfileTab, setActiveExpandedProfileTab] = useState(
    savedExpandedProfileTab,
  );

  const handleExpandedProfileTabChange = useCallback((tab: string) => {
    savedExpandedProfileTab = tab;
    setActiveExpandedProfileTab(tab);
  }, []);
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [showPlayerStatusModal, setShowPlayerStatusModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showSeasonStatsModal, setShowSeasonStatsModal] = useState(false);
  const [showCareerTotalsModal, setShowCareerTotalsModal] = useState(false);

  const [showInteractiveEvent, setShowInteractiveEvent] = useState(false);
  const [currentInteractiveEvent, setCurrentInteractiveEvent] =
    useState<InteractiveEvent | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Get current interactive event from player's active events
  const activeEvents = useMemo(() => {
    return player.eventState?.activeEvents || [];
  }, [player.eventState?.activeEvents]);

  // Auto-show pending interactive events when they exist (TACTICAL MODE ONLY)
  useEffect(() => {
    // Only show interactive events in tactical mode
    if (player.careerMode !== "tactical") {
      return;
    }
    
    // Don't show if already showing an event or if no events
    if (showInteractiveEvent || activeEvents.length === 0) {
      return;
    }
    
    // Get the first unprocessed event (priority: critical first, then by deadline)
    const urgentEvent = activeEvents.find(e => e.severity === 'critical');
    const nextEvent = urgentEvent || activeEvents[0];
    
    if (nextEvent) {
      // Small delay to allow UI to settle after simulation
      const timer = setTimeout(() => {
        setCurrentInteractiveEvent(nextEvent);
        setShowInteractiveEvent(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [activeEvents, showInteractiveEvent, player.careerMode]);

  // Handle opening an interactive event modal
  const handleOpenInteractiveEvent = useCallback((event: InteractiveEvent) => {
    setCurrentInteractiveEvent(event);
    setShowInteractiveEvent(true);
  }, []);

  // Handle player update from events
  const handlePlayerUpdate = useCallback(
    (updatedPlayer: Player) => {
      if (onPlayerUpdate) {
        onPlayerUpdate(updatedPlayer);
      }
    },
    [onPlayerUpdate],
  );

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      // Small delay to ensure render
      await new Promise((resolve) => setTimeout(resolve, 100));
      await shareCareerCard("share-career-card");
    } catch (error) {
      console.error("Share failed", error);
    } finally {
      setIsSharing(false);
    }
  };

  const latestLog = careerHistory[careerHistory.length - 1];

  // Aggregate career stats for profile view
  const careerStats = useMemo(() => {
    const proHistory = careerHistory
      .slice(1)
      .filter((log) => !log.team?.isYouth);
    if (proHistory.length === 0) return undefined;
    const stats = aggregateCareerStats(proHistory, player.stats.preferredFoot);
    return stats.matchStats;
  }, [careerHistory, player.stats.preferredFoot]);

  // Swipe handling
  const touchState = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest(
      'button, a, select, input, textarea, [role="button"], .recharts-surface, .recharts-wrapper, table',
    );

    if (isInteractive) {
      touchState.current.isTracking = false;
      return;
    }

    touchState.current = {
      startX: e.targetTouches[0].clientX,
      startY: e.targetTouches[0].clientY,
      startTime: Date.now(),
      isTracking: true,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchState.current.isTracking) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const horizontalDistance = touchState.current.startX - endX;
      const verticalDistance = Math.abs(touchState.current.startY - endY);
      const swipeTime = Date.now() - touchState.current.startTime;

      const isValidSwipe =
        Math.abs(horizontalDistance) > SWIPE_CONFIG.minDistance &&
        verticalDistance < SWIPE_CONFIG.maxVerticalMovement &&
        swipeTime < SWIPE_CONFIG.maxTime;

      if (!isValidSwipe) return;

      const currentIndex = TABS.indexOf(activeTab);

      if (horizontalDistance > 0 && currentIndex < TABS.length - 1) {
        setSwipeDirection("left");
        setActiveTab(TABS[currentIndex + 1]);
      } else if (horizontalDistance < 0 && currentIndex > 0) {
        setSwipeDirection("right");
        setActiveTab(TABS[currentIndex - 1]);
      }

      touchState.current.isTracking = false;
    },
    [activeTab],
  );

  const handleTerminateContract = useCallback(() => {
    setShowTerminationModal(true);
  }, []);

  const handleConfirmTermination = useCallback(
    (updatedPlayer: Player) => {
      onConfirmContractTermination?.(updatedPlayer);
      setShowTerminationModal(false);
    },
    [onConfirmContractTermination],
  );

  const renderTabContent = () => {
    return (
      <>
        <LazyTab name="overview" isActive={activeTab === "overview"}>
          <OverviewTab
            player={player}
            latestLog={latestLog}
            careerHistory={careerHistory}
            onTerminateContract={handleTerminateContract}
            onOpenTraining={onOpenTraining}
            onOpenPlayerStatus={() => setShowPlayerStatusModal(true)}
            onOpenAgentDetails={() => setShowAgentModal(true)}
            onOpenSeasonStats={() => setShowSeasonStatsModal(true)}
            onOpenCareerTotals={() => setShowCareerTotalsModal(true)}
            onOpenHonors={() => {
              setActiveTab("history");
              handleHistorySubTabChange("honors");
            }}
          />
        </LazyTab>

        <LazyTab name="social" isActive={activeTab === "social"}>
          <SocialMediaView 
            player={player} 
            socialData={player.socialData}
            currentSeasonLog={latestLog}
            currentSeason={careerHistory.length}
          />
        </LazyTab>

        <LazyTab name="profile" isActive={activeTab === "profile"}>
          <ExpandedPlayerProfileView
            player={player}
            careerStats={careerStats}
            activeTab={activeExpandedProfileTab}
            onTabChange={handleExpandedProfileTabChange}
          />
        </LazyTab>

        <LazyTab name="goals" isActive={activeTab === "goals"}>
          <GoalsTab player={player} />
        </LazyTab>

        <LazyTab name="history" isActive={activeTab === "history"}>
          <HistoryTab
            history={careerHistory}
            player={player}
            onTerminateContract={handleTerminateContract}
            activeSubTab={activeHistorySubTab}
            onSubTabChange={handleHistorySubTabChange}
          />
        </LazyTab>
      </>
    );
  };

  if (isSimulating) {
    return null;
  }

  // Guard: Show loading when data is not ready yet
  if (!latestLog || !latestLog.stats) {
    return (
      <div className="bg-slate-900 text-white flex items-center justify-center h-full w-full">
        <div className="text-center">
          <Icon
            name="CircleDot"
            size={48}
            className="text-[var(--accent-primary)] mb-4 animate-spin"
          />
          <p className="text-[var(--text-secondary)]">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white flex flex-col h-full w-full font-sans min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">
        <PlayerHeader
          player={player}
          overrideLeagueTier={
            latestLog &&
            latestLog.team.id === player.team.id &&
            latestLog.team.leagueTier !== player.team.leagueTier
              ? latestLog.team.leagueTier
              : undefined
          }
        />
      </div>

      {/* Tab Navigation */}
      <div
        className="flex border-y border-slate-700 bg-slate-800 overflow-x-auto scrollbar-hide flex-shrink-0 scroll-snap-x scroll-smooth"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <TabButton
          text={t("dashboard.overview")}
          icon="UserCheck"
          isActive={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        />
        <TabButton
          text={t("dashboard.social")}
          icon="Hash"
          isActive={activeTab === "social"}
          onClick={() => setActiveTab("social")}
        />
        <TabButton
          text={t("dashboard.profile")}
          icon="IdCard"
          isActive={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
        />
        <TabButton
          text={t("dashboard.goalsTab")}
          icon="Target"
          isActive={activeTab === "goals"}
          onClick={() => setActiveTab("goals")}
        />
        <TabButton
          text={t("dashboard.history")}
          icon="History"
          isActive={activeTab === "history"}
          onClick={() => setActiveTab("history")}
        />
      </div>

      {/* Tab Content */}
      <div
        className="flex-grow overflow-y-auto scrollbar-hide min-h-0"
        style={{ WebkitOverflowScrolling: "touch" }}
        onTouchStart={handleTouchStart}
      >
        <div
          key={activeTab}
          className="p-3 sm:p-4"
          onAnimationEnd={() => setSwipeDirection(null)}
        >
          <TabErrorBoundary key={activeTab} t={t}>
            {renderTabContent()}
          </TabErrorBoundary>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-3 sm:p-4 bg-gradient-to-t from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-transparent border-t border-primary flex-shrink-0 shadow-theme-lg">
        {isFinished ? (
          <FinishedBar
            onShowLeaderboard={onShowLeaderboard}
            onRestart={onRestart}
            onShare={handleShare}
            isSharing={isSharing}
          />
        ) : (
          <ActionBar
            transferOffers={transferOffers}
            onAcceptOffer={onAcceptOffer}
            onStay={onStay}
            onNextSeason={onNextSeason}
            player={player}
            isForcedToMove={isForcedToMove}
            onTerminateContract={handleTerminateContract}
          />
        )}
      </div>

      {/* Contract Termination Modal */}
      <ContractTerminationModal
        player={player}
        isOpen={showTerminationModal}
        onClose={() => setShowTerminationModal(false)}
        onConfirm={handleConfirmTermination}
      />

      {/* Player Status Modal */}
      <PlayerStatusModal
        player={player}
        isOpen={showPlayerStatusModal}
        onClose={() => setShowPlayerStatusModal(false)}
      />

      {/* Agent & Contract Modal */}
      <AgentContractModal
        player={player}
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onPlayerUpdate={onPlayerUpdate}
      />

      {/* Season Stats Modal */}
      <SeasonStatsModal
        player={player}
        latestLog={latestLog}
        isOpen={showSeasonStatsModal}
        onClose={() => setShowSeasonStatsModal(false)}
      />

      {/* Career Totals Modal */}
      <CareerTotalsModal
        player={player}
        careerHistory={careerHistory}
        isOpen={showCareerTotalsModal}
        onClose={() => setShowCareerTotalsModal(false)}
      />

      {/* Interactive Event Modal */}
      <InteractiveEventModal
        event={currentInteractiveEvent}
        player={player}
        isOpen={showInteractiveEvent}
        onClose={() => {
          setShowInteractiveEvent(false);
          setCurrentInteractiveEvent(null);
        }}
        onPlayerUpdate={handlePlayerUpdate}
      />

      {/* Hidden Share Card */}
      <ShareCareerCard
        player={player}
        history={careerHistory}
        awards={player.awards}
      />
    </div>
  );
};

export default CareerDashboard;
