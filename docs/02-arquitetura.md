# 2. Arquitetura

## Fluxo principal

```text
Expo/React Native
  ├─ HTTPS + Bearer Clerk ──► Express /api/v1 ──► service ──► repository ──► Prisma/PostgreSQL
  ├─ Socket.IO autenticado ─► módulo chat ──────► service ──► Prisma/PostgreSQL
  └─ PUT com URL temporária ───────────────────────────────────────────────► Cloudflare R2

Express ──► Clerk (identidade)
        ├─► BrasilAPI (ISBN)
        └─► Resend (e-mail transacional)
```

## Backend por módulo

Cada pasta em `API/src/modules` contém o que pertence ao seu domínio:

- `*.routes.js`: composição de rotas;
- `*.controller.js`: parâmetros HTTP, status e envelope;
- `*.service.js`: regra de negócio, autorização e coordenação;
- `*.repository.js`: consultas Prisma;
- `*.schemas.js`: validação Zod;
- providers/adapters: integrações externas.

Módulos atuais: `auth`, `books`, `chat`, `email`, `health`, `isbn`, `matches`, `media` e `users`.

## Frontend

`pages` compõem telas e chamadas; `components` implementa primitives reutilizáveis; `services` concentra rede; `providers` mantém sessão; `types` contém contratos compartilhados no app; `styles/theme.ts` é o único catálogo global de tokens.

## Decisões

- HTTP é a fonte durável; Socket.IO entrega eventos em tempo real.
- O cliente pode sugerir dados de ISBN, mas o servidor valida e deriva `hasIsbnBadge`.
- Upload usa URL pré-assinada para não transportar arquivos pelo processo Express.
- Clerk é a autoridade de credenciais. A tabela `User` guarda perfil e vínculo `clerkUserId`, nunca senha.
- Em desenvolvimento existe uma identidade local explícita; produção rejeita `AUTH_MODE` diferente de `clerk`.
