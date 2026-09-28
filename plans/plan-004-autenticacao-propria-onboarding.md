# Plano 004 — Autenticação própria e onboarding em etapas

> **Estado atual:** a autenticação própria está implementada. As referências a Clerk neste plano tratam da migração e da remoção da integração antiga; Clerk não é dependência nem opção de autenticação do produto atual. O aceite de produção e os serviços externos pendentes estão descritos no status abaixo.

- Status: IMPLEMENTADO — RETRY DE CADASTRO PENDENTE IMPLEMENTADO; ACEITE DE PRODUÇÃO PENDENTE DE SERVIÇOS EXTERNOS/LGPD
- Tipo: MOBILE / API / BANCO / SEGURANÇA
- Prioridade: ALTA
- Data de criação: 11/09/2026
- Escopo: substituir Clerk por autenticação nativa persistida e criar onboarding obrigatório/opcional

> **Para agentes de implementação:** usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Marque cada etapa com checkbox e faça uma verificação independente ao final de cada tarefa.

**Objetivo:** substituir o Clerk e o modo local por autenticação própria persistida no PostgreSQL, com cadastro seguro, verificação de e-mail, sessões revogáveis e onboarding mobile em três etapas.

**Arquitetura:** a API será a autoridade de identidade. Senhas serão armazenadas somente como hashes bcrypt; códigos de verificação, recuperação e refresh tokens serão armazenados somente como hashes. O app receberá um access token curto e um refresh token rotativo persistido no banco, mantendo a sessão no `expo-secure-store`; a API também validará o access token no Socket.IO.

**Stack:** Expo/React Native, TypeScript, React Navigation, TanStack Query, Axios, Express 5, Zod, PostgreSQL 16, Prisma 6, bcryptjs, `jose`, `express-rate-limit`, Resend, Cloudflare R2 e Socket.IO.

**Especificação:** requisitos aprovados na conversa de 11/09/2026 e regras existentes em `docs/01-visao-geral.md`, `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/04-backend-api.md`, `docs/05-contrato-api.md`, `docs/06-banco-de-dados.md`, `docs/07-autenticacao-seguranca.md`, `docs/09-design-system-components.md`, `docs/10-docker-ambientes.md`, `docs/11-qualidade-testes.md`, `docs/12-contribuicao.md` e `docs/13-pendencias-conhecidas.md`.

## Status da execução

- [x] Tarefas 1–5: banco, primitives, casos de uso, HTTP, rate limits, Socket.IO e remoção do Clerk.
- [x] Tarefas 6–7: sessão mobile, refresh concorrente e fluxo obrigatório de cadastro/verificação/login/recuperação.
- [x] Tarefas 8–10: perfil/avatar e livros opcionais, ações de pular e guards de navegação.
- [x] Tarefas 11–12: documentação, runbook e aceite automatizado/local com PostgreSQL, Expo e Android export.
- [x] Correção pós-aceite: nova tentativa com o mesmo e-mail reutiliza imediatamente o cadastro pendente, atualiza senha/CPF/celular, invalida o código anterior e estende a janela de 24 horas; o CPF continua protegido contra colisão com outra conta e pendentes expirados são limpos na próxima tentativa.
- [ ] Aceite de produção: entrega Resend, bucket R2, dispositivo Android/iOS, HTTPS/proxy/backup e aprovação LGPD.

## Restrições globais

- Produção não pode aceitar `AUTH_MODE=development`, `x-dev-user-id` ou qualquer identidade fornecida pelo cliente.
- A senha deve ter de 6 a 72 bytes UTF-8, com pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial; a validação deve existir no app e na API.
- Nenhuma senha, token puro, CPF puro, telefone completo ou código de verificação pode aparecer em logs, respostas de erro, analytics ou mensagens de exceção.
- E-mail deve ser normalizado com trim e lowercase; confirmação de e-mail comprova posse da caixa postal, não validação de entrega em tempo real.
- CPF deve passar dígitos verificadores e rejeitar sequências repetidas; o banco deve manter um identificador único protegido para evitar duplicidade.
- Rate limits de cadastro, login, verificação, reenvio, reset, refresh e API geral devem ser separados e configuráveis.
- Tokens de verificação/reset são de uso único, expiram, têm contador de tentativa e devem ser invalidados após sucesso ou troca de senha.
- Refresh tokens devem ser rotativos, armazenados por hash, revogáveis individualmente e revogáveis por usuário.
- Toda rota privada mantém autenticação, ownership, seleção de campos públicos e envelopes `{ data }` / `{ error }` existentes.
- Fotos de perfil usam o mesmo padrão de upload pré-assinado do R2, com MIME/tamanho/ownership validados no servidor.
- A primeira etapa é obrigatória; perfil e livros podem ser pulados e retomados depois.
- Migrações Prisma são versionadas; não editar banco compartilhado manualmente.
- O plano preserva JavaScript na API, TypeScript no app e o padrão de arquivos `index.tsx` + `styles.ts`.

## Segurança coberta

