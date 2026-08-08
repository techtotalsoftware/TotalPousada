// Rate limiter simples em memória, por IP, sem dependências externas (sem
// Redis/Upstash configurado no projeto). Limitação conhecida: em ambientes
// serverless com múltiplas instâncias, cada instância tem seu próprio
// contador — não é um limite globalmente exato, mas já corta bots e scripts
// de força bruta na prática. Se o tráfego crescer, migrar pra um rate
// limiter distribuído (ex.: @upstash/ratelimit) é o próximo passo.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Evita crescimento ilimitado do Map em processos de vida longa — limpa
// entradas expiradas periodicamente.
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanup = Date.now();

function cleanupExpired(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// Assume que a aplicação só é alcançável através de um único proxy reverso
// confiável (nginx no VPS), nunca diretamente da internet. Nesse cenário,
// o último IP da cadeia X-Forwarded-For é o que o nginx anexou (o IP real do
// cliente que conectou nele) — os IPs anteriores, se houver, podem ter sido
// forjados pelo próprio cliente e não são confiáveis. Usar o primeiro valor
// (como antes) permitia burlar o rate limit variando o header a cada request.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

/**
 * Retorna `true` se a requisição estiver dentro do limite permitido, `false`
 * se deve ser rejeitada com 429. `scope` isola contadores entre rotas
 * diferentes (ex.: "login" vs "login-email") pro mesmo identificador.
 */
export function checkRateLimit(
  identifier: string,
  scope: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupExpired(now);

  const key = `${scope}:${identifier}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({ message: 'Muitas tentativas. Aguarde um momento e tente novamente.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}
