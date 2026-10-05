# 5. Contrato HTTP

Base: `/api/v1`. `/health` e as rotas públicas abaixo não exigem bearer. Rotas privadas exigem `Authorization: Bearer <accessToken>`. Os endpoints de sessão web são protegidos por cookie first-party e validação exata de `Origin`; nenhum cliente pode fornecer um cabeçalho de identidade local.

## Autenticação

| Método | Caminho | Resultado |
| --- | --- | --- |
| POST | `/auth/register` | cria conta pendente; `201` |
| POST | `/auth/verify-email` | ativa conta e emite access/refresh |
| POST | `/auth/resend-verification` | resposta genérica `{ accepted: true }` |
| POST | `/auth/login` | emite access/refresh |
| POST | `/auth/refresh` | rotaciona refresh e access |
| POST | `/auth/logout` | revoga a sessão do refresh |
| POST | `/auth/logout-all` | revoga sessões do usuário autenticado |
| POST | `/auth/forgot-password` | resposta genérica `{ accepted: true }` |
| POST | `/auth/reset-password` | troca senha e revoga todas as sessões |
| GET | `/auth/me` | usuário da sessão atual |
| POST | `/auth/browser/login` | login web; refresh em cookie HttpOnly e sem refresh token no JSON |
| POST | `/auth/browser/verify-email` | verifica e inicia sessão web pelo mesmo cookie |
| POST | `/auth/browser/refresh` | rotaciona refresh a partir do cookie HttpOnly |
| POST | `/auth/browser/logout` | revoga refresh e expira o cookie web |

`register` recebe somente `email`, `password`, `cpf` e `phone`. Se já existir um cadastro pendente não verificado com o mesmo e-mail, a chamada reutiliza imediatamente esse cadastro, atualiza senha/CPF/celular, invalida o código anterior e envia uma nova confirmação; se o novo CPF já pertencer a outra conta, ou se o e-mail já estiver verificado, a API retorna erro genérico. `verify-email` recebe `email` e código de 6 dígitos. No cliente nativo, respostas de sessão incluem `accessToken`, `refreshToken`, `expiresAt` e `user`. Na PWA, a origem HTTPS precisa ser exatamente a origem permitida pela API; enviando `X-Session-Transport: cookie`, a API guarda refresh em cookie HttpOnly/Secure/SameSite=Strict e omite `refreshToken` do JSON. A PWA mantém o access token só em memória. Códigos, hashes, CPF protegido e metadados internos nunca são retornados.

Para a PWA, publique `/api` no mesmo origin HTTPS por reverse proxy; HTTP de LAN/Internet é bloqueado antes do envio de credenciais. HTTP efêmero em memória é aceito somente com a página e a API em loopback no desenvolvimento. Refresh de cookie é serializado entre abas com Web Locks. As rotas de cookie exigem `Origin` HTTPS listado em `CLIENT_ORIGINS`; logout limpa o cookie e revoga a sessão antes de o app encerrar a sessão local.

As respostas web de login/verificação/refresh incluem somente `accessToken`, `expiresAt` e `user`. O refresh fica em `__Host-trocalivros_refresh` com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sem `Domain` e validade alinhada à sessão. Todas as rotas browser exigem origem exata na allowlist composta por `CLIENT_ORIGINS` e pelo `PWA_CLIENT_ORIGIN` opcional; logout limpa o cookie mesmo se a revogação remota falhar.

Cada grupo tem limite configurável e headers `RateLimit`; ao exceder, responde `429` com `RATE_LIMITED`. Login usa mensagem genérica para conta ausente/senha errada; recuperação e reenvio não confirmam existência.

## Perfil, onboarding e avatar

| Método | Caminho | Função |
| --- | --- | --- |
| GET/PATCH | `/me` | ler/alterar nome, sobrenome, bio, cidade, celular e interesses |
| POST | `/me/onboarding/profile/skip` | concluir apresentação opcional do perfil |
| POST | `/me/onboarding/books/complete` | concluir/pular apresentação de livros |
| POST | `/me/avatar/presign` | autorizar avatar |
| POST | `/me/avatar/complete` | validar e vincular avatar |
| DELETE | `/me/avatar` | remover avatar atual |

O restante do domínio mantém `/books`, `/discover`, `/interactions`, `/matches`, `/likes`, `/conversations` e as rotas de imagens de livros. Todas as respostas usam `{ data }`; erros usam `{ error: { code, message, requestId, fields? } }`.

## Curtidas

| Método | Caminho | Função |
| --- | --- | --- |
| GET | `/likes/received` | curtidas recebidas nos livros do usuário, com paginação por cursor |
| GET | `/likes/sent` | curtidas enviadas pelo usuário, com paginação por cursor |
| GET | `/likes/received/count` | contagem de curtidas pendentes (não respondidas) para badge |
| GET | `/likes/received/books` | livros do usuário que possuem curtidas (para filtro) |

Query params para listagens: `cursor` (uuid, opcional), `limit` (1–50, padrão 20), `sort` (`desc`/`asc`, padrão `desc`), `bookId` (uuid, opcional, somente em `/likes/received`).

Respostas de listagem seguem o padrão paginado: `{ data: { items: [...], nextCursor: string | null, hasMore: boolean } }`. Cada item de curtida recebida inclui `id`, `actor` (id, name, avatarUrl, city), `book` (id, title, coverUrl) e `likedAt`. Cada item de curtida enviada inclui `id`, `book` (id, title, coverUrl), `owner` (id, name, avatarUrl, city) e `likedAt`. A contagem retorna `{ data: { count: number } }`.

