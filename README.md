# Total Pousada

SaaS multi-tenant de gestão para pousadas: reservas, quartos, calendário, financeiro, equipe e hóspedes.

## Estrutura

O projeto está organizado em dois blocos principais no mesmo repositório:

- `frontend/`: app Next.js, rotas públicas e APIs do painel.
- `backend/`: lógica de domínio, modelos, serviços e mocks usados pelo app.

```text
frontend/
  app/
    api/
      auth/            login/logout
      public/          rotas consumidas pela landing page externa (sem sessão)
      tenant/          rotas autenticadas do painel (reservas, quartos, cupons, equipe, despesas)
      webhooks/        provisionamento de novos tenants
    dashboard/         páginas do painel (calendário, financeiro, equipe, hóspedes, quartos...)
    page.tsx           página de login
  components/          componentes de UI, incluindo components/calendar/
  middleware.ts        protege /dashboard/* (redirecionamento); não cobre /api/*
  next.config.ts
  tsconfig.json
  tailwind.config.ts
backend/
  actions/            server actions (reservas, despesas)
  lib/
    auth.ts             sessão JWT (HMAC-SHA256, cookie httpOnly)
    tenant-session.ts   sessão revalidada no banco a cada request de API
    db.ts               conexão Sequelize + roda as migrações (backend/migrations/)
    logger.ts           log estruturado (logError/logWarn), ponto de integração p/ Sentry
    rate-limit.ts        rate limiting em memória, por IP/identificador
    dashboard-access.ts controle de acesso por feature/role
    room-policies.ts    tarifas sazonais, estadia mínima, fechamentos
    ...
  models/             modelos Sequelize (MySQL)
  services/
    tenantService.ts    acesso a dados por tenant
  types/
    domain.ts           tipos de domínio (Room, Reservation, Expense...)
```

## Autenticação e autorização

- Sessão é um JWT customizado (HMAC-SHA256 via WebCrypto) guardado em cookie httpOnly (`lib/auth.ts`).
- `middleware.ts` só protege `/dashboard/*` para fins de navegação; rotas de API se autenticam sozinhas.
- Rotas em `app/api/tenant/**` usam `lib/tenant-session.ts` (`getVerifiedTenantSession`), que reconsulta usuário/tenant no banco a cada chamada — desativar um colaborador ou mudar suas permissões tem efeito imediato nas rotas de API, mesmo com o token do cookie ainda válido.
- Controle de acesso por feature (`calendar`, `reservations`, `finance`, `team`, etc.) fica em `lib/dashboard-access.ts`.
- Não existe login de demonstração — todo acesso passa por um usuário real de um tenant no banco. Isso é proposital: elimina qualquer chance de alguém acessar o painel sem ter pago.

## Banco de dados

- Sequelize + MySQL. `lib/db.ts` cria as tabelas que ainda não existem via `sequelize.sync()` (nunca altera tabelas existentes) e aplica as migrações versionadas em `backend/migrations/` no cold start, via [umzug](https://github.com/sequelize/umzug). Cada migração roda exatamente uma vez e fica registrada na tabela `SequelizeMeta`. Para adicionar uma alteração de schema, crie um novo arquivo numerado em `backend/migrations/` (siga o padrão dos existentes) e registre-o em `backend/migrations/runner.ts`.

## Rotas públicas

- `app/api/public/**` não exigem sessão e são consumidas pela landing page pública da pousada. CORS liberado apenas para esse prefixo em `next.config.ts`.
- O preço da reserva pública é sempre recalculado no servidor a partir do quarto/datas/cupom — nunca confia no valor enviado pelo cliente.
- Endpoints públicos que gravam dados ou permitem tentativa repetida (criar reserva, validar cupom, login) passam por `lib/rate-limit.ts` antes de tocar no banco.

## E-mails transacionais e lembrete de check-in

- `backend/lib/mailer.ts` envia e-mail via SMTP (nodemailer), configurado por
  `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`MAIL_FROM` no `.env`.
  Se essas variáveis não estiverem preenchidas, o envio é pulado (com aviso
  no log) em vez de quebrar a criação de reserva — e-mail é best-effort, não
  bloqueia o fluxo principal.
- Confirmação de reserva é enviada automaticamente (fire-and-forget, depois
  da transação confirmada) em `backend/actions/reservation.ts`, tanto para
  reserva pública quanto para reserva manual criada no painel.
- Lembrete de check-in é enviado por um job diário externo: `POST
  /api/cron/checkin-reminders`, autenticado por `CRON_SECRET` (mesmo padrão
  do `PROVISION_WEBHOOK_SECRET`), que varre reservas confirmadas de todos os
  tenants com check-in no dia seguinte e ainda sem lembrete enviado
  (`reminder_sent_at IS NULL`). Precisa de uma entrada de crontab no VPS,
  por exemplo:
  ```
  0 8 * * * curl -s -X POST https://seusite.com/api/cron/checkin-reminders \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

## Logging

- `lib/logger.ts` centraliza os erros da aplicação: `logError(contexto, error, meta?)` grava um JSON estruturado (nível, timestamp, contexto, stack) em vez de `console.error` solto — fica fácil de capturar via pm2/journald no VPS e filtrar por contexto.
- Quando contratarmos um serviço de monitoramento (Sentry ou similar), basta preencher `SENTRY_DSN` no `.env` e completar `forwardToMonitoring()` em `logger.ts` — nenhuma chamada de `logError` espalhada pelo código precisa mudar.

## Testes e CI

- Testes unitários com [Vitest](https://vitest.dev) em `backend/**/__tests__/*.test.ts`, cobrindo a lógica mais sensível: sessão/autenticação, rate limiter, geração de slug de tenant e regras de plano.
- `npm test` roda a suíte localmente; `npm run typecheck` roda o TypeScript sem emitir build.
- `.github/workflows/ci.yml` roda os dois (`typecheck` + `test`) em todo push/PR para `main` no GitHub Actions.
- Ainda não há testes de integração com banco real nem testes de UI — a suíte atual cobre lógica pura, não fluxos completos de reserva/pagamento.
