# 4. Backend e API

A API usa JavaScript ESM, Express 5, Zod e Prisma. O ponto de composição HTTP é `API/src/app.js`; `API/src/index.js` cria o servidor e registra Socket.IO.

## Pipeline HTTP

1. request ID e log estruturado;
2. Helmet, CORS e limite JSON de 1 MB;
3. CORS restrito e rate limit em `/api/v1`;
4. autenticação bearer nativa e hidratação do usuário;
5. rota/controller/service/repository;
6. handler central de erro.

As rotas `/auth/browser/login`, `/auth/browser/verify-email`, `/auth/browser/refresh` e `/auth/browser/logout` usam os mesmos services e a mesma família de `AuthSession` dos endpoints nativos. Requerem `Origin` na allowlist `CLIENT_ORIGINS`; o domínio PWA pode ser informado separadamente por `PWA_CLIENT_ORIGIN` e é combinado com a allowlist em memória. Rejeitam `Sec-Fetch-Site: cross-site` e guardam o refresh rotativo em cookie `__Host-` seguro. O refresh token não aparece no JSON web. O APK mantém os endpoints nativos.

## Respostas

Sucesso usa `{ "data": ... }`. Erros usam `{ "error": { "code", "message", "fields?", "requestId" } }`. Não exponha stack, detalhes Prisma, segredos ou conteúdo privado em logs.

## Regras de implementação

- validar `params`, `query` e `body` com Zod;
- verificar ownership no service antes de mutar livros/imagens;
- selecionar apenas campos públicos de usuário;
- paginação usa `limit`, `cursor` e `pageInfo`;
- integração externa deve ter timeout e mapear falha para `AppError`;
- controller não contém regra de match, ISBN ou armazenamento.

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
