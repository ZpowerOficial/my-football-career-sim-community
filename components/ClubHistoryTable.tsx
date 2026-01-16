import React from 'react';
import type { CareerLog, Player } from '../types';
import { getRatingColor } from '../services/ratingSystem';
import { useI18n } from '../contexts/I18nContext';
import { translateCountry } from '@/utils/i18n';

interface ClubHistoryTableProps {
  history: CareerLog[];
  player: Player;
}

const getLeagueColor = (reputation: number): string => {
  if (reputation >= 90) return 'bg-green-600/20 border-green-600/30';
  if (reputation >= 85) return 'bg-emerald-600/20 border-emerald-600/30';
  if (reputation >= 80) return 'bg-yellow-600/20 border-yellow-600/30';
  if (reputation >= 75) return 'bg-orange-600/20 border-orange-600/30';
  if (reputation >= 70) return 'bg-purple-600/20 border-purple-600/30';
  return 'bg-blue-600/20 border-blue-600/30';
};

const ClubHistoryTable: React.FC<ClubHistoryTableProps> = ({ history, player }) => {
  const { t } = useI18n();
  // Aggregate by club
  const clubStats = React.useMemo(() => {
    const clubs = new Map<string, {
      team: CareerLog['team'];
      seasons: number;
      matches: number;
      goals: number;
      assists: number;
      cleanSheets: number;
      avgRating: number;
    }>();

    history.slice(1).forEach(log => {
      const existing = clubs.get(log.team.name);
      if (existing) {
        existing.seasons++;
        existing.matches += log.stats.matchesPlayed;
        existing.goals += log.stats.goals;
        existing.assists += log.stats.assists;
        existing.cleanSheets += log.stats.cleanSheets;
        existing.avgRating = (existing.avgRating + log.stats.averageRating) / 2;
      } else {
        clubs.set(log.team.name, {
          team: log.team,
          seasons: 1,
          matches: log.stats.matchesPlayed,
          goals: log.stats.goals,
          assists: log.stats.assists,
          cleanSheets: log.stats.cleanSheets,
          avgRating: log.stats.averageRating,
        });
      }
    });

    return Array.from(clubs.values()).sort((a, b) => b.team.reputation - a.team.reputation);
  }, [history]);

  return (
    <div className="bg-card rounded-[1rem] border border-primary overflow-hidden shadow-theme">
      <div className="bg-gradient-to-r from-[var(--bg-tertiary)] to-[var(--bg-secondary)] px-4 py-3 border-b border-primary">
        <h3 className="text-base font-bold text-primary">{t('clubHistory')}</h3>
        <p className="text-xs text-muted mt-1">{t('clubsCount', { n: clubStats.length })}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-secondary)]">
              <th className="px-2 py-2 text-left text-xs font-bold text-muted uppercase tracking-wider">{t('club')}</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-muted uppercase tracking-wider">{t('yrs')}</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-muted uppercase tracking-wider">{t('matchesShort')}</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-muted uppercase tracking-wider">{t('goalsShort')}</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-muted uppercase tracking-wider">{t('assistsShort')}</th>
              {player.position === 'GK' && (
                <th className="px-2 py-2 text-center text-xs font-bold text-muted uppercase tracking-wider">{t('cleanSheetsShort')}</th>
              )}
              <th className="px-2 py-2 text-center text-xs font-bold text-muted uppercase tracking-wider">{t('ratingShort')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bg-tertiary)]">
            {clubStats.map((club, index) => (
              <tr
                key={index}
                className={`${getLeagueColor(club.team.reputation)} border-l-4 hover:bg-[var(--bg-tertiary)] transition-colors`}
              >
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-primary text-sm truncate">{club.team.name}</div>
                    <div className="text-xs text-muted">{translateCountry(t, club.team.country)}</div>
                  </div>
                </td>
                <td className="px-2 py-2 text-center text-secondary font-medium">{club.seasons}</td>
                <td className="px-2 py-2 text-center text-secondary font-medium">{club.matches}</td>
                <td className="px-2 py-2 text-center text-emerald-400 font-bold">{club.goals}</td>
                <td className="px-2 py-2 text-center text-violet-400 font-bold">{club.assists}</td>
                {player.position === 'GK' && (
                  <td className="px-2 py-2 text-center text-cyan-400 font-bold">{club.cleanSheets}</td>
                )}
                <td className={`px-2 py-2 text-center font-bold ${getRatingColor(club.avgRating)}`}>
                  {club.avgRating.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="bg-[var(--bg-secondary)] px-4 py-3 border-t border-primary">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-600/50 border border-green-600"></div>
            <span className="text-muted">{t('legend.elite')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-600/50 border border-yellow-600"></div>
            <span className="text-muted">{t('legend.top')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-600/50 border border-purple-600"></div>
            <span className="text-muted">{t('legend.mid')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-600/50 border border-blue-600"></div>
            <span className="text-muted">{t('legend.lower')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubHistoryTable;