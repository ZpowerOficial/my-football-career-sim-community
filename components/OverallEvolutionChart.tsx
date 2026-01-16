import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import type { CareerLog } from '../types';

// Helper to safely handle numbers (prevents NaN)
const safeNum = (value: number | undefined | null, fallback = 0): number =>
  value != null && Number.isFinite(value) ? value : fallback;

interface OverallEvolutionChartProps {
  history: CareerLog[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, t }) => {
  if (active && payload && payload.length) {
    const overall = payload[0].value;
    const change = payload[0].payload.change;

    return (
      <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-lg p-3 shadow-xl">
        <p className="text-white font-bold text-base mb-1">{t('history.season')} {label}</p>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-lg">{t('leaderboard.ovr')} {overall}</span>
          {change !== undefined && change !== 0 && (
            <span className={`text-sm font-semibold ${change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {change > 0 ? '+' : ''}{change}
            </span>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomDot: React.FC<any> = (props) => {
  const { cx, cy, payload } = props;
  const isGrowth = payload.change && payload.change > 0;
  const isDecline = payload.change && payload.change < 0;

  return (
    <g>
      {/* Touch area (invisÃ­vel mas facilita o toque) */}
      <circle
        cx={cx}
        cy={cy}
        r={15}
        fill="transparent"
        style={{ cursor: 'pointer' }}
      />
      {/* Glow effect */}
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={isDecline ? '#ef4444' : isGrowth ? '#10b981' : '#f59e0b'}
        fillOpacity={0.3}
      />
      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={isDecline ? '#ef4444' : isGrowth ? '#10b981' : '#f59e0b'}
        stroke="#fff"
        strokeWidth={2}
      />
    </g>
  );
};

const OverallEvolutionChart: React.FC<OverallEvolutionChartProps> = ({ history }) => {
  const { t } = useI18n();
  // Preparar dados com informaÃ§Ã£o de mudanÃ§a
  const data = history.slice(1).map((log, index) => {
    const previousOverall = index > 0 ? history[index].stats.overall : log.stats.overall;
    const change = log.stats.overall - previousOverall;

    return {
      season: index + 1,
      age: log.age,
      overall: log.stats.overall,
      change: change,
    };
  });

  // Calcular domÃ­nio do Y-axis com padding
  const overalls = data.map(d => d.overall);
  const minOverall = Math.min(...overalls);
  const maxOverall = Math.max(...overalls);
  const padding = Math.max(5, Math.ceil((maxOverall - minOverall) * 0.15));

  const yAxisDomain = [
    Math.max(0, minOverall - padding),
    Math.min(99, maxOverall + padding)
  ];

  // Detectar se Ã© mobile
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={isMobile ? 300 : 280}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          {/* Grid */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#475569"
            strokeOpacity={0.3}
            vertical={false}
          />

          {/* Axes */}
          <XAxis
            dataKey="season"
            tick={{ fill: '#cbd5e1', fontSize: isMobile ? 13 : 12 }}
            label={{
              value: t('history.season'),
              position: 'insideBottom',
              offset: -5,
              fill: '#94a3b8',
              fontSize: isMobile ? 13 : 12
            }}
            stroke="#475569"
          />
          <YAxis
            tick={{ fill: '#cbd5e1', fontSize: isMobile ? 13 : 12 }}
            domain={yAxisDomain}
            label={{
              value: t('history.overall'),
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: isMobile ? 13 : 12
            }}
            stroke="#475569"
          />

          {/* Tooltip */}
          <Tooltip
            content={(props) => <CustomTooltip {...props} t={t} />}
            cursor={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 5' }}
          />

          {/* Legend */}
          <Legend
            wrapperStyle={{
              color: '#cbd5e1',
              fontSize: isMobile ? '14px' : '13px',
              paddingTop: '10px'
            }}
            iconType="circle"
          />

          {/* Gradient Area (Background) */}
          <defs>
            <linearGradient id="overallGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <Area
            type="monotone"
            dataKey="overall"
            fill="url(#overallGradient)"
            stroke="none"
          />

          {/* Main Line */}
          <Line
            type="monotone"
            dataKey="overall"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{
              r: isMobile ? 10 : 8,
              fill: '#f59e0b',
              stroke: '#fff',
              strokeWidth: 3
            }}
            name={t('leaderboard.overallRating')}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Stats Summary */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider">{t('history.peak')}</p>
          <p className="text-lg font-bold text-emerald-400">{maxOverall}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider">{t('history.current')}</p>
          <p className="text-lg font-bold text-amber-400">{data[data.length - 1]?.overall || 0}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider">{t('history.growthShort')}</p>
          <p className={`text-lg font-bold ${
            safeNum(data[data.length - 1]?.overall) - safeNum(data[0]?.overall) >= 0
              ? 'text-emerald-400'
              : 'text-red-400'
          }`}>
            {safeNum(data[data.length - 1]?.overall) - safeNum(data[0]?.overall) >= 0 ? '+' : ''}
            {safeNum(data[data.length - 1]?.overall) - safeNum(data[0]?.overall)}
          </p>
        </div>
      </div>

      {/* Legend Indicators */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          <span className="text-slate-400">{t('history.growth')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <span className="text-slate-400">{t('history.stable')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <span className="text-slate-400">{t('history.decline')}</span>
        </div>
      </div>
    </div>
  );
};

export default OverallEvolutionChart;