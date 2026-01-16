import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import type { PositionDetail, Continent } from '../types';
import {
  loadDiversityStats,
  generateRandomCareer,
  getDailyChallenge,
  type DiversityStats,
  type DailyChallenge
} from '../services/diversitySystem';
import { Icon } from './ui/Icon';

interface JourneyPanelProps {
  onSelectCareer: (position: PositionDetail, continent: Continent, gender: 'male' | 'female', xpBonus: number) => void;
  continents: Continent[];
}

// Todas as 16 posições agrupadas
const ALL_POSITIONS: { category: string; positions: PositionDetail[] }[] = [
  { category: 'attackers', positions: ['ST', 'CF', 'LW', 'RW'] },
  { category: 'midfielders', positions: ['CAM', 'CM', 'LM', 'RM', 'CDM'] },
  { category: 'defenders', positions: ['CB', 'LB', 'RB', 'LWB', 'RWB'] },
  { category: 'goalkeeper', positions: ['GK'] }
];

// Ícones representativos dos continentes (sem bandeiras de países)
const CONTINENT_ICONS: Record<Continent, string> = {
  'Europe': '🏰',
  'South America': '⚽',
  'Asia': '🏯',
  'North America': '🗽',
  'Africa': '🦁',
  'Australia': '🦘'
};

