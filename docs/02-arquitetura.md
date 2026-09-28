# 2. Arquitetura

```text
Expo/React Native
  ├─ CameraView ─► validação EAN-13 local ─► HTTPS + access ─► GET /api/v1/isbn/:isbn
  ├─ HTTPS + access token ─► Express /api/v1 ─► service ─► repository ─► PostgreSQL
  ├─ refresh token ────────► rotação/revogação de AuthSession
  ├─ Socket.IO + access ───► mesma validação JWT + AuthSession
  └─ PUT pré-assinado ───────────────────────────────────────────────► Cloudflare R2

PWA (Expo Web / React Native Web)
  ├─ telas compartilhadas de app/ ─► HTTPS no mesmo domínio
  ├─ refresh ──────────────────────► cookie HttpOnly first-party
  └─ /api/v1, /health, /socket.io e /covers ─► Caddy em web/ ─► API Railway privada

Express ──► Resend (verificação, recuperação e boas-vindas)
        └─► BrasilAPI (ISBN)
```

A API é a única autoridade de identidade. O cliente nunca escolhe `userId`/owner; rotas privadas usam `req.currentUser.id`. O access token contém `sub` e `sid`, e só é aceito se a sessão correspondente estiver ativa, não revogada, não expirada e vinculada a um usuário verificado.

Cada módulo da API separa rotas, controllers, services, repositories e schemas Zod. No app, `SessionProvider` usa um transporte nativo ou web: Android/iOS persiste tokens no SecureStore; a PWA mantém o access token em memória e recupera a sessão por cookie HttpOnly. `services/api.ts` injeta bearer e coordena um único refresh para respostas 401 concorrentes.

Na criação de livro, o scanner nativo reconhece apenas EAN-13 e faz a primeira validação no dispositivo. Somente códigos de livro com prefixo `978`/`979` e checksum válido seguem para a rota privada de ISBN; QR, URL, texto e EAN de outros produtos são descartados antes da rede. A API repete a validação com Zod e checksum, valida e limita o payload recebido da BrasilAPI, consulta o provedor com timeout e cache de 10 minutos limitado a 500 entradas e aplica limite dedicado por usuário autenticado, com IP como fallback. O resultado apenas preenche o formulário para revisão: não cria livro nem persiste capa automaticamente.

A câmera é uma entrada local e efêmera. Nenhum frame ou foto atravessa a fronteira do app. O Expo Camera fornece implementação web com detecção de código de barras; câmera, permissões e envio de imagens ainda exigem aceite em Safari/iPhone físico. O fluxo manual continua disponível como alternativa e para ISBN-10.

O web build escolhe `window.location.origin` para API e Socket.IO; por isso o bundle não depende do IP local em `app/.env`. O proxy Caddy usa domínio Railway próprio e encaminha a API pela rede privada. Os dados de `/api/v1`, do socket e das capas não são armazenados no cache da PWA.

Uploads usam autorização curta e chave derivada no servidor. Capas ficam em `books/<user>/<book>/<uuid>`; avatares, em `avatars/<user>/<uuid>`. O servidor confirma tipo e tamanho antes de vincular a URL.

`clerkUserId` permanece nullable apenas como coluna histórica durante a janela de migração. Não é usado pelo runtime, autorização, seed ou payload público.