1. Hash assíncrono com bcrypt e salt rounds configuráveis; comparação assíncrona e rehash progressivo quando o custo antigo for menor.
2. Rejeição do limite de 72 bytes do bcrypt para evitar truncamento silencioso.
3. Normalização de e-mail, CPF e telefone antes de validar ou consultar.
4. Mensagens genéricas em login, recuperação e reenvio para impedir enumeração de contas.
5. Rate limit por IP e, quando disponível, por e-mail normalizado ou usuário; limites mais agressivos para autenticação.
6. Códigos de 6 dígitos com hash, TTL, uso único, limite de tentativas e intervalo mínimo entre reenvios.
7. Access tokens JWT curtos com `iss`, `aud`, `sub`, `jti`, `iat` e `exp`; assinatura com segredo forte fora do repositório.
8. Refresh tokens aleatórios, não JWT, com rotação e detecção de reutilização; revogar a família quando houver replay.
9. Revogação de todas as sessões ao redefinir senha e opção explícita de logout de todos os dispositivos.
10. Helmet, CORS restrito, limite de corpo, request ID, logs estruturados sem credenciais e erros sem stack/detalhes de Prisma.
11. Validação Zod no servidor para todos os `body`, `params` e `query`; respostas sem hashes, tokens, CPF protegido ou chaves internas.
12. Proteção contra corrida no cadastro por índices únicos e tratamento de `P2002` como erro de domínio.
13. Autorização por `req.currentUser.id`, nunca por `userId` enviado pelo cliente.
14. Upload de avatar limitado, com chave R2 por usuário, URL pré-assinada curta e limpeza de objetos abandonados.
15. CORS, segredos, migrações, backup, rotação de chaves e retenção de dados documentados para produção.

## Mapa de arquivos

### Criar

- `API/src/modules/auth/auth.constants.js`: tempos, limites e nomes de cookies/tokens sem lógica HTTP.
- `API/src/modules/auth/auth.crypto.js`: bcrypt, geração/hash de tokens, JWT, HMAC de CPF e comparação segura.
- `API/src/modules/auth/auth.schemas.js`: schemas Zod de cadastro, login, códigos, refresh e reset.
- `API/src/modules/auth/auth.repository.js`: consultas e transações Prisma de credenciais, verificações e sessões.
- `API/src/modules/auth/auth.service.js`: casos de uso de registro, verificação, login, refresh, logout e recuperação.
- `API/src/modules/auth/auth.controller.js`: adaptação HTTP e envelopes de resposta.
- `API/src/modules/auth/auth.routes.js`: rotas públicas e rate limits específicos.
- `API/src/modules/auth/auth.tokens.js`: emissão/rotação/revogação de access e refresh tokens.
- `API/src/modules/auth/validators.js`: CPF, telefone, e-mail e política de senha.
- `API/src/modules/media/avatar.service.js`: presign/complete/delete de avatar usando o adapter R2 existente.
- `API/prisma/migrations/20260911120000_native_auth_onboarding/migration.sql`: migração de autenticação e onboarding.
- `API/tests/auth.crypto.test.js`, `API/tests/auth.validators.test.js`, `API/tests/auth.service.test.js`, `API/tests/auth.routes.test.js`: cobertura unitária e HTTP.
- `app/src/features/auth/passwordRules.ts`: regras puras de senha e mensagens de campo.
- `app/src/features/auth/authStorage.ts`: persistência segura e expiração local de tokens.
- `app/src/features/auth/authApi.ts`: chamadas públicas de autenticação e refresh.
- `app/src/features/onboarding/onboarding.ts`: tipos e estado das etapas.
- `app/src/pages/OnboardingProfile/index.tsx`, `styles.ts`: formulário opcional de perfil.
- `app/src/pages/OnboardingBooks/index.tsx`, `styles.ts`: cadastro opcional de livros.
- `app/src/components/OnboardingProgress/index.tsx`, `styles.ts`: progresso, continuar e pular.
- `app/src/components/AvatarPicker/index.tsx`, `styles.ts`: escolha e upload de foto.
- `app/src/features/auth/__tests__/passwordRules.test.ts`: testes puros de senha.

### Modificar

- `API/prisma/schema.prisma`: remover vínculo obrigatório Clerk, adicionar credenciais, sessões, tokens e campos de onboarding.
- `API/src/app.js`: remover middleware Clerk e instalar limites públicos/privados nativos.
- `API/src/config/env.js`, `API/.env.example`: configurar JWT, bcrypt, tokens, e-mail, limites e modo de autenticação.
- `API/src/modules/auth/auth.middleware.js`: validar access token próprio e anexar usuário.
- `API/src/modules/users/users.schemas.js`, `users.service.js`, `users.repository.js`: perfil, nome/sobrenome, interesses e campos públicos.
- `API/src/routes/index.js`: separar rotas públicas de autenticação das rotas privadas.
- `API/src/modules/chat/chat.socket.js`: validar access token próprio no handshake.
- `API/src/modules/email/email.service.js`, `templates/welcome.v1.js`: mensagens de verificação, reset e boas-vindas sem vazar estado da conta.
- `API/src/modules/media/media.routes.js` e controllers/services relacionados: suportar avatar sem permitir acesso cruzado.
- `API/package.json`, `API/package-lock.json`: remover Clerk e adicionar bcryptjs/jose se não existirem.
- `API/prisma/seed.js`: criar dados de demonstração sem depender de `clerkUserId`.
- `app/src/providers/SessionProvider.tsx`: substituir Clerk/dev session por access/refresh próprios.
- `app/src/services/api.ts`: refresh automático uma vez por resposta 401, fila de requisições e logout ao falhar.
- `app/src/services/socket.ts`: enviar access token próprio.
- `app/src/pages/Auth/index.tsx`, `styles.ts`: cadastro/login/verificação/reset nativos sem Clerk.
- `app/src/routes/authRoutes.tsx`, `app/src/routes/index.tsx`, `app/src/routes/app.routes.tsx`: onboarding e guards.
- `app/src/types/navigation.ts`, `app/src/types/api.ts`: contratos de auth e onboarding.
- `app/package.json`, `app/package-lock.json`, `app/app.json`, `app/src/config/env.ts`: retirar Clerk e registrar ambiente/API.
- `docs/02-arquitetura.md`, `03-frontend-mobile.md`, `05-contrato-api.md`, `06-banco-de-dados.md`, `07-autenticacao-seguranca.md`, `10-docker-ambientes.md`, `11-qualidade-testes.md`, `13-pendencias-conhecidas.md`, `16-historico-de-alteracoes.md`: atualizar a fonte de verdade.

