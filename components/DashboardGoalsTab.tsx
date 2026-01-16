import React, { useState } from "react";
import { useI18n } from "../contexts/I18nContext";
import { translateNationality } from "@/utils/i18n";
import type { Player } from "../types";
import { Icon, type IconName } from "./ui/Icon";

// Collapsible section component for organizing goals
interface CollapsibleSectionProps {
  title: string;
  color: string;
  goals: any[];
  defaultOpen?: boolean;
  children: (goals: { active: any[]; completed: any[] }) => React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  color,
  goals,
  defaultOpen = true,
  children,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const active = goals.filter((g) => !g.isAchieved && !g.isExpired);
  const completed = goals.filter((g) => g.isAchieved || g.isExpired);
  const total = goals.length;
  const activeCount = active.length;

  if (total === 0) return null;

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left mb-3 group"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-200 flex items-center gap-2">
            <span className={`w-1 h-4 ${color} rounded-full`}></span>
            {title}
            <span className="text-xs font-normal text-slate-400 ml-1">
              ({activeCount}/{total})
            </span>
          </h3>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {activeCount} {t("goals.v2.active") || "active"}
              </span>
            )}
            <Icon
              name={isOpen ? "ChevronDown" : "ChevronRight"}
              size={16}
              className="text-slate-400 group-hover:text-slate-200 transition"
            />
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="space-y-3">
          {children({ active, completed })}
        </div>
      )}
    </div>
  );
};

interface GoalsTabProps {
  player: Player;
}

// FunÃ§Ã£o para obter recompensas baseadas no tipo/id do objetivo (evita depender de inglÃªs na descriÃ§Ã£o)
const getGoalRewards = (
  goal: any,
): {
  type:
  | "skillPoints"
  | "mediaBoost"
  | "teamChemistry"
  | "clubApproval"
  | "transferBudget"
  | "agentReputation";
  value: string;
  icon: IconName;
  color: string;
}[] => {
  const rewards = [] as Array<{
    type:
    | "skillPoints"
    | "mediaBoost"
    | "teamChemistry"
    | "clubApproval"
    | "transferBudget"
    | "agentReputation";
    value: string;
    icon: IconName;
    color: string;
  }>;
  const id: string = String(goal.id || "");

  if (
    id.startsWith("goal_") ||
    id.startsWith("century_goals") ||
    id.includes("first_goal")
  ) {
    rewards.push({
      type: "skillPoints",
      value: "+5",
      icon: "Star",
      color: "text-yellow-400",
    });
    rewards.push({
      type: "mediaBoost",
      value: "+10%",
      icon: "Megaphone",
      color: "text-blue-400",
    });
  } else if (id.startsWith("assist_")) {
    rewards.push({
      type: "skillPoints",
      value: "+3",
      icon: "Star",
      color: "text-yellow-400",
    });
    rewards.push({
      type: "teamChemistry",
      value: "+5%",
      icon: "Users",
      color: "text-purple-400",
    });
  } else if (id.includes("clean_sheet")) {
    rewards.push({
      type: "skillPoints",
      value: "+4",
      icon: "Star",
      color: "text-yellow-400",
    });
    rewards.push({
      type: "clubApproval",
      value: "+8%",
      icon: "ThumbsUp",
      color: "text-green-400",
    });
  } else if (id.includes("top_tier") || id.includes("transfer")) {
    rewards.push({
      type: "transferBudget",
      value: "+€2M",
      icon: "Euro",
      color: "text-emerald-400",
    });
    rewards.push({
      type: "agentReputation",
      value: "+15%",
      icon: "UserCog",
      color: "text-cyan-400",
    });
  } else {
    rewards.push({
      type: "skillPoints",
      value: "+2",
      icon: "Star",
      color: "text-yellow-400",
    });
    rewards.push({
      type: "mediaBoost",
      value: "+5%",
      icon: "Megaphone",
      color: "text-blue-400",
    });
  }

  return rewards;
};

