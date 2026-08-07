import { getDb } from "@/lib/db";
import type { AuditAction } from "@/models/AuditLog";

type LogAuditEventInput = {
  tenantId: number;
  userId: number | null;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Grava um evento na trilha de auditoria (best-effort). Nunca lança — uma
 * falha ao registrar o log não pode derrubar a ação de negócio que já foi
 * concluída (ex.: check-in já efetivado, reserva já criada).
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    const { AuditLog } = await getDb();

    // userId negativo é o usuário demo (não existe na tabela users, e a
    // coluna é UNSIGNED — gravar -1 direto quebra o INSERT).
    const userId = input.userId !== null && input.userId > 0 ? input.userId : null;

    await AuditLog.create({
      tenantId: input.tenantId,
      userId,
      userName: input.userName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
  } catch (error) {
    console.error("[audit] Falha ao registrar evento de auditoria:", error);
  }
}
