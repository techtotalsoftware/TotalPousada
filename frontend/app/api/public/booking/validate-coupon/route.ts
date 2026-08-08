import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hasPublicSiteAccess, resolvePublicTenantId } from "@/lib/public-tenant";
import { logError } from "@/lib/logger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Endpoint público e não autenticado: sem limite, um atacante poderia
    // testar códigos de cupom em sequência (brute force) sem custo nenhum.
    const ipLimit = checkRateLimit(getClientIp(request), "validate-coupon", {
      limit: 20,
      windowMs: 60_000,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const body = await request.json();
    const { code } = body;

    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Informe o código do cupom." }, { status: 400 });
    }

    const tenantId = await resolvePublicTenantId(request);

    if (!tenantId || !(await hasPublicSiteAccess(tenantId))) {
      return NextResponse.json({ error: "Cupom inválido ou inexistente." }, { status: 404 });
    }

    const { Coupon } = await getDb();

    // Busca o cupom pelo código (ignorando maiúsculas/minúsculas na hora da busca)
    const coupon = await Coupon.findOne({
      where: {
        tenantId,
        code: code.toUpperCase(),
      },
    });

    // Regras de Validação
    if (!coupon) {
      return NextResponse.json(
        { error: "Cupom inválido ou inexistente." },
        { status: 404 },
      );
    }

    if (coupon.status !== "active") {
      return NextResponse.json(
        { error: "Este cupom não está mais ativo." },
        { status: 400 },
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { error: "Este cupom já atingiu o limite de uso." },
        { status: 400 },
      );
    }

    // Se passou em tudo, retorna o valor do desconto!
    return NextResponse.json(
      {
        valid: true,
        code: coupon.code,
        discountPercentage: Number(coupon.discountPercentage),
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  } catch (error: any) {
    logError("Erro ao validar cupom:", error);
    return NextResponse.json(
      { error: "Erro interno ao validar cupom." },
      { status: 500 },
    );
  }
}

// Necessário para o CORS (Landing Page -> SaaS)
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}
