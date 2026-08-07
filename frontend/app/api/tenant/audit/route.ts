import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getVerifiedTenantSession, hasFeatureAccess } from "@/lib/tenant-session";

export async function GET() {
  const session = await getVerifiedTenantSession();
  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!hasFeatureAccess(session, "audit")) {
    return NextResponse.json(
      { message: "Sem permissão para esta ação." },
      { status: 403 },
    );
  }

  const { AuditLog } = await getDb();

  const logs = await AuditLog.findAll({
    where: { tenantId: session.tenantId },
    order: [["createdAt", "DESC"]],
    limit: 200,
  });

  return NextResponse.json(
    logs.map((log) => ({
      id: log.id,
      userName: log.userName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      createdAt: log.createdAt,
    })),
    { status: 200 },
  );
}