## Tarefas de implementação

### Tarefa 1: consolidar o contrato e a migração de identidade

**Agente/skill local:** `clerk` e `clerk-expo`, somente para inventariar e remover corretamente os pontos de integração existentes; não reutilizar Clerk como autoridade.

**Arquivos:**
- Modificar: `API/prisma/schema.prisma`, `API/prisma/seed.js`, `app/src/types/api.ts`, `app/src/types/navigation.ts`
- Criar: `API/prisma/migrations/20260911120000_native_auth_onboarding/migration.sql`
- Testar: `API/tests/auth.migration.test.js`

**Contrato produzido:**

```text
User:
  id, email, passwordHash, emailVerifiedAt, firstName, lastName, name,
  cpfHash, cpfEncrypted, phone, bio, interests[], avatarUrl,
  profileCompletedAt, booksOnboardingCompletedAt, createdAt, updatedAt

AuthSession:
  id, userId, refreshTokenHash, expiresAt, revokedAt, replacedById,
  userAgent, ipHash, createdAt, lastUsedAt

AuthCode:
  id, userId, type(EMAIL_VERIFY|PASSWORD_RESET), codeHash,
  expiresAt, consumedAt, attempts, lastSentAt, createdAt
```

- [ ] **Passo 1: escrever a matriz de compatibilidade** entre campos Clerk atuais (`clerkUserId`, `legacyPassHash`, `name`, `email`) e campos nativos, incluindo decisão explícita para registros legados sem senha.
- [ ] **Passo 2: escrever o teste de schema** que exige `email` normalizado único, `passwordHash` nullable apenas durante migração, `emailVerifiedAt` nullable, `cpfHash` único nullable, `AuthSession` indexado por usuário/expiração e `AuthCode` indexado por usuário/tipo/expiração.
- [ ] **Passo 3: criar a migração Prisma** adicionando os campos/tabelas sem apagar dados existentes; manter `clerkUserId` temporariamente nullable para permitir backfill controlado.
- [ ] **Passo 4: implementar backfill seguro** que preserve perfis/livros e marque contas antigas como exigindo nova senha/verificação, sem inventar hashes ou sessões.
- [ ] **Passo 5: atualizar a seed** para usar usuários nativos de teste apenas em ambiente explicitamente local, com senhas de teste fora de produção.
- [ ] **Passo 6: executar `npx prisma validate` e a migração em PostgreSQL descartável**; confirmar que registros e relações existentes continuam íntegros.

**Critério de aceite:** a migração é reversível por backup/restore, não perde livros ou relações, não cria usuários autenticáveis com senha desconhecida e deixa claro quais contas precisam ser recriadas.

### Tarefa 2: implementar primitives criptográficas e validações de identidade

**Agente/skill local:** nenhum `.agents/` local cobre autenticação própria; usar o contrato Context7 consultado para `bcryptjs` e manter implementação isolada para revisão de segurança.

**Arquivos:**
- Criar: `API/src/modules/auth/auth.constants.js`, `auth.crypto.js`, `validators.js`, `auth.schemas.js`
- Criar: `API/tests/auth.crypto.test.js`, `API/tests/auth.validators.test.js`
- Modificar: `API/src/config/env.js`, `API/.env.example`, `API/package.json`

**Interfaces produzidas:**

```js
hashPassword(password) -> Promise<string>
verifyPassword(password, hash) -> Promise<boolean>
needsPasswordRehash(hash) -> boolean
createOpaqueToken(byteLength) -> string
hashOpaqueToken(token) -> string
signAccessToken({ userId, sessionId }) -> string
verifyAccessToken(token) -> { userId, sessionId, jti }
normalizeEmail(email) -> string
validateCpf(cpf) -> { normalized, hash, encrypted }
normalizePhone(phone) -> string
validatePassword(password) -> { valid, issues[] }
```

