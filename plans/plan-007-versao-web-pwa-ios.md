# TrocaLivros Web/PWA para iPhone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** criar uma área `web/` para publicar uma PWA iOS instalável que compartilhe interface e funcionalidades com o APK Android e use a API/PostgreSQL do Railway.

**Architecture:** criar `web/` para build, hospedagem e configuração exclusiva da PWA, preservando `app/` como fonte compartilhada das telas Expo/React Native Web. Concentrar diferenças do Safari em adaptadores `.web.ts(x)` de sessão, câmera, avisos e navegação; não duplicar as telas. Publicar a PWA como **serviço web separado no mesmo projeto Railway**, com proxy de `/api/v1`, `/health`, `/socket.io` e `/covers` para a API via rede privada. O navegador usa um único origin HTTPS e cookie first party; o APK continua chamando a API Railway diretamente.

**Tech Stack:** Expo 57, React Native 0.86, React Native Web 0.21, React Navigation 7, Caddy para arquivos estáticos/proxy WebSocket, Express 5, Socket.IO 4, Prisma/PostgreSQL e Railway; manifesto web e service worker de cache limitado.

**Spec:** [plan-007-versao-web-pwa-ios-especificacao.md](./plan-007-versao-web-pwa-ios-especificacao.md). Fontes verificadas em [plan-007-versao-web-pwa-ios-fontes.md](./plan-007-versao-web-pwa-ios-fontes.md).

## Global Constraints

- `web/` contém somente build, assets, PWA e hospedagem; o mesmo código de telas, componentes, textos, tema Be Vietnam Pro e contratos de API atende aos dois clientes. Arquivos `.web.ts(x)` ficam apenas nas integrações de plataforma.
- Paridade inclui cadastro/recuperação, onboarding, perfil, livros, ISBN/câmera, descoberta, match, chat, imagens, sessão e o Premium de teste definido para o MVP.
- O Premium acordado na conversa usa **30 dias exatos**, **15 curtidas grátis por dia** e **nenhuma cobrança real**. Nenhum checkout/Stripe entra neste incremento.
- A API continua autoridade para sessão, propriedade dos dados, contagem de curtidas e Premium; nenhum segredo nem credencial R2 entra em `EXPO_PUBLIC_*` ou no bundle. A rotação por cookie usa Web Locks para serializar abas; sessão renovável requer Safari/iOS 15.4 ou mais recente.
- Todas as superfícies publicadas usam HTTPS; dados privados e respostas `/api/v1` não entram no cache offline.
- O scanner e os uploads devem ser testados em iPhone físico. Fallback manual de ISBN permanece visível mesmo se a câmera for negada.
- Respeitar `docs/` para contratos, segurança, design e documentação viva. Os trechos antigos de Clerk/Stripe são históricos e precisam de correção quando a área for tocada.

## Diagnóstico que fundamenta o plano

- A exportação `npx expo export --platform web` **concluiu neste checkout** em 28/09/2026, com 821 módulos; isso prova compilação, não funcionamento no Safari. O diretório temporário de exportação foi removido.
- `app/.env` usa IP local; `app/src/config/env.ts` tem fallback localhost. Esse bundle não serve para iPhone fora da LAN. URLs `EXPO_PUBLIC_` ficam embutidas no build.
- `authStorage.ts` usa `expo-secure-store`, sem web; o backend responde refresh token no JSON. A sessão web requer um transporte específico com cookie seguro, mantendo o transporte atual no APK.
- `main-tabs.tsx` já aponta para a variante JS, apropriada para web; `main-tabs.ios.tsx` usa UIKit apenas no app nativo. `NavigationContainer` ainda não tem `linking` para URLs/histórico.
- Várias telas usam `Alert.alert`; scanner, seletor de imagem e upload R2 exigem verificação e eventual adaptação web. O backend restringe `CLIENT_ORIGINS` e o Socket.IO usa a mesma lista.
- `app/app.json` só define favicon web; não há `web/`, `manifest.json`, HTML PWA nem política de cache.
- Este checkout contém este plano 007, mas **não contém código Premium**. O plano 006 ainda não reflete a decisão posterior de teste grátis; a paridade Premium permanece uma dependência separada.
- A API Railway deve responder `200` em `/health` antes do aceite. A checagem anterior nesta conversa retornou `502`; uma tentativa atual de leitura pelo navegador de pesquisa não comprovou recuperação. Tratar como bloqueio de ambiente, com logs/deploy Railway e teste externo, sem afirmar que está saudável.

## Escolha de implantação

