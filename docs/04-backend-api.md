# 4. Backend e API

A API usa JavaScript ESM, Express 5, Zod e Prisma. O ponto de composição HTTP é `API/src/app.js`; `API/src/index.js` cria o servidor e registra Socket.IO.

## Pipeline HTTP

1. request ID e log estruturado;
2. Helmet, CORS restrito e limite JSON de 1 MB;
3. middleware de autenticação própria e sessão revogável;
4. rate limit em `/api/v1`;
5. autenticação e hidratação do usuário local;
6. rota/controller/service/repository;
7. handler central de erro.

## Sessão nativa e contratos web

Todos os caminhos abaixo ficam sob `/api/v1/auth` e reutilizam os mesmos services de identidade e `AuthSession` revogável:

| Cliente/contrato | Login, verificação, refresh e logout | Transporte do refresh |
| --- | --- | --- |
| APK/nativo | `/login`, `/verify-email`, `/refresh`, `/logout` sem seleção de cookie | token no JSON e SecureStore no dispositivo |
| Web da main | os mesmos endpoints com `X-Session-Transport: cookie` | `trocalivros_refresh`, HttpOnly, Secure, SameSite=Strict, Path=/api/v1/auth |
| PWA/adaptador web | `/browser/login`, `/browser/verify-email`, `/browser/refresh`, `/browser/logout` | `__Host-trocalivros_refresh`, HttpOnly, Secure, Path=/, sem Domain |

O refresh token não aparece no JSON dos dois contratos web. Ambos devem exigir `req.secure` e `Origin` HTTPS autorizado, com proteção CSRF e rejeição de `Sec-Fetch-Site: cross-site`. A allowlist combina `CLIENT_ORIGINS` e `PWA_CLIENT_ORIGIN` sem apagar origens existentes; a configuração efetivamente implantada ainda precisa ser conferida para a versão integrada. O APK mantém o transporte nativo.

Cookie inválido/expirado deve ser removido no refresh; erro transitório não deve apagar cookie nem encerrar uma sessão válida. Logout remove cookie e estado local somente após revogação confirmada. A regra da main prevalece sobre o logout offline/local da branch PWA; os testes dos dois contratos conciliados ainda precisam ser executados.

O Caddy preserva método, URI, corpo, Origin, cookies e headers de encaminhamento nas rotas `/api/v1`, `/health`, `/socket.io` e `/covers`. A Railway termina TLS; o protocolo da borda precisa chegar à API, sem promover HTTP a HTTPS. A configuração de `trust proxy` deve corresponder à cadeia real de proxies confiáveis, para que HTTPS e limites por IP continuem corretos. O fallback HTML não pode mascarar respostas de API, WebSocket ou arquivos ausentes.

## Respostas

Sucesso usa `{ "data": ... }`. Erros usam `{ "error": { "code", "message", "fields?", "requestId" } }`. Não exponha stack, detalhes Prisma, segredos ou conteúdo privado em logs.

## Regras de implementação

- validar `params`, `query` e `body` com Zod;
- verificar ownership no service antes de mutar livros/imagens;
- selecionar apenas campos públicos de usuário;
- paginação usa `limit`, `cursor` e `pageInfo`;
- integração externa deve ter timeout e mapear falha para `AppError`;
- controller não contém regra de match, ISBN ou armazenamento.

## Fotos de livros e limpeza R2

`POST /books/:bookId/images/presign` recebe MIME e tamanho e retorna um PUT curto para `pending/books/<owner>/<book>/<imageId>.<ext>`. `POST /complete` verifica ownership pela sessão, executa HEAD, promove o objeto para `books/...` e cria a imagem sob lock da linha do livro. O repositório atribui a próxima posição e rejeita a quarta imagem com `IMAGE_LIMIT_REACHED`.

`PUT /books/:bookId/images/order` recebe todos os IDs atuais, já na ordem final. A transação move posições para uma faixa temporária, grava as posições finais e atualiza a capa. `DELETE /books/:bookId/images/:imageId` remove o vínculo, renumera as posições e enfileira a chave R2 na mesma transação. Exclusões de livro e expiração de conta pendente também registram limpeza. O worker tenta até 20 itens por rodada, a cada 60 s, com backoff exponencial limitado a 24 h.

O bucket de imagens de livros é privado. Serializadores assinam GET em tempo de resposta e incluem `expiresAt`; nunca persistem a URL assinada. A leitura de URLs externas legadas é mantida durante a transição. A cópia temporária/final não participa da transação PostgreSQL; falhas de persistência tentam limpar a chave final e uploads `pending/` têm lifecycle como proteção adicional.

A rota de Curtidas mantém o contrato já registrado em docs/05-contrato-api.md: a API retorna nextCursor e hasMore; o app adapta esses campos ao pageInfo usado nas outras listas paginadas.

## Premium de teste

O módulo `premium` centraliza a regra de trial de 30 × 24 horas, elegibilidade por conta verificada, registro de apresentação e ativação idempotente. `GET /premium/status` inclui `serverNow` para o cliente esconder benefícios exatamente no término com base em uma referência do servidor; a API continua sendo a autoridade de acesso. Curtidas recebidas com identidades passam pelo gate no service antes da consulta ao repositório.

`POST /interactions` com `LIKE` usa lock PostgreSQL por User. Depois de obter o lock, lê o relógio do servidor, calcula a data civil de São Paulo, aplica o limite 15 para conta gratuita e grava a quota e a interação na mesma transação. `PASS` não consome nem apaga uso. O registro diário não tem FK para Book, então remover livro não libera vaga.

## Consulta de ISBN

`GET /api/v1/isbn/:isbn` é privado. O parâmetro passa por schema Zod e validação de checksum antes da integração; a resposta da BrasilAPI também passa por schema com tipos e limites antes de entrar no cache. O service mantém timeout e cache de 10 minutos limitado a 500 entradas, removendo expiradas e a mais antiga quando necessário. Um rate limit específico usa janela `ISBN_RATE_LIMIT_WINDOW_MS=60000` e teto `ISBN_LOOKUP_LIMIT=30`, com chave do usuário autenticado e IP como fallback.

ISBN inexistente, entrada inválida, limite excedido e indisponibilidade externa ou payload externo inválido retornam respectivamente `404`, `422`, `429` e `503` no envelope sanitizado padrão. URLs de log da consulta substituem o valor por `/api/v1/isbn/:isbn`. Nenhuma dessas falhas cria ou altera um livro, permitindo que o app preserve o preenchimento manual.

## Comandos

```bash
npm run dev
npm run lint
npm test
npm run prisma:generate
npm run prisma:migrate
```