- [ ] **Passo 1: escrever testes para senha** cobrindo 6 caracteres inválidos, ausência de maiúscula/minúscula/número/especial, senha acima de 72 bytes UTF-8, senha válida e comparação de senha correta/incorreta.
- [ ] **Passo 2: escrever testes para CPF** cobrindo CPF válido, dígitos incorretos, todos os dígitos iguais, pontuação, vazio e duplicidade lógica.
- [ ] **Passo 3: escrever testes para telefone/e-mail** cobrindo normalização de e-mail, e-mails inválidos, telefone nacional com máscara e telefone já em E.164.
- [ ] **Passo 4: implementar `bcrypt.hash`/`compare` assíncronos** com rounds configuráveis e `bcrypt.truncates`/checagem de bytes antes do hash.
- [ ] **Passo 5: implementar tokens aleatórios com `crypto.randomBytes`** e hashes SHA-256/HMAC; nunca persistir o valor puro.
- [ ] **Passo 6: implementar JWT com `jose`** exigindo `iss`, `aud`, `sub`, `sid`, `jti`, `iat` e `exp`; rejeitar algoritmo, issuer, audience e expiração inesperados.
- [ ] **Passo 7: implementar CPF protegido** com criptografia autenticada usando chave de ambiente e HMAC com chave separada para unicidade; nunca registrar o CPF decifrado.
- [ ] **Passo 8: executar `npm test -- auth.crypto.test.js auth.validators.test.js`** e confirmar que testes não dependem de rede ou relógio real sem controle.

**Critério de aceite:** nenhuma primitive acessa HTTP/Prisma, todas são determinísticas quando recebem relógio/segredo de teste e os testes demonstram que dados secretos não aparecem nas mensagens de erro.

### Tarefa 3: criar repositórios e casos de uso de autenticação

**Agente/skill local:** `clerk` apenas como checklist de remoção de `clerkUserId`; seguir o padrão repository/service/schema já usado em `API/src/modules/users`.

**Arquivos:**
- Criar: `API/src/modules/auth/auth.repository.js`, `auth.tokens.js`, `auth.service.js`
- Modificar: `API/src/modules/email/email.service.js`, `API/src/modules/users/users.repository.js`
- Testar: `API/tests/auth.service.test.js`

**Interfaces produzidas:**

```js
register(input, meta) -> { userId, email, requiresEmailVerification }
verifyEmail({ email, code }) -> { accessToken, refreshToken, user }
resendVerification({ email }, meta) -> { accepted: true }
login({ email, password }, meta) -> { accessToken, refreshToken, user }
refresh(refreshToken, meta) -> { accessToken, refreshToken, user }
logout({ sessionId, refreshToken }) -> { ok: true }
logoutAll(userId) -> { ok: true }
requestPasswordReset({ email }, meta) -> { accepted: true }
resetPassword({ email, code, password }) -> { ok: true }
```

- [ ] **Passo 1: escrever testes para registro transacional** verificando criação de usuário, hash de senha, `emailVerifiedAt=null`, código hash, índices únicos e envio idempotente de e-mail.
- [ ] **Passo 2: escrever testes para concorrência de e-mail/CPF** simulando `P2002` e confirmando resposta de domínio sem expor qual registro já existe.
- [ ] **Passo 3: escrever testes para verificação** cobrindo código correto, código errado, expirado, consumido, limite de tentativas, reenvio com cooldown e sessão emitida apenas no sucesso.
- [ ] **Passo 4: escrever testes para login** cobrindo senha incorreta, e-mail não verificado, credencial válida, rehash progressivo e mensagem indistinguível para conta inexistente.
- [ ] **Passo 5: escrever testes para refresh rotation** cobrindo rotação normal, token expirado, token revogado, token reutilizado e revogação da família inteira após replay.
- [ ] **Passo 6: escrever testes para reset** cobrindo código de uso único, nova política de senha, invalidação de todas as sessões e resposta genérica do pedido.
- [ ] **Passo 7: implementar as transações Prisma** usando `createMany`/`update` atômicos conforme necessário e bloqueios/updates condicionais para consumo único.
- [ ] **Passo 8: implementar envio de e-mails** para verificação, reset e boas-vindas, mantendo falha de entrega fora da resposta de registro e sem logar destinatário completo.
- [ ] **Passo 9: executar os testes de serviço** com banco isolado/mockado e revisar seleção de campos para garantir que nenhum hash sai do domínio público.

**Critério de aceite:** os casos de uso podem ser exercitados sem Express, não criam sessão antes da confirmação de e-mail, invalidam tokens no momento certo e são seguros contra enumeração.

### Tarefa 4: expor rotas públicas e middleware privado

**Agente/skill local:** nenhum agente local apropriado; aplicar padrões de `API/src/shared/http` e o contrato de rate limit consultado no Context7.

**Arquivos:**
- Criar: `API/src/modules/auth/auth.controller.js`, `auth.routes.js`
- Modificar: `API/src/modules/auth/auth.middleware.js`, `API/src/routes/index.js`, `API/src/app.js`, `API/src/config/env.js`
- Testar: `API/tests/auth.routes.test.js`, `API/tests/app.test.js`

**Rotas públicas produzidas:**

```text
POST /api/v1/auth/register
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all       (autenticada)
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me               (autenticada)
```

