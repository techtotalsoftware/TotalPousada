import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Op } from "sequelize";
import {
  getVerifiedTenantSession,
  hasFeatureAccess,
} from "@/lib/tenant-session";
import {
  hasPlanAccessToFeature,
  resolveDashboardPermissionsForRole,
  sanitizeDashboardPermissions,
  type DashboardFeatureKey,
} from "@/lib/dashboard-access";
import { getDb } from "@/lib/db";
import { TenantPlan } from "@/lib/plan-enum";

const TEAM_ROLE_OPTIONS = [
  "Recepcao",
  "Limpeza",
  "Manutencao",
  "Gestao",
] as const;
const TEAM_SHIFT_OPTIONS = ["Manha", "Tarde", "Noite"] as const;
type TeamShift = (typeof TEAM_SHIFT_OPTIONS)[number];

type TeamCreatePayload = {
  name?: string;
  username?: string;
  password?: string;
  phone?: string;
  role?: string;
  shift?: TeamShift;
  permissions?: DashboardFeatureKey[];
};

function parsePermissions(raw: string | null | undefined) {
  if (!raw) {
    return [];
  }

  try {
    return sanitizeDashboardPermissions(JSON.parse(raw));
  } catch {
    return [];
  }
}

function extractTenantSlug(email: string) {
  const match = email
    .trim()
    .toLowerCase()
    .match(/^[^@\s]+@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/);

  return match?.[1] ?? null;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/\s+/g, "");
}

async function ensureTenantContext(
  tenantId: number,
  tenantName: string,
  plan: TenantPlan,
) {
  const { Tenant } = await getDb();

  await Tenant.findOrCreate({
    where: { id: tenantId },
    defaults: {
      id: tenantId,
      name: tenantName,
      slug: `tenant-${tenantId}`,
      plan,
      status: "active",
    },
  });
}

export async function GET() {
  const session = await getVerifiedTenantSession();

  if (!session) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  if (!hasFeatureAccess(session, "team")) {
    return NextResponse.json(
      { message: "Sem permissao para esta acao." },
      { status: 403 },
    );
  }

  await ensureTenantContext(session.tenantId, session.tenantName, session.plan);

  const { User, Tenant } = await getDb();

  const tenant = await Tenant.findByPk(session.tenantId, {
    attributes: ["slug"],
  });

  const teamUsers = await User.findAll({
    where: {
      tenantId: session.tenantId,
      role: {
        [Op.in]: ["admin", "staff"],
      },
    },
    order: [["createdAt", "DESC"]],
  });

  const team = teamUsers.map((user) => {
    const rawPermissions = parsePermissions(user.dashboardPermissions);
    const permissions = resolveDashboardPermissionsForRole(
      user.role,
      rawPermissions,
    );

    return {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      phone: user.phone ?? "Nao informado",
      role: user.teamRole,
      shift: user.shiftLabel,
      employmentStatus: user.employmentStatus,
      shiftStatus: user.shiftStatus,
      lastPunch: user.lastPunchAt ? user.lastPunchAt.toISOString() : null,
      permissions,
      isCurrentUser: user.id === session.userId,
      accountRole: user.role,
    };
  });

  return NextResponse.json({
    canManage: session.role === "admin",
    tenantSlug: tenant?.slug ?? "",
    plan: session.plan,
    members: team,
  });
}

export async function POST(request: Request) {
  const session = await getVerifiedTenantSession();

  if (!session) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json(
      { message: "Somente gestores podem cadastrar colaboradores." },
      { status: 403 },
    );
  }

  if (!hasFeatureAccess(session, "team")) {
    return NextResponse.json(
      { message: "Sem permissao para esta acao." },
      { status: 403 },
    );
  }

  await ensureTenantContext(session.tenantId, session.tenantName, session.plan);

  const body = (await request.json()) as TeamCreatePayload;

  if (!body.name || !body.password || !body.role || !body.shift) {
    return NextResponse.json(
      { message: "Preencha nome, usuario, senha, funcao e turno." },
      { status: 400 },
    );
  }

  const username = normalizeUsername(body.username ?? "");

  if (!username) {
    return NextResponse.json(
      { message: "Informe o usuario do colaborador." },
      { status: 400 },
    );
  }

  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/i.test(username)) {
    return NextResponse.json(
      {
        message:
          "O usuario deve ter entre 3 e 40 caracteres e usar apenas letras, numeros, ponto, hifen ou underline.",
      },
      { status: 400 },
    );
  }

  if (
    !TEAM_ROLE_OPTIONS.includes(body.role as (typeof TEAM_ROLE_OPTIONS)[number])
  ) {
    return NextResponse.json({ message: "Funcao invalida." }, { status: 400 });
  }

  const teamRole = body.role as (typeof TEAM_ROLE_OPTIONS)[number];

  if (!TEAM_SHIFT_OPTIONS.includes(body.shift)) {
    return NextResponse.json({ message: "Turno invalido." }, { status: 400 });
  }

  const { User, Tenant } = await getDb();

  const currentTenant = await Tenant.findByPk(session.tenantId, {
    attributes: ["slug"],
  });
  const tenantSlug = currentTenant?.slug;

  if (!tenantSlug) {
    return NextResponse.json(
      { message: "Slug da pousada nao encontrado." },
      { status: 400 },
    );
  }

  const fullEmail = `${username}@${tenantSlug}`;
  const emailTenantSlug = extractTenantSlug(fullEmail);

  if (!emailTenantSlug || emailTenantSlug !== tenantSlug) {
    return NextResponse.json(
      {
        message: `O usuario deve usar o sufixo desta pousada: @${tenantSlug}.`,
      },
      { status: 400 },
    );
  }

  const permissions = sanitizeDashboardPermissions(body.permissions ?? []).filter(
    (feature) => hasPlanAccessToFeature(session.plan, feature),
  );
  const passwordHash = await bcrypt.hash(body.password, 10);

  try {
    await User.create({
      name: body.name.trim(),
      email: fullEmail,
      passwordHash,
      role: "staff",
      tenantId: session.tenantId,
      phone: body.phone?.trim() || null,
      teamRole,
      shiftLabel:
        body.shift === "Manha"
          ? "morning"
          : body.shift === "Tarde"
            ? "afternoon"
            : "night",
      shiftStatus: "off",
      employmentStatus: "active",
      dashboardPermissions: JSON.stringify(permissions),
    });

    return NextResponse.json({ ok: true, email: fullEmail }, { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar colaborador:", error);

    if (error instanceof Error && /unique/i.test(error.message)) {
      return NextResponse.json(
        { message: "E-mail ja cadastrado em outro usuario." },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      /team_role|Data truncated/i.test(error.message)
    ) {
      try {
        await User.create({
          name: body.name.trim(),
          email: fullEmail,
          passwordHash,
          role: "staff",
          tenantId: session.tenantId,
          phone: body.phone?.trim() || null,
          teamRole: "Recepcao",
          shiftLabel:
            body.shift === "Manha"
              ? "morning"
              : body.shift === "Tarde"
                ? "afternoon"
                : "night",
          shiftStatus: "off",
          employmentStatus: "active",
          dashboardPermissions: JSON.stringify(permissions),
        });

        return NextResponse.json(
          { ok: true, email: fullEmail },
          { status: 201 },
        );
      } catch (fallbackError) {
        console.error(
          "Erro no fallback de cadastro de colaborador:",
          fallbackError,
        );
      }
    }

    return NextResponse.json(
      { message: "Falha ao cadastrar colaborador." },
      { status: 500 },
    );
  }
}
