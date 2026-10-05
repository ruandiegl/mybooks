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

A integração preserva os dois contratos web: `/api/v1/auth/*` com `X-Session-Transport: cookie`, da main, e `/api/v1/auth/browser/*`, com cookie `__Host-trocalivros_refresh`, da PWA. Ambos usam os mesmos services e sessões rotativas, sem refresh token no JSON web. O contrato da main mantém `SameSite=Strict`; o cookie `__Host-` tem `HttpOnly`, `Secure`, `Path=/` e nenhum `Domain`. Ambos devem exigir requisição e `Origin` HTTPS autorizado, com bloqueio de origem indevida e proteção CSRF. O aceite da implementação conciliada dessas garantias ainda está pendente.

A API fica na mesma origem HTTPS via proxy `/api`. Refresh entre abas usa Web Locks; HTTP de LAN é bloqueado e loopback serve apenas para desenvolvimento sem persistência de sessão. Falha transitória de rede/servidor não equivale a sessão inválida. Logout só encerra a sessão local e remove o cookie depois da revogação confirmada; falha oferece retry e preserva a regra da main.

Na criação de livro, o scanner nativo reconhece apenas EAN-13 e faz a primeira validação no dispositivo. Somente códigos de livro com prefixo `978`/`979` e checksum válido seguem para a rota privada de ISBN; QR, URL, texto e EAN de outros produtos são descartados antes da rede. A API repete a validação com Zod e checksum, valida e limita o payload recebido da BrasilAPI, consulta o provedor com timeout e cache de 10 minutos limitado a 500 entradas e aplica limite dedicado por usuário autenticado, com IP como fallback. O resultado apenas preenche o formulário para revisão: não cria livro nem persiste capa automaticamente.

A câmera é uma entrada local e efêmera. Nenhum frame ou foto atravessa a fronteira do app. O Expo Camera fornece implementação web com detecção de código de barras; câmera, permissões e envio de imagens ainda exigem aceite em Safari/iPhone físico. O fluxo manual continua disponível como alternativa e para ISBN-10.

O web build escolhe `window.location.origin` para API e Socket.IO; por isso o bundle não depende do IP local em `app/.env`. O proxy Caddy encaminha `/api/v1`, `/health`, `/socket.io` e `/covers` para a API pela rede privada da Railway. Preserva Origin, cookies e o protocolo HTTPS informado pelo ingress que termina TLS; não deve fabricar HTTPS para requisições HTTP ou sem esse cabeçalho. A cadeia de proxies confiáveis precisa ser validada no ambiente publicado.

O manifesto define início/escopo `/` e modo `standalone`, com ícones 192/512 e metadados/ícone 180 para iOS. O service worker guarda somente assets com hash e `offline.html`; navegação tenta a rede e usa a página offline quando indisponível. Dados da API, sessão, Socket.IO, capas e fotos privadas do R2 ficam fora desse cache. O fallback SPA atende apenas navegação HTML GET/HEAD; erros JSON da API e arquivos ausentes não viram `index.html`.

O linking do React Navigation traduz URLs de autenticação, onboarding, telas principais, livros, matches e chat, mantendo os guards de sessão e ownership. Variantes `.web` concentram configuração de origem, autenticação por cookie, avisos com callbacks e preparação de imagens; a UI de Curtidas, Premium e galeria continua compartilhada. Conversão HEIC/JPEG ocorre localmente quando o navegador consegue decodificar, sem mudar as regras finais de MIME, tamanho e limite de fotos da API.

Fotos de livro usam autorização curta para um objeto temporário em `pending/books/<user>/<book>/<uuid>`. A API confirma tipo e tamanho com HEAD, copia para `books/<user>/<book>/<uuid>` e só então vincula a imagem ao livro sob lock transacional. `sortOrder = 0` é a capa; o limite de três e a lista completa de reordenação são verificados no servidor. Uploads abandonados expiram pelo lifecycle do prefixo temporário.

O bucket de fotos de livros é privado. As respostas de livro assinam GET por prazo curto e informam `expiresAt`; a assinatura não é gravada no PostgreSQL. O app renova os dados periodicamente e ao voltar ao primeiro plano. URLs externas legadas permanecem como fallback e a capa ISBN só aparece quando não há foto própria. Avatares continuam no fluxo legado de `avatars/<user>/<uuid>` e podem usar `R2_PUBLIC_URL`.

`clerkUserId` permanece nullable apenas como coluna histórica durante a janela de migração. Não é usado pelo runtime, autorização, seed ou payload público.

A experiência PWA de iOS usa a mesma conta, API, trial e cota diária do APK. O Premium deriva do estado persistido no servidor; a API inicia e expira o período e aplica os entitlements. O cliente oculta dados identificáveis ao fim exato e limpa o cache de curtidas recebidas. Cobrança real não faz parte desta arquitetura.

## Foto de perfil — plano 009 (implementação não publicada)

Avatares novos seguem grant → pending/avatars → validação/normalização no servidor → chave permanente → GET assinado. Claim/CAS e fila de limpeza controlam concorrência; originais ficam efêmeros no cliente.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).
