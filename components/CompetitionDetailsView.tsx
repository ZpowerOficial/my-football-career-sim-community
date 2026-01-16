import React from 'react';
import type { ContextualCompetitionData, CompetitionResult } from '../types';
import { getRatingColor } from '../services/ratingSystem';
import { useI18n } from '../contexts/I18nContext';
import { translateCountry } from '@/utils/i18n';
import { getLeagueName, getDomesticCupName } from '@/utils/competitionNames';

// Helper to safely handle numbers (prevents NaN rendering)
const safeNum = (value: number | undefined | null, fallback = 0): number =>
  value != null && Number.isFinite(value) ? value : fallback;

interface CompetitionDetailsViewProps {
  competitionData: ContextualCompetitionData;
}

const getCompetitionColor = (type: string): string => {
  switch (type) {
    case 'League': return 'bg-blue-600/20 border-blue-600/30';
    case 'Cup': return 'bg-yellow-600/20 border-yellow-600/30';
    case 'Continental': return 'bg-purple-600/20 border-purple-600/30';
    default: return 'bg-slate-600/20 border-slate-600/30';
  }
};

const getCompetitionIcon = (type: string): string => {
  switch (type) {
    case 'League': return '🏆';
    case 'Cup': return '🏆';
    case 'Continental': return '🌍';
    default: return '⚽️';
  }
};

// Helper to translate competition names
const getTranslatedCompetitionName = (competitionName: string, t: (key: string) => string): string => {
  // Try competitionNames first (for continental competitions like "South American Champions Cup")
  let translated = t(`competitionNames.${competitionName}`);
  if (translated !== `competitionNames.${competitionName}`) return translated;
  
  // Try multiple translation approaches
  translated = t(competitionName);
  if (translated !== competitionName) return translated;
  
  translated = t(`trophy.${competitionName}`);
  if (translated !== `trophy.${competitionName}`) return translated;
  
  translated = t(`trophiesSection.${competitionName}`);
  if (translated !== `trophiesSection.${competitionName}`) return translated;
  
  return competitionName;
};

const CompetitionDetailsView: React.FC<CompetitionDetailsViewProps> = ({ competitionData }) => {
  const { t } = useI18n();
  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 px-4 py-3 border-b border-slate-700/50">
        <h3 className="text-base font-bold text-white">{t('competitionDetails', { country: translateCountry(t, competitionData.country) })}</h3>
        <p className="text-xs text-slate-400 mt-1">
          {getLeagueName(t, competitionData.country, competitionData.leagueTier)} •
          {competitionData.domesticCup ? ` ${getDomesticCupName(t, competitionData.country)}` : ` ${t('noDomesticCup')}`} •
          {competitionData.continentalQualification
            ? ` ${competitionData.continentalCompetition || t('competitionType.Continental')}`
            : ` ${t('noContinental')}`}
        </p>
      </div>

      {competitionData.competitions.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          <span className="text-4xl">⚽️</span>
          <p className="mt-2">{t('noCompetitionData')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="px-2 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{t('competition')}</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{t('pos')}</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{t('matchesShort')}</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{t('goalsShort')}</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{t('assistsShort')}</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{t('ratingShort')}</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{t('trophy')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {competitionData.competitions.map((comp, index) => (
                <tr
                  key={index}
                  className={`${getCompetitionColor(comp.type)} border-l-4 hover:bg-slate-700/30 transition-colors`}
                >
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{getCompetitionIcon(comp.type)}</span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{getTranslatedCompetitionName(comp.competition, t)}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider">{t(`competitionType.${comp.type}`)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-slate-300 font-medium">
                    {comp.position && comp.totalTeams ? `${comp.position}/${comp.totalTeams}` : '-'}
                  </td>
                  <td className="px-2 py-2 text-center text-slate-300 font-medium">{safeNum(comp.matchesPlayed)}</td>
                  <td className="px-2 py-2 text-center text-emerald-400 font-bold">{safeNum(comp.goals)}</td>
                  <td className="px-2 py-2 text-center text-violet-400 font-bold">{safeNum(comp.assists)}</td>
                  <td className={`px-2 py-2 text-center font-bold ${getRatingColor(safeNum(comp.rating, 6.0))}`}>
                    {safeNum(comp.rating, 6.0).toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {comp.trophies && comp.trophies > 0 ? (
                      <span className="text-yellow-400 font-bold">🏆</span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-900/50 px-4 py-3 border-t border-slate-700/50">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-600/50 border border-blue-600"></div>
            <span className="text-slate-400">{t('competitionType.League')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-600/50 border border-yellow-600"></div>
            <span className="text-slate-400">{t('competitionType.Cup')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-600/50 border border-purple-600"></div>
            <span className="text-slate-400">{t('competitionType.Continental')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitionDetailsView;
