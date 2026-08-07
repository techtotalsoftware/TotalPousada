'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus2, Loader2, Sparkles } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';

type RoomOption = {
  id: string;
  name: string;
  maxGuests: number;
  price: number;
  status: 'active' | 'maintenance';
};

type AddonOption = {
  id: number;
  name: string;
  price: number;
  status: 'active' | 'inactive';
};

type ReservationItem = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'blocked';
  channelReference: string;
  amount: number;
  currency: string;
  notes: string;
  addons?: Array<{ id: number; name: string; price: number }>;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  room?: {
    localRoomId: string;
    name: string;
  };
};

type FormState = {
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCpf: string;
  guestCount: string;
  checkIn: string;
  checkOut: string;
  amount: string;
  notes: string;
  entryType: 'manual_reservation' | 'blocked';
  addonIds: number[];
};

const INITIAL_FORM: FormState = {
  roomId: '',
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  guestCpf: '',
  guestCount: '1',
  checkIn: '',
  checkOut: '',
  amount: '',
  notes: '',
  entryType: 'manual_reservation',
  addonIds: [],
};

function formatCurrencyLabel(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateLabel(value: string) {
  if (!value) return '-';
  const datePart = value.slice(0, 10);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${datePart}T00:00:00`));
}

function statusLabel(status: ReservationItem['status']) {
  if (status === 'confirmed') {
    return 'Confirmada';
  }

  if (status === 'pending') {
    return 'Pendente';
  }

  if (status === 'blocked') {
    return 'Bloqueada';
  }

  return 'Cancelada';
}

function statusClass(status: ReservationItem['status']) {
  if (status === 'confirmed') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
  }

  if (status === 'pending') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
  }

  if (status === 'blocked') {
    return 'border-violet-400/20 bg-violet-400/10 text-violet-200';
  }

  return 'border-rose-400/20 bg-rose-400/10 text-rose-200';
}

export default function ReservationsPage() {
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [addonsCatalog, setAddonsCatalog] = useState<AddonOption[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [roomsResponse, reservationsResponse, addonsResponse] = await Promise.all([
          fetch('/api/tenant/rooms'),
          fetch('/api/tenant/reservations'),
          // Adicionais são exclusivos do plano Enterprise — em planos
          // menores essa rota devolve 403, então tratamos como "sem
          // catálogo" em vez de erro fatal da tela.
          fetch('/api/tenant/addons').catch(() => null),
        ]);

        if (!roomsResponse.ok) {
          throw new Error('Não foi possível carregar os quartos.');
        }

        if (!reservationsResponse.ok) {
          throw new Error('Não foi possível carregar as reservas.');
        }

        const roomsData = (await roomsResponse.json()) as RoomOption[];
        const reservationsData = (await reservationsResponse.json()) as ReservationItem[];
        const addonsData =
          addonsResponse && addonsResponse.ok
            ? ((await addonsResponse.json()) as AddonOption[])
            : [];

        if (!cancelled) {
          setRooms(roomsData);
          setReservations(reservationsData);
          setAddonsCatalog(addonsData.filter((addon) => addon.status === 'active'));
          setForm((current) => ({
            ...current,
            roomId: current.roomId || roomsData[0]?.id || '',
          }));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar a tela de reservas.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    return {
      confirmed: reservations.filter((reservation) => reservation.status === 'confirmed').length,
      pending: reservations.filter((reservation) => reservation.status === 'pending').length,
      blocked: reservations.filter((reservation) => reservation.status === 'blocked').length,
    };
  }, [reservations]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.entryType === 'blocked') {
      if (!form.roomId || !form.checkIn || !form.checkOut) {
        setError('Preencha quarto e período para continuar.');
        return;
      }
    } else {
      if (
        !form.roomId ||
        !form.guestName ||
        !form.guestEmail ||
        !form.guestPhone ||
        !form.guestCpf ||
        !form.checkIn ||
        !form.checkOut ||
        !form.amount ||
        !form.notes
      ) {
        setError('Na reserva manual, todos os campos são obrigatórios.');
        return;
      }
    }

    if (form.checkOut <= form.checkIn) {
      setError('A data de check-out precisa ser posterior ao check-in.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/tenant/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: form.roomId,
          guestName: form.entryType === 'blocked' ? 'Bloqueio Operacional' : form.guestName,
          guestEmail: form.entryType === 'blocked' ? '' : form.guestEmail,
          guestPhone: form.entryType === 'blocked' ? '' : form.guestPhone,
          guestCpf: form.entryType === 'blocked' ? '' : form.guestCpf,
          guestCount: form.entryType === 'blocked' ? 1 : Number(form.guestCount) || 1,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          amount: parseCurrencyInput(form.amount || '0'),
          notes: form.notes,
          entryType: form.entryType,
          addonIds: form.entryType === 'blocked' ? [] : form.addonIds,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Não foi possível criar a reserva.');
      }

      setReservations((current) => [payload.reservation, ...current]);
      setForm({
        roomId: rooms[0]?.id || '',
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        guestCpf: '',
        guestCount: '1',
        checkIn: '',
        checkOut: '',
        amount: '',
        notes: '',
        entryType: 'manual_reservation',
        addonIds: [],
      });
      setSuccess('Reserva criada com sucesso no banco de dados.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao criar a reserva.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">Recepção</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Reservas</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Gerencie todas as reservas da pousada. Crie novas reservas, acompanhe o status de cada hóspede e mantenha o calendário sempre atualizado.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
            Conflitos de datas, bloqueios futuros e mínimo de estadia são verificados automaticamente.
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
          <p className="text-sm text-slate-400">Confirmadas</p>
          <p className="mt-2 text-3xl font-semibold">{metrics.confirmed}</p>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
          <p className="text-sm text-slate-400">Pendentes</p>
          <p className="mt-2 text-3xl font-semibold">{metrics.pending}</p>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
          <p className="text-sm text-slate-400">Bloqueadas</p>
          <p className="mt-2 text-3xl font-semibold">{metrics.blocked}</p>
        </article>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/20"
        >
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl bg-sky-500/10 p-2.5 text-sky-300">
              <CalendarPlus2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Nova reserva</h3>
              <p className="text-sm text-slate-400">Escolha o quarto disponível e grave a reserva no banco.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <select
              value={form.entryType}
              onChange={(event) => setForm((current) => ({ ...current, entryType: event.target.value as FormState['entryType'] }))}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            >
              <option value="manual_reservation">Reserva manual</option>
              <option value="blocked">Bloqueio operacional</option>
            </select>

            <select
              value={form.roomId}
              onChange={(event) => setForm((current) => ({ ...current, roomId: event.target.value }))}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
              disabled={isLoading || rooms.length === 0}
            >
              <option value="">Selecione o quarto</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} · até {room.maxGuests} hóspedes
                </option>
              ))}
            </select>

            <input
              value={form.guestName}
              onChange={(event) => setForm((current) => ({ ...current, guestName: event.target.value }))}
              required={form.entryType !== 'blocked'}
              placeholder="Nome do hóspede"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            />
            <input
              type="email"
              value={form.guestEmail}
              onChange={(event) => setForm((current) => ({ ...current, guestEmail: event.target.value }))}
              required={form.entryType !== 'blocked'}
              placeholder="E-mail do hóspede"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            />
            <input
              value={form.guestPhone}
              onChange={(event) => setForm((current) => ({ ...current, guestPhone: event.target.value }))}
              required={form.entryType !== 'blocked'}
              placeholder="Telefone"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            />
            <input
              value={form.guestCpf}
              onChange={(event) => setForm((current) => ({ ...current, guestCpf: event.target.value }))}
              required={form.entryType !== 'blocked'}
              placeholder="CPF"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            />
            <input
              type="number"
              min={1}
              value={form.guestCount}
              onChange={(event) => setForm((current) => ({ ...current, guestCount: event.target.value }))}
              required={form.entryType !== 'blocked'}
              placeholder="Número de hóspedes"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.checkIn}
                onChange={(event) => setForm((current) => ({ ...current, checkIn: event.target.value }))}
                required
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
              />
              <input
                type="date"
                value={form.checkOut}
                onChange={(event) => setForm((current) => ({ ...current, checkOut: event.target.value }))}
                required
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
              />
            </div>
            <input
              type="text"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: formatCurrencyInput(event.target.value) }))}
              required={form.entryType !== 'blocked'}
              placeholder="R$ 0,00 (diária/hospedagem)"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            />

            {addonsCatalog.length > 0 && form.entryType !== 'blocked' ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Adicionais (somados ao valor da reserva)
                </p>
                <div className="mt-2 space-y-1.5">
                  {addonsCatalog.map((addon) => {
                    const checked = form.addonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-white/5"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm((current) => ({
                                ...current,
                                addonIds: checked
                                  ? current.addonIds.filter((id) => id !== addon.id)
                                  : [...current.addonIds, addon.id],
                              }))
                            }
                            className="h-4 w-4 rounded border-white/20 bg-slate-950 accent-sky-500"
                          />
                          {addon.name}
                        </span>
                        <span className="text-slate-400">{formatCurrencyLabel(addon.price)}</span>
                      </label>
                    );
                  })}
                </div>
                {form.addonIds.length > 0 ? (
                  <p className="mt-2 text-xs text-sky-300">
                    + {formatCurrencyLabel(
                      addonsCatalog
                        .filter((addon) => form.addonIds.includes(addon.id))
                        .reduce((sum, addon) => sum + addon.price, 0),
                    )}{' '}
                    em adicionais
                  </p>
                ) : null}
              </div>
            ) : null}

            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              required={form.entryType !== 'blocked'}
              placeholder="Observações"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-sky-300 transition focus:ring"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || isLoading || rooms.length === 0}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-900/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Criar reserva
          </button>
        </form>

        {isLoading || reservations.length > 0 ? (
          <article className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
            <h3 className="text-xl font-semibold text-white">Reservas recentes</h3>
            <p className="mt-1 text-sm text-slate-400">Reservas mais recentes da pousada.</p>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
                  Carregando quartos e reservas...
                </div>
              ) : (
                reservations.slice(0, 6).map((reservation) => {
                  const roomName = reservation.room?.name || rooms.find((room) => room.id === reservation.roomId)?.name || reservation.roomId;

                  return (
                    <div key={reservation.id} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{reservation.customer?.name || 'Sem hóspede'}</p>
                          <p className="mt-1 text-sm text-slate-400">{roomName}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusClass(reservation.status)}`}>
                          {statusLabel(reservation.status)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        {formatDateLabel(reservation.checkIn)} - {formatDateLabel(reservation.checkOut)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{reservation.channelReference || 'Sem referência'}</p>
                      {reservation.addons && reservation.addons.length > 0 ? (
                        <p className="mt-1 text-xs text-sky-300">
                          Adicionais: {reservation.addons.map((addon) => addon.name).join(', ')}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </article>
        ) : (
          <article className="flex items-center justify-center rounded-[28px] border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/20">
            <div>
              <p className="text-sm font-medium text-slate-300">Nenhuma reserva feita ainda.</p>
              <p className="mt-1 text-sm text-slate-500">Preencha o formulário ao lado para criar a primeira reserva no banco.</p>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