// Determina a chave de i18n da descriÃ§Ã£o do objetivo a partir do id
const getGoalKey = (id: string): string | null => {
  if (!id) return null;
  if (id.startsWith("debut")) return "makeDebut";
  if (id.startsWith("first_clean_sheet")) return "firstCleanSheet";
  if (id.startsWith("first_goal")) return "firstProGoal";
  if (id.startsWith("regular_starter")) return "becomeRegularStarter";
  if (id.startsWith("goal_milestone")) return "reachCareerGoals";
  if (id.startsWith("assist_milestone")) return "reachCareerAssists";
  if (id.startsWith("ovr_target")) return "reachOverall";
  if (id.startsWith("first_trophy")) return "winFirstMajorTrophy";
  if (id.startsWith("national_team_callup")) return "earnCallUp";
  if (id.startsWith("top_tier")) return "playTopTier";
  if (id.startsWith("club_legend")) return "becomeClubLegend";
  if (id.startsWith("club_record")) return "breakClubRecord";
  if (id.startsWith("ballon_dor")) return "winBallonDor";
  if (id.startsWith("champions_league")) return "winChampionsLeague";
  if (id.startsWith("world_cup")) return "winWorldCup";
  if (id.startsWith("captain")) return "becomeCaptain";
  if (id.startsWith("century_goals")) return "score100CareerGoals";
  if (id.startsWith("decade_club")) return "spend10Years";
  if (id.startsWith("international_century")) return "reach100Caps";
  return null;
};

// Traduz a descriÃ§Ã£o de um objetivo, usando t() e preenchendo variÃ¡veis
const getGoalText = (
  t: (k: string) => string,
  goal: any,
  player: Player,
): string => {
  const key = getGoalKey(String(goal.id || ""));
  // If this is a V2 objective, allow a richer fallback text provided by the generator
  if (!key) {
    const fb = (goal as any)?.descriptionParams?.fallbackText;
    if (fb) return fb;

    const desc = String(goal.description || "");
    // Humanize V2 keys when translations are missing.
    if (desc.startsWith("goals.v2.")) {
      const tail = desc.replace(/^goals\.v2\./, "");
      const pretty = tail
        .replace(/([A-Z])/g, " $1")
        .replace(/\./g, " · ")
        .replace(/_/g, " ")
        .trim();
      return pretty.charAt(0).toUpperCase() + pretty.slice(1);
    }

    return desc;
  }
  const params: Record<string, any> = {};
  if (goal.context?.clubName || player.team?.name)
    params.club = goal.context?.clubName || player.team?.name;
  if (typeof goal.targetValue === "number") params.target = goal.targetValue;
  if (player.nationality)
    params.nationality = translateNationality(t, player.nationality);
  const template = t(`goals.desc.${key}`);
  // Simple interpolation for {param} tokens
  return Object.keys(params).reduce(
    (acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k])),
    template,
  );
};

