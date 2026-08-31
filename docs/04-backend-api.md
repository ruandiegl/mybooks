# 4. Backend e API

A API usa JavaScript ESM, Express 5, Zod e Prisma. O ponto de composição HTTP é `API/src/app.js`; `API/src/index.js` cria o servidor e registra Socket.IO.

## Pipeline HTTP

1. request ID e log estruturado;
2. Helmet, CORS e limite JSON de 1 MB;
3. Clerk middleware quando configurado;
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

## Comandos

```bash
npm run dev
npm run lint
npm test
npm run prisma:generate
npm run prisma:migrate
```
