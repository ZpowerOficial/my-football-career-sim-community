import React from "react";
import { useI18n } from "../contexts/I18nContext";
import type { ExtendedMatchStats, Player, SeasonStats } from "../types";
import { Icon } from "./ui/Icon";

interface CareerDetailedStatsViewProps {
  stats: SeasonStats;
  player: Player;
  onBack: () => void;
}

const StatItem: React.FC<{
  label: string;
  value: string | number | undefined;
}> = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="text-sm font-bold text-white">{value ?? "N/A"}</p>
  </div>
);

const CareerDetailedStatsView: React.FC<CareerDetailedStatsViewProps> = ({
  stats: careerStats,
  player,
  onBack,
}) => {
  const { t } = useI18n();
  const stats = careerStats.matchStats;

  if (!stats) {
    return (
      <div className="text-center py-10 text-slate-400">
        {t("careerStats.noStatsAvailable")}
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Icon name="ArrowLeft" size={16} />
        </button>
        <div>
          <h3 className="text-xl font-bold text-white">
            {t("history.careerDetailedStats")}
          </h3>
          <p className="text-sm text-slate-400">{player.name}</p>
        </div>
      </div>

      {/* General */}
      <div>
        <h4 className="text-lg font-bold text-white mb-2">
          {t("careerStats.general")}
        </h4>
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
          <StatItem label={t("detailedStats.matches")} value={stats.matches} />
          <StatItem
            label={t("detailedStats.teamOfTheWeek")}
            value={stats.teamOfTheWeek}
          />
        </div>
      </div>

      {/* Attacking */}
      <div>
        <h4 className="text-lg font-bold text-white mb-2">
          {t("careerStats.attacking")}
        </h4>
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
          <StatItem label={t("detailedStats.goals")} value={stats.goals} />
          <StatItem
            label={t("detailedStats.expectedGoals")}
            value={stats.expectedGoals?.toFixed(2) || "0.00"}
          />
          <StatItem
            label={t("detailedStats.goalsPerMatch")}
            value={stats.goalsPerMatch?.toFixed(2) || "0.00"}
          />
          <StatItem label={t("detailedStats.shots")} value={stats.shots} />
          <StatItem
            label={t("detailedStats.shotsPerGame")}
            value={stats.shotsOnTargetPerGame?.toFixed(2) || "0.00"}
          />
          <StatItem
            label={t("careerStats.bigChancesMissed")}
            value={stats.bigChancesMissed}
          />
          <StatItem
            label={t("detailedStats.goalConversion")}
            value={`${stats.goalConversion?.toFixed(1) || 0}%`}
          />
          <StatItem
            label={t("careerStats.freeKickGoals")}
            value={stats.freeKickGoals}
          />
          <StatItem
            label={t("careerStats.directFreeKickEffectiveness")}
            value={`${stats.directFreeKickEffectiveness?.toFixed(1) || 0}%`}
          />
          <StatItem
            label={t("careerStats.goalsFromInsideBox")}
            value={stats.goalsFromInsideBox}
          />
          <StatItem
            label={t("careerStats.goalsFromOutsideBox")}
            value={stats.goalsFromOutsideBox}
          />
          <StatItem
            label={t("careerStats.headedGoals")}
            value={stats.headedGoals}
          />
          <StatItem
            label={t("careerStats.leftFootGoals")}
            value={stats.leftFootGoals}
          />
          <StatItem
            label={t("careerStats.rightFootGoals")}
            value={stats.rightFootGoals}
          />
          <StatItem
            label={t("careerStats.penaltiesWon")}
            value={stats.penaltiesWon}
          />
        </div>
      </div>

      {/* Creativity & Passing */}
      <div>
        <h4 className="text-lg font-bold text-white mb-2">
          {t("careerStats.passing")}
        </h4>
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
          <StatItem label={t("dashboard.assists")} value={stats.assists} />
          <StatItem
            label={t("careerStats.expectedAssists")}
            value={stats.expectedAssists?.toFixed(2) || "0.00"}
          />
          <StatItem label={t("careerStats.touches")} value={stats.touches} />
          <StatItem
            label={t("careerStats.bigChancesCreated")}
            value={stats.bigChancesCreated}
          />
          <StatItem
            label={t("careerStats.keyPasses")}
            value={stats.keyPasses}
          />
          <StatItem
            label={t("detailedStats.passCompletion")}
            value={`${stats.passCompletion?.toFixed(1) || 0}%`}
          />
          <StatItem
            label={t("careerStats.passesInOwnHalf")}
            value={stats.passesInOwnHalf}
          />
          <StatItem
            label={t("careerStats.passesInFinalThird")}
            value={stats.passesInFinalThird}
          />
          <StatItem
            label={t("careerStats.accurateLongBalls")}
            value={stats.accurateLongBalls}
          />
          <StatItem
            label={t("careerStats.accurateThroughBalls")}
            value={stats.accurateThroughBalls}
          />
          <StatItem
            label={t("careerStats.accurateCrosses")}
            value={stats.accurateCrosses}
          />
        </div>
      </div>

      {/* Defensive */}
      <div>
        <h4 className="text-lg font-bold text-white mb-2">
          {t("careerStats.defending")}
        </h4>
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
          <StatItem
            label={t("careerStats.interceptions")}
            value={stats.interceptions}
          />
          <StatItem
            label={t("careerStats.tacklesPerGame")}
            value={stats.tacklesPerGame?.toFixed(2) || "0.00"}
          />
          <StatItem
            label={t("careerStats.ballRecoveriesInAttack")}
            value={stats.ballRecoveriesInAttack}
          />
          <StatItem
            label={t("careerStats.ballRecoveriesPerGame")}
            value={stats.ballRecoveriesPerGame?.toFixed(2) || "0.00"}
          />
          <StatItem
            label={t("careerStats.dribbledPastPerGame")}
            value={stats.dribbledPastPerGame?.toFixed(2) || "0.00"}
          />
          <StatItem
            label={t("careerStats.clearancesPerGame")}
            value={stats.clearancesPerGame?.toFixed(2) || "0.00"}
          />
          <StatItem
            label={t("careerStats.shotsBlockedPerGame")}
            value={stats.shotsBlockedPerGame?.toFixed(2) || "0.00"}
          />
          <StatItem
            label={t("careerStats.errorsLeadingToShot")}
            value={stats.errorsLeadingToShot}
          />
          <StatItem
            label={t("careerStats.errorsLeadingToGoal")}
            value={stats.errorsLeadingToGoal}
          />
          <StatItem
            label={t("careerStats.penaltiesConceded")}
            value={stats.penaltiesConceded}
          />
        </div>
      </div>

      {/* Duels */}
      <div>
        <h4 className="text-lg font-bold text-white mb-2">
          {t("careerStats.duels")}
        </h4>
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
          <StatItem
            label={t("careerStats.successfulDribbles")}
            value={`${stats.dribblesSuccessPercentage?.toFixed(1) || 0}%`}
          />
          <StatItem
            label={t("careerStats.duelsWon")}
            value={`${stats.duelsWonPercentage?.toFixed(1) || 0}%`}
          />
          <StatItem
            label={t("careerStats.groundDuelsWon")}
            value={`${stats.groundDuelsWonPercentage?.toFixed(1) || 0}%`}
          />
          <StatItem
            label={t("careerStats.aerialDuelsWon")}
            value={`${stats.aerialDuelsWonPercentage?.toFixed(1) || 0}%`}
          />
          <StatItem
            label={t("careerStats.possessionLost")}
            value={stats.possessionLost}
          />
        </div>
      </div>

      {/* Discipline */}
      <div>
        <h4 className="text-lg font-bold text-white mb-2">
          {t("careerStats.discipline")}
        </h4>
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
          <StatItem
            label={t("careerStats.foulsPerGame")}
            value={stats.foulsPerGame?.toFixed(2) || "0.00"}
          />
          <StatItem
            label={t("careerStats.foulsDrawn")}
            value={stats.foulsDrawn}
          />
          <StatItem label={t("careerStats.offsides")} value={stats.offsides} />
          <StatItem
            label={t("careerStats.yellowCards")}
            value={stats.yellowCards}
          />
          <StatItem
            label={t("careerStats.redCardsFromSecondYellow")}
            value={stats.redCardsFromSecondYellow}
          />
          <StatItem label={t("careerStats.redCards")} value={stats.redCards} />
        </div>
      </div>
    </div>
  );
};

export default CareerDetailedStatsView;
