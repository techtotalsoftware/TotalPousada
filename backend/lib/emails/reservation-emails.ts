function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type ReservationEmailData = {
  tenantName: string;
  guestName: string;
  roomName: string;
  checkIn: string | Date;
  checkOut: string | Date;
  amount: number;
};

function baseTemplate(tenantName: string, title: string, bodyHtml: string): string {
  const safeTenantName = escapeHtml(tenantName);
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
    <div style="max-width:520px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#38bdf8;">${safeTenantName}</p>
      <h1 style="margin:0 0 20px;font-size:20px;color:#ffffff;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top:28px;font-size:12px;color:#64748b;">Este é um e-mail automático enviado por ${safeTenantName} através da plataforma Total Pousada. Se você não reconhece esta reserva, entre em contato diretamente com a pousada.</p>
    </div>
  </body>
</html>`;
}

export function buildReservationConfirmationEmail(data: ReservationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const checkInLabel = formatDate(data.checkIn);
  const checkOutLabel = formatDate(data.checkOut);
  const amountLabel = formatCurrency(data.amount);
  const guestName = escapeHtml(data.guestName);
  const roomName = escapeHtml(data.roomName);

  const html = baseTemplate(
    data.tenantName,
    "Reserva confirmada",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Olá, ${guestName}! Sua reserva foi confirmada com sucesso. Confira os detalhes abaixo:</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px;">
       <tr><td style="padding:6px 0;color:#94a3b8;">Quarto</td><td style="padding:6px 0;text-align:right;color:#f8fafc;">${roomName}</td></tr>
       <tr><td style="padding:6px 0;color:#94a3b8;">Check-in</td><td style="padding:6px 0;text-align:right;color:#f8fafc;">${checkInLabel}</td></tr>
       <tr><td style="padding:6px 0;color:#94a3b8;">Check-out</td><td style="padding:6px 0;text-align:right;color:#f8fafc;">${checkOutLabel}</td></tr>
       <tr><td style="padding:6px 0;color:#94a3b8;">Valor total</td><td style="padding:6px 0;text-align:right;color:#34d399;font-weight:bold;">${amountLabel}</td></tr>
     </table>`,
  );

  const text = `Olá, ${data.guestName}!

Sua reserva em ${data.tenantName} foi confirmada.

Quarto: ${data.roomName}
Check-in: ${checkInLabel}
Check-out: ${checkOutLabel}
Valor total: ${amountLabel}

Se você não reconhece esta reserva, entre em contato diretamente com a pousada.`;

  return {
    subject: `Reserva confirmada em ${data.tenantName}`,
    html,
    text,
  };
}

export function buildCheckinReminderEmail(data: ReservationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const checkInLabel = formatDate(data.checkIn);
  const checkOutLabel = formatDate(data.checkOut);
  const guestName = escapeHtml(data.guestName);
  const roomName = escapeHtml(data.roomName);

  const html = baseTemplate(
    data.tenantName,
    "Seu check-in está chegando!",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Olá, ${guestName}! Passando para lembrar que sua estadia começa em breve:</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px;">
       <tr><td style="padding:6px 0;color:#94a3b8;">Quarto</td><td style="padding:6px 0;text-align:right;color:#f8fafc;">${roomName}</td></tr>
       <tr><td style="padding:6px 0;color:#94a3b8;">Check-in</td><td style="padding:6px 0;text-align:right;color:#f8fafc;">${checkInLabel}</td></tr>
       <tr><td style="padding:6px 0;color:#94a3b8;">Check-out</td><td style="padding:6px 0;text-align:right;color:#f8fafc;">${checkOutLabel}</td></tr>
     </table>
     <p style="margin:20px 0 0;font-size:14px;line-height:1.6;">Estamos ansiosos para recebê-lo(a)!</p>`,
  );

  const text = `Olá, ${data.guestName}!

Seu check-in em ${data.tenantName} está chegando.

Quarto: ${data.roomName}
Check-in: ${checkInLabel}
Check-out: ${checkOutLabel}

Estamos ansiosos para recebê-lo(a)!`;

  return {
    subject: `Lembrete: seu check-in em ${data.tenantName} é amanhã`,
    html,
    text,
  };
}