`/likes/received` e `/likes/received/books` retornam `403 PREMIUM_REQUIRED` antes de consultar dados de identidade quando não há trial ativo. `/likes/received/count` permanece público à conta autenticada e contém somente um número agregado; `/likes/sent` permanece acessível no plano gratuito. O período é verificado no servidor usando `startedAt <= agora < endsAt`.

As ações de curtir de volta, dispensar e remover curtida reutilizam o endpoint existente `POST /interactions` com `action: "LIKE"` ou `"PASS"` via upsert. Não há endpoint DELETE separado.
A API também retorna actorBook em cada curtida recebida: o primeiro livro disponível de quem enviou a curtida, resumido em id, título e capa, ou null. Curtir de volta e dispensar precisam apontar para esse livro do outro usuário, nunca para o livro do próprio usuário que recebeu a curtida. O app omite as ações quando actorBook é null.

## Premium gratuito de demonstração

| Método | Caminho | Função |
| --- | --- | --- |
| GET | `/premium/status` | retorna `serverNow`, elegibilidade, `trialState` (`NOT_STARTED`, `ACTIVE`, `EXPIRED`), timestamps UTC, modo de convite e benefícios |
| POST | `/premium/offer/prompted` | registra de modo idempotente que a oferta foi apresentada, sem iniciar o trial |
| POST | `/premium/trial/activate` | ativa, uma única vez, os 30 dias após aceite explícito; repetição devolve o estado já persistido |

Todas as rotas exigem conta autenticada. A ativação exige e-mail verificado e a identidade vem da sessão. `endsAt = startedAt + 30 × 24 horas`, com intervalo ativo exclusivo em `endsAt`. Status, activation e curtidas não criam pagamento, cartão, checkout ou renovação. Os três cards futuros não têm preço nem ação.

Cada `POST /interactions` com `action: "LIKE"` conta um livro distinto por usuário e data civil `America/Sao_Paulo`. Plano gratuito permite 15; o 16º retorna `403 DAILY_LIKE_LIMIT_REACHED`. PASS não conta e não devolve vaga. Quota e Interaction são gravadas na mesma transação depois do lock da conta; likes Premium também são registrados para não liberar novas vagas após expirar no mesmo dia.


## Livros e fotos

| Método | Caminho | Função |
| --- | --- | --- |
| GET/POST | `/books` | listar livros próprios / criar livro |
| GET/PATCH/DELETE | `/books/:bookId` | consultar, editar ou excluir livro próprio |
| POST | `/books/:bookId/images/presign` | autorizar PUT temporário; body `{ mimeType, size }` |
| POST | `/books/:bookId/images/complete` | validar HEAD e vincular a foto |
| PUT | `/books/:bookId/images/order` | persistir a lista completa `{ imageIds: [...] }` |
| DELETE | `/books/:bookId/images/:imageId` | remover foto e promover a primeira restante |

São aceitos 0–3 arquivos JPEG/PNG/WebP de até 8 MiB por livro. `sortOrder = 0` é sempre a capa; o backend deriva owner e chave R2 da sessão e do livro. Uploads novos usam `pending/books/...`, depois são copiados para `books/...`. Fotos privadas recebem `url` GET assinada e `expiresAt` nas respostas; links externos legados têm `expiresAt: null`. `IMAGE_LIMIT_REACHED` é `409`, `IMAGE_ORDER_INVALID` é `422`, e erros de validação de arquivo mantêm códigos `IMAGE_TYPE_INVALID`, `IMAGE_SIZE_INVALID` e `IMAGE_UPLOAD_MISMATCH`.

## ISBN e livros

| Método | Caminho | Função |
| --- | --- | --- |
| GET | `/isbn/:isbn` | consulta privada de ISBN válido e retorna dados normalizados para revisão |

O parâmetro aceita ISBN-10 ou ISBN-13 conforme a validação do domínio; a leitura por câmera envia somente EAN-13 de livro com prefixo `978`/`979`. A API valida formato e checksum novamente, independentemente do cliente, e valida o payload externo antes de mapeá-lo. A consulta usa cache de 10 minutos limitado a 500 entradas, timeout e limite dedicado de 30 requisições por janela de 60 segundos, por usuário autenticado e com IP como fallback.

Os status esperados de falha são `404` para ISBN não encontrado, `422` para parâmetro inválido, `429` para limite excedido e `503` para indisponibilidade da consulta externa. Todos mantêm o envelope seguro de erro e permitem continuar pelo cadastro manual; o endpoint não cadastra o livro nem persiste automaticamente eventual URL de capa externa.

## Foto de perfil — plano 009 (implementação não publicada)

Avatar v2: presign recebe {mimeType:"image/png",size,width:512,height:512,protocolVersion:2}; complete recebe {imageId}. Resposta AvatarDescriptor = {avatarUrl,avatarUrlExpiresAt,avatarVersion}; URL/expiração podem ser null. DELETE segue 204 legado; Prefer:return=representation retorna 200 com envelope data e Preference-Applied. Resumos de usuários incluem expiração/versão, sem avatarStorageKey. Capas de Curtidas incluem coverUrlExpiresAt.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).

O cliente novo envia `X-Avatar-Owner` nos comandos de avatar, apenas para conferir a conta capturada no início da ação. Divergência da sessão retorna `409 AVATAR_SESSION_CHANGED` antes da mutação; o header nunca autoriza outro usuário nem é repassado ao PUT R2. Clientes legados sem header permanecem compatíveis.