- [ ] **Passo 1: escrever testes HTTP** para envelopes de sucesso/erro, status `201/200/204/400/401/409/429`, request ID e ausência de segredos.
- [ ] **Passo 2: escrever testes de limites** para cada grupo público e confirmar headers `RateLimit` sem headers legados.
- [ ] **Passo 3: implementar schemas Zod** com limites explícitos de tamanho para e-mail, senha, nome, CPF, telefone, código e refresh token.
- [ ] **Passo 4: implementar controllers finos** que chamem services e traduzam somente códigos de domínio para mensagens em português.
- [ ] **Passo 5: separar `/auth` antes do middleware privado** e proteger todas as demais rotas com access token próprio + `attachCurrentUser`.
- [ ] **Passo 6: configurar `trust proxy` conscientemente** e documentar a origem real do IP para rate limit atrás de proxy.
- [ ] **Passo 7: remover `clerkMiddleware`, `getAuth`, `verifyToken` e o aceite de `x-dev-user-id` em produção**; manter desenvolvimento somente se `AUTH_MODE=development` e com uma chave/flag explícita para testes locais.
- [ ] **Passo 8: executar testes de rota e da aplicação** com `npm test -- auth.routes.test.js app.test.js`.

**Critério de aceite:** uma rota privada sem bearer próprio responde `401`; Clerk não é carregado em runtime; ataques de repetição nos endpoints de auth retornam `429` sem revelar se a conta existe.

### Tarefa 5: remover Clerk da API, Socket.IO e configuração

**Agente/skill local:** `clerk` e `clerk-expo` para checklist de imports, provider, token cache, plugin e variáveis a remover; `clerk-testing` não será usado porque o teste final não dependerá de Clerk.

**Arquivos:**
- Modificar: `API/src/modules/users/users.service.js`, `users.repository.js`, `API/src/modules/chat/chat.socket.js`, `API/src/index.js`, `API/package.json`, `API/.env.example`, `app/app.json`
- Remover dependências/configuração: imports Clerk, `clerkUserId` como identidade operacional, chaves Clerk e plugin Clerk.
- Testar: `API/tests/chat.socket.auth.test.js`, `API/tests/users.service.test.js`

- [ ] **Passo 1: escrever teste de Socket.IO** para access token próprio válido, token expirado, `sid` revogado, ausência de token e tentativa de entrar em conversa sem membership.
- [ ] **Passo 2: adaptar `chat.socket.js`** para verificar o JWT próprio e carregar o usuário por `sub`; nunca confiar em `devUserId` em produção.
- [ ] **Passo 3: adaptar users service/repository** para `findById`/`findByEmail` nativos e remover sincronização/identidade derivada do Clerk.
- [ ] **Passo 4: remover dependência `@clerk/express`** e confirmar que nenhum arquivo da API importa Clerk.
- [ ] **Passo 5: atualizar seed e health metadata** para reportar `authMode=native` e distinguir `development` somente em ambiente local.
- [ ] **Passo 6: rodar `rg -n "clerk|CLERK|x-dev-user-id" API app docs`** e classificar cada ocorrência restante como removida, histórica ou documentação atualizada.

**Critério de aceite:** API HTTP e Socket.IO usam a mesma autoridade nativa; token revogado não acessa chat; nenhum segredo ou pacote Clerk permanece no bundle de produção.

### Tarefa 6: substituir sessão e autenticação no app mobile

**Agente/skill local:** `clerk-expo` somente como inventário de superfícies a retirar (`ClerkProvider`, `tokenCache`, hooks e plugin); a implementação final usa `expo-secure-store` e API própria.

**Arquivos:**
- Criar: `app/src/features/auth/authStorage.ts`, `authApi.ts`, `passwordRules.ts`, `app/src/features/auth/__tests__/passwordRules.test.ts`
- Modificar: `app/src/providers/SessionProvider.tsx`, `app/src/services/api.ts`, `app/src/services/socket.ts`, `app/src/config/env.ts`, `app/package.json`, `app/package-lock.json`, `app/app.json`
- Testar: `app/src/features/auth/__tests__/passwordRules.test.ts`, typecheck e export Android.

**Interfaces produzidas:**

```ts
type AuthTokens = { accessToken: string; refreshToken: string; expiresAt: number };
type SessionUser = ApiUser & { emailVerifiedAt: string; onboarding: OnboardingState };
loadTokens(): Promise<AuthTokens | null>;
saveTokens(tokens: AuthTokens): Promise<void>;
clearTokens(): Promise<void>;
configureApiSession(accessor: { getAccessToken(): Promise<string | null>; refresh(): Promise<boolean>; onUnauthorized(): Promise<void> }): void;
```

- [ ] **Passo 1: escrever testes para `passwordRules`** alinhados ao contrato server-side, incluindo mensagens para cada requisito e confirmação de senha.
- [ ] **Passo 2: implementar armazenamento seguro** com chaves versionadas no SecureStore, limpeza atômica em logout e nenhum fallback para AsyncStorage.
- [ ] **Passo 3: implementar `authApi`** para register/verify/resend/login/refresh/logout/reset e mapear o envelope de erro da API.
- [ ] **Passo 4: escrever teste do interceptor** que aguarda um único refresh para requisições concorrentes, repete a requisição original uma vez e desloga ao falhar.
- [ ] **Passo 5: substituir `SessionProvider`** por carregamento inicial de tokens, validação de sessão, refresh antes da expiração e limpeza de cache TanStack Query.
- [ ] **Passo 6: atualizar API e Socket.IO** para enviar bearer nativo e reconectar após refresh sem duplicar mensagens.
- [ ] **Passo 7: remover dependências e configuração Clerk** do app e substituir `authMode` por configuração explícita da API.
- [ ] **Passo 8: executar `npm run typecheck` e `npx expo export --platform android --output-dir .validation-export --clear`**; remover o diretório temporário após a validação.

