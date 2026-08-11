import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { getDb } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { buildCheckinReminderEmail } from "@/lib/emails/reservation-emails";
import { logError, logWarn } from "@/lib/logger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

function isValidCronSecret(provided: string | null) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Disparado por um cron job do VPS (não por sessão de usuário nem por
 * requisição do painel), uma vez por dia, para enviar o lembrete de
 * check-in aos hóspedes que chegam amanhã em qualquer tenant. Autenticado
 * por segredo compartilhado (CRON_SECRET), no mesmo padrão do webhook de
 * provisionamento — não há sessão de tenant aqui porque o job
 * legitimamente precisa varrer reservas de todos os tenants, cada uma já
 * isolada pelo próprio tenantId da linha.
 *
 * Exemplo de crontab no VPS:
 *   0 8 * * * curl -s -X POST https://seusite.com/api/cron/checkin-reminders \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: Request) {
  const ipLimit = checkRateLimit(getClientIp(request), "cron-checkin-reminders", {
    limit: 5,
    windowMs: 60_000,
  });
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds);
  }

  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!isValidCronSecret(provided)) {
    logWarn("cron/checkin-reminders: tentativa com segredo inválido", {
      ip: getClientIp(request),
    });
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { Reservation, Room, Tenant } = await getDb();

  const now = new Date();
  const tomorrowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const tomorrowEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2),
  );

  const reservations = await Reservation.findAll({
    where: {
      status: "confirmed",
      checkIn: { [Op.gte]: tomorrowStart, [Op.lt]: tomorrowEnd },
      reminderSentAt: null,
    },
    include: [
      { model: Room, as: "room", attributes: ["name"] },
      { model: Tenant, as: "tenant", attributes: ["name"] },
    ],
  });

  let sent = 0;
  let failed = 0;

  for (const reservation of reservations) {
    try {
      if (!reservation.guestEmail) {
        continue;
      }

      const room = reservation.get("room") as InstanceType<typeof Room> | undefined;
      const tenant = reservation.get("tenant") as InstanceType<typeof Tenant> | undefined;
      if (!tenant) {
        continue;
      }

      const email = buildCheckinReminderEmail({
        tenantName: tenant.name,
        guestName: reservation.guestName,
        roomName: room?.name ?? "Quarto",
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        amount: Number(reservation.amount),
      });

      const ok = await sendMail({ to: reservation.guestEmail, ...email });
      if (ok) {
        await reservation.update({ reminderSentAt: new Date() });
        sent += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      logError("cron/checkin-reminders: falha ao processar reserva", error, {
        reservationId: reservation.id,
      });
    }
  }

  return NextResponse.json({ ok: true, total: reservations.length, sent, failed });
}
