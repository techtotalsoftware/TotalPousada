/**
 * Logger estruturado central. Hoje escreve JSON em stderr (capturável por
 * pm2/journald/systemd no VPS). Quando um provedor de monitoramento
 * (Sentry, etc.) for contratado, basta preencher SENTRY_DSN e estender
 * `forwardToMonitoring` abaixo — o restante do código que chama `logError`
 * não precisa mudar.
 */

type LogMeta = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function forwardToMonitoring(context: string, error: unknown, meta?: LogMeta) {
  if (!process.env.SENTRY_DSN) return;
  // Integração com Sentry (ou similar) entra aqui quando o DSN existir.
  void context;
  void error;
  void meta;
}

export function logError(context: string, error: unknown, meta?: LogMeta) {
  const entry = {
    level: "error" as const,
    timestamp: new Date().toISOString(),
    context,
    error: serializeError(error),
    ...(meta ? { meta } : {}),
  };

  console.error(JSON.stringify(entry));
  forwardToMonitoring(context, error, meta);
}

export function logWarn(context: string, meta?: LogMeta) {
  const entry = {
    level: "warn" as const,
    timestamp: new Date().toISOString(),
    context,
    ...(meta ? { meta } : {}),
  };

  console.warn(JSON.stringify(entry));
}