**Critério de aceite:** reiniciar o app mantém a sessão válida, expiração renova uma vez, logout remove tokens/cache, 401 definitivo retorna à tela pública e o app não contém imports Clerk.

### Tarefa 7: implementar o fluxo obrigatório de cadastro e login

**Agente/skill local:** `clerk-expo` apenas como referência de superfícies de UI a substituir; seguir `docs/03-frontend-mobile.md` e o design system nativo.

**Arquivos:**
- Modificar: `app/src/pages/Auth/index.tsx`, `app/src/pages/Auth/styles.ts`, `app/src/routes/authRoutes.tsx`, `app/src/routes/index.tsx`, `app/src/types/api.ts`
- Criar: `app/src/components/VerificationCodeField/index.tsx`, `styles.ts`, `app/src/components/PasswordRequirements/index.tsx`, `styles.ts`
- Testar: testes puros de validação e roteiro manual documentado em `docs/15-matriz-validacao-mvp.md`

- [ ] **Passo 1: desenhar estados de tela** `landing`, `register`, `verify-email`, `login`, `forgot-password`, `reset-code`, `reset-password`, `loading`, `error` e `success` sem depender de Clerk.
- [ ] **Passo 2: implementar cadastro** com e-mail, senha, confirmação, CPF, celular e aceite explícito dos termos/privacidade quando esses documentos estiverem disponíveis; bloquear envio durante requisição.
- [ ] **Passo 3: implementar verificação de e-mail** com código de 6 dígitos, reenvio com contador e mensagens genéricas; somente após sucesso salvar tokens e avançar.
- [ ] **Passo 4: implementar login e logout** com mensagens que não diferenciem e-mail inexistente, senha incorreta ou conta não verificada além do necessário para UX.
- [ ] **Passo 5: implementar recuperação** com e-mail, código e nova senha usando a mesma política e aviso de conclusão sem revelar existência da conta.
- [ ] **Passo 6: garantir teclado/safe area/acessibilidade** nos campos de CPF, telefone, senha, código e botões; manter alvos de toque e estados de foco/erro/loading.
- [ ] **Passo 7: executar `npm run typecheck` e revisar em telas pequenas** com teclado aberto, texto ampliado, erro longo e reenvio.

**Critério de aceite:** não é possível entrar no app sem concluir cadastro e verificação; nenhuma senha/CPF é enviada fora de HTTPS; todos os erros de campo são claros e todos os controles possuem rótulo acessível.

### Tarefa 8: implementar perfil opcional e retomável

**Agente/skill local:** nenhum `.agents/` local específico; usar os componentes e tokens documentados em `docs/09-design-system-components.md` e o plano anterior de perfil apenas como referência visual.

**Arquivos:**
- Criar: `app/src/pages/OnboardingProfile/index.tsx`, `styles.ts`, `app/src/components/AvatarPicker/index.tsx`, `styles.ts`, `app/src/components/OnboardingProgress/index.tsx`, `styles.ts`
- Modificar: `API/src/modules/users/users.schemas.js`, `users.service.js`, `users.repository.js`, `API/src/modules/media/media.routes.js`, `app/src/pages/profile/index.tsx`, `app/src/types/api.ts`, `app/src/types/navigation.ts`
- Testar: `API/tests/users.profile.test.js`, `app` typecheck e testes de componente existentes.

- [ ] **Passo 1: escrever testes de PATCH de perfil** para nome/sobrenome, bio, interesses, avatar, limites de tamanho, listas vazias e ownership implícito pelo token.
- [ ] **Passo 2: adicionar campos e serialização** sem retornar `passwordHash`, `cpfHash`, `cpfEncrypted`, tokens ou sessões.
- [ ] **Passo 3: implementar upload de avatar** com presign/complete/delete, MIME JPEG/PNG/WebP, limite de 8 MB, chave `avatars/<userId>/<uuid>`, URL curta e limpeza após falha.
- [ ] **Passo 4: implementar tela opcional** com nome, sobrenome, bio, interesses e foto; `Pular por agora` deve persistir a etapa como pulada/adiável, não bloquear a navegação.
- [ ] **Passo 5: fazer a tela retornar ao ponto correto** quando a pessoa entrar novamente; usar dados reais e avatar com iniciais quando ausente.
- [ ] **Passo 6: executar testes de API e typecheck** e revisar estado vazio, carregamento, erro de upload, cancelamento da galeria e retry.

**Critério de aceite:** perfil pode ser salvo parcialmente, pulado e retomado; foto não aceita URL arbitrária nem upload de outro usuário; dados sensíveis não aparecem no payload público.

### Tarefa 9: implementar cadastro opcional de livros

**Agente/skill local:** nenhum `.agents/` local específico; reutilizar os módulos de livros/ISBN existentes e as regras de `docs/05-contrato-api.md`.

