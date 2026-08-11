import nodemailer, { type Transporter } from "nodemailer";
import { logError, logWarn } from "@/lib/logger";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let cachedTransporter: Transporter | null | undefined;

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.MAIL_FROM,
  );
}

function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  if (!isSmtpConfigured()) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return cachedTransporter;
}

/**
 * Envia e-mail transacional (confirmação de reserva, lembrete de check-in).
 * Nunca lança: e-mail é uma notificação de conveniência, não pode derrubar o
 * fluxo de criação de reserva se o SMTP falhar ou não estiver configurado
 * ainda. Chamadores devem disparar isso sem `await` bloquear a resposta ao
 * usuário, ou tratar como best-effort.
 */
export async function sendMail(input: SendMailInput): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    logWarn("mailer: SMTP não configurado, e-mail não enviado", {
      to: input.to,
      subject: input.subject,
    });
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  } catch (error) {
    logError("mailer: falha ao enviar e-mail", error, { subject: input.subject });
    return false;
  }
}
