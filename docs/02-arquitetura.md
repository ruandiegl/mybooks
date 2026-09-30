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

Fotos de livro usam autorização curta para um objeto temporário em `pending/books/<user>/<book>/<uuid>`. A API confirma tipo e tamanho com HEAD, copia para `books/<user>/<book>/<uuid>` e só então vincula a imagem ao livro sob lock transacional. `sortOrder = 0` é a capa; o limite de três e a lista completa de reordenação são verificados no servidor. Uploads abandonados expiram pelo lifecycle do prefixo temporário.

O bucket de fotos de livros é privado. As respostas de livro assinam GET por prazo curto e informam `expiresAt`; a assinatura não é gravada no PostgreSQL. O app renova os dados periodicamente e ao voltar ao primeiro plano. URLs externas legadas permanecem como fallback e a capa ISBN só aparece quando não há foto própria. Avatares continuam no fluxo legado de `avatars/<user>/<uuid>` e podem usar `R2_PUBLIC_URL`.

`clerkUserId` permanece nullable apenas como coluna histórica durante a janela de migração. Não é usado pelo runtime, autorização, seed ou payload público.

A experiência PWA de iOS usa a mesma conta, API, trial e cota diária do APK. O Premium deriva do estado persistido no servidor; a API inicia e expira o período e aplica os entitlements. O cliente oculta dados identificáveis ao fim exato e limpa o cache de curtidas recebidas. Cobrança real não faz parte desta arquitetura.
