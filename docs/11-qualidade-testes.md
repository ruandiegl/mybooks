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

Na validação desta entrega, o app teve 7 arquivos e 32 testes aprovados, além de typecheck, Expo Doctor 21/21 e export Android. Na API, o lint passou sem erros; 23 arquivos e 161 testes foram aprovados, com 1 arquivo e 1 teste ignorados após ampliar a cobertura de payload externo, cache, rate limit e sanitização de logs. `prisma validate` confirmou o schema e `prisma generate` gerou o Prisma Client 6.19.3.

Migração em PostgreSQL limpo, entrega Resend, R2, dois usuários no Socket.IO e dispositivo Android/iOS são evidências separadas. O aceite físico do scanner deve incluir permissão negada e bloqueada, baixa luz, código danificado, offline, `404`, `503` e limite excedido. Se o ambiente não existir, registre como pendente; typecheck, export e mocks não equivalem a teste ponta a ponta.
