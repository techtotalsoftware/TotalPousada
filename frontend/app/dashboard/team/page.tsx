"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Plus, ShieldCheck } from "lucide-react";
import type { DashboardFeatureKey } from "@/lib/dashboard-access";
import { DEFAULT_STAFF_FEATURES } from "@/lib/dashboard-access";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  TEAM_PERMISSION_OPTIONS,
  TEAM_ROLE_OPTIONS,
  TEAM_SHIFT_OPTIONS,
  type TeamEmploymentStatus,
  type TeamShift,
  type TeamShiftStatus,
} from "@/lib/team";

type TeamRole = (typeof TEAM_ROLE_OPTIONS)[number];

type TeamMember = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: TeamRole;
  shift: TeamShift;
  employmentStatus: TeamEmploymentStatus;
  shiftStatus: TeamShiftStatus;
  lastPunch: string | null;
  permissions: DashboardFeatureKey[];
  isCurrentUser: boolean;
  accountRole: "admin" | "staff";
};

type TeamResponse = {
  canManage: boolean;
  tenantSlug: string;
  members: TeamMember[];
};

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function usernameFromEmail(email: string, tenantSlug: string) {
  const suffix = `@${tenantSlug}`;
  if (tenantSlug && email.toLowerCase().endsWith(suffix)) {
    return email.slice(0, email.length - suffix.length);
  }
  return email.split("@")[0] ?? email;
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<number | null>(null);
  const [savingPermissionsFor, setSavingPermissionsFor] = useState<
    number | null
  >(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"Todos" | TeamRole>("Todos");
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    phone: "",
    role: "Recepcao" as TeamRole,
    shift: "Manha" as TeamMember["shift"],
    permissions: [...DEFAULT_STAFF_FEATURES] as DashboardFeatureKey[],
  });
  const [permissionDraft, setPermissionDraft] = useState<
    Record<number, DashboardFeatureKey[]>
  >({});
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  async function loadTeam() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tenant/team", { cache: "no-store" });
      const payload = (await response.json()) as TeamResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message ?? "Nao foi possivel carregar a equipe.",
        );
      }

      setTeam(payload.members);
      setTenantSlug(payload.tenantSlug ?? "");
      setCanManage(payload.canManage);
      setPermissionDraft(
        payload.members.reduce<Record<number, DashboardFeatureKey[]>>(
          (acc, member) => {
            acc[member.id] = member.permissions;
            return acc;
          },
          {},
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado ao carregar equipe.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeam();
  }, []);

  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      const matchesRole =
        roleFilter === "Todos" ? true : member.role === roleFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.phone.toLowerCase().includes(term);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, team]);

  const summary = useMemo(() => {
    return {
      active: team.filter((member) => member.employmentStatus === "ativo")
        .length,
      onShift: team.filter((member) => member.shiftStatus === "em_turno")
        .length,
    };
  }, [team]);

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name || !form.username || !form.password || isAddingMember) {
      return;
    }

    setError(null);
    setIsAddingMember(true);

    try {
      const response = await fetch("/api/tenant/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          password: form.password,
          phone: form.phone,
          role: form.role,
          shift: form.shift,
          permissions: form.permissions,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setError(payload.message ?? "Nao foi possivel criar colaborador.");
        return;
      }

      setForm({
        name: "",
        username: "",
        password: "",
        phone: "",
        role: "Recepcao",
        shift: "Manha",
        permissions: [...DEFAULT_STAFF_FEATURES],
      });
      await loadTeam();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro de conexao ao criar colaborador.",
      );
    } finally {
      setIsAddingMember(false);
    }
  }

  function togglePermission(
    permissions: DashboardFeatureKey[],
    key: DashboardFeatureKey,
  ) {
    if (permissions.includes(key)) {
      return permissions.filter((permission) => permission !== key);
    }

    return [...permissions, key];
  }

  async function runMemberAction(
    memberId: number,
    action: "toggle-employment" | "toggle-shift",
  ) {
    setBusyMemberId(memberId);
    setError(null);

    try {
      const response = await fetch(`/api/tenant/team/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setError(payload.message ?? "Falha ao atualizar colaborador.");
        return;
      }

      await loadTeam();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro de conexao ao atualizar colaborador.",
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  async function savePermissions(memberId: number) {
    setSavingPermissionsFor(memberId);
    setError(null);

    try {
      const response = await fetch(`/api/tenant/team/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set-permissions",
          permissions: permissionDraft[memberId] ?? [],
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setError(payload.message ?? "Nao foi possivel salvar permissoes.");
        return;
      }

      await loadTeam();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro de conexao ao salvar permissoes.",
      );
    } finally {
      setSavingPermissionsFor(null);
    }
  }

  async function deleteMember(member: TeamMember) {
    if (!canManage) {
      return;
    }

    setMemberToDelete(member);
  }

  async function confirmDeleteMember() {
    if (!memberToDelete) {
      return;
    }

    setBusyMemberId(memberToDelete.id);
    setError(null);

    try {
      const response = await fetch(`/api/tenant/team/${memberToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setError(payload.message ?? "Nao foi possivel excluir colaborador.");
        return;
      }

      setMemberToDelete(null);
      await loadTeam();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro de conexao ao excluir colaborador.",
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">
          Operacao interna
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          Gerenciamento de Equipe
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Controle real da equipe com cadastro de login interno (usuario/senha),
          ativacao/inativacao, abertura e encerramento de turno, e permissoes
          por pagina do sistema.
        </p>
        {tenantSlug ? (
          <p className="mt-2 text-xs text-slate-500">
            Pousada atual: @{tenantSlug}
          </p>
        ) : null}
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
          <p className="text-sm text-slate-400">Colaboradores ativos</p>
          <p className="mt-2 text-3xl font-semibold">{summary.active}</p>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
          <p className="text-sm text-slate-400">Em turno agora</p>
          <p className="mt-2 text-3xl font-semibold">{summary.onShift}</p>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-white">
          <p className="text-sm text-slate-400">Permissoes configuraveis</p>
          <p className="mt-2 text-3xl font-semibold">
            {TEAM_PERMISSION_OPTIONS.length}
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:gap-8 xl:grid-cols-[1.1fr_minmax(0,0.9fr)]">
        <article className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-md">
          <div className="flex flex-col gap-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, usuário ou telefone..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition-all duration-200 hover:border-white/20 focus:border-sky-400/50 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-400/20"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Filtrar:
              </span>
              {(["Todos", ...TEAM_ROLE_OPTIONS] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={[
                    "rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200",
                    roleFilter === role
                      ? "border-sky-400/40 bg-sky-500/15 text-sky-200 shadow-sm shadow-sky-900/20"
                      : "border-white/10 bg-slate-950/50 text-slate-300 hover:border-white/20 hover:bg-slate-800/50 hover:text-white",
                  ].join(" ")}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="animate-pulse text-sm font-medium text-slate-400">
                  Carregando equipe...
                </p>
              </div>
            ) : null}

            {filteredTeam.map((member) => {
              const username = usernameFromEmail(member.email, tenantSlug);

              return (
                <div
                  key={member.id}
                  className="group rounded-2xl border border-white/10 bg-slate-950/50 p-5 transition-colors duration-200 hover:bg-slate-950/70"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-white">
                        {member.name}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-400">
                        {member.role} <span className="mx-1 opacity-50">·</span>{" "}
                        Turno {member.shift}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-slate-400">
                          {tenantSlug
                            ? `${username}@${tenantSlug}`
                            : member.email}
                        </p>
                        <p className="text-xs text-slate-400">{member.phone}</p>
                        <p className="text-xs font-medium text-slate-500">
                          Conta:{" "}
                          <span
                            className={
                              member.accountRole === "admin"
                                ? "text-sky-300/80"
                                : "text-slate-400"
                            }
                          >
                            {member.accountRole === "admin"
                              ? "Gestor"
                              : "Colaborador"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1",
                          member.employmentStatus === "ativo"
                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-500/40 bg-slate-700/30 text-slate-300",
                        ].join(" ")}
                      >
                        {member.employmentStatus === "ativo"
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1",
                          member.shiftStatus === "em_turno"
                            ? "border-sky-400/30 bg-sky-500/10 text-sky-200"
                            : "border-slate-500/40 bg-slate-700/30 text-slate-300",
                        ].join(" ")}
                      >
                        {member.shiftStatus === "em_turno"
                          ? "Em turno"
                          : "Fora de turno"}
                      </span>
                      {member.isCurrentUser ? (
                        <span className="inline-flex items-center rounded-full border border-sky-300/40 bg-sky-500/10 px-2.5 py-1 text-sky-200">
                          Você
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900/50 px-2 py-1">
                      <Clock3 className="h-3.5 w-3.5 text-emerald-400/80" />
                      Última batida:{" "}
                      <span className="text-slate-300">
                        {formatDateTime(member.lastPunch ?? undefined)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        void runMemberAction(member.id, "toggle-shift")
                      }
                      disabled={
                        !canManage ||
                        member.employmentStatus !== "ativo" ||
                        busyMemberId === member.id
                      }
                      className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-200 transition-all duration-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {member.shiftStatus === "fora"
                        ? "Iniciar turno"
                        : "Encerrar turno"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runMemberAction(member.id, "toggle-employment")
                      }
                      disabled={
                        !canManage ||
                        member.isCurrentUser ||
                        busyMemberId === member.id
                      }
                      className="rounded-xl border border-white/15 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200 transition-all duration-200 hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {member.employmentStatus === "ativo"
                        ? "Inativar colaborador"
                        : "Reativar colaborador"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMember(member)}
                      disabled={
                        !canManage ||
                        member.isCurrentUser ||
                        member.accountRole === "admin" ||
                        busyMemberId === member.id
                      }
                      className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-200 transition-all duration-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Excluir colaborador
                    </button>
                  </div>

                  <div className="mt-5 rounded-xl border border-white/5 bg-slate-900/30 p-4">
                    <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-sky-200/80">
                      <ShieldCheck className="h-4 w-4" /> Permissões no painel
                    </p>

                    <div className="grid gap-2.5 md:grid-cols-2">
                      {TEAM_PERMISSION_OPTIONS.map((option) => {
                        const checked = (
                          permissionDraft[member.id] ?? []
                        ).includes(option.key);

                        return (
                          <label
                            key={option.key}
                            className="group/label flex cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-900/60"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={
                                !canManage || member.accountRole === "admin"
                              }
                              onChange={() =>
                                setPermissionDraft((prev) => ({
                                  ...prev,
                                  [member.id]: togglePermission(
                                    prev[member.id] ?? [],
                                    option.key,
                                  ),
                                }))
                              }
                              className="h-4 w-4 cursor-pointer rounded border-white/20 bg-slate-950 accent-sky-500 transition-all disabled:cursor-not-allowed"
                            />
                            <span className="group-hover/label:text-white transition-colors">
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {member.accountRole !== "admin" ? (
                      <button
                        type="button"
                        onClick={() => void savePermissions(member.id)}
                        disabled={
                          !canManage || savingPermissionsFor === member.id
                        }
                        className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-200 transition-all duration-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {savingPermissionsFor === member.id
                          ? "Salvando..."
                          : "Salvar permissões"}
                      </button>
                    ) : (
                      <p className="mt-4 text-xs italic text-slate-500">
                        * Gestor sempre enxerga todas as opções do sistema.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {!loading && filteredTeam.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12">
                <p className="text-sm font-medium text-slate-400">
                  Nenhum colaborador encontrado.
                </p>
              </div>
            ) : null}
          </div>
        </article>

        {/* PAINEL DIREITO: ADICIONAR COLABORADOR */}
        <article className="space-y-6">
          <form
            onSubmit={addMember}
            className="sticky top-6 rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-md"
          >
            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight text-white">
                Novo colaborador
              </h3>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Crie um login interno usando um usuário. O sistema adicionará
                automaticamente o sufixo da pousada.
              </p>
            </div>

            <div className="grid gap-4">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                placeholder="Nome completo"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-sky-400/50 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-400/20"
              />

              <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                <input
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Za-z0-9._-]+"
                  placeholder="usuário"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-sky-400/50 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-400/20"
                />
                <div className="flex h-[46px] items-center justify-center rounded-xl border border-white/10 bg-slate-950/40 px-4 text-sm font-medium text-slate-400 md:min-w-[120px]">
                  {tenantSlug ? `@${tenantSlug}` : "@slugpousada"}
                </div>
              </div>

              <input
                type="password"
                minLength={6}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                required
                placeholder="Senha de acesso"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-sky-400/50 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-400/20"
              />
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="Telefone"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-sky-400/50 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-400/20"
              />

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      role: event.target.value as TeamRole,
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition-all duration-200 hover:border-white/20 focus:border-sky-400/50 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-400/20"
                >
                  <option value="Recepcao">Recepção</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Manutencao">Manutenção</option>
                  <option value="Gestao">Gestão</option>
                </select>
                <select
                  value={form.shift}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      shift: event.target.value as TeamMember["shift"],
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition-all duration-200 hover:border-white/20 focus:border-sky-400/50 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-400/20"
                >
                  {TEAM_SHIFT_OPTIONS.map((shift) => (
                    <option key={shift} value={shift}>
                      {shift}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 rounded-xl border border-white/5 bg-slate-950/30 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-sky-200/80">
                  Permissões de acesso
                </p>
                <div className="grid gap-2.5 md:grid-cols-2">
                  {TEAM_PERMISSION_OPTIONS.map((option) => {
                    const checked = form.permissions.includes(option.key);

                    return (
                      <label
                        key={option.key}
                        className="group/form-label flex cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2.5 text-xs text-slate-300 transition-colors hover:bg-slate-900/60"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm((prev) => ({
                              ...prev,
                              permissions: togglePermission(
                                prev.permissions,
                                option.key,
                              ),
                            }))
                          }
                          className="h-4 w-4 cursor-pointer rounded border-white/20 bg-slate-950 accent-sky-500 transition-all"
                        />
                        <span className="group-hover/form-label:text-white transition-colors">
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={!canManage || isAddingMember}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all duration-200 hover:scale-[1.02] hover:bg-sky-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 md:w-auto md:justify-start"
              >
                <Plus className="h-4 w-4" />{" "}
                {isAddingMember ? "Adicionando..." : "Adicionar colaborador"}
              </button>

              {!canManage ? (
                <p className="mt-4 text-xs font-medium text-rose-300/80">
                  * Somente gestores podem criar colaboradores e editar
                  permissões.
                </p>
              ) : null}
            </div>
          </form>
        </article>
      </section>

      <ConfirmDialog
        open={Boolean(memberToDelete)}
        title="Excluir colaborador"
        description={
          memberToDelete
            ? `Tem certeza que deseja excluir ${memberToDelete.name}? Esta acao nao pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir colaborador"
        cancelLabel="Manter colaborador"
        loading={memberToDelete ? busyMemberId === memberToDelete.id : false}
        onCancel={() => setMemberToDelete(null)}
        onConfirm={() => void confirmDeleteMember()}
      />
    </div>
  );
}
