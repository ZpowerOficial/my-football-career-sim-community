import React from "react";
import { useI18n } from "../contexts/I18nContext";
import type { CareerLog, Player } from "../types";

// Helper to safely handle numbers (prevents NaN rendering)
const safeNum = (value: number | undefined | null, fallback = 0): number =>
  value != null && Number.isFinite(value) ? value : fallback;

interface SeasonBySeasonTableProps {
  history: CareerLog[];
  player: Player;
  onViewDetails: (log: CareerLog) => void;
}

const SeasonBySeasonTable: React.FC<SeasonBySeasonTableProps> = ({
  history,
  player,
  onViewDetails,
}) => {
  const { t } = useI18n();
  const isGoalkeeper = player.position === "GK";

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
        <h3 className="text-sm sm:text-base font-bold text-white">
          {t("history.seasonBySeason")}
        </h3>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden divide-y divide-slate-700/30">
        {history.slice(1).map((log, index) => (
          <div
            key={index}
            className="p-4 hover:bg-slate-700/20 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-slate-400 text-xs mb-1">
                  {t("history.season")} {index + 14}</div>
                <div className="font-bold text-white text-sm">
                  {log.team.name}
                </div>
                {log.team.league &&
                  typeof log.team.league === "object" &&
                  "name" in log.team.league && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {log.team.league.name}
                    </div>
                  )}
              </div>
              <button
                onClick={() => onViewDetails(log)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs whitespace-nowrap"
              >
                {t("history.details")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/40 rounded-lg p-2.5">
                <div className="text-xs text-slate-400 mb-1">
                  {t("dashboard.matches")}
                </div>
                <div className="text-base font-bold text-white">
                  {log.stats.matchesPlayed}
                </div>
              </div>

              {isGoalkeeper ? (
                <>
                  <div className="bg-slate-900/40 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-1">
                      {t("dashboard.cleanSheets")}
                    </div>
                    <div className="text-base font-bold text-emerald-400">
                      {log.stats.matchStats?.cleanSheets ?? log.stats.cleanSheets ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-1">
                      {t("detailedStats.goalsConceded")}
                    </div>
                    <div className="text-base font-bold text-red-400">
                      {log.stats.matchStats?.goalsConceded || 0}
                    </div>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-1">
                      {t("detailedStats.savePercentage")}
                    </div>
                    <div className="text-base font-bold text-yellow-400">
                      {log.stats.matchStats?.savePercentage
                        ? `${safeNum(log.stats.matchStats.savePercentage).toFixed(1)}%`
                        : "N/A"}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-900/40 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-1">
                      {t("dashboard.goals")}
                    </div>
                    <div className="text-base font-bold text-emerald-400">
                      {safeNum(log.stats.goals)}
                    </div>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-1">
                      {t("dashboard.assists")}
                    </div>
                    <div className="text-base font-bold text-violet-400">
                      {safeNum(log.stats.assists)}
                    </div>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-1">
                      {t("history.ratingShort")}
                    </div>
                    <div className="text-base font-bold text-yellow-400">
                      {safeNum(log.stats.averageRating, 6.0).toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/50">
              <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("history.season")}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("history.clubs")}
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("dashboard.matches")}
              </th>

              {isGoalkeeper ? (
                <>
                  <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("dashboard.cleanSheets")}
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("detailedStats.goalsConceded")}
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("detailedStats.savePercentage")}
                  </th>
                </>
              ) : (
                <>
                  <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("dashboard.goals")}
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("dashboard.assists")}
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("history.ratingShort")}
                  </th>
                </>
              )}
              <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("common.actions") || "Actions"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {history.slice(1).map((log, index) => (
              <tr
                key={index}
                className="hover:bg-slate-700/30 transition-colors"
              >
                <td className="px-4 py-3 text-slate-300 font-medium">
                  {index + 14}
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm">
                      {log.team.name}
                    </div>
                    {log.team.league &&
                      typeof log.team.league === "object" &&
                      "name" in log.team.league && (
                        <div className="text-xs text-slate-400 truncate">
                          {log.team.league.name}
                        </div>
                      )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-slate-300 font-medium">
                  {safeNum(log.stats.matchesPlayed)}
                </td>

                {isGoalkeeper ? (
                  <>
                    <td className="px-4 py-3 text-center text-emerald-400 font-bold">
                      {safeNum(log.stats.matchStats?.cleanSheets ?? log.stats.cleanSheets)}
                    </td>
                    <td className="px-4 py-3 text-center text-red-400 font-bold">
                      {safeNum(log.stats.matchStats?.goalsConceded)}
                    </td>
                    <td className="px-4 py-3 text-center text-yellow-400 font-bold">
                      {log.stats.matchStats?.savePercentage
                        ? `${safeNum(log.stats.matchStats.savePercentage).toFixed(1)}%`
                        : "N/A"}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-center text-emerald-400 font-bold">
                      {safeNum(log.stats.goals)}
                    </td>
                    <td className="px-4 py-3 text-center text-violet-400 font-bold">
                      {safeNum(log.stats.assists)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-yellow-400">
                      {safeNum(log.stats.averageRating, 6.0).toFixed(2)}
                    </td>
                  </>
                )}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onViewDetails(log)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-lg text-xs"
                  >
                    {t("common.view") || "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SeasonBySeasonTable;