| Caminho | Efeito no MVP | Decisão |
| --- | --- | --- |
| `web/` como serviço Railway separado, com proxy privado para API/Socket.IO | Código e deploy web separados da API, um origin para o Safari e cookie first party; exige configurar o proxy. | **Recomendado para a banca** |
| Exportar Expo Web e servir `dist/` no Express da API | Um origin e menos serviços, mas acopla releases web/API e muda o container da API atual. | Alternativa de contingência |
| Frontend estático externo chamando API Railway diretamente | Deploy independente, porém precisa de CORS e depende de cookie entre sites para sessão persistente no Safari. | Evitar neste MVP |

`web.output: "single"` é adequado ao app atual com React Navigation; não migrar para Expo Router apenas para criar a PWA. O proxy em `web/` deve enviar rotas de API, saúde, socket e capas para a API privada antes do fallback SPA. Apenas rotas de navegação HTML recebem `index.html`; um erro de API ou arquivo inexistente não pode virar HTML 200. Usar `Cache-Control: no-store` no HTML e cache imutável só em assets com hash.

## Mapa de arquivos e interfaces

| Área | Arquivos principais | Responsabilidade |
| --- | --- | --- |
| Publicação | `web/Dockerfile`, `web/Caddyfile`, `web/README.md`, `app/app.json`, `app/public/index.html`, `app/public/manifest.json`, `app/public/` ícones, `app/package.json` | `web/` constrói/exporta o mesmo app Expo e publica SPA/ícones sem alterar o deploy da API; `app/public` abriga assets web exigidos pelo Expo |
| Sessão | `API/src/modules/auth/auth.routes.js`, `auth.controller.js`, `auth.service.js`, schemas e testes; `app/src/features/auth/authTransport.ts`, `authTransport.web.ts`, `authApi.web.ts`, `app/src/providers/SessionProvider.tsx` | Bearer e SecureStore nativos; access curto em memória e refresh cookie HttpOnly no web |
| Navegação | `app/src/routes/index.tsx`, `app/src/routes/linking.ts`, `app/src/types/navigation.ts` | URL por tela, voltar/recarregar/abrir link e guarda de autenticação |
| Compatibilidade visual | `app/src/components/AppNotice/`, `app/src/components/BarcodeScannerModal/index.web.tsx`, `app/src/pages/BookCreate`, `AvatarPicker`, telas com alertas | Avisos visíveis, câmera e uploads no Safari, mesma linguagem visual |
| Integrações | `app/src/config/env.web.ts`, `web/Caddyfile`, `API/src/modules/chat/chat.socket.js`, R2/configuração Railway | Origin HTTPS, proxy privado, validação de origin no socket e mídia pública |
| Aceite | `docs/15-matriz-validacao-mvp.md`, `docs/10-docker-ambientes.md`, `docs/03-frontend-mobile.md`, `docs/13-pendencias-conhecidas.md`, `docs/16-historico-de-alteracoes.md` | Evidências por plataforma, roteiro de publicação e pendências reais |

**Interface de sessão proposta:** `SessionTransport` oferece `restore(): Promise<SessionSnapshot | null>`, `accept(response): Promise<SessionSnapshot>`, `refresh(): Promise<SessionSnapshot | null>` e `signOut(): Promise<void>`. `SessionSnapshot` contém `accessToken`, `expiresAt` e `user`; o refresh token só existe no adaptador nativo. O adaptador web mantém access token em memória; `restore()` chama `/api/v1/auth/browser/refresh` com cookie first party. `SessionProvider` e Axios usam a mesma interface; 401 concorrentes continuam gerando um único refresh. Não criar cópia completa do provedor de sessão para web.

