'use client';

import { useState } from 'react';

export type OccupancyMonthPoint = {
  key: string;
  label: string;
  occupancyRate: number;
  adr: number;
  revpar: number;
};

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const CHART_HEIGHT = 160;
const CHART_TOP_PADDING = 14;

export function OccupancyTrendChart({ points }: { points: OccupancyMonthPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxRate = Math.max(0.1, ...points.map((point) => point.occupancyRate));
  const groupWidth = 100 / points.length;
  const barWidth = groupWidth * 0.4;

  return (
    <div>
      <div className="relative mt-1">
        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-40 w-full overflow-visible"
          role="img"
          aria-label="Gráfico de taxa de ocupação dos últimos 6 meses"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = CHART_TOP_PADDING + (CHART_HEIGHT - CHART_TOP_PADDING - 22) * (1 - fraction);
            return (
              <line
                key={fraction}
                x1={0}
                x2={100}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.4}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {points.map((point, index) => {
            const baseline = CHART_HEIGHT - 22;
            const plotHeight = CHART_HEIGHT - CHART_TOP_PADDING - 22;
            const barHeight = (point.occupancyRate / maxRate) * plotHeight;
            const groupX = index * groupWidth;
            const barX = groupX + (groupWidth - barWidth) / 2;
            const isHovered = hoveredIndex === index;

            return (
              <g
                key={point.key}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
              >
                <rect x={groupX} y={CHART_TOP_PADDING} width={groupWidth} height={plotHeight} fill="transparent" />
                <rect
                  x={barX}
                  y={baseline - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={1.2}
                  fill="currentColor"
                  className={isHovered ? 'text-sky-300' : 'text-sky-400/80'}
                />
                <text
                  x={groupX + groupWidth / 2}
                  y={CHART_HEIGHT - 4}
                  textAnchor="middle"
                  fontSize={4.2}
                  fill="rgba(203,213,225,0.7)"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredIndex !== null ? (
          <div
            className="pointer-events-none absolute top-0 rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-white shadow-xl"
            style={{
              left: `${(hoveredIndex + 0.5) * groupWidth}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="font-semibold">{points[hoveredIndex].label}</p>
            <p className="mt-1 text-sky-300">Ocupação: {formatPercent(points[hoveredIndex].occupancyRate)}</p>
            <p className="text-slate-300">ADR: {formatCurrency(points[hoveredIndex].adr)}</p>
            <p className="text-slate-300">RevPAR: {formatCurrency(points[hoveredIndex].revpar)}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-slate-950/60 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Mês</th>
              <th className="px-4 py-3 text-right font-medium">Ocupação</th>
              <th className="px-4 py-3 text-right font-medium">ADR (diária média)</th>
              <th className="px-4 py-3 text-right font-medium">RevPAR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-slate-900/50">
            {points.map((point) => (
              <tr key={point.key}>
                <td className="px-4 py-3 text-white">{point.label}</td>
                <td className="px-4 py-3 text-right text-slate-300">{formatPercent(point.occupancyRate)}</td>
                <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(point.adr)}</td>
                <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(point.revpar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
