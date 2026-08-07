'use client';

import { useState } from 'react';

export type FinanceMonthPoint = {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const CHART_HEIGHT = 180;
const CHART_TOP_PADDING = 16;

export function FinanceTrendChart({ points }: { points: FinanceMonthPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = Math.max(1, ...points.flatMap((point) => [point.revenue, point.expenses]));
  const groupWidth = 100 / points.length;
  const barWidth = groupWidth * 0.28;

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Receita
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Despesas
        </span>
      </div>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-48 w-full overflow-visible"
          role="img"
          aria-label="Gráfico de receita e despesas dos últimos 6 meses"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = CHART_TOP_PADDING + (CHART_HEIGHT - CHART_TOP_PADDING - 24) * (1 - fraction);
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
            const baseline = CHART_HEIGHT - 24;
            const plotHeight = CHART_HEIGHT - CHART_TOP_PADDING - 24;
            const revenueHeight = (point.revenue / maxValue) * plotHeight;
            const expenseHeight = (point.expenses / maxValue) * plotHeight;
            const groupX = index * groupWidth;
            const revenueX = groupX + groupWidth * 0.22;
            const expenseX = groupX + groupWidth * 0.5;
            const isHovered = hoveredIndex === index;

            return (
              <g
                key={point.key}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
              >
                <rect x={groupX} y={CHART_TOP_PADDING} width={groupWidth} height={plotHeight} fill="transparent" />
                <rect
                  x={revenueX}
                  y={baseline - revenueHeight}
                  width={barWidth}
                  height={revenueHeight}
                  rx={1.2}
                  fill="currentColor"
                  className={isHovered ? 'text-emerald-300' : 'text-emerald-400/80'}
                />
                <rect
                  x={expenseX}
                  y={baseline - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  rx={1.2}
                  fill="currentColor"
                  className={isHovered ? 'text-rose-300' : 'text-rose-400/80'}
                />
                <text
                  x={groupX + groupWidth / 2}
                  y={CHART_HEIGHT - 6}
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
            <p className="mt-1 text-emerald-300">Receita: {formatCurrency(points[hoveredIndex].revenue)}</p>
            <p className="text-rose-300">Despesas: {formatCurrency(points[hoveredIndex].expenses)}</p>
          </div>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>Receita e despesas por mês</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Receita</th>
            <th>Despesas</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <td>{point.label}</td>
              <td>{formatCurrency(point.revenue)}</td>
              <td>{formatCurrency(point.expenses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