**Contrato HTTP web proposto:** `POST /api/v1/auth/browser/login`, `/verify-email`, `/refresh` e `/logout`. Os dois primeiros compartilham a regra de negócio nativa e retornam `{ data: { accessToken, expiresAt, user } }`, omitindo refresh do JSON e definindo cookie `__Host-trocalivros_refresh` (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`; o prefixo `__Host-` exige `Path=/` e nenhum `Domain`). `refresh` rotaciona a sessão e o cookie; `logout` revoga e limpa o cookie. Validar `Origin`/`Sec-Fetch-Site` e CSRF nas rotas que usam cookie; nunca aceitar mudança de estado por GET. O APK mantém `/auth/login`, `/verify-email`, `/refresh`, `/logout` atuais. Revisar política de duração e concorrência com a família de refresh existente antes de implementar.

## Review Focus

1. Safari fecha e reabre a PWA após access expirar: `restore()` renova uma vez e não cria loop de login.
2. Duas requisições 401 simultâneas ou refresh replay: uma rotação legítima, erro posterior limpa sessão e cache privado.
3. PWA carregada por URL interna após atualização: a rota abre a tela certa e não recebe `index.html` em erro de API.
4. Câmera negada ou upload HEIC do iPhone: usuário mantém formulário/ISBN e recebe caminho de conversão ou erro claro sem livro órfão.
5. Service worker antigo, offline ou troca de conta no mesmo aparelho: assets atualizam e dados privados não são servidos de cache a outra conta.

---

### Task 1: Fixar a linha de base e a paridade

**Files:** `plans/plan-007-versao-web-pwa-ios.md`, `docs/15-matriz-validacao-mvp.md` (atualizar ao executar); ler `app/src/pages/*`, `app/src/components/*`, `API/src/routes/index.js` e implantação Railway.

**Interfaces:** produz uma matriz com linha por fluxo e colunas APK, Safari, PWA instalada, API/serviço e evidência.

- [x] Verificar o checkout atual: o código Premium de teste está ausente; registrar dependência e não marcar esse fluxo como entregue.
- [ ] Confirmar Railway `GET /health = 200` externamente, migration aplicada, login de conta existente e conta nova, Socket.IO, Resend e R2. Corrigir a falha 502 se persistir antes do teste PWA.
- [ ] Inventariar estados de todas as telas: Auth, onboarding, Descobrir, Biblioteca, Livro (criar/detalhes/editar), Matches, Mensagens, Chat, Perfil, ISBN, imagens e Premium.
- [ ] Registrar screenshots do APK com conta e dados de teste, dimensões 320/360/390 pt e fonte ampliada; eles serão a referência de paridade.
- [x] Exportar a PWA e executar o smoke do manifesto/cache/bundle: build de 821 módulos, 32 assets com hash pré-cacheados e smoke aprovado. Isso comprova o build, não o funcionamento no Safari.

**Aceite:** matriz e lacunas reais identificadas, conta de demonstração acessível pela API Railway e a dependência Premium resolvida ou explicitamente pendente.

### Task 2: Criar `web/` e publicar a SPA/PWA em serviço próprio

**Files:** criar `web/Dockerfile`, `web/Caddyfile`, `web/README.md`, `web/tests/proxy-smoke.mjs`; modificar `app/app.json`, `app/package.json`, `app/public/index.html`, `app/public/manifest.json`, ícones 192/512/Apple touch. Preservar `API/Dockerfile` e o deploy atual da API.

**Interfaces:** serviço `web` expõe `GET /`/rota de tela como HTML PWA; encaminha `/api/v1/*`, `/health`, `/socket.io/*` e `/covers/*` sem alterar método, body, cookie, status ou protocolo WebSocket; assets têm MIME e cache corretos. Upstream configurado por variável `API_UPSTREAM` privada, sem endereço interno no bundle do navegador.

- [x] Configurar `web.output: "single"`, nome TrocaLivros, `display: "standalone"`, `start_url`, `scope`, cores e ícones. Personalizar `public/index.html` com manifesto e metadados iOS; build e smoke PWA aprovados.
- [x] Criar `app/src/config/env.web.ts` para usar `window.location.origin` como API/Socket e testar ausência de URL local no bundle. A configuração nativa continua independente.
- [x] Criar `web/Dockerfile` multi-stage com Node 22 e Caddy, contexto na raiz e saída Expo em `app/dist`; a configuração do serviço Railway segue pendente.
- [x] Criar `web/Caddyfile` com rotas de proxy, WebSocket, encaminhamento de headers, fallback apenas para navegação HTML GET/HEAD e políticas de cache. O upstream privado e a cadeia real de proxies ainda precisam de validação na Railway.
- [ ] Executar smoke de proxy HTTP/WebSocket/cache e validar parser Caddy. O teste foi escrito, mas não executou porque Caddy não está instalado e o daemon Docker local está inacessível.
- [ ] Criar/configurar o serviço e domínio HTTPS Railway, ajustar `CLIENT_ORIGINS` da API e testar Safari/instalação Adicionar à Tela de Início. Isso depende de publicar este código numa branch GitHub e confirmar o upstream privado.

**Aceite:** PWA acessível publicamente no domínio do serviço `web` Railway e instalada no iPhone; API continua no serviço existente, `/health` e contratos antigos funcionam através do proxy. Uma atualização web pode ser publicada sem reconstruir a API.

### Task 3: Tornar a sessão web segura e persistente

**Files:** `API/src/modules/auth/auth.routes.js`, `auth.controller.js`, `auth.schemas.js`, `auth.service.js`, testes de rota; `app/src/features/auth/authTransport.ts`, `authTransport.web.ts`, `authApi.web.ts`, `app/src/providers/SessionProvider.tsx`, `app/src/services/api.ts`, testes do app.

**Interfaces:** `SessionTransport` e quatro rotas `/auth/browser/*` definidos acima; access bearer segue nas rotas privadas e no handshake Socket.IO.

- [x] Escrever testes de login/verificação web: atributos do cookie, refresh omitido do JSON, rejeição de Origin inválida, rotação, logout, refresh inválido e preservação dos endpoints nativos.
- [x] Implementar auth web sobre os services existentes, com rotação/revogação da mesma `AuthSession`, cookie `__Host-` HttpOnly/Secure e validação de Origin/Fetch Metadata.
- [x] Escrever testes do transporte para restauração por cookie, refresh serializado entre abas, logout offline persistido por marcador não secreto, access token apenas em memória e retenção da sessão em falha temporária; testar cookie inválido/malformado expirado pela API.
- [x] Adicionar adaptador web same-origin e manter SecureStore no adaptador nativo. Ajustar `SessionProvider` e chamadas Auth sem duplicar regras.
- [ ] Inspecionar armazenamento, DevTools, network e logs no Safari: refresh só em cookie HttpOnly; nenhum token duradouro acessível por JS.

**Aceite:** mesma conta entra no APK e PWA, reabre PWA autenticada, logout/revogação valem nos dois canais e um 401 não causa loop.

### Task 4: URLs, tela e interações equivalentes

**Files:** `app/src/routes/index.tsx`, `app/src/routes/linking.ts`, `app/src/types/navigation.ts`, telas que usam `Alert.alert`, novo `app/src/components/AppNotice/` se necessário, estilos afetados.

**Interfaces:** caminhos explícitos para Auth, onboarding, tabs, livro, chat e perfil; avisos possuem ações e callbacks equivalentes aos alertas nativos.

- [x] Configurar linking do React Navigation e testar resolução de caminhos de livro, chat e descoberta. Reload/voltar e guardas em navegador real seguem pendentes.
- [x] Substituir alertas que não funcionam no web por adaptador `.web`, preservando confirmações e callbacks; testes do adaptador aprovados.
- [ ] Ajustar safe area, barra de abas JS, teclado virtual, viewport, rolagem e foco em 320/360/390 pt. Comparar cada tela com os screenshots da Task 1, inclusive bottom sheet Premium caso integrado.
- [ ] Testar acessibilidade de rótulos, foco, contraste e alvos de toque; testar o sheet fechando por arrasto para baixo, toque no backdrop e botão, sem abrir repetidamente no login.

**Aceite:** todos os controles visíveis do APK têm ação e retorno visível na PWA; navegação direta e retorno são coerentes no Safari e instalada.

### Task 5: Câmera, fotos, mídia e chat no Safari

**Files:** `app/src/components/BarcodeScannerModal/index.web.tsx` somente se o atual falhar, `app/src/pages/BookCreate/index.tsx`, `app/src/components/AvatarPicker/index.tsx`, `app/src/services/socket.ts`, `API/src/modules/chat/chat.socket.js`, configurações R2 e URLs de capas.

**Interfaces:** scanner entrega somente ISBN/EAN-13 validado à lógica já compartilhada; upload usa presign/PUT/complete; Socket.IO usa access atual e reconecta após refresh.

- [ ] Em iPhone físico HTTPS, tentar `CameraView`: conceder/negar permissão, ler `978`/`979`, rejeitar código inválido, fechar câmera e digitar ISBN. O aceite físico permanece pendente.
- [x] Implementar adaptador web que converte HEIC/HEIF e JPEG grande para JPEG de até 8 MB antes do upload; testes de conversão, limite e erro aprovados.
- [ ] Testar envio real de JPEG, PNG, WebP e HEIC no iPhone e confirmar CORS do R2, presign/PUT/HEAD e mídia HTTPS.
- [ ] Localizar capas salvas com host `192.168.*` ou HTTP e migrar por operação versionada/backup para URLs HTTPS estáveis ou chaves resolvidas pela API. Não fazer `replace` cego no banco; preservar ownership e validar quantidade antes/depois.
- [x] Atualizar handshake Socket.IO para buscar o access token atual e tentar refresh uma vez após sessão expirada; teste unitário aprovado.
- [ ] Testar chat de dois usuários, typing, ack, retry, reconexão e sessão revogada em Safari/PWA; validar origin e WebSocket através da Railway.

**Aceite:** ISBN, uploads, capas e chat funcionam no iPhone fora da LAN; cada falha tem retry/fallback e nenhuma imagem privada ou token vaza para outro usuário.

### Task 6: Cache limitado, implantação e documentação final

**Files:** `app/public/` service worker ou configuração Workbox, scripts de build, documentação `docs/README.md`, `docs/01`, `02`, `03`, `04`, `05`, `07`, `09`, `10`, `11`, `13`, `14`, `15`, `16`, `docs/seguranca-auth-runbook.md` conforme áreas efetivamente alteradas.

**Interfaces:** cache apenas do shell/assets versionados; `index.html` busca versão atual; respostas autenticadas usam rede e não persistem em Cache Storage.

- [x] Implementar service worker com precache de assets com hash e página offline genérica; não cacheia API, socket, capas ou HTML com dados. Smoke PWA aprovou manifesto, ícones, lista de cache e ausência de URL local.
- [x] Executar roteiro local reproduzível: typecheck/testes do app, lint/testes API, export web e smoke PWA. Exportar também Android Hermes (1.067 módulos). O smoke de proxy Caddy está escrito, mas bloqueado pela ausência de Caddy/Docker acessível.
- [ ] Adicionar esses comandos a CI e executar o smoke do proxy em ambiente com Caddy disponível.
- [ ] Ensaiar publicação e rollback Railway. Verificar `/health`, login, R2, chat, ícones, manifesto, versão nova e sem rede após cada deploy.
- [x] Atualizar `docs/` para auth nativa e web, estado de build, limitações Railway/iPhone e distinção entre ausência do Premium e cobrança futura.

**Aceite:** checklist da especificação integralmente marcado com evidências do Safari e PWA física; documentação descreve o estado entregue, sem chamar uma exportação web de PWA concluída.

## Matriz manual obrigatória para a banca

| Fluxo | APK Android | Safari iPhone | PWA instalada | Evidência mínima |
| --- | --- | --- | --- | --- |
| Cadastro, e-mail, login, refresh, logout e recuperação | Sim | Sim | Sim | duas contas, reload/reabertura, sessão revogada |
| Onboarding completo e pulado; perfil/avatar | Sim | Sim | Sim | salvar, cancelar, retomar, imagem |
| Livros: criar, editar, excluir, capa, busca e paginação | Sim | Sim | Sim | dois proprietários, ownership e estados vazios |
| ISBN digitado e leitura de EAN-13 pela câmera | Sim | Sim | Sim | válido/inválido, permissão negada, fallback manual |
| Descoberta, like/pass, match e Premium de teste | Sim | Sim | Sim | mesma conta/regra no servidor; Premium depende de integrar implementação ausente |
| Conversas e chat em tempo real | Sim | Sim | Sim | dois aparelhos, envio/reconexão/retry |
| HTTPS, mídia, atualização e rede indisponível | Sim | Sim | Sim | acesso fora da LAN, nova versão, erro recuperável |

## Ordem e decisão de conclusão

Tasks 1→2→3→4→5→6. Sessão segura e API saudável são requisitos anteriores ao aceite público. Um build web verde é apenas a primeira evidência; só considerar a PWA pronta depois de executar a matriz no iPhone físico real da apresentação. Não afirmar paridade Premium enquanto seu código não aparecer no checkout e os testes das regras de 30 dias/15 curtidas não passarem.

## Fontes oficiais

[Expo Web](https://docs.expo.dev/workflow/web/), [Expo PWA](https://docs.expo.dev/guides/progressive-web-apps/), [Expo: monorepos](https://docs.expo.dev/guides/monorepos/), [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/), [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [React Navigation Web](https://reactnavigation.org/docs/web-support/), [Apple: adicionar site à Tela de Início](https://support.apple.com/en-ca/guide/iphone/iph42ab2f3a7/27/ios/27), [WebKit: cookies de terceiros](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/), [OWASP: sessão](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [Socket.IO: CORS](https://socket.io/docs/v4/handling-cors/), [Railway: rede privada](https://docs.railway.com/networking/private-networking), [Railway: Dockerfile](https://docs.railway.com/builds/dockerfiles), [Caddy: reverse proxy/WebSocket](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Railway: Application Failed to Respond](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond). Expo e React Navigation também foram consultados via Context7.
