'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, TrendingUp } from 'lucide-react';

type OccupancyMetrics = {
  month: string;
  roomsTotal: number;
  daysInMonth: number;
  availableRoomNights: number;
  bookedRoomNights: number;
  occupancyRate: number;
  reservationsCount: number;
  revenue: number;
  plan: string;
  adr?: number;
  revpar?: number;
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [metrics, setMetrics] = useState<OccupancyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/tenant/reports/occupancy?month=${month}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || 'Não foi possível carregar o relatório.');
        }

        if (!cancelled) {
          setMetrics(payload as OccupancyMetrics);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar relatório.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [month]);

  const isEnterprise = metrics?.plan === 'Enterprise';

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">Desempenho</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Relatórios</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Ocupação, receita e reservas do mês selecionado.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            />
            {isEnterprise ? (
              <a
                href={`/api/tenant/reports/occupancy?month=${month}&format=csv`}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-900/30 transition hover:bg-sky-400"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </a>
            ) : null}
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </p>
        ) : null}
      </section>

      {isLoading || !metrics ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-10 text-center text-sm text-slate-400">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-3">Carregando relatório...</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
              <p className="text-sm text-slate-400">Taxa de ocupação</p>
              <p className="mt-2 text-3xl font-semibold">{formatPercent(metrics.occupancyRate)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.bookedRoomNights} de {metrics.availableRoomNights} diárias-quarto
              </p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
              <p className="text-sm text-slate-400">Reservas no mês</p>
              <p className="mt-2 text-3xl font-semibold">{metrics.reservationsCount}</p>
              <p className="mt-1 text-xs text-slate-500">{metrics.roomsTotal} quartos ativos</p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
              <p className="text-sm text-slate-400">Receita do mês</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(metrics.revenue)}</p>
              <p className="mt-1 text-xs text-slate-500">Atribuída à data de check-in</p>
            </article>

            {isEnterprise ? (
              <>
                <article className="rounded-[24px] border border-sky-400/25 bg-sky-500/10 p-5 text-white">
                  <div className="flex items-center gap-2 text-sky-200">
                    <TrendingUp className="h-4 w-4" />
                    <p className="text-sm">ADR</p>
                  </div>
                  <p className="mt-2 text-3xl font-semibold">{formatCurrency(metrics.adr ?? 0)}</p>
                  <p className="mt-1 text-xs text-slate-400">Diária média (receita / diárias vendidas)</p>
                </article>
              </>
            ) : (
              <article className="flex flex-col justify-center rounded-[24px] border border-dashed border-white/15 bg-slate-900/40 p-5 text-center text-sm text-slate-400">
                <p>ADR, RevPAR e exportação CSV são exclusivos do plano Enterprise.</p>
              </article>
            )}
          </section>

          {isEnterprise ? (
            <section className="rounded-[28px] border border-sky-400/25 bg-sky-500/10 p-6 text-sky-100">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">RevPAR</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(metrics.revpar ?? 0)}</p>
              <p className="mt-1 text-sm text-sky-200/80">
                Receita por quarto disponível (receita / diárias-quarto disponíveis no mês).
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
