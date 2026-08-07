import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { Transaction } from "sequelize";
import { TenantPlan, normalizeTenantPlan } from "@/lib/plan-enum";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/tenant-slug";

const validPlans: TenantPlan[] = [
  TenantPlan.BASIC,
  TenantPlan.PREMIUM,
  TenantPlan.ENTERPRISE,
];

type ProvisionPayload = {
  tenantName?: string;
  adminEmail?: string;
  adminPassword?: string;
  plan?: string;
  webhookSecret?: string;
};

function isValidWebhookSecret(provided: string | undefined) {
  const expected = process.env.PROVISION_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function extractTenantSlug(email: string) {
  const trimmed = email.trim().toLowerCase();
  const match = trimmed.match(/^[^@\s]+@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/);
  if (match?.[1]) {
    return match[1];
  }

  const fallback = slugify(trimmed.split("@")[0] || trimmed);
  return fallback || null;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ProvisionPayload;
  if (!isValidWebhookSecret(payload.webhookSecret)) {
    return NextResponse.json({ message: "Webhook inválido." }, { status: 401 });
  }

  const tenantName = payload.tenantName?.trim();
  const adminEmail = payload.adminEmail?.trim().toLowerCase();
  const adminPassword = payload.adminPassword;
  if (!tenantName || !adminEmail || !adminPassword || !payload.plan) {
    return NextResponse.json(
      { message: "Payload incompleto." },
      { status: 400 },
    );
  }

  const normalizedPlan = normalizeTenantPlan(payload.plan);
  if (!normalizedPlan || !validPlans.includes(normalizedPlan)) {
    return NextResponse.json({ message: "Plano inválido." }, { status: 400 });
  }

  const slug = extractTenantSlug(adminEmail);
  if (!slug) {
    return NextResponse.json(
      { message: "adminEmail deve estar no formato usuario@slugdapousada." },
      { status: 400 },
    );
  }

  const { sequelize, Tenant, User } = await getDb();
  try {
    await sequelize.transaction(async (transaction: Transaction) => {
      const existingTenant = await Tenant.findOne({
        where: { slug },
        transaction,
      });
      if (existingTenant) throw new Error("TENANT_SLUG_ALREADY_EXISTS");

      const tenant = await Tenant.create(
        { name: tenantName, slug, plan: normalizedPlan, status: "active" },
        { transaction },
      );
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await User.create(
        {
          name: adminEmail.split("@")[0],
          email: adminEmail,
          passwordHash,
          role: "admin",
          tenantId: Number(tenant.id),
        },
        { transaction },
      );
    });
    return NextResponse.json({ ok: true, slug }, { status: 201 });
  } catch (error) {
    console.error("Provision webhook error:", error);
    if (
      error instanceof Error &&
      error.message === "TENANT_SLUG_ALREADY_EXISTS"
    ) {
      return NextResponse.json(
        { message: "Já existe uma pousada com esse slug." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: "Falha ao provisionar tenant." },
      { status: 500 },
    );
  }
}
