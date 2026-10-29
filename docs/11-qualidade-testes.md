# 11. Qualidade e testes

## Moderação básica — plano 014

Os testes da API cobrem cálculo com piso, bloqueio de interação e remoção destrutiva indevida. A integração usa somente `TEST_DATABASE_URL` local `*_test` e `TEST_DATABASE_DISPOSABLE=true`: aplica todas as migrações em schema temporário, verifica denúncia única/privacidade, bloqueios concorrentes, ocultação de livros/curtidas/matches/chat, recusa de mensagem e restauração do histórico. O app valida tipagem, rotas e build PWA. Testar em duas contas e aparelhos físicos ainda é aceite externo.

## Boot e ícones — plano 013

`features/boot/__tests__`, `bootApp` e `bootRoutes` cobrem recursos, deadlines, primeiro frame, imagem falha, ponte nativa, sessão lenta e foco. `node --test web/tests/brand-assets.test.mjs` valida os pixels/dimensões reais; smoke PWA executa o HTML/worker exportados. QA opcional `pwa-boot-browser-smoke.cjs` testa bundle atrasado/reload, temas, falhas e larguras somente em loopback. Preview/release físico e Safari/PWA instalada são aceites separados; [registro 013](../plans/plan-013-identidade-web-splashscreen-execucao.md).

## Regressões de continuidade de mídia — plano011

Executar `app: npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:pwa` e exportsHermes iOS/Android; API `npm test` e `npm run lint`. A cobertura de `features/media/__tests__` exercita reducer, DOM decodificado real, ponte nativa controlada, consumidores, fila e geração da sessão. Vitest resolve adapters Web nos testes de componentes; bridges nativos usam import explícito, sem alterar o resolver Metro.

Exigir20 renovações sem remontagem/retorno ao fallback, capa correta após reorder, remoção/version++, retry da mesmaURI, decode/load separados, URL vencida, erro sem corpo legível, actor/epoch novo, foco/background, motion e orçamento da fila. O smoke PWA executa o worker gerado com requests sintéticas: API/R2 bypass, ativos públicos preservados e ausência de escrita privada. Fixtures/URLs/contas sintéticas não aprovam acesso R2, login real, uso offline, sensores ou Safari físico. Evidências atuais e aceites pendentes: [execução011](../plans/plan-011-carregamento-imagens-sem-piscadas-execucao.md).

## Plano010

Cobrir providers/componentes reais, I/O simulado somente nas fronteiras; ownership/epoch, hydrate/write atrasados, cookie Web Lock não recursivo e pendências do modal. `SETTINGS_TEST_DATABASE_URL` exige loopback/banco `plan010_test`; integrações verificam concorrência, rollback, família, FK e HTTP/cookies. Sockets usam cliente real. Export/browsertests não são aceite físico; [execução](../plans/plan-010-menu-perfil-configuracoes-execucao.md) separa evidências e limitações.

Antes de uma entrega, executar os checks abaixo na versão integrada e registrar os resultados. Esta conciliação documental não executou esses comandos:

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

