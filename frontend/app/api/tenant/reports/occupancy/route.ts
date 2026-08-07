import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getDb } from "@/lib/db";
import { getVerifiedTenantSession, hasFeatureAccess } from "@/lib/tenant-session";
import { hasPlanAccess } from "@/lib/plan-enum";
import { TenantPlan } from "@/lib/plan-enum";

function parseMonthParam(raw: string | null): { year: number; monthIndex: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-").map(Number);
    if (month >= 1 && month <= 12) {
      return { year, monthIndex: month - 1 };
    }
  }

  const now = new Date();
  return { year: now.getUTCFullYear(), monthIndex: now.getUTCMonth() };
}

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  }

  return lines.join("\n");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

async function toPdf(
  metrics: Record<string, unknown>,
  isEnterprise: boolean,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.15, 0.15, 0.15);
  const mutedColor = rgb(0.4, 0.4, 0.4);
  const margin = 50;
  let y = page.getHeight() - margin;

  page.drawText("Relatório de Ocupação", { x: margin, y, size: 20, font: boldFont, color: textColor });
  y -= 26;
  page.drawText(`Mês de referência: ${metrics.month}`, { x: margin, y, size: 12, font, color: mutedColor });
  y -= 36;

  const rows: Array<[string, string]> = [
    ["Quartos ativos", String(metrics.roomsTotal)],
    ["Taxa de ocupação", formatPercent(metrics.occupancyRate as number)],
    [
      "Diárias-quarto reservadas",
      `${metrics.bookedRoomNights} de ${metrics.availableRoomNights}`,
    ],
    ["Reservas no mês", String(metrics.reservationsCount)],
    ["Receita do mês", formatCurrency(metrics.revenue as number)],
  ];

  if (isEnterprise) {
    rows.push(["ADR (diária média)", formatCurrency((metrics.adr as number) ?? 0)]);
    rows.push(["RevPAR", formatCurrency((metrics.revpar as number) ?? 0)]);
  }

  for (const [label, value] of rows) {
    page.drawText(label, { x: margin, y, size: 11, font: boldFont, color: textColor });
    page.drawText(value, { x: margin + 240, y, size: 11, font, color: textColor });
    y -= 24;
  }

  return doc.save();
}

export async function GET(request: Request) {
  const session = await getVerifiedTenantSession();
  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!hasFeatureAccess(session, "reports")) {
    return NextResponse.json(
      { message: "Sem permissão para esta ação." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const { year, monthIndex } = parseMonthParam(searchParams.get("month"));
  const format = searchParams.get("format");
  const wantsCsv = format === "csv";
  const wantsPdf = format === "pdf";
  const isPremium = hasPlanAccess(session.plan, TenantPlan.PREMIUM);
  const isEnterprise = hasPlanAccess(session.plan, TenantPlan.ENTERPRISE);

  // Exportação (CSV ou PDF) acompanha o mesmo plano da tela de Relatórios
  // (Premium). ADR/RevPAR continuam exclusivos do Enterprise (ver bloco
  // isEnterprise abaixo).
  if ((wantsCsv || wantsPdf) && !isPremium) {
    return NextResponse.json(
      { message: "Exportação disponível apenas no plano Premium ou superior." },
      { status: 403 },
    );
  }

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));
  const daysInMonth = Math.round(
    (monthEnd.getTime() - monthStart.getTime()) / 86_400_000,
  );

  const { Room, Reservation } = await getDb();

  const rooms = await Room.findAll({
    where: { tenantId: session.tenantId, status: "active" },
    attributes: ["quantity"],
  });
  const roomsTotal = rooms.reduce((sum, room) => sum + room.quantity, 0);
  const availableRoomNights = roomsTotal * daysInMonth;

  const reservations = await Reservation.findAll({
    where: {
      tenantId: session.tenantId,
      status: { [Op.ne]: "cancelled" },
      checkIn: { [Op.lt]: monthEnd },
      checkOut: { [Op.gt]: monthStart },
    },
    attributes: ["checkIn", "checkOut", "amount", "status"],
  });

  let bookedRoomNights = 0;
  let revenue = 0;
  let reservationsCount = 0;

  for (const reservation of reservations) {
    const checkIn = new Date(reservation.checkIn);
    const checkOut = new Date(reservation.checkOut);
    const clippedStart = checkIn < monthStart ? monthStart : checkIn;
    const clippedEnd = checkOut > monthEnd ? monthEnd : checkOut;
    const nightsInMonth = Math.max(
      0,
      Math.round((clippedEnd.getTime() - clippedStart.getTime()) / 86_400_000),
    );

    bookedRoomNights += nightsInMonth;

    // Receita é atribuída ao mês da data de check-in (simplificação — uma
    // reserva que atravessa a virada do mês soma toda a receita no mês em
    // que o hóspede chega, não rateada noite a noite).
    if (checkIn >= monthStart && checkIn < monthEnd) {
      reservationsCount += 1;
      revenue += Number(reservation.amount);
    }
  }

  const occupancyRate =
    availableRoomNights > 0 ? bookedRoomNights / availableRoomNights : 0;

  const metrics: Record<string, unknown> = {
    month: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    roomsTotal,
    daysInMonth,
    availableRoomNights,
    bookedRoomNights,
    occupancyRate,
    reservationsCount,
    revenue,
    plan: session.plan,
  };

  if (isEnterprise) {
    metrics.adr = bookedRoomNights > 0 ? revenue / bookedRoomNights : 0;
    metrics.revpar = availableRoomNights > 0 ? revenue / availableRoomNights : 0;
  }

  if (wantsCsv) {
    const csv = toCsv([
      Object.fromEntries(
        Object.entries(metrics).map(([key, value]) => [
          key,
          typeof value === "number" ? Math.round(value * 100) / 100 : String(value),
        ]),
      ) as Record<string, string | number>,
    ]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-ocupacao-${metrics.month}.csv"`,
      },
    });
  }

  if (wantsPdf) {
    const pdfBytes = await toPdf(metrics, isEnterprise);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-ocupacao-${metrics.month}.pdf"`,
      },
    });
  }

  return NextResponse.json(metrics, { status: 200 });
}
