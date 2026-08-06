import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSessionToken, authConfig, shouldUseSecureCookies } from "@/lib/auth";
import { resolveDashboardPermissionsForRole, sanitizeDashboardPermissions } from "@/lib/dashboard-access";
import { getDb } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { DEMO_TENANT_ID, DEMO_TENANT_NAME, DEMO_USER_EMAIL, DEMO_USER_PASSWORD } from "@/services/demoData";

function parseDashboardPermissions(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    return sanitizeDashboardPermissions(JSON.parse(raw));
  } catch {
    return [];
  }
}

function extractTenantSlug(email: string) {
  const match = email.trim().toLowerCase().match(/^[^@\s]+@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  const ipLimit = checkRateLimit(getClientIp(request), "login-ip", { limit: 20, windowMs: 60_000 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

  const body = (await request.json()) as { email?: string; password?: string };
  const secureCookie = shouldUseSecureCookies(request);

  if (!body.email || !body.password) {
    return NextResponse.json({ message: "Informe e-mail e senha." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const emailLimit = checkRateLimit(email, "login-email", { limit: 8, windowMs: 60_000 });
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterSeconds);

  const demoLoginEnabled = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_LOGIN === "true";
  if (demoLoginEnabled && email === DEMO_USER_EMAIL && body.password === DEMO_USER_PASSWORD) {
    const token = await createSessionToken({ userId: -1, tenantId: DEMO_TENANT_ID, plan: "premium", tenantName: DEMO_TENANT_NAME, role: "admin", permissions: [], active: true });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(authConfig.cookieName, token, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: authConfig.tokenTtlSeconds });
    return response;
  }

  const tenantSlug = extractTenantSlug(email);
  if (!tenantSlug) {
    return NextResponse.json({ message: "Use o e-mail no formato usuario@slugdapousada." }, { status: 400 });
  }

  const { User, Tenant } = await getDb();
  const tenant = await Tenant.findOne({ where: { slug: tenantSlug, status: "active" } });
  if (!tenant) {
    return NextResponse.json({ message: "Pousada não encontrada ou inativa." }, { status: 404 });
  }

  const user = await User.findOne({ where: { email, tenantId: tenant.id } });
  if (!user) return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
  if (user.employmentStatus === "inactive") {
    return NextResponse.json({ message: "Colaborador inativo. Solicite reativacao ao gestor." }, { status: 403 });
  }

  const isValid = await bcrypt.compare(body.password, user.passwordHash);
  if (!isValid) return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });

  const token = await createSessionToken({
    userId: user.id,
    tenantId: tenant.id,
    plan: tenant.plan,
    tenantName: tenant.name,
    role: user.role,
    permissions: resolveDashboardPermissionsForRole(user.role, parseDashboardPermissions(user.dashboardPermissions)),
    active: user.employmentStatus === "active",
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authConfig.cookieName, token, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: authConfig.tokenTtlSeconds });
  return response;
}
