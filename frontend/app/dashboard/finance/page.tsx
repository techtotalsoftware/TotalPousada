import { Landmark, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { ExpenseDeleteButton } from '@/components/expense-delete-button';
import { ExpenseModalForm } from '@/components/expense-modal-form';
import { FinanceTrendChart, type FinanceMonthPoint } from '@/components/finance-trend-chart';
import { OccupancyTrendChart, type OccupancyMonthPoint } from '@/components/occupancy-trend-chart';
import { getAuthenticatedSession } from '@/lib/auth';
import { hasPlanAccess, TenantPlan } from '@/lib/plan-enum';
import { getExpenses, getReservations, getRooms } from '@/services/tenantService';

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthlyTrend(
  reservations: Array<{ status: string; amount: number; checkIn: string }>,
  expenses: Array<{ amount: number; date: string }>,
): FinanceMonthPoint[] {
  const months: FinanceMonthPoint[] = [];
  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const reference = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({ key: monthKey(reference), label: MONTH_LABEL_FORMATTER.format(reference), revenue: 0, expenses: 0 });
  }

  const pointByKey = new Map(months.map((point) => [point.key, point]));

  for (const reservation of reservations) {
    if (reservation.status !== 'confirmed' && reservation.status !== 'pending') continue;
    const key = String(reservation.checkIn).slice(0, 7);
    const point = pointByKey.get(key);
    if (point) {
      const amount = Number(reservation.amount);
      point.revenue += Number.isFinite(amount) ? amount : 0;
    }
  }

  for (const expense of expenses) {
    const key = String(expense.date).slice(0, 7);
    const point = pointByKey.get(key);
    if (point) {
      point.expenses += expense.amount;
    }
  }

  return months;
}

function buildOccupancyTrend(
  reservations: Array<{ status: string; amount: number; checkIn: string; checkOut: string }>,
  roomsTotal: number,
): OccupancyMonthPoint[] {
  const months: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - offset, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    months.push({ key: monthKey(start), label: MONTH_LABEL_FORMATTER.format(start), start, end });
  }

  const active = reservations.filter(
    (reservation) => reservation.status === 'confirmed' || reservation.status === 'pending',
  );

  return months.map(({ key, label, start, end }) => {
    const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    const availableRoomNights = roomsTotal * daysInMonth;

    let bookedRoomNights = 0;
    let revenue = 0;

    for (const reservation of active) {
      const checkIn = new Date(`${reservation.checkIn}T00:00:00Z`);
      const checkOut = new Date(`${reservation.checkOut}T00:00:00Z`);
      if (checkIn >= end || checkOut <= start) continue;

      const clippedStart = checkIn < start ? start : checkIn;
      const clippedEnd = checkOut > end ? end : checkOut;
      bookedRoomNights += Math.max(0, Math.round((clippedEnd.getTime() - clippedStart.getTime()) / 86_400_000));

      if (checkIn >= start && checkIn < end) {
        const amount = Number(reservation.amount);
        revenue += Number.isFinite(amount) ? amount : 0;
      }
    }

    return {
      key,
      label,
      occupancyRate: availableRoomNights > 0 ? bookedRoomNights / availableRoomNights : 0,
      adr: bookedRoomNights > 0 ? revenue / bookedRoomNights : 0,
      revpar: availableRoomNights > 0 ? revenue / availableRoomNights : 0,
    };
  });
}

