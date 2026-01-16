import React from 'react';
import { useI18n } from '../contexts/I18nContext';

interface FormGraphProps {
  values: number[]; // ratings 1-10 (latest last or first)
  width?: number;
  height?: number;
  title?: string;
}

// Small, dependency-free sparkline/line chart for ratings
const FormGraph: React.FC<FormGraphProps> = ({ values, width = 320, height = 80, title }) => {
  const { t } = useI18n();
  const displayTitle = title || t('history.formLast10');

  if (!values || values.length === 0) {
    return (
      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
  <h4 className="text-sm font-bold text-white mb-2">{displayTitle}</h4>
  <p className="text-slate-400 text-xs">{t('common.noRecentMatches')}</p>
      </div>
    );
  }

  const data = values.slice(-10); // last 10
  const max = 10;
  const min = 4; // display range cap used in sim
  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / (max - min)) * innerH;
    return [x, y] as const;
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  const std = Math.sqrt(data.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / data.length);

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-white">{displayTitle}</h4>
  <div className="text-xs text-slate-400">Avg {avg.toFixed(2)} ± {std.toFixed(2)}</div>
      </div>
      <svg width={width} height={height} className="block">
        {/* guide bands */}
        <rect x={0} y={0} width={width} height={height} fill="none" />
        {/* reference lines at 6.5, 7.5, 8.5 */}
        {([6.5, 7.5, 8.5] as number[]).map((r, idx) => {
          const y = pad + innerH - ((r - min) / (max - min)) * innerH;
          return <line key={idx} x1={pad} x2={pad + innerW} y1={y} y2={y} stroke={r === 7.5 ? '#f59e0b' : '#475569'} strokeDasharray="3,3" strokeWidth={0.8} />;
        })}
        {/* area fill */}
        <path d={`${path} L ${pad + innerW} ${height - pad} L ${pad} ${height - pad} Z`} fill="url(#grad)" opacity={0.22} />
        {/* line */}
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth={2} />
        {/* points */}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill={data[i] >= 7.5 ? '#f59e0b' : '#93c5fd'} />
        ))}
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
      <div className="mt-2 text-[11px] text-slate-400">
        • {t('history.formHint')}
      </div>
    </div>
  );
};

export default FormGraph;