npm run build:web
npm run test:pwa
node ../web/tests/proxy-smoke.mjs
node ../web/tests/proxy-https-smoke.mjs
```

A suíte deve cobrir política/limite bcrypt, CPF/celular/e-mail, códigos, concorrência de cadastro, enumeração, refresh/replay, sessão revogada, rate limit, ownership HTTP/Socket.IO, avatar e decisões de onboarding. No app, cobre regras puras de senha, refresh único e guards.

Para o fluxo de ISBN, cubra no app aceitação exclusiva de EAN-13 `978`/`979` com checksum válido, rejeição sem chamada HTTP de QR/URL/texto/EAN de produto, preenchimento após leitura e fallback manual. Na API, cubra Zod/checksum, cache, timeout, chave do rate limit e respostas `404/422/429/503` sem vazamento.

Para fotos, cobrir limite de três, ownership, ordem completa, capa na posição 0, upload temporário/HEAD/cópia, retry sem duplicar fotos confirmadas, fila de limpeza e serialização/renovação de GET privado com `expiresAt`. O adaptador web de conversão não pode substituir a galeria nem reduzir essas garantias.

Os testes web adicionados cobrem transporte de sessão em memória, refresh cookie na API, deep links, adaptador de aviso, conversão HEIC, credencial atual por handshake Socket.IO, manifesto/ícones, ausência de URL local e lista restrita do service worker. Na integração, verificar os dois contratos: `X-Session-Transport: cookie` e `/auth/browser/*` com cookie `__Host-`. Ambos exigem HTTPS e Origin autorizado; testar HTTP de LAN, origem ausente/indevida, CSRF, sessão revogada, cookie malformado, refresh concorrente entre abas e logout com falha transitória. Logout deve preservar cookie e sessão para retry até confirmar revogação; os testes antigos que aprovavam logout offline/local não aprovam essa regra.

O smoke Caddy verifica status/corpo HTTP, cookies/Origin/IP/protocolo encaminhados, WebSocket, navegação profunda e cache. O smoke HTTPS verifica preservação de `X-Forwarded-Proto: https`, de `http` e da ausência do cabeçalho, sem inventar TLS. Esses checks locais não comprovam login real ou a cadeia de proxies publicada; o aceite deve ser repetido no domínio HTTPS da versão integrada.

## Evidências históricas e limites

Na main, a validação da galeria registrada em 30/09 teve app com 9 arquivos/39 testes, typecheck e exports Web/Android aprovados; API com lint e 27 arquivos/177 testes aprovados, 1 ignorado; Prisma validate/generate e Client 6.19.3. Os testes incluíam limite, ownership, ordem, capa, retry da fila e URLs privadas. O registro separado de Premium/revisão final informou API com 198 aprovados/2 ignorados, app com 57 aprovados e checks/exports aprovados. São execuções anteriores, não resultados da integração PWA.

Na branch PWA, o registro de 28/09 informou app com 12 arquivos/47 testes e typecheck; API com lint e 23 arquivos/170 testes aprovados, 1 ignorado. A matriz da mesma branch informa 24 arquivos/172 testes aprovados, 1 ignorado; a divergência entre resumos é mantida com contexto, sem afirmar uma nova execução que a reconcilie. O export web gerou 821 módulos e passou o smoke de manifesto, ícones, service worker e bundle; Android Hermes gerou 1.067 módulos. O smoke local do proxy ficou pendente naquele registro por ausência de Caddy e daemon Docker acessível. Esses totais não se somam nem aprovam a versão integrada. A evidência histórica está em `docs/15-matriz-validacao-mvp.md`.

No checkout isolado da galeria, a migração de `BookImage` não foi executada em PostgreSQL limpo nem em cópia do banco existente: faltavam URL de banco e Docker disponível. A consulta `API/prisma/book-image-preflight.sql` identifica exceções antes da aplicação. Também faltavam bucket e credenciais R2 naquele ambiente. PUT/HEAD/copy/GET/DELETE reais, lifecycle, CORS e prova física Android/iOS/Web continuam como aceites pendentes; validação em banco descartável do Premium não comprova migração das fotos no banco alvo.

Migração em PostgreSQL limpo, entrega Resend, R2, dois usuários no Socket.IO e dispositivo Android/iOS são evidências separadas. O aceite físico do scanner deve incluir permissão negada e bloqueada, baixa luz, código danificado, offline, `404`, `503` e limite excedido. Se o ambiente não existir, registre como pendente; typecheck, export e mocks não equivalem a teste ponta a ponta.

## Safe area da PWA

Regressões em app/src/__tests__/pwaSafeArea.component.test.tsx verificam os contratos enviados à navegação/SafeAreaView: topo/laterais das abas, altura/padding inferior com insets34/21/0, laterais do Stack sem duplicação em Main/onboarding e preservação dos valores nativos. O inset é fronteira controlada, não prova física de Safari/ilha. O teste de fonte inspeciona a declaração CSS gerada; tamanho calculado foi conferido separadamente no Chrome, pois jsdom mantém incorretamente o shorthand14px do React Native Web.

O smoke web/tests/pwa-build-smoke.mjs exige viewport-fit=cover e zoom acessível no HTML exportado. Repetir no iPhone em Safari e PWA instalada, retrato/paisagem, com foco/fechamento do teclado e barras do navegador visíveis/ocultas. Não somar ou duplicar safe area no body/root, conteúdo e tab bar.

## Foto de perfil — plano 009 (implementação não publicada)

Testes reais de grants: DATABASE_URL e AVATAR_TEST_DATABASE_URL apontam para banco descartável no loopback, já migrado; executar npm test -- tests/avatar.repository.integration.test.js em API/. O teste rejeita host não-loopback e limpa só suas fixtures. Suites/builds locais não aprovam R2 ou aparelhos físicos.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).

A revisão do plano 009 acrescentou testes com componentes/hooks realmente montados (RTL/jsdom), incluindo transições assíncronas, cropper real, clocks, sessão e liberação de seleção atrasada. As dependências são dev; o normalizador e o PostgreSQL têm testes separados. Evidência final: API 258 passaram/7 condicionais pulados e app 141 passaram; aceites físicos/R2 permanecem separados.

## Instalação e fronteira web — plano 012

As suítes `features/pwa/__tests__`, `pwaApp`, `pwaInstall`, `webViewportGate` e `pwaNativeBoundary` verificam captura antecipada, prompt one-shot, corrida de confirmação, fallback iOS, limite 1024/1025, primeiro boot sem sessão e preservação de formulário/upload/modal. O smoke do export executa o bootstrap e o worker real, mantendo o bypass de API/R2 privados.

QA opcional de Chrome/Edge e fixture de portais reais: [instruções web](../web/README.md). Eventos sintéticos não confirmam instalação do navegador. Emulador de viewport/Chrome desktop não confirma notch, PWA Safari, VoiceOver ou seletor de instalação em aparelhos. Comandos, resultados e pendências ficam no [registro 012](../plans/plan-012-acesso-mobile-tablet-instalacao-pwa-execucao.md).

## Cobertura de conversas, troca e remoção de match

Na API, cubra: orientação `mine`/`theirs` e resumo mínimo dos livros; livros legados/removidos; leitura contextual apenas por participante e vínculo exato; `404` indistinguível para ausente/sem acesso; `RESERVED`/`EXCHANGED`; recibo `clientActionId` com replay sem reaplicar ação; conflito de escopo `409`; livros canônicos do par; e remoção que altera curtidas atuais para `PASS`, apaga a conversa/histórico e preserva recibos. Rotas e sockets também cobrem publicação somente pós-commit, saída/evicção de sala, membership revalidado durante escrita e recusa de mensagem após remoção concorrente.

No app, cubra header com avatar/nome, bottom sheet e estados de livro indisponível, rota contextual e deep link com reload, manutenção da rota genérica de livro, cancelamento sem requisição, sucesso `204`, reconciliação incerta/ativa, confirmação HTTP com socket offline, deduplicação do evento, limpeza seletiva de cache, aviso único dispensável e saída da navegação apenas quando a conversa removida estiver no caminho ativo.

As integrações PostgreSQL devem usar exclusivamente `TEST_DATABASE_URL` para banco local descartável `*_test` e `TEST_DATABASE_DISPOSABLE=true`; não usar `DATABASE_URL` nem banco Railway. A execução de 20/10/2026 rodou `npm run test:integration -- tests/matches.migration.integration.test.js tests/matches.integration.test.js` em PostgreSQL 16 local de loopback: 2 arquivos e 12 testes aprovados, cobrindo migração/backfill/FKs e ciclo de match/replay/concorrência.

Após os ajustes finais, a suíte completa do app passou em 17 arquivos e 83 testes; `npm run typecheck`, `npm run build:web` e `npm run test:pwa` também passaram, com 32 recursos fingerprintados no service worker. A API passou em 29 arquivos/232 testes, com 1 ignorado, e no lint; `prisma validate` e `prisma generate` passaram. A integração PostgreSQL 16 local descartável passou em 2 arquivos/12 testes. A inspeção em dispositivo Android/iOS não foi executada nesta validação: não havia dispositivo local e o usuário optou por pular o teste remoto; nenhum aparelho remoto foi alocado. Não registrar teste simulado ou build como aceite físico.

## Gamificação de sequência diária

Os testes unitários da API cobrem conversão de dia em `America/Sao_Paulo`, primeiro check-in, idempotência do mesmo dia, incremento consecutivo, reinício após falta e elegibilidade hoje/ontem. `tests/gamification.repository.test.js` confirma que a data só é consultada depois de adquirir o lock, protegendo a sequência se uma requisição atravessar a meia-noite. As rotas cobrem autenticação, rejeição de data/identidade enviada pelo cliente e projeção que remove e-mail, telefone e datas. A integração `tests/gamification.integration.test.js` cobre migração de contas existentes, check-in simultâneo, incremento/reinício e empate na posição 20 com posição própria fora da lista.

No app, `checkInScheduler.test.ts` cobre sessão restaurada, retorno ao primeiro plano, deduplicação, retry e concorrência; `presentation.test.ts` cobre posições compartilhadas, corte com empates, posição própria fora da lista, estado vazio e projeção de dados públicos. `linking.test.ts` cobre `/ranking/sequencia` e preservação do caminho de Perfil.

O filtro Global/Matches ativos acrescenta testes de rota para `scope` omitido, válido e inválido; testes de repositório e integração PostgreSQL cobrem os dois lados do match, bloqueio bilateral, arquivamento/remoção, empates, posição pessoal e ausência de matches. No app, `leaderboardScope.component.test.tsx` verifica alternância, isolamento de cache, vazio e erro; `leaderboardRelationshipCache.test.ts` e `realtime.test.ts` verificam atualização após mudanças de relacionamento e reconexão.

Na implementação do filtro, passaram 543 testes do app em 106 arquivos, tipagem, exportação Web e smoke test PWA; a API passou em lint e 371 testes unitários, com 33 condicionais ignorados. A integração do ranking passou em 7 testes com PostgreSQL 18 local descartável (`trocalivros_rank_test`, loopback, `TEST_DATABASE_DISPOSABLE=true`). Não foram executados testes de banco no Railway.

Na validação inicial da gamificação, a API e o app passaram respectivamente 32 arquivos/248 testes (1 arquivo/1 teste ignorado) e 19 arquivos/95 testes; `npm run lint`, `npm run typecheck`, export PWA de 835 módulos, export Android Hermes e `npm run test:pwa` passaram. O bundle Android gerado foi de 2,6 MB; isso confirma export, não gera um APK nem substitui teste físico. `prisma validate` e `prisma generate` passaram. Naquele momento, a integração PostgreSQL e a inspeção visual em aparelho físico não haviam sido executadas. A integração posterior está registrada abaixo; nenhum banco Railway/produção foi usado nos testes.

## Validação da integração para publicação — 29/10/2026

Na árvore que integra a branch local com `origin/main`, a API passou em lint e em 55 arquivos/364 testes; 7 arquivos/33 testes condicionais foram ignorados pela suíte unitária. A integração em PostgreSQL 18 local descartável (`trocalivros_deploy_test`, loopback, `TEST_DATABASE_DISPOSABLE=true`) passou em 3 arquivos/18 testes, incluindo concorrência de match e sequência diária. `prisma migrate status` confirmou as 13 migrações aplicadas nesse banco. Nenhum teste de migração foi executado no banco Railway.

O app passou em typecheck e em 103 arquivos/532 testes. `npm run build:web` e `npm run test:pwa` passaram, com 32 recursos fingerprintados no service worker. Esses resultados verificam a árvore local; deploy, migrações no banco alvo, fluxos no domínio público e inspeção em dispositivo permanecem verificações separadas.