const GoalsTab: React.FC<GoalsTabProps> = ({ player }) => {
  const { t } = useI18n();
  // Debug logging removed

  const formatBands = (goal: any): string | null => {
    const b = goal?.bands;
    if (!b) return null;

    const stretchLabel = t("goals.v2.bands.stretch") || "Stretch";
    const expectedLabel = t("goals.v2.bands.expected") || "Expected";
    const failLabel = t("goals.v2.bands.fail") || "Fail";

    // Team objective uses max thresholds (position)
    if (
      typeof b.expectedMax === "number" ||
      typeof b.stretchMax === "number" ||
      typeof b.failureMax === "number"
    ) {
      const stretch = typeof b.stretchMax === "number" ? `Top ${b.stretchMax}` : null;
      const expected = typeof b.expectedMax === "number" ? `Top ${b.expectedMax}` : null;
      const failure = typeof b.failureMax === "number" ? `>${b.failureMax}` : null;
      return [stretch && `${stretchLabel}: ${stretch}`, expected && `${expectedLabel}: ${expected}`, failure && `${failLabel}: ${failure}`]
        .filter(Boolean)
        .join(" • ");
    }

    const stretch = typeof b.stretchMin === "number" ? `≥${b.stretchMin}` : null;
    const expectedMin = typeof b.expectedMin === "number" ? `≥${b.expectedMin}` : null;
    const expectedMax = typeof b.expectedMax === "number" ? `≤${b.expectedMax}` : null;
    const failure = typeof b.failureMax === "number" ? `≤${b.failureMax}` : null;

    const expected = expectedMin || expectedMax ? `${expectedLabel}: ${[expectedMin, expectedMax].filter(Boolean).join(" ")}` : null;

    return [stretch && `${stretchLabel}: ${stretch}`, expected, failure && `${failLabel}: ${failure}`]
      .filter(Boolean)
      .join(" • ");
  };

  const formatOrigin = (goal: any): string | null => {
    if (!goal?.objectiveKind) return null;
    const origin = goal.origin || "club";
    const sev = goal.severity || "low";
    const originLabel = t(`goals.v2.origin.${origin}`) || origin;
    const sevLabel = t(`goals.v2.severity.${sev}`) || sev;
    return `${originLabel} • ${sevLabel}`;
  };

  const goals = [...(player.playerGoals || [])];

  const isV2 = (g: any) => !!g.objectiveKind;

  const bySection = {
    season: goals.filter(
      (g: any) =>
        isV2(g) &&
        g.deadline?.kind === "season" &&
        g.objectiveKind === "expectation" &&
        !g.isExpired,
    ),
    promises: goals.filter((g: any) => isV2(g) && g.objectiveKind === "promise"),
    chases: goals.filter(
      (g: any) =>
        isV2(g) &&
        (g.objectiveKind === "record" || g.objectiveKind === "legacy"),
    ),
    career: goals.filter(
      (g: any) =>
        (isV2(g) && g.objectiveKind === "milestone") ||
        (!isV2(g) && (g.type === "career" || g.type === "legacy")),
    ),
    legacyOther: goals.filter(
      (g: any) => !isV2(g) && g.type !== "career" && g.type !== "legacy",
    ),
  };

  // sort: active first
  const sortActive = (arr: any[]) =>
    arr.sort((a, b) => {
      if (a.isAchieved && !b.isAchieved) return 1;
      if (!a.isAchieved && b.isAchieved) return -1;
      return 0;
    });

  const sortedGoals = {
    season: sortActive(bySection.season),
    promises: sortActive(bySection.promises),
    chases: sortActive(bySection.chases),
    career: sortActive(bySection.career),
    legacyOther: sortActive(bySection.legacyOther),
  };

  const getGoalStatusColor = (goal: any) => {
    const progress = goal.targetValue
      ? (goal.currentValue || 0) / goal.targetValue
      : 0;
    if (goal.isAchieved) {
      return "bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500";
    }
    if (progress > 0.9) {
      return "bg-gradient-to-br from-amber-900/20 to-orange-900/10 border-amber-400";
    }
    if (progress > 0.7) {
      return "bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border-yellow-500/60";
    }
    return "bg-slate-800/60 border-slate-600/60 backdrop-blur-sm";
  };

  const getFlagIcon = (goal: any): { name: IconName; color: string } => {
    const progress = goal.targetValue
      ? (goal.currentValue || 0) / goal.targetValue
      : 0;
    if (goal.isAchieved) return { name: "Trophy", color: "text-yellow-400" };
    if (progress > 0.9) return { name: "Flame", color: "text-orange-400" };
    if (progress > 0.7) return { name: "FlagTriangleRight", color: "text-yellow-400" };
    return { name: "Flag", color: "text-slate-400" };
  };

  const getProgressColor = (goal: any) => {
    if (goal.isAchieved)
      return "bg-gradient-to-r from-green-500 to-emerald-500";
    const progress = goal.targetValue
      ? (goal.currentValue || 0) / goal.targetValue
      : 0;
    if (progress > 0.7) return "bg-gradient-to-r from-yellow-500 to-amber-500";
    return "bg-gradient-to-r from-blue-500 to-cyan-500";
  };

  const getCategoryIcon = (goal: any): IconName => {
    const id: string = String(goal.id || "");
    if (
      id.startsWith("goal_") ||
      id.includes("first_goal") ||
      id.startsWith("century_goals")
    )
      return "CircleDot";
    if (id.startsWith("assist_")) return "HandHelping";
    if (id.includes("clean_sheet")) return "ShieldHalf";
    if (
      id.includes("champions_league") ||
      id.includes("world_cup") ||
      goal.category === "Trophy"
    )
      return "Trophy";
    if (goal.category === "International" || id.includes("national_"))
      return "Flag";
    if (
      goal.category === "Loyalty" ||
      id.includes("club_legend") ||
      id.includes("decade_club")
    )
      return "Heart";
    if (
      goal.category === "Development" ||
      id.includes("ovr_target") ||
      id.includes("top_tier")
    )
      return "TrendingUp";
    if (goal.category === "Individual" || id.includes("ballon_dor"))
      return "Award";
    return "Target";
  };

  // Helper to render a goal card
  const renderGoalCard = (goal: any, i: number, showCompletedLabel = false) => {
    const progress = goal.targetValue
      ? Math.min(100, ((goal.currentValue || 0) / goal.targetValue) * 100)
      : 0;
    const rewards = getGoalRewards(goal);
    const isCompleted = goal.isAchieved || goal.isExpired;

    return (
      <div
        key={goal.id || i}
        className={`p-3 sm:p-4 lg:p-5 rounded-xl border-l-4 transition-all duration-300 hover:scale-[1.01] ${getGoalStatusColor(goal)} ${isCompleted ? "opacity-75" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Icon
              name={getFlagIcon(goal).name}
              size={24}
              variant="solid"
              className={getFlagIcon(goal).color}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon name={getCategoryIcon(goal)} size={12} className="text-slate-400" />
                <p
                  className={`font-bold text-sm sm:text-base lg:text-lg ${goal.isAchieved ? "text-green-300" : "text-white"}`}
                >
                  {getGoalText(t as any, goal, player)}
                </p>
              </div>

              {/* Simplified target display for V2 objectives */}
              {goal.objectiveKind && goal.targetValue && !goal.isAchieved && (
                <div className="mt-1 text-xs text-slate-400">
                  {t("goals.target") || "Target"}: <span className="text-slate-200 font-medium">{goal.targetValue}</span>
                </div>
              )}
            </div>
          </div>
          {isCompleted && (
            <span className={`text-xs px-2 py-1 rounded-full ${goal.isAchieved ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
              {goal.isAchieved ? t("goals.completed") : t("goals.expired") || "Expired"}
            </span>
          )}
        </div>

        {goal.targetValue && !goal.isAchieved && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{t("goals.progress")}</span>
              <span>
                {goal.currentValue || 0} / {goal.targetValue}
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor(goal)} shadow-lg`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {!isCompleted && rewards.length > 0 && (
          <div className="mt-3">
            <h5 className="text-xs text-slate-400 font-semibold mb-2">
              {t("goals.rewards.title")}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rewards.map((reward, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs sm:text-sm p-1.5 sm:p-2 rounded bg-slate-700/30"
                >
                  <Icon
                    name={reward.icon}
                    size={12}
                    className={`${reward.color} flex-shrink-0`}
                  />
                  <span className="text-slate-300 truncate">
                    {t(`goals.rewards.${reward.type}`)}:
                  </span>
                  <span className="font-semibold text-white ml-auto flex-shrink-0">
                    {reward.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to render goals grouped by active/completed
  const renderGoalGroup = (goals: { active: any[]; completed: any[] }) => (
    <>
      {goals.active.map((goal, i) => renderGoalCard(goal, i))}
      {goals.completed.length > 0 && goals.active.length > 0 && (
        <div className="flex items-center gap-2 my-2 opacity-60">
          <div className="flex-1 h-px bg-slate-600"></div>
          <span className="text-xs text-slate-500">{t("goals.completed") || "Completed"}</span>
          <div className="flex-1 h-px bg-slate-600"></div>
        </div>
      )}
      {goals.completed.map((goal, i) => renderGoalCard(goal, goals.active.length + i, true))}
    </>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* === THIS SEASON === */}
      <CollapsibleSection
        title={t("goals.v2.sections.thisSeason") || "This Season"}
        color="bg-blue-500"
        goals={sortedGoals.season}
        defaultOpen={true}
      >
        {renderGoalGroup}
      </CollapsibleSection>

      {/* === PROMISES === */}
      <CollapsibleSection
        title={t("goals.v2.sections.promises") || "Promises"}
        color="bg-amber-500"
        goals={sortedGoals.promises}
        defaultOpen={true}
      >
        {renderGoalGroup}
      </CollapsibleSection>

      {/* === CHASES === */}
      <CollapsibleSection
        title={t("goals.v2.sections.chases") || "Record Chases"}
        color="bg-purple-500"
        goals={sortedGoals.chases}
        defaultOpen={true}
      >
        {renderGoalGroup}
      </CollapsibleSection>

      {/* === CAREER === */}
      <CollapsibleSection
        title={t("goals.v2.sections.career") || "Career"}
        color="bg-emerald-500"
        goals={sortedGoals.career}
        defaultOpen={sortedGoals.season.length === 0}
      >
        {renderGoalGroup}
      </CollapsibleSection>

      {/* === LEGACY (OTHER) === */}
      <CollapsibleSection
        title={t("goals.legacyOther") || "Other Goals"}
        color="bg-slate-500"
        goals={sortedGoals.legacyOther}
        defaultOpen={sortedGoals.season.length === 0 && sortedGoals.career.length === 0}
      >
        {renderGoalGroup}
      </CollapsibleSection>

      {/* Estado vazio */}
      {sortedGoals.season.length === 0 &&
        sortedGoals.promises.length === 0 &&
        sortedGoals.chases.length === 0 &&
        sortedGoals.career.length === 0 &&
        sortedGoals.legacyOther.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="mb-4 sm:mb-6">
              <Icon name="ClipboardList" size={48} className="text-slate-600" />
            </div>
            <p className="text-slate-400 text-base sm:text-lg font-semibold mb-2">
              {t("goals.emptyTitle")}
            </p>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto px-4">
              {t("goals.emptyDescription")}
            </p>
          </div>
        )}
    </div>
  );
};

export default GoalsTab;