export const JourneyPanel: React.FC<JourneyPanelProps> = ({ onSelectCareer, continents }) => {
  const { t } = useI18n();
  const [stats, setStats] = useState<DiversityStats | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'challenge'>('stats');

  useEffect(() => {
    setStats(loadDiversityStats());
    setDailyChallenge(getDailyChallenge());
  }, []);

  if (!stats) return null;

  // Calcular estatísticas - usando posições específicas
  const totalPositions = ALL_POSITIONS.reduce((sum, group) => sum + group.positions.length, 0);
  const positionsPlayed = stats.positionsPlayed || {};
  const exploredPositions = ALL_POSITIONS.reduce((count, group) => {
    return count + group.positions.filter(pos => (positionsPlayed[pos] || 0) > 0).length;
  }, 0);

  const totalContinents = 6;
  const exploredContinents = Object.values(stats.continents).filter(v => v && v > 0).length;

  const exploredGenders = (stats.genders.male > 0 ? 1 : 0) + (stats.genders.female > 0 ? 1 : 0);

  // Helper para checar se posição foi jogada
  const wasPositionPlayed = (pos: PositionDetail) => (positionsPlayed[pos] || 0) > 0;
  const getPositionCount = (pos: PositionDetail) => positionsPlayed[pos] || 0;

  const handleRandomCareer = () => {
    const random = generateRandomCareer(continents);
    onSelectCareer(random.position, random.continent, random.gender, 25);
  };

  const handleAcceptChallenge = () => {
    if (dailyChallenge) {
      onSelectCareer(dailyChallenge.position, dailyChallenge.continent, dailyChallenge.gender, dailyChallenge.bonusXP);
    }
  };

  const getChallengeHoursRemaining = () => {
    if (!dailyChallenge) return 0;
    return Math.max(0, Math.ceil((dailyChallenge.expiresAt - Date.now()) / (1000 * 60 * 60)));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="text-center py-4 px-4 border-b border-slate-700/50 flex-shrink-0">
        <h2 className="text-lg font-bold text-white">{t('journey.title')}</h2>
        <p className="text-xs text-slate-400">{t('journey.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 flex-shrink-0">
        <div className="flex bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'stats'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400'
              }`}
          >
            <Icon name="ChartBar" size={14} className="mr-2" />
            {t('journey.stats')}
          </button>
          <button
            onClick={() => setActiveTab('challenge')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'challenge'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400'
              }`}
          >
            <Icon name="Flame" size={14} className="mr-2" />
            {t('journey.challenge')}
          </button>
        </div>
      </div>

      {/* Conteúdo Estatísticas - scrollável */}
      {activeTab === 'stats' && (
        <div className="flex-1 overflow-y-auto px-4 pb-4 hide-scrollbar" style={{ minHeight: 0 }}>
          <div className="space-y-4 animate-fade-in pt-3">
            {/* Resumo geral */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-center mb-3">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
                  {stats.totalCareers}
                </div>
                <div className="text-xs text-slate-400">{t('journey.totalCareers')}</div>
              </div>

              {/* Barras de progresso */}
              <div className="space-y-3">
                {/* Continentes */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{t('journey.continents')}</span>
                    <span className="text-green-400 font-medium">{exploredContinents}/{totalContinents}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                      style={{ width: `${(exploredContinents / totalContinents) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Posições */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{t('journey.positions')}</span>
                    <span className="text-blue-400 font-medium">{exploredPositions}/{totalPositions}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                      style={{ width: `${(exploredPositions / totalPositions) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Gênero */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{t('setup.gender')}</span>
                    <span className="text-purple-400 font-medium">{exploredGenders}/2</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                      style={{ width: `${(exploredGenders / 2) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de continentes */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t('journey.continents')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {continents.map(continent => {
                  const count = stats.continents[continent] || 0;
                  const explored = count > 0;
                  return (
                    <div
                      key={continent}
                      className={`text-center p-2 rounded-lg ${explored ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700/50'
                        }`}
                    >
                      <div className="text-lg">{CONTINENT_ICONS[continent]}</div>
                      <div className={`text-[10px] font-medium truncate ${explored ? 'text-green-400' : 'text-slate-500'}`}>
                        {t(`continents.${continent}`)}
                      </div>
                      {explored && (
                        <div className="text-[10px] text-green-400/70">{count}x</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid de posições */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t('journey.positions')}
              </h3>
              {ALL_POSITIONS.map(group => (
                <div key={group.category} className="mb-3 last:mb-0">
                  <div className="text-[10px] text-slate-500 mb-1.5">{t(`setup.${group.category}`)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.positions.map(pos => {
                      const played = wasPositionPlayed(pos);
                      const count = getPositionCount(pos);
                      return (
                        <div
                          key={pos}
                          className={`px-2.5 py-1 rounded text-xs font-medium ${played
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-700/50 text-slate-500'
                            }`}
                        >
                          {pos}
                          {played && count > 1 && <span className="ml-1 opacity-60">×{count}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Gênero */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t('setup.gender')}
              </h3>
              <div className="space-y-2">
                {/* Masculino */}
                <div
                  className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all ${stats.genders.male > 0
                    ? 'bg-blue-600 border-2 border-blue-400'
                    : 'bg-slate-700/50 border-2 border-slate-600/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">♂</span>
                    <span className={`font-semibold ${stats.genders.male > 0 ? 'text-white' : 'text-slate-400'}`}>
                      {t('setup.male')}
                    </span>
                  </div>
                  {stats.genders.male > 0 && (
                    <span className="text-xs text-blue-200 bg-blue-500/30 px-2 py-0.5 rounded">
                      {stats.genders.male}x
                    </span>
                  )}
                </div>
                {/* Feminino */}
                <div
                  className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all ${stats.genders.female > 0
                    ? 'bg-pink-600 border-2 border-pink-400'
                    : 'bg-slate-700/50 border-2 border-slate-600/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">♀</span>
                    <span className={`font-semibold ${stats.genders.female > 0 ? 'text-white' : 'text-slate-400'}`}>
                      {t('setup.female')}
                    </span>
                  </div>
                  {stats.genders.female > 0 && (
                    <span className="text-xs text-pink-200 bg-pink-500/30 px-2 py-0.5 rounded">
                      {stats.genders.female}x
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Desafios - sem scroll, tamanho natural */}
      {activeTab === 'challenge' && (
        <div className="px-4 pb-4">
          <div className="space-y-4 animate-fade-in pt-3">
            {/* Desafio do Dia */}
            {dailyChallenge && !dailyChallenge.completed ? (
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Icon name="Flame" size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-amber-300">{t('journey.dailyChallenge')}</div>
                      <div className="text-xs text-amber-400/60">
                        {t('journey.expiresIn', { hours: getChallengeHoursRemaining() })}
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-lg">
                    +{dailyChallenge.bonusXP} XP
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-4 text-white">
                    <div className="text-center">
                      <div className="text-2xl mb-1">{CONTINENT_ICONS[dailyChallenge.continent]}</div>
                      <div className="text-xs text-slate-400">{t(`continents.${dailyChallenge.continent}`)}</div>
                    </div>
                    <div className="text-slate-600 text-2xl">•</div>
                    <div className="text-center">
                      <div className="text-xl font-bold mb-1">{dailyChallenge.position}</div>
                      <div className="text-xs text-slate-400">{t("common.position")}</div>
                    </div>
                    <div className="text-slate-600 text-2xl">•</div>
                    <div className="text-center">
                      <div className="text-2xl mb-1">{dailyChallenge.gender === 'male' ? '♂️' : '♀️'}</div>
                      <div className="text-xs text-slate-400">{dailyChallenge.gender === 'male' ? t('setup.male') : t('setup.female')}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAcceptChallenge}
                  className="w-full bg-amber-500 active:bg-amber-600 text-black font-bold py-3 rounded-xl transition-colors text-base"
                >
                  {t('journey.acceptChallenge')}
                </button>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Icon name="Check" size={24} className="text-green-400" />
                </div>
                <div className="text-base font-medium text-green-400 mb-1">
                  {t('journey.challengeCompleted')}
                </div>
                <div className="text-sm text-slate-400">
                  {t('journey.nextChallenge')}
                </div>
              </div>
            )}

            {/* Carreira Aleatória */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Icon name="Dices" size={18} className="text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-cyan-300">{t('journey.randomCareer')}</div>
                  <div className="text-xs text-cyan-400/60">{t('journey.randomDesc')}</div>
                </div>
              </div>

              <button
                onClick={handleRandomCareer}
                className="w-full bg-cyan-500 active:bg-cyan-600 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
              >
                <Icon name="Shuffle" size={16} />
                {t('journey.surpriseMe')}
                <span className="bg-black/20 px-2 py-0.5 rounded text-xs">+25% XP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JourneyPanel;
