# 4. Backend e API

A API usa JavaScript ESM, Express 5, Zod e Prisma. O ponto de composição HTTP é `API/src/app.js`; `API/src/index.js` cria o servidor e registra Socket.IO.

## Pipeline HTTP

1. request ID e log estruturado;
2. Helmet, CORS e limite JSON de 1 MB;
3. middleware de autenticação própria e sessão revogável;
4. rate limit em `/api/v1`;
5. autenticação e hidratação do usuário local;
6. rota/controller/service/repository;
7. handler central de erro.

## Respostas

Sucesso usa `{ "data": ... }`. Erros usam `{ "error": { "code", "message", "fields?", "requestId" } }`. Não exponha stack, detalhes Prisma, segredos ou conteúdo privado em logs.

## Regras de implementação

- validar `params`, `query` e `body` com Zod;
- verificar ownership no service antes de mutar livros/imagens;
- selecionar apenas campos públicos de usuário;
- paginação usa `limit`, `cursor` e `pageInfo`;
- integração externa deve ter timeout e mapear falha para `AppError`;
- controller não contém regra de match, ISBN ou armazenamento.


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
