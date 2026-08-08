import { getDb } from "@/lib/db";
import { hasPlanAccessToFeature } from "@/lib/dashboard-access";

/**
 * Resolve o tenant usado pelas rotas públicas (`/api/public/**`, consumidas
 * pela landing page externa, sem sessão). Centralizado aqui para que
 * listagem de quartos, validação de cupom e criação de reserva pública
 * sempre concordem sobre qual tenant estão servindo — antes, cada rota
 * resolvia isso de um jeito diferente (algumas tinham `tenantId: 1`
 * hardcoded), o que quebrava a criação de reserva sempre que o tenant real
 * não era o de id 1.
 */
export async function resolvePublicTenantId(
  request: Request,
): Promise<number | null> {
  const { searchParams } = new URL(request.url);
  const fromSlug = searchParams.get("slug");

  if (fromSlug) {
    const { Tenant } = await getDb();
    const tenant = await Tenant.findOne({
      where: { slug: fromSlug, status: "active" },
    });
    return typeof tenant?.id === "number" ? tenant.id : null;
  }

  const fromQuery = searchParams.get("tenantId");
  const fromEnv = process.env.PUBLIC_ROOMS_TENANT_ID;

  const { Tenant, Room } = await getDb();

  const parsedQuery = fromQuery ? Number(fromQuery) : NaN;
  if (Number.isInteger(parsedQuery) && parsedQuery > 0) {
    const tenant = await Tenant.findOne({
      where: { id: parsedQuery, status: "active" },
      attributes: ["id"],
    });
    return typeof tenant?.id === "number" ? tenant.id : null;
  }

  const parsedEnv = fromEnv ? Number(fromEnv) : NaN;
  if (Number.isInteger(parsedEnv) && parsedEnv > 0) {
    const tenant = await Tenant.findOne({
      where: { id: parsedEnv, status: "active" },
      attributes: ["id"],
    });
    return typeof tenant?.id === "number" ? tenant.id : null;
  }

  // Fallback legado para integrações existentes que ainda não informam
  // slug/tenantId: só é seguro enquanto houver um único tenant ativo. Com
  // 2+ pousadas, novas integrações devem sempre passar `?slug=`.
  const firstRoom = await Room.findOne({
    attributes: ["tenantId"],
    include: [{ model: Tenant, as: "tenant", where: { status: "active" }, attributes: [] }],
    order: [
      ["tenantId", "ASC"],
      ["id", "ASC"],
    ],
  });

  if (firstRoom?.tenantId) {
    return firstRoom.tenantId;
  }

  return null;
}

/**
 * A landing page pública (`/api/public/**`) é vendida junto com o pacote de
 * Galeria, exclusivo do plano Enterprise. Reaproveita o mesmo requisito da
 * feature "gallery" em vez de duplicar a regra em cada rota pública.
 */
export async function hasPublicSiteAccess(tenantId: number): Promise<boolean> {
  const { Tenant } = await getDb();
  const tenant = await Tenant.findByPk(tenantId, { attributes: ["plan", "status"] });

  if (!tenant || tenant.status !== "active") {
    return false;
  }

  return hasPlanAccessToFeature(tenant.plan, "gallery");
}