**Arquivos:**
- Criar: `app/src/pages/OnboardingBooks/index.tsx`, `styles.ts`
- Modificar: `app/src/routes/authRoutes.tsx`, `app/src/routes/index.tsx`, `app/src/pages/BookCreate/index.tsx`, `app/src/pages/Library/index.tsx`, `app/src/types/navigation.ts`
- Testar: `API/tests/books.service.test.js`, `API/tests/mobile.features.test.js`, typecheck.

- [ ] **Passo 1: definir o estado da etapa** com lista local temporária, `Adicionar livro`, `Editar`, `Remover`, `Concluir depois` e `Finalizar cadastro`.
- [ ] **Passo 2: reutilizar `BookCreate`** para criação manual/ISBN sem duplicar formulário ou lógica de validação.
- [ ] **Passo 3: persistir cada livro pela API autenticada** e invalidar a biblioteca após sucesso; nunca confiar em owner enviado pelo app.
- [ ] **Passo 4: permitir pular** sem impedir o acesso à app; salvar `booksOnboardingCompletedAt` apenas quando concluir ou escolher pular.
- [ ] **Passo 5: adicionar entrada posterior** pela Biblioteca/Perfil para retomar a etapa quando não houver livros.
- [ ] **Passo 6: executar testes** para livro com ISBN inválido, livro duplicado, cancelamento, erro de rede e lista vazia.

**Critério de aceite:** a etapa usa o CRUD atual, não cria registros órfãos, pode ser pulada, pode ser retomada e não impede o usuário de entrar no aplicativo.

### Tarefa 10: conectar guards, estado de onboarding e navegação

**Agente/skill local:** nenhum agente local específico; seguir os tipos de navegação e guards existentes.

**Arquivos:**
- Modificar: `app/src/routes/index.tsx`, `app/src/routes/authRoutes.tsx`, `app/src/routes/app.routes.tsx`, `app/src/providers/SessionProvider.tsx`, `app/src/types/navigation.ts`
- Criar: `app/src/routes/onboardingRoutes.tsx`, se a separação reduzir o acoplamento.
- Testar: `app/src/routes/__tests__/onboardingGuards.test.tsx`, typecheck.

- [ ] **Passo 1: escrever testes de decisão** para sessão carregando, deslogado, autenticado sem verificação, autenticado com perfil incompleto, autenticado com livros incompletos e autenticado completo.
- [ ] **Passo 2: definir `OnboardingState`** com `registrationComplete`, `emailVerified`, `profileComplete`, `booksComplete` e `nextStep` derivado do backend.
- [ ] **Passo 3: enviar usuário recém-verificado** primeiro ao perfil opcional, depois aos livros opcionais, preservando botões de pular em ambas as telas.
- [ ] **Passo 4: permitir acesso ao app após a primeira etapa** mesmo quando perfil/livros forem pulados; mostrar lembrete não bloqueante na Biblioteca/Perfil.
- [ ] **Passo 5: impedir loops** após refresh, logout/login, fechamento do app e erro de rede durante a consulta `/auth/me`.
- [ ] **Passo 6: executar typecheck e teste de navegação** em todas as combinações de estado.

**Critério de aceite:** somente a primeira etapa é obrigatória; o app não abre rotas privadas sem sessão válida e não prende o usuário em onboarding opcional.

### Tarefa 11: atualizar documentação, observabilidade e ambiente

**Agente/skill local:** `clerk`/`clerk-expo` somente para confirmar remoção documental das premissas Clerk; nenhuma skill local cobre política própria de segurança.

**Arquivos:**
- Modificar: `docs/01-visao-geral.md`, `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/05-contrato-api.md`, `docs/06-banco-de-dados.md`, `docs/07-autenticacao-seguranca.md`, `docs/10-docker-ambientes.md`, `docs/11-qualidade-testes.md`, `docs/13-pendencias-conhecidas.md`, `docs/16-historico-de-alteracoes.md`, `API/.env.example`, `app/.env.example`
- Criar: `docs/seguranca-auth-runbook.md`

