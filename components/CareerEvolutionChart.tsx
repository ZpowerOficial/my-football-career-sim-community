import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { CareerLog, Player } from '../types';

// Helper to safely handle numbers (prevents NaN)
const safeNum = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback;

interface CareerEvolutionChartProps {
  history: CareerLog[];
  player: Player;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  const { t } = useI18n();
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-lg p-3 shadow-xl">
        <p className="text-white font-bold text-sm mb-1">{t('history.seasonNum', { num: label })}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-300 text-xs">{entry.name}:</span>
            <span className="text-white font-semibold text-sm">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CareerEvolutionChart: React.FC<CareerEvolutionChartProps> = ({ history, player }) => {
  // Prepare data
  const chartData = history.slice(1).map((log, index) => ({
    season: index + 1,
    overall: log.stats.overall,
    goals: log.stats.goals,
    assists: log.stats.assists,
  }));

  // Calculate career growth
  const careerGrowth = chartData.length > 0
    ? chartData[chartData.length - 1].overall - chartData[0].overall
    : 0;

  // Dynamic X-axis interval based on number of seasons
  const totalSeasons = chartData.length;
  const xAxisInterval = totalSeasons > 15 ? 2 : totalSeasons > 10 ? 1 : 0;

  // Detect mobile
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {/* Overall Evolution Chart */}
      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-900/50 to-slate-800/50 px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">{t('history.overallEvolution')}</h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{safeNum(player.stats.overall, 50)}</div>
              <div className="text-xs text-slate-400">
                {careerGrowth > 0 ? '+' : ''}{safeNum(careerGrowth, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 260} className="select-none">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
            >
              <defs>
                <linearGradient id="overallGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="season"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: isMobile ? 11 : 10 }}
                interval={xAxisInterval}
                label={{
                  value: t('history.season'),
                  position: 'insideBottom',
                  offset: -3,
                  fill: '#64748b',
                  fontSize: isMobile ? 11 : 10
                }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: isMobile ? 11 : 10 }}
                domain={['dataMin - 5', 'dataMax + 3']}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'transparent' }} wrapperStyle={{ outline: 'none' }} />
              <Area
                type="monotone"
                dataKey="overall"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#overallGradient)"
                name={t('history.overall')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Chart (Goals + Assists) */}
      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-900/50 to-slate-800/50 px-4 py-3 border-b border-slate-700/50">
          <h3 className="text-base font-bold text-white">{t('history.performanceBySeason')}</h3>
        </div>

        <div className="p-4">
          <ResponsiveContainer width="100%" height={isMobile ? 240 : 220} className="select-none">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
            >
              <defs>
                <linearGradient id="goalsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="assistsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="season"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: isMobile ? 11 : 10 }}
                interval={xAxisInterval}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: isMobile ? 11 : 10 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'transparent' }} wrapperStyle={{ outline: 'none' }} />
              <Area
                type="monotone"
                dataKey="goals"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#goalsGradient)"
                name={t('dashboard.goals')}
              />
              <Area
                type="monotone"
                dataKey="assists"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#assistsGradient)"
                name={t('dashboard.assists')}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-slate-400">{t('dashboard.goals')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-violet-500"></div>
              <span className="text-slate-400">{t('dashboard.assists')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerEvolutionChart;