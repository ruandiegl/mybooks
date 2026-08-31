# 6. Banco de dados

`API/prisma/schema.prisma` é a fonte de verdade. PostgreSQL 16 é o banco do projeto e Prisma 6 é o único caminho de acesso no código novo.

## Modelos

- `User`: vínculo Clerk, perfil e cidade;
- `Book`: catálogo, ISBN validado, disponibilidade e proprietário;
- `BookImage`: metadados e chave do objeto R2;
- `Interaction`: ação LIKE/PASS idempotente;
- `Match`: relação canônica entre duas pessoas;
- `Conversation` e `ConversationMember`: chat e estado de leitura;
- `Message`: mensagem durável com `clientMessageId` único por remetente.

## Regras

- IDs são UUIDs;
- timestamps usam `DateTime` e são emitidos em ISO 8601;
- livro novo sempre recebe `ownerId` do usuário autenticado;
- ISBN válido pode ser único por edição/owner conforme evolução do produto, mas não deve impedir diferentes pessoas de possuir a mesma edição;
- exclusões em cascata devem ser deliberadas e revisadas;
- consultas de descoberta, histórico e relações usam índices definidos no schema/migração.

## Migrações

A migração `20260831140000_mvp_foundation` preserva usuários e livros legados, cria vínculos Clerk de transição e adiciona o domínio social. Em ambiente local:

```bash
cd API
npx prisma generate
npx prisma migrate dev
```

Nunca edite um banco compartilhado manualmente para substituir uma migração. Faça backup antes de aplicar a migração em dados reais e valide registros legados sem proprietário.