- [ ] **Passo 1: documentar endpoints e exemplos** sem incluir senhas, tokens ou CPFs reais; registrar status, limites e envelopes.
- [ ] **Passo 2: documentar variáveis** `AUTH_MODE=native`, `JWT_ACCESS_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `BCRYPT_ROUNDS`, chaves de criptografia/HMAC de CPF e limites de auth.
- [ ] **Passo 3: documentar operação** para rotação de segredos, revogação global de sessões, backup antes da migração, retenção/remoção de CPF e limpeza de uploads abandonados.
- [ ] **Passo 4: documentar LGPD** como requisito operacional: finalidade do CPF/telefone, minimização, acesso restrito, exportação/remoção e prazo de retenção a validar com o responsável legal do produto.
- [ ] **Passo 5: atualizar fluxo Docker** com migração nativa e seed local; produção deve falhar sem segredos obrigatórios ou com modo de desenvolvimento.
- [ ] **Passo 6: registrar pendências reais**: provedor de e-mail, domínio remetente, HTTPS, proxy confiável, banco gerenciado com backup, storage privado e testes em dispositivo.

**Critério de aceite:** uma pessoa nova consegue configurar o ambiente seguindo a documentação sem consultar Clerk, e o runbook descreve como responder a token comprometido, vazamento de segredo, brute force e reset de sessão.

### Tarefa 12: executar validação de segurança e aceite ponta a ponta

**Agente/skill local:** `clerk-testing` não se aplica ao fluxo final; usar a matriz de testes do projeto e adicionar casos específicos de abuso.

**Arquivos:**
- Modificar: `API/tests/app.test.js`, `API/tests/auth.routes.test.js`, `API/tests/chat.socket.auth.test.js`, `docs/15-matriz-validacao-mvp.md`
- Criar: `API/tests/auth.security.test.js`, `API/tests/auth.integration.test.js`

- [ ] **Passo 1: executar lint, testes, Prisma validate/generate e typecheck** conforme `docs/11-qualidade-testes.md`.
- [ ] **Passo 2: executar integração em PostgreSQL limpo** com migração nativa, seed local e dois usuários de teste.
- [ ] **Passo 3: validar fluxo feliz** cadastro → código → login → perfil → livros → logout → login após reinício do app.
- [ ] **Passo 4: validar ataques** brute force, enumeração, reuso de código, replay de refresh, refresh concorrente, JWT alterado, sessão revogada, CPF duplicado, telefone inválido, upload indevido e acesso cruzado ao perfil/avatar.
- [ ] **Passo 5: validar Socket.IO** com dois usuários, reconexão, token expirado, sessão revogada e membership incorreto.
- [ ] **Passo 6: executar varredura final** por `clerk`, segredos, logs de senha/token/CPF e endpoints sem rate limit.
- [ ] **Passo 7: atualizar a matriz** separando evidência executada, bloqueios externos e itens pendentes; não declarar aceite de produção sem HTTPS, e-mail real, backup e dispositivo testado.

**Critério de aceite:** toda afirmação de “concluído” possui comando/evidência correspondente; falhas de ambiente ficam registradas como pendência, não mascaradas por testes estáticos.

## Ordem e dependências

1. Tarefa 1 — contrato/migração.
2. Tarefa 2 — primitives e validações.
3. Tarefa 3 — serviços de autenticação.
4. Tarefa 4 — rotas/middleware.
5. Tarefa 5 — remoção Clerk na API/socket.
6. Tarefa 6 — sessão mobile.
7. Tarefa 7 — cadastro/login/verificação.
8. Tarefa 8 — perfil opcional.
9. Tarefa 9 — livros opcionais.
10. Tarefa 10 — guards e navegação.
11. Tarefa 11 — documentação/ambiente.
12. Tarefa 12 — validação final.

As tarefas 2 e 1 podem ser revisadas em paralelo apenas na leitura, mas a implementação da tarefa 3 depende do schema e das primitives. Tarefas 8 e 9 são independentes entre si depois da sessão mobile; a tarefa 10 deve integrar ambas antes do aceite.

## Definition of Done específica

- Não existem imports, dependências, chaves ou rotas Clerk no runtime.
- Conta não verificada não acessa o app privado.
- Senha nunca é armazenada em texto puro e respeita a política de 6 caracteres mínimos e 72 bytes máximos.
- Cadastro, login, verificação, reset e refresh possuem rate limit próprio e testes de abuso.
- Access token expirado renova por refresh rotativo; replay revoga a família.
- Logout individual e global funcionam; reset de senha revoga sessões.
- CPF e telefone são validados no servidor; CPF é protegido em repouso e não aparece em resposta pública.
- Perfil e livros são opcionais e retomáveis; somente a primeira etapa bloqueia a entrada.
- Avatar passa por presign/complete/delete e ownership.
- HTTP e Socket.IO usam a mesma sessão nativa.
- Migração é testada em PostgreSQL; seed e Docker são reproduzíveis.
- Lint, testes, Prisma, TypeScript e export mobile passam conforme a matriz.
- Documentação, contrato, ambiente e pendências estão atualizados.

## Auto-revisão do plano

- Cobertura: todos os requisitos de persistência, bcrypt, e-mail, senha, CPF, celular, rate limit, cadastro obrigatório, perfil opcional, livros opcionais, Clerk e segurança foram atribuídos a tarefas.
- Placeholders proibidos: não há `TBD`, `TODO` ou instruções genéricas sem arquivo, interface, comando ou critério.
- Consistência: os nomes `AuthSession`, `AuthCode`, `profileCompletedAt`, `booksOnboardingCompletedAt`, `accessToken` e `refreshToken` são usados de forma consistente entre banco, API e app.
- Risco explícito: contas Clerk legadas sem credencial não são convertidas silenciosamente; exigem nova senha/verificação.

## Referências técnicas consultadas

- Context7 `/dcodeio/bcrypt.js`: hash/comparison assíncronos, rounds configuráveis, limite de 72 bytes UTF-8 e rehash progressivo.
- Context7 `/express-rate-limit/express-rate-limit`: limites por rota, `standardHeaders` e desativação de headers legados.
- Context7 `/prisma/web`: campos únicos, índices, transações e modelos de usuário/sessão/token em PostgreSQL.
- `.agents/skills/clerk/SKILL.md` e `.agents/skills/clerk-expo/SKILL.md`: inventário das superfícies Clerk existentes a remover, sem reutilizar Clerk no desenho final.
- `docs/07-autenticacao-seguranca.md`, `docs/06-banco-de-dados.md` e `docs/11-qualidade-testes.md`: regras de segurança, migração e evidência do projeto.
