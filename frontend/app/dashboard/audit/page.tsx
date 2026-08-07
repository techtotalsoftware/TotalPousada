'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

type AuditLogItem = {
  id: number;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  'reservation.created': 'Criou a reserva',
  'reservation.updated': 'Editou a reserva',
  'reservation.cancelled': 'Cancelou a reserva',
  'reservation.deleted': 'Excluiu a reserva',
  'reservation.checked_in': 'Fez check-in da reserva',
  'reservation.checked_out': 'Fez check-out da reserva',
  'team.member_created': 'Cadastrou o colaborador',
  'team.member_deleted': 'Excluiu o colaborador',
  'team.permissions_updated': 'Alterou permissões do colaborador',
  'team.employment_toggled': 'Alterou o status do colaborador',
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/tenant/audit', { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || 'Não foi possível carregar a auditoria.');
        }

        if (!cancelled) {
          setLogs(payload as AuditLogItem[]);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar auditoria.');
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
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex items-center gap-2.5">
          <div className="rounded-2xl bg-sky-500/10 p-2.5 text-sky-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">Segurança</p>
            <h2 className="mt-1 text-3xl font-semibold text-white">Auditoria</h2>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Últimas 200 ações realizadas pela equipe: reservas, check-in/out e alterações de colaboradores.
        </p>
        {error ? (
          <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            <p className="mt-3">Carregando...</p>
          </div>
        ) : logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhuma ação registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-white">{log.userName}</span>{' '}
                  <span className="text-slate-300">{ACTION_LABELS[log.action] ?? log.action}</span>
                  {log.entityId ? (
                    <span className="text-slate-500"> · {log.entityType} #{log.entityId}</span>
                  ) : null}
                </div>
                <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
