# 11. Qualidade e testes

Antes de uma entrega:

```bash
cd API
npm run lint
npm test
npx prisma validate
npx prisma generate

cd ../app
npm test
npm run typecheck
npx expo-doctor
npx expo export --platform android --output-dir .validation-export --clear
```

A suíte deve cobrir política/limite bcrypt, CPF/celular/e-mail, códigos, concorrência de cadastro, enumeração, refresh/replay, sessão revogada, rate limit, ownership HTTP/Socket.IO, avatar e decisões de onboarding. No app, cobre regras puras de senha, refresh único e guards.

Para o fluxo de ISBN, cubra no app aceitação exclusiva de EAN-13 `978`/`979` com checksum válido, rejeição sem chamada HTTP de QR/URL/texto/EAN de produto, preenchimento após leitura e fallback manual. Na API, cubra Zod/checksum, cache, timeout, chave do rate limit e respostas `404/422/429/503` sem vazamento.

Na validação da galeria de fotos, o app teve 9 arquivos e 39 testes aprovados, typecheck aprovado e bundles Web e Android exportados pelo Expo 57. Na API, o lint passou sem erros; 27 arquivos e 177 testes foram aprovados, com 1 arquivo/teste ignorado. `prisma validate` confirmou o schema e `prisma generate` gerou o Prisma Client 6.19.3. Os testes novos cobrem limite, ownership, ordem, capa, retry da fila e serialização de URLs privadas.

A migração de `BookImage` não foi executada em PostgreSQL limpo nem em cópia do banco existente: não havia URL de banco no checkout isolado e o comando Docker não estava disponível. A consulta prévia `API/prisma/book-image-preflight.sql` foi adicionada para identificar exceções antes da aplicação. O `.env` local não tem `R2_ACCOUNT_ID`, `R2_BUCKET` ou credenciais R2 preenchidas; PUT/HEAD/copy/GET/DELETE reais, lifecycle, CORS e prova física Android/iOS permanecem pendentes. Export, testes unitários e mocks não equivalem a esses aceites externos.

Migração em PostgreSQL limpo, entrega Resend, R2, dois usuários no Socket.IO e dispositivo Android/iOS são evidências separadas. O aceite físico do scanner deve incluir permissão negada e bloqueada, baixa luz, código danificado, offline, `404`, `503` e limite excedido. Se o ambiente não existir, registre como pendente; typecheck, export e mocks não equivalem a teste ponta a ponta.
