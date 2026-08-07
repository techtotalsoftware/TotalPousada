import { NextResponse } from "next/server";
import { getVerifiedTenantSession, hasFeatureAccess } from "@/lib/tenant-session";
import { createManualReservationAction } from "@/actions/reservation";
import {
  deleteReservation,
  getTenantReservations,
  updateReservation,
} from "@/services/tenantService";
import type { Reservation } from "@/types/domain";
import { logAuditEvent } from "@/lib/audit";

export async function PATCH(request: Request) {
  const session = await getVerifiedTenantSession();
  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  if (!hasFeatureAccess(session, "reservations")) {
    return NextResponse.json({ message: "Sem permissão para esta ação." }, { status: 403 });
  }

  const body = (await request.json()) as { reservation?: Reservation };

  if (!body.reservation) {
    return NextResponse.json({ message: "Reserva inválida." }, { status: 400 });
  }

  try {
    const reservation = await updateReservation(session.tenantId, body.reservation);
    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.userName,
      action:
        body.reservation.status === "cancelled"
          ? "reservation.cancelled"
          : "reservation.updated",
      entityType: "reservation",
      entityId: body.reservation.id,
    });
    return NextResponse.json({ reservation });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar reserva.",
      },
      { status: 400 },
    );
  }
}

export async function GET() {
  try {
    const session = await getVerifiedTenantSession();
    if (!session) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }
    if (!hasFeatureAccess(session, "reservations")) {
      return NextResponse.json({ message: "Sem permissão para esta ação." }, { status: 403 });
    }

    const reservations = await getTenantReservations(session.tenantId);

    const payload = reservations.map((reservation) => {
      const json = reservation.toJSON() as Record<string, unknown> & {
        addons: string | null;
      };
      let addons: Array<{ id: number; name: string; price: number }> = [];
      try {
        const parsed = json.addons ? JSON.parse(json.addons) : [];
        addons = Array.isArray(parsed) ? parsed : [];
      } catch {
        addons = [];
      }

      return { ...json, addons };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao buscar reservas do SaaS:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getVerifiedTenantSession();
    if (!session) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }
    if (!hasFeatureAccess(session, "reservations")) {
      return NextResponse.json({ message: "Sem permissão para esta ação." }, { status: 403 });
    }

    const body = (await request.json()) as {
      roomId?: string;
      checkIn?: string;
      checkOut?: string;
      amount?: number;
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
      guestCpf?: string;
      notes?: string;
      entryType?: 'manual_reservation' | 'blocked';
      unitNumber?: number;
      addonIds?: number[];
    };

    const entryType = body.entryType ?? 'manual_reservation';

    if (!body.roomId || !body.checkIn || !body.checkOut) {
      return NextResponse.json({ message: "Preencha os campos obrigatórios da reserva." }, { status: 400 });
    }

    if (
      entryType === 'manual_reservation' &&
      (!body.guestName ||
        !body.guestEmail ||
        !body.guestPhone ||
        !body.guestCpf ||
        Number(body.amount ?? 0) <= 0 ||
        !body.notes)
    ) {
      return NextResponse.json(
        { message: 'Na reserva manual, todos os campos são obrigatórios.' },
        { status: 400 },
      );
    }

    const reservation = await createManualReservationAction({
      roomId: body.roomId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      entryType,
      amount: Number(body.amount ?? 0),
      guestName: body.guestName ?? "Bloqueio Operacional",
      guestEmail: body.guestEmail ?? "",
      guestPhone: body.guestPhone ?? "",
      guestCpf: body.guestCpf ?? "",
      notes: body.notes ?? "",
      preferredUnitNumber: body.unitNumber !== undefined ? Number(body.unitNumber) : undefined,
      addonIds: Array.isArray(body.addonIds)
        ? body.addonIds.map((id) => Number(id)).filter((id) => Number.isInteger(id))
        : undefined,
    });

    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.userName,
      action: "reservation.created",
      entityType: "reservation",
      entityId: reservation.id,
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao criar reserva.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getVerifiedTenantSession();
  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  if (!hasFeatureAccess(session, "reservations")) {
    return NextResponse.json({ message: "Sem permissão para esta ação." }, { status: 403 });
  }

  const body = (await request.json()) as { reservationId?: string };
  const reservationId = body.reservationId?.trim();

  if (!reservationId) {
    return NextResponse.json({ message: "ID da reserva é obrigatório." }, { status: 400 });
  }

  try {
    await deleteReservation(session.tenantId, reservationId);
    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.userName,
      action: "reservation.deleted",
      entityType: "reservation",
      entityId: reservationId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao excluir reserva.",
      },
      { status: 400 },
    );
  }
}
