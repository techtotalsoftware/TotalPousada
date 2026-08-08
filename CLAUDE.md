# TotalPousada — contexto para o Claude

SaaS multi-tenant de gestão de pousadas (reservas, quartos, financeiro, equipe,
promoções/cupons, relatórios). Ver `README.md` para a estrutura completa de
pastas e módulos — este arquivo é sobre **decisões e estado atual**, não
sobre onde cada arquivo mora.

## Modelo de negócio (importante para não propor coisas fora do escopo)

- O pagamento da assinatura acontece em **outro site**, fora deste repositório.
  Quando o cliente paga, aquele site é responsável por criar o usuário
  administrador e o tenant (pousada) aqui via webhook
  (`frontend/app/api/webhooks/provision/route.ts`).
- Este repositório **não tem e não deve ganhar** integração de pagamento
  (Stripe/Mercado Pago/etc.) — isso é proposital, não uma lacuna.
- Deploy é feito em VPS próprio do time — não pedir/gerar Dockerfile,
  vercel.json ou config de PaaS a menos que explicitamente solicitado.

## Decisões de arquitetura que já foram tomadas (não redescutir do zero)

- **Migrations**: schema do banco é versionado em `backend/migrations/`
  (runner com [umzug](https://github.com/sequelize/umzug), tracking em
  `SequelizeMeta`). `sequelize.sync()` sem `alter` só cria tabelas que não
  existem — nunca altera tabela existente. Qualquer alteração de schema
  (nova coluna, novo índice, nova tabela) vira uma migration numerada nova
  em `backend/migrations/`, registrada em `backend/migrations/runner.ts`.
  Isso substituiu um esquema antigo de `sync({alter:true})` + funções
  `ensureXColumn()` ad-hoc que já causou um incidente real (estourou o
  limite de 64 índices por tabela do MySQL, na tabela `rooms`, depois de
  dezenas de restarts em dev).
- **Logging**: erros passam por `logError()` de `backend/lib/logger.ts`
  (JSON estruturado), não por `console.error` solto. Tem um ponto de
  extensão pronto para Sentry (`SENTRY_DSN`) quando for contratado.
- **Testes**: Vitest, só lógica pura por enquanto (auth, rate-limit,
  slug, planos) — sem testes de integração com banco real ainda. CI no
  GitHub Actions roda typecheck + testes em todo push/PR pra `main`.
- **Rate limiting**: em memória, por processo (`backend/lib/rate-limit.ts`).
  Suficiente para um VPS rodando uma instância única. Se o app rodar em
  múltiplas instâncias/processos (cluster, múltiplos servidores atrás de
  load balancer), esse limiter para de ser preciso globalmente e precisa
  virar algo distribuído (ex.: Upstash Redis) — não fazer essa migração
  preventivamente sem essa necessidade real aparecer.

## Segurança — obrigatório em toda alteração, não só quando pedido

Este é um SaaS multi-tenant que guarda dados pessoais de hóspedes (nome, CPF,
e-mail, telefone) e dados financeiros. Qualquer código novo ou alterado deve
ser avaliado contra os riscos abaixo antes de considerar a tarefa concluída
— não só quando o pedido menciona "segurança" explicitamente.

**Isolamento entre tenants (o risco mais grave deste projeto)**
- Toda query que lê/escreve dados de tenant (`Room`, `Reservation`, `User`,
  `Coupon`, `Addon`, etc.) precisa filtrar por `tenantId` vindo da **sessão
  verificada no servidor** (`getVerifiedTenantSession`/`getAuthenticatedSession`),
  nunca de um parâmetro de URL, body ou query string enviado pelo cliente.
- Ao adicionar uma rota nova em `app/api/tenant/**`, confirme que ela chama
  `getVerifiedTenantSession` (ou equivalente) antes de tocar no banco, e que
  o `tenantId` usado nas queries é sempre o da sessão.
- Ao adicionar uma rota nova em `app/api/public/**`, ela não deve expor
  nenhum dado de um tenant que não seja o resolvido por
  `resolvePublicTenantId`/`hasPublicSiteAccess`.

**Autenticação e sessão**
- Sessão é HMAC-SHA256 assinada (`lib/auth.ts`) — nunca decodificar o payload
  sem verificar a assinatura primeiro, nunca usar `jwt.decode` sem verify em
  nenhuma lib nova que for adicionada.
- Fail-closed: campos ausentes ou de tipo inesperado no payload da sessão
  devem ser tratados como "não autenticado", nunca promovidos a um nível de
  acesso padrão/admin.
- Senhas sempre via `bcrypt` (já em uso) — nunca armazenar ou logar senha em
  texto puro, nem em `logError`/`console.log` de debug.

**Injeção e input não confiável**
- Todo acesso a dados usa Sequelize via query builder (`where: {...}`,
  `findOne`, etc.) — nunca `sequelize.query()` com string interpolada a
  partir de input do usuário. Se precisar de raw SQL, usar bind
  parameters (`replacements`/`bind`), nunca concatenação de string.
- Nunca fazer "mass assignment" — não passar `req.body` inteiro direto para
  `Model.create()`/`Model.update()`; sempre montar o objeto explicitamente
  com os campos esperados (evita que o cliente injete `tenantId`, `role`,
  `id` ou outro campo sensível que não deveria poder setar).
- Validar tipo e formato de todo input de rota pública antes de usar (já é o
  padrão em `validate-coupon`, `booking` etc. — manter).

**Exposição de dados**
- Nunca devolver em uma resposta de API campos internos que o client não
  precisa (senha/hash, tokens, IDs internos de outro sistema) — ver
  `removeInternalRoomFields` em `app/api/public/booking/route.ts` como
  padrão a seguir.
- `logError`/`logWarn` (`lib/logger.ts`) não devem receber senha, token de
  sessão, segredo de webhook ou payload bruto de cartão/pagamento — logar
  só o necessário para debugar.
- Rotas públicas com CORS `Access-Control-Allow-Origin: "*"` só devem expor
  dados que já são públicos por natureza (quartos, galeria, disponibilidade)
  — nunca dado de outro tenant ou dado interno.

**Abuso e negação de serviço**
- Toda rota pública que grava no banco ou permite tentativa repetida (login,
  criação de reserva, validação de cupom, cadastro) passa por
  `checkRateLimit` (`lib/rate-limit.ts`) — ao adicionar uma rota pública
  nova nessa categoria, replicar o padrão já usado em
  `app/api/public/booking/route.ts` e `validate-coupon/route.ts`.
- Upload de arquivo (galeria, fotos de quarto) deve validar tipo/tamanho no
  servidor, não só no client.

**Frontend**
- React já escapa output por padrão — não introduzir `dangerouslySetInnerHTML`
  com conteúdo vindo de input do usuário ou do banco (o único uso hoje, em
  `app/layout.tsx`, é um script estático de tema, sem dado dinâmico — deve
  continuar assim).

**Segredos**
- `.env`/`.env.local` nunca vão para o Git (já no `.gitignore`) — ao propor
  qualquer exemplo, usar `.env.example` com placeholder, nunca um valor real.
- Novo segredo/API key entra em `.env.example` com um comentário explicando
  o que é, mas o valor real nunca é commitado nem colado em código.

Se uma alteração pedida pelo usuário esbarra em algum desses pontos (ex.:
"lista todas as reservas" sem filtrar tenant, ou "loga o payload todo pra
debugar"), sinalizar o risco antes de implementar do jeito inseguro.

## Estado de prontidão para clientes pagantes

Feito:
- Autenticação e isolamento entre tenants (sessão HMAC, cookie httpOnly).
- Migrations, logging estruturado, testes + CI, rate limiting nas rotas
  públicas mais expostas a abuso (reserva pública, validação de cupom, login).
- Páginas legais em `frontend/app/termos` e `frontend/app/privacidade`.

Pendente / conhecido:
- **`frontend/app/termos` e `frontend/app/privacidade` têm placeholders**
  `[RAZÃO SOCIAL]` e `[PREENCHER]` (CNPJ) que precisam ser preenchidos com
  os dados reais da empresa antes de publicar — e idealmente revisados por
  um advogado (LGPD).
- Sem testes de integração (banco real) nem testes de UI.
- Sem monitoramento de erro em produção configurado (só o ponto de extensão
  em `logger.ts` esperando um `SENTRY_DSN`).
- Deploy em VPS ainda não configurado neste repo (decisão consciente, ver
  acima).