function formatCurrency(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

export default async function FinancePage() {
  const session = await getAuthenticatedSession();

  if (!session) {
    return null;
  }

  const [reservations, expenses, rooms] = await Promise.all([
    getReservations(session.tenantId),
    getExpenses(session.tenantId),
    getRooms(session.tenantId),
  ]);
  const activeReservations = reservations.filter(
    (reservation) => reservation.status === 'confirmed' || reservation.status === 'pending',
  );
  const activeReservationsCount = activeReservations.length;
  const grossRevenue = activeReservations.reduce((total, reservation) => {
    const amount = Number(reservation.amount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  const netProfit = grossRevenue - totalExpenses;
  const monthlyTrend = buildMonthlyTrend(reservations, expenses);

  // ADR/RevPAR/ocupação são um recurso Enterprise, mesma régua já usada no
  // relatório de ocupação (app/api/tenant/reports/occupancy).
  const hasOccupancyMetrics = hasPlanAccess(session.plan, TenantPlan.ENTERPRISE);
  const roomsTotal = rooms
    .filter((room) => room.status === 'active')
    .reduce((total, room) => total + room.quantity, 0);
  const occupancyTrend = hasOccupancyMetrics ? buildOccupancyTrend(reservations, roomsTotal) : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">Financeiro</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Saúde financeira da {session.tenantName}</h2>
          </div>
          <ExpenseModalForm />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 text-white">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Faturamento Bruto</p>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(grossRevenue)}</p>
          <p className="mt-2 text-xs text-slate-500">{activeReservationsCount} reserva{activeReservationsCount !== 1 ? 's' : ''} ativa{activeReservationsCount !== 1 ? 's' : ''} considerada{activeReservationsCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 text-white">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Total de Despesas</p>
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-300">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold text-rose-300">{formatCurrency(totalExpenses)}</p>
          <p className="mt-2 text-xs text-slate-500">{expenses.length} custo{expenses.length !== 1 ? 's' : ''} registrado{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={`rounded-[28px] border p-6 text-white ${netProfit >= 0 ? 'border-emerald-400/20 bg-emerald-950/40' : 'border-rose-400/20 bg-rose-950/40'}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Lucro Líquido</p>
            <div className={`rounded-xl p-2 ${netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-semibold ${netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatCurrency(netProfit)}</p>
          <p className="mt-2 text-xs text-slate-500">Faturamento menos despesas</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <h3 className="text-2xl font-semibold text-white">Receita x despesas (últimos 6 meses)</h3>
        <p className="mt-1 text-sm text-slate-400">Tendência mensal para acompanhar a saúde financeira ao longo do tempo.</p>
        <div className="mt-6">
          <FinanceTrendChart points={monthlyTrend} />
        </div>
      </section>

      {hasOccupancyMetrics ? (
        <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
          <h3 className="text-2xl font-semibold text-white">Ocupação, ADR e RevPAR (últimos 6 meses)</h3>
          <p className="mt-1 text-sm text-slate-400">
            Indicadores de performance da operação: taxa de ocupação, diária média (ADR) e receita por quarto
            disponível (RevPAR).
          </p>
          <div className="mt-6">
            <OccupancyTrendChart points={occupancyTrend} />
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <h3 className="text-2xl font-semibold text-white">Custos registrados</h3>

        {/* Cards — só no mobile. A tabela (sm:block) cobre tablet/desktop;
            5 colunas espremidas num telão de 375px obrigava a rolar pra
            ver valor/ações. */}
        <div className="mt-6 space-y-3 sm:hidden">
          {expenses.length ? (
            expenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-white">{expense.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {expense.category} · {formatLongDate(expense.date)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-rose-300">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
                <div className="mt-3">
                  <ExpenseDeleteButton expenseId={expense.id} description={expense.description} />
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
              Sua operação ainda não registrou despesas.
            </p>
          )}
        </div>

        <div className="mt-6 hidden overflow-hidden rounded-[24px] border border-white/10 sm:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-slate-950/60 text-left text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-medium">Descrição</th>
                  <th className="px-5 py-4 font-medium">Categoria</th>
                  <th className="px-5 py-4 font-medium">Data</th>
                  <th className="px-5 py-4 text-right font-medium">Valor</th>
                  <th className="px-5 py-4 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-900/50">
                {expenses.length ? (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-4 text-white">{expense.description}</td>
                      <td className="px-5 py-4 text-slate-300">{expense.category}</td>
                      <td className="px-5 py-4 text-slate-300">{formatLongDate(expense.date)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-rose-300">{formatCurrency(expense.amount)}</td>
                      <td className="px-5 py-4 text-right">
                        <ExpenseDeleteButton expenseId={expense.id} description={expense.description} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      Sua operação ainda não registrou despesas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-sky-400/20 bg-slate-900/80 p-4 text-sm text-slate-300 shadow-lg shadow-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-sky-300/20 bg-sky-400/10 p-2 text-sky-300">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-100">Como o faturamento bruto é calculado</p>
                <p className="mt-1 leading-relaxed text-slate-400">O total considera o valor integral das reservas com status ativos.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-medium text-emerald-200">
                Confirmadas
              </span>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-medium text-amber-200">
                Pendentes de pagamento
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-400">
                Canceladas e bloqueadas ficam de fora
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
