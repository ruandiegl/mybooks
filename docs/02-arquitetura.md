# 2. Arquitetura

```text
Expo/React Native
  ├─ CameraView ─► validação EAN-13 local ─► HTTPS + access ─► GET /api/v1/isbn/:isbn
  ├─ HTTPS + access token ─► Express /api/v1 ─► service ─► repository ─► PostgreSQL
  ├─ refresh token ────────► rotação/revogação de AuthSession
  ├─ Socket.IO + access ───► mesma validação JWT + AuthSession
  └─ PUT pré-assinado ───────────────────────────────────────────────► Cloudflare R2

Express ──► Resend (verificação, recuperação e boas-vindas)
        └─► BrasilAPI (ISBN)
```

A API é a única autoridade de identidade. O cliente nunca escolhe `userId`/owner; rotas privadas usam `req.currentUser.id`. O access token contém `sub` e `sid`, e só é aceito se a sessão correspondente estiver ativa, não revogada, não expirada e vinculada a um usuário verificado.

Cada módulo da API separa rotas, controllers, services, repositories e schemas Zod. No app, `SessionProvider` mantém a sessão e `services/api.ts` injeta bearer e coordena refresh concorrente. O app nativo persiste tokens pelo SecureStore. A PWA mantém o access token em memória e o refresh token em cookie HttpOnly, Secure e SameSite=Strict; a API fica no mesmo origin HTTPS via proxy `/api`, com origem validada nas mutações. HTTP de loopback serve apenas para desenvolvimento e não persiste a sessão.

Na criação de livro, o scanner nativo reconhece apenas EAN-13 e faz a primeira validação no dispositivo. Somente códigos de livro com prefixo `978`/`979` e checksum válido seguem para a rota privada de ISBN; QR, URL, texto e EAN de outros produtos são descartados antes da rede. A API repete a validação com Zod e checksum, valida e limita o payload recebido da BrasilAPI, consulta o provedor com timeout e cache de 10 minutos limitado a 500 entradas e aplica limite dedicado por usuário autenticado, com IP como fallback. O resultado apenas preenche o formulário para revisão: não cria livro nem persiste capa automaticamente.

A câmera é uma entrada local e efêmera. Nenhum frame ou foto atravessa a fronteira do app, e o fluxo manual continua sendo a alternativa para Web, indisponibilidade da câmera e ISBN-10.

Uploads usam autorização curta e chave derivada no servidor. Capas ficam em `books/<user>/<book>/<uuid>`; avatares, em `avatars/<user>/<uuid>`. O servidor confirma tipo e tamanho antes de vincular a URL.

`clerkUserId` permanece nullable apenas como coluna histórica durante a janela de migração. Não é usado pelo runtime, autorização, seed ou payload público.

A experiência PWA de iOS usa a mesma conta, API, trial e cota diária do APK. O Premium deriva do estado persistido no servidor; a API inicia e expira o período e aplica os entitlements. O cliente oculta dados identificáveis ao fim exato e limpa o cache de curtidas recebidas. Cobrança real não faz parte desta arquitetura.
