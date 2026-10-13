# Plano 011 — Carregamento de capas e avatares sem piscadas

> **Para execução por agentes:** usar `superpowers:executing-plans` na execução sequencial recomendada, ou `superpowers:subagent-driven-development` se escolhido pelo usuário. A implementação e as evidências estão no [registro de execução](./plan-011-carregamento-imagens-sem-piscadas-execucao.md); caixas originais abaixo descrevem o roteiro, não substituem o status desse registro.

**Estado:** implementação local concluída; integração com o menu em validação na branch `codex/media-profile-integration`. Aceite físico e publicação pendentes. **Data:** 09/10/2026; atualizado em 13/10/2026.

**Objetivo:** eliminar os resets visuais evitáveis no carregamento e na renovação de capas e fotos de perfil, em Expo e PWA, mantendo a foto correta, a privacidade e as interações existentes.

**Arquitetura:** separar identidade do conteúdo, URL de transporte e estado de exibição. Um componente compartilhado manterá a imagem já exibida quando apenas a assinatura mudar, com adapters nativo/web e antecipação limitada dos próximos itens. A API acrescentará a identidade da capa aos resumos de Curtidas, sem migração de banco.

**Stack:** Expo 57.0.22, React Native 0.86.3, React 19.2.3, TypeScript, TanStack Query, Vitest, Express/Zod/Prisma e R2 privado. Propor `expo-image` instalado pelo `npx expo install expo-image`; o SDK57 local indica `~57.0.5`. Não atualizar o SDK ou outras dependências nesta tarefa.

**Especificação:** pedido do usuário, confirmação **“Ambos”** e seções 1–5 deste documento. A implementação depende da revisão/aprovação do desenho e da escolha do método de execução.

## Restrições globais

- Contemplar capas no Descobrir, Curtidas, Biblioteca, estante do Perfil e galeria do livro; avatares no Perfil/modal/formulário, onboarding, Descobrir, Curtidas, detalhes, matches, mensagens e chat.
- Preservar paleta/tokens, tipografia, dimensões dos cards, grade de Curtidas com duas colunas e áreas seguras. Esta tarefa não é um redesign.
- Preservar primeira foto como capa, ordem, até três fotos por livro, edição por gestos, câmera/galeria, pressão longa, feedback háptico e proteção de callout Safari.
- Preservar animações do Descobrir: saída de 240 ms, entrada de 160 ms, snapshot durante a mutação e proteção por `{userId, epoch}`.
- R2 continua privado. Não remover parâmetros de assinatura, acrescentar cache-busters, tornar o bucket público ou mudar TTL/CORS/credenciais para mascarar a piscada.
- Não persistir mídia privada em AsyncStorage, filesystem do app ou CacheStorage/service worker. Cache controlado pelo loader nativo será somente em memória.
- Não usar URL, `dataUpdatedAt`, `Date.now()` ou valor aleatório como key React de uma foto cuja identidade não mudou.
- Troca de livro, foto, proprietário do avatar, versão do avatar ou geração da sessão não pode mostrar a imagem anterior, nem por um frame.
- Não reintroduzir Clerk. Respeitar autenticação própria, ownership, gates Premium e descarte das respostas da sessão anterior.
- Planejamento não autoriza instalação, implementação, commit/push, deploy, migração, seed, operação R2, SSH ou backup.

## Foco da revisão

1. URL assinada expirada, inclusive erro web sem corpo legível: renovar de forma limitada sem apagar uma imagem já decodificada — tarefas 2 e 4.
2. Resposta/imagem da conta A concluída depois de entrar na B, inclusive mesmo usuário com novo epoch: descartar o evento antigo — tarefas 2–4.
3. Troca da foto 1 pela foto 2, novo avatar ou remoção: invalidar a identidade antiga imediatamente, sem reaproveitar a capa errada — tarefas 1–3.
4. Falha transitória de assinatura retornando URL nula e retry da mesma URL: distinguir ausência confirmada de mídia de falha de transporte — tarefas 2–3.
5. Retorno do background, redução de movimento, blur e expiração Premium: não reiniciar animações ou antecipar identidades ocultas — tarefas 3–5.

---

## 1. Contexto e evidências do código

Inspeção somente leitura na branch `codex/profile-settings`, HEAD `8762fa9`, que incorporou a main `bbca847`. Há alterações locais do menu/configurações e arquivos do usuário; preservar todos e não incluí-los por acidente nesta entrega. O checkout do Metro e o SHA publicado da PWA precisam ser conferidos novamente na execução.

| Superfície | Evidência atual | Efeito possível |
| --- | --- | --- |
| Descobrir | `BookPhoto` tem key formada por livro + URL + `query.dataUpdatedAt` | Refetch recria a imagem mesmo sem trocar o conteúdo |
| Galeria/detalhes | Foto e miniatura usam URL + `refreshVersion`; detalhes envia `dataUpdatedAt` | Renovação de assinatura recria todos os slots |
| Curtidas | `LikeCard` usa key URL/título; resumo não informa o ID da capa | URL nova reinicia o componente; livro ID sozinho não detectaria reordenação |
| Biblioteca/estante | `BookCard` renderiza `Image` diretamente com `key={coverUrl}` | Fluxo próprio, sujeito ao mesmo reset |
| Avatares | `Avatar` troca `source.uri` e marca falha por URL/versão, sem ID do usuário | Assinatura nova pode reiniciar carga; não há continuidade explícita |
| Renovação | Hooks já renovam antes da expiração e ao recuperar foco | A renovação é necessária; desligá-la não resolve a causa |

São fatores confirmados no código, não uma medição de todos os frames do aparelho. O plano inclui baseline e aceite físico para verificar quanto cada fator contribui.

### Documentação e instruções consideradas

- [Índice](../docs/README.md) e docs01–15: produto, arquitetura, app, API, contratos, modelos, segurança, chat, design system, ambientes, testes, contribuição e limites de validação; registros recentes de [docs16](../docs/16-historico-de-alteracoes.md).
- [Runbook de segurança](../docs/seguranca-auth-runbook.md), [plano008](./plan-008-fotos-livros-r2.md), plano009 e seu [registro de publicação](./plan-009-foto-perfil-usuario-r2-publicacao.md). Afirmações históricas de R2 público/avatar não publicado não substituem esse registro nem o código atual.
- Skills `systematic-debugging`, `brainstorming`, `writing-plans` e `ui-ux-pro-max`: investigação antes da solução, decisões explícitas, etapas verificáveis e espaços visuais estáveis. A autorrevisão deste plano cabe ao agente principal.
- `.agents/skills/` contém skills de Clerk. Foram consideradas, mas não aplicadas: a autenticação vigente é própria e esta tarefa não muda autenticação. Não houve execução de subagentes nesta investigação.

### Fontes técnicas consultadas

Context7 foi utilizado para Expo Image, preservação de estado no React e URLs assinadas do R2. Como a consulta Expo não assegurava a versão57, a decisão de compatibilidade foi conferida na documentação oficial dessa versão e no `bundledNativeModules.json` local.

- Alterar key recria o componente e seu estado: [React — Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state).
- Expo Image está disponível no Expo Go. Suporta política de memória e transições; `prefetch` recebe URLs, não uma identidade customizada equivalente ao `cacheKey` do source. Não assumir que antecipação por URI preenche outra chave de cache: [Expo Image SDK57](https://docs.expo.dev/versions/v57.0.0/sdk/image/).
- URL assinada é uma credencial temporária; sua assinatura não deve ser alterada. CORS pode impedir a leitura do erro de uma URL vencida: [R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) e [R2 — CORS](https://developers.cloudflare.com/r2/buckets/cors/).

## 2. Identidade e contrato de mídia

Identidade React não é URL de download nem autorização. Toda chave é opaca e restrita ao processo; não registrar URL assinada, chave ou imagem em logs.

- Foto de livro: escopo do viewer + bookId + BookImage.id. Reordenar a capa seleciona outro ID; novo upload cria outro ID.
- Avatar: escopo do viewer + subjectId + avatarVersion. `subjectId` é o dono da foto, não necessariamente o usuário conectado.
- Resumo de Curtidas: acrescentar `coverImageId: string | null` em `book` e `actorBook`; preservar URL/expiração e contratos antigos. `app/src/types/likes.ts` aceita o campo opcional durante a transição.
- Mídia externa/legada sem ID ou versão confiável: incluir a URI completa na identidade opaca, junto do sujeito. Nunca retirar query strings: elas podem selecionar conteúdo diferente. O ID sintético `external-cover` precisa desse tratamento e do bookId.
- Tamanho de preparação: buckets de 128, 256, 512, 1024 ou 1536 pixels, escolhidos pelo tamanho visual × pixel ratio. Bucket é variante do recurso, não a key React do conteúdo; resize deve manter o frame enquanto prepara a resolução adequada.
- `retryToken` só muda por retry explícito. Refetch comum ou renovação não são retry nem troca de conteúdo.

Para manter a antecipação e o renderer alinhados, a primeira entrega usa cache do loader **por URI**, não `cacheKey` customizado. A identidade lógica controla continuidade e troca de conteúdo. URLs novas não devem substituir o source de uma imagem pronta somente porque foram renovadas. Reuso de bitmap entre assinaturas por chave customizada é uma evolução separada, caso as medições indiquem necessidade; não misturar os dois esquemas na primeira entrega.

## 3. Comportamento visual proposto

- Reservar o slot antes de carregar; reutilizar o fallback estático atual de livro/iniciais. Não introduzir shimmer/pulso contínuo.
- Primeira carga: fallback estável até sucesso de decodificação/exibição. Revelar o novo conteúdo em 120 ms; usar 0 ms com redução de movimento ou preferência ainda desconhecida. Esses tempos são uma decisão de UX deste plano.
- Mesmo conteúdo + URL renovada: atualizar o endereço disponível para a próxima tentativa, mantendo o source/frame já exibido. Não remontar, limpar, repetir fade ou disparar novo download apenas por refetch.
- Retry explícito: carregar a URL mais recente mantendo o frame, se houver; só substituir após sucesso. Falha sem frame mantém o fallback e a ação de retry existente.
- Conteúdo realmente diferente: remover o frame antigo imediatamente e preparar o novo. Nunca usar a foto do card anterior como placeholder.
- Avatar com URL nula na mesma versão conhecida: uma foto já carregada pode permanecer durante falha transitória. Remoção confirmada incrementa a versão e limpa imediatamente; versão ausente/desconhecida não autoriza preservar conteúdo de outra identidade.
- Web: manter o nó/frame ativo e preparar outro `HTMLImageElement` com `decode()` ou `load`; trocar após sucesso. Dois consumidores não podem disputar o mesmo nó DOM. Preparação não requer fetch/blob/canvas nem leitura de pixels, preservando capas externas sem CORS de fetch.
- Nativo: `expo-image` com `cachePolicy="memory"`; source ativo retido pelo controlador. `recyclingKey`, se utilizado, deriva da identidade e não da URL; não depender dele no Web. Não assumir que evento `onLoad` e exibição física do frame são idênticos.

Não alterar `key={source.uri}` dos editores de recorte: ali uma nova seleção deve reiniciar o editor. O problema está na apresentação de mídia remota, não no draft de edição.

## 4. Renovação, antecipação e privacidade

- Manter os hooks/timers de renovação existentes, seus buffers, cooldowns e exclusão de requisições simultâneas. Não criar um timer por Avatar/BookPhoto nem aumentar o TTL do R2.
- Ao erro de imagem, pedir renovação pela query proprietária; validar identidade, tentativa e sessão antes de chamar o callback. Erro antigo não pode renovar o usuário/card novo.
- Antecipar somente as capas e avatares dos próximos **dois** livros do Descobrir: até **quatro** recursos, com **duas** preparações simultâneas. Dedupe por identidade + URI vigente. Não antecipar toda a lista/galeria.
- Pular URL vencida ou com menos de **20 s** de validade, tela sem foco e conteúdo não autorizado. Parar a fila em blur, troca de conta/epoch ou unmount; resposta tardia não entra no estado do novo actor.
- Nativo: antecipação `Image.prefetch(url, {cachePolicy: 'memory'})`, mesma URI usada pelo renderer. Web: antecipação com Image/decode; benefício de cache deve ser medido, não presumido como equivalente ao nativo.
- Cancelar filas e soltar referências próprias no fim da sessão. Se limpar cache global nativo, serializar a limpeza antes das cargas da próxima geração; uma limpeza antiga não pode atingir a nova conta. Não inventar abort/release de API que não oferece isso; pedidos já iniciados podem terminar, mas seus resultados serão descartados.
- Limitar metadados de dedupe a **24 entradas** por escopo; não manter um depósito ilimitado de imagens decodificadas no app. Esse limite não é um teto da memória do SO/browser; medir consumo real.
- Cache em memória não é login offline nem autoridade de acesso. Quando o gate Premium expirar, desmontar conteúdo recebido e cancelar sua antecipação; não reutilizar seus descritores para contornar o gate.
- `clearMemoryCache`/`clearDiskCache` não garantem limpeza Web. O cache HTTP do navegador/SO é distinto do cache controlado pelo app; não prometer apagamento seguro total. Auditoria de headers/derivados R2 é outro escopo caso as medições a justifiquem.

Fora desta entrega: thumbnails/novas cópias R2, CDN público, blurhash gerado no servidor, novo schema, mudanças de upload/recorte e upgrades gerais. Imagens originais grandes continuarão custando bytes; medir esse custo antes de propor uma segunda tarefa.

## 5. Critérios de aceite

1. Após uma imagem estar pronta, **20 refetches/renovações** do mesmo conteúdo não causam remontagem nem retorno ao fallback; troca real de conteúdo continua correta.
2. Capa foto1 permanece igual no Descobrir, Curtidas, Biblioteca e detalhes; após reordenar, todos mostram a nova capa, sem frame da antiga identidade.
3. Avatar ampliado/normal permanece estável; novo upload e remoção refletem a versão confirmada, sem quebrar gestos, ações ou safe areas.
4. Falha de rede/assinatura não apaga um frame pronto; retry da mesma URI funciona e não cria loop de renovação.
5. Nenhum resultado de sessão A aparece em B; mídia privada continua fora do worker/cache persistente controlado pelo app.
6. Fila respeita 2 livros/4 recursos/2 simultâneos/24 metadados e para nos limites de foco, sessão e acesso.
7. Testes, typecheck e builds passam; Expo Go iOS/Android e Safari/PWA instalada recebem aceite físico separado. Não declarar piscada resolvida em hardware só por mocks/export.
8. Registrar baseline e resultado com fixtures iguais, cache frio/quente e latência de 50/250/1000 ms: montagens, retornos ao fallback, GETs, bytes, tempo até primeira imagem e memória. Relatar p50/p95 quando houver amostras suficientes; sem prometer aceleração percentual antes de medir.

---

## 6. Mapa de arquivos e interfaces

Novo módulo `app/src/features/media/`: tipos/identidade puros, controlador de exibição e fila de antecipação. Novo `components/RemoteMediaImage/`: adapters de plataforma, sem tokens de livro/perfil. `BookPhoto` e `Avatar` continuam donos de fallback e acessibilidade; telas passam IDs/versões e mantêm as queries de renovação.

Contratos novos em `mediaTypes.ts`:

```ts
type MediaScope = { userId: string; epoch: number };
type MediaDescriptor = { identity: string; url: string | null; expiresAt: string | null };
type MediaRequest = { media: MediaDescriptor; pixelBucket: number };
type MediaDisplayState = { identity: string | null; activeUrl: string | null; pendingUrl: string | null; attempt: number; status: 'empty' | 'loading' | 'ready' | 'error' };
```

Identidade lógica inclui o scope, mas ele nunca é enviado como autorização. DOM fica exclusivamente em `.web.ts(x)`. Não criar uma segunda abstração de sessão ou de upload.

O getter atual retorna `SessionScope = {userId: string | undefined; epoch: number}`. Adaptar para `MediaScope | null` testando userId, sem trocar o contrato de SessionProvider. Quando o sujeito da foto não estiver disponível, renderizar somente o fallback; nunca usar nome, viewerId ou ID fictício para identificar outro usuário.

## 7. Tarefas de execução

Nos blocos **Arquivos** das tarefas2–4, caminhos começando por `features/`, `components/`, `pages/` ou `providers/` são relativos a `app/src/`. Arquivos de testes existentes que constroem diretamente props alteradas devem receber as mesmas novas props; nenhuma mudança de comportamento no teste pode esconder o RED.

### Task 1: Identidade estável e contrato aditivo das capas

**Arquivos:** criar `app/src/features/media/mediaTypes.ts`, `mediaIdentity.ts` e `__tests__/mediaIdentity.test.ts`; alterar `app/src/types/likes.ts`, `API/src/modules/likes/likes.service.js`, `API/tests/likes.service.test.js` e `docs/05-contrato-api.md`. Repositório de likes já seleciona IDs das imagens; só alterar sua seleção/teste se a verificação da árvore de execução demonstrar falta de ID.

**Interfaces produzidas:** `createBookMedia(scope: MediaScope, bookId: string, photo: {id?: string | null; url: string | null; expiresAt?: string | null}): MediaDescriptor | null`; `createAvatarMedia(scope: MediaScope, subjectId: string, avatar: {avatarUrl?: string | null; avatarUrlExpiresAt?: string | null; avatarVersion?: number}): MediaDescriptor | null`; `getMediaPixelBucket(size: number, pixelRatio: number): number`. API produz `coverImageId: string | null` além de URL/expiração nos resumos.

- [ ] Escrever `same_image_new_signature_keeps_identity`, `reordered_cover_changes_identity`, `avatar_subject_version_epoch_isolate_identity` e `legacy_external_cover_is_namespaced`. Usar fixtures sintéticas com igualdade literal:

```ts
expect(createBookMedia(scopeA, 'book1', photo1Sig1)?.identity).toBe(createBookMedia(scopeA, 'book1', photo1Sig2)?.identity);
expect(createBookMedia(scopeA, 'book1', photo1Sig1)?.identity).not.toBe(createBookMedia(scopeA, 'book1', photo2)?.identity);
expect(createAvatarMedia(scopeA, 'u1', avatarV1)?.identity).not.toBe(createAvatarMedia(scopeB, 'u1', avatarV1)?.identity);
expect(getMediaPixelBucket(44, 3)).toBe(256);
```

- [ ] Em `likes.service.test.js`, fixar `expect(result.items[0].book.coverImageId).toBe('image-first')` com imagens fora de ordem; repetir em actorBook/sent e ausência `toBeNull()`. Não vazar storageKey ou alterar foto1.
- [ ] Rodar em `app/`: `npm test -- src/features/media/__tests__/mediaIdentity.test.ts`; em `API/`: `npm test -- tests/likes.service.test.js`. RED deve demonstrar contrato/função ausente, não falha de setup.
- [ ] Implementar somente os builders, o bucket e o DTO aditivo. Registrar compatibilidade com API antiga/campo ausente; não inferir identidade privada pela estrutura do caminho R2.
- [ ] Repetir os comandos, exigir GREEN e `npm run typecheck` no app; API `npm run lint`.
- [ ] Commit de execução com `git add` dos arquivos exatos desta tarefa e mensagem `feat(media): expose stable cover identity`. Não usar `git add .` ou incluir o WIP do menu.

### Task 2: Apresentação contínua com adapters nativo e Web

**Arquivos:** criar `features/media/mediaDisplayState.ts`, `__tests__/mediaDisplayState.test.ts`, `components/RemoteMediaImage/RemoteMediaImage.types.ts`, `index.tsx`, `index.web.tsx` e `features/media/__tests__/remoteMediaImage.component.test.tsx`; alterar `app/package.json` e `app/package-lock.json` apenas pela instalação compatível.

**Consome:** MediaDescriptor/MediaScope da tarefa1 e getter estável de sessão atual. **Produz:** `reduceMediaDisplay(state: MediaDisplayState, event: MediaDisplayEvent): MediaDisplayState`; definir no mesmo módulo a união de eventos `source`, `loaded`, `failed`, `retry` e `reset`, com identidade/tentativa para rejeitar eventos antigos. `RemoteMediaImage` recebe `{media: MediaDescriptor | null; scope: MediaScope; getScope: () => MediaScope | null; pixelBucket: number; retryToken?: number; fit: 'cover' | 'contain'; transitionMs: 0 | 120; style; accessibilityLabel?: string; onReady?: () => void; onError?: () => void}`; tipar style com StyleProp<ImageStyle>.

- [ ] Escrever `signed_url_renewal_keeps_ready_frame`, `new_identity_clears_old_frame`, `same_uri_manual_retry_works`, `late_actor_or_attempt_is_ignored` e `null_same_avatar_version_vs_removal`. Preparações adiadas devem fixar:

```ts
expect(renewedState.activeUrl).toBe('https://fixture.invalid/photo?sig=1');
expect(renewedState.status).toBe('ready');
expect(changedIdentityState.activeUrl).toBeNull();
expect(afterLateLoad).toEqual(stateBeforeLateLoad);
expect(retryState.attempt).toBe(failedState.attempt + 1);
```

- [ ] Escrever componente Web com decode adiado: a imagem ativa permanece no DOM, não volta ao fallback e só a identidade nova remove a anterior; dois consumidores não movem o nó um do outro. Testar 120 ms e 0 ms, falha decode com fallback load e contexto de sessão real em pelo menos uma corrida.
- [ ] Rodar em `app/`: `npm test -- src/features/media/__tests__/mediaDisplayState.test.ts src/features/media/__tests__/remoteMediaImage.component.test.tsx`; observar RED antes do renderer novo.
- [ ] Em `app/`, executar `npx expo install expo-image`; conferir versão selecionada pelo SDK57 e ausência de upgrades alheios no lockfile.
- [ ] Implementar reducer e adapters segundo seção3. Usar `cachePolicy="memory"` explícito no nativo; não passar props DOM no bundle nativo, não substituir uma fonte pronta em cada assinatura e não chamar `loadAsync` presumindo uma política de cache não verificada.
- [ ] Repetir testes/typecheck; fazer export Web e Hermes iOS para verificar resolução `.web`/nativa. GREEN de mocks não substitui aceite físico.
- [ ] Commit apenas dos arquivos desta tarefa: `feat(media): keep decoded images stable during renewal`.

### Task 3: Integrar todas as superfícies e retry sem remontagem

**Arquivos:** alterar `components/BookPhoto/index.tsx`, `components/BookCard/index.tsx`, `components/BookGallery/index.tsx`, `components/Avatar/index.tsx`, `components/AvatarPicker/index.tsx`, `components/ProfileEditForm/index.tsx`, `components/LikeCard/index.tsx`, `components/AvatarPhotoModal/index.tsx`, `components/AvatarPhotoModal/AvatarPhotoModal.types.ts`; telas `pages/Discover/index.tsx`, `pages/Library/index.tsx`, `pages/Likes/index.tsx`, `pages/BookDetails/index.tsx`, `pages/profile/index.tsx`, `pages/OnboardingProfile/index.tsx`, `pages/Matches/index.tsx`, `pages/Messages/index.tsx` e `pages/Chat/index.tsx`. Criar `features/media/__tests__/mediaConsumers.component.test.tsx`; ampliar `features/avatar/__tests__/avatarRenewal.component.test.tsx` e `pages/Discover/__tests__/discoverMotion.component.test.tsx`. Adaptar fixtures diretas em `features/avatar/__tests__/avatarBrowserActions.component.test.tsx`, `avatarBrowserPolicy.test.tsx`, `avatarPhotoModal.component.test.tsx` e `avatarPhotoMotion.component.test.tsx`.

**Consome:** builders da tarefa1 e RemoteMediaImage da tarefa2. **Produz:** Avatar exige `subjectId: string | null`; AvatarPicker/AvatarPhotoModal propagam subjectId; BookPhoto recebe descriptor e retryToken; LikeCard recebe `userId: string`, `bookId: string` e `coverImageId?: string | null`. Biblioteca/Perfil e galeria usam os mesmos builders. BookGallery recebe bookId para namespace das fotos; `refreshVersion` é substituído por retryToken, incrementado pelo botão “Recarregar fotos” junto do refetch existente.

- [ ] Fixar em teste antes da mudança: `expect(imageMountsAfter20Refetches).toBe(imageMountsAfterReady)` e `expect(fallbackReturnsAfterReady).toBe(0)` para Descobrir, galeria e Biblioteca; repetir Avatar com 20 assinaturas na mesma versão.
- [ ] Fixar capa nos consumidores: `expect(likedCardMedia.identity).toBe(discoverCoverMedia.identity)` para mesma sessão/foto1; após reorder, `expect(currentCoverId).toBe('photo2')`, sem render de photo1. Testar dois livros com mesmo título.
- [ ] Cobrir URL nula temporária versus remoção/version++, retry da mesma URI, sujeito diferente com mesmo nome, e modal ampliado com assinatura renovada. Capturar callbacks antigos para comprovar que não renovam a nova identidade.
- [ ] Rodar em `app/`: `npm test -- src/features/media/__tests__/mediaConsumers.component.test.tsx src/features/avatar/__tests__/avatarRenewal.component.test.tsx src/pages/Discover/__tests__/discoverMotion.component.test.tsx`; registrar RED que reproduz remontagens/resets atuais.
- [ ] Integrar props/IDs, remover keys por URL/timestamp e preservar keys legítimas por bookId/photo.id. `BookCard` adota BookPhoto com fit cover; demais capas mantêm contain. Não alterar a key do editor de recorte, dimensões, fallback/copy ou a lógica de mutação/snapshot do Descobrir.
- [ ] Repetir os testes e `npm run typecheck`; executar também as suites de avatar/browser-actions, galeria/bookPresentation e unlikeDiscovery. Confirmar animações anteriores, proteção Safari, foco, acessibilidade e gate Premium.
- [ ] Commit dos componentes/telas/testes desta tarefa: `fix(media): remove image resets across books and profiles`.

### Task 4: Antecipação limitada e renovação segura

**Arquivos:** criar `features/media/mediaPrefetch.ts`, `features/media/warmMediaUrl.ts`, `features/media/warmMediaUrl.web.ts`, `features/media/useDiscoverMediaPrefetch.ts` e `features/media/__tests__/mediaPrefetch.test.ts`; alterar `pages/Discover/index.tsx`, `features/avatar/useAvatarRefresh.ts`, `features/avatar/__tests__/avatarRefresh.test.ts` e, somente para coordenar descarte da geração, `providers/SessionProvider.tsx`. A fachada mediaPrefetch não terá variantes `.native/.web` com exports diferentes; importar o adapter warmMediaUrl pelo nome comum.

**Consome:** MediaRequest, builders e `getSessionScope()`. **Produz:** `prefetchMedia(requests: MediaRequest[], scope: MediaScope, getScope: () => MediaScope | null): () => void` (retorna cancelamento lógico); `warmMediaUrl(url: string): Promise<boolean>` nos adapters; `disposeMediaScope(scope: MediaScope): Promise<void>` coordenado, sem resposta velha alterando geração nova. Hook `useDiscoverMediaPrefetch({books, focused, scope, getScope})` tipado com Book[].

- [ ] Escrever `next_two_books_only`, `two_concurrent_jobs`, `dedupe_and_24_metadata_limit`, `expired_or_near_expiry_is_skipped`, `blur_premium_and_epoch_cancel_queue` e `old_cleanup_does_not_clear_new_generation`. Usar relógio/preparações controlados:

```ts
expect(prefetchRequests).toHaveLength(4);
expect(maxConcurrent).toBe(2);
expect(metadataCount).toBeLessThanOrEqual(24);
expect(startedForUrlWith19SecondsRemaining).toBe(false);
expect(resultsAcceptedAfterEpochChange).toHaveLength(0);
```

- [ ] Testar que a URI preparada é a do renderer, sem cacheKey customizado divergente. Testar erro genérico de URL vencida sem corpo legível: uma renovação por query/inFlight, preservação do frame pronto, cooldown normal de 5 s e backoff de falha de 30 s já presentes no hook.
- [ ] Rodar em `app/`: `npm test -- src/features/media/__tests__/mediaPrefetch.test.ts src/features/avatar/__tests__/avatarRefresh.test.ts`; confirmar RED.
- [ ] Implementar fila/adapters, dedupe limitado, checks antes/depois de await e descarte por scope. Não instalar fetch/blob fallback, não antecipar recebidos após expiração Premium, não criar timers individuais, nem remover os timers de renovação já existentes. Manter regra de URL de livro com buffer20 s e de avatar com buffer/cooldown vigentes.
- [ ] Repetir testes/typecheck e avatarRenewal/session; provar que uma tentativa antiga não aceita sucesso depois de logout e que limpeza de A não limpa carga de B. Chamadas nativas em andamento podem terminar; descarte lógico é obrigatório mesmo sem abort real.
- [ ] Commit somente do módulo, integrações e testes desta tarefa: `perf(media): prefetch a bounded discover window`.

### Task 5: Validação completa, documentação e preparo de entrega

**Arquivos:** criar `plans/plan-011-carregamento-imagens-sem-piscadas-execucao.md`; atualizar somente descrições afetadas de `docs/03-frontend-mobile.md`, `09-design-system-components.md`, `11-qualidade-testes.md` e `15-matriz-validacao-mvp.md`; ampliar `web/tests/pwa-build-smoke.mjs` se necessário para fixar a ausência de cache privado. Não sobrescrever mudanças locais alheias nos mesmos documentos.

**Consome:** entregas1–4. **Produz:** evidências com SHA/checkout, comandos/resultados, baseline/comparação e lista explícita de aceites externos pendentes.

- [ ] Fixar `private_media_is_not_cached_by_worker`: requests R2/API/URLs assinadas não entram em CacheStorage; preservar cache de assets com hash. Se já coberto, executar e reutilizar a evidência em vez de duplicar teste.
- [ ] Registrar baseline e ensaio pós-fix em fixtures sintéticas loopback: 20 renovações, decode/rede adiados, carregamento frio/quente, resize e navegação; zero fallback após ready da mesma identidade e zero foto da identidade anterior. Não usar imagens pessoais ou contas reais para os testes automatizados.
- [ ] Em `API/`: `npm test` e `npm run lint`. Em `app/`: `npm test`, `npm run typecheck`, `npm run build:web` e `npm run test:pwa`. Registrar suites condicionais puladas como puladas, nunca aprovadas.
- [ ] Em `app/`: `npx expo export --platform ios --output-dir .expo/plan011-export-ios` e `npx expo export --platform android --output-dir .expo/plan011-export-android`. Não gerar APK/IPA nem EAS update como efeito implícito.
- [ ] Solicitar revisão independente da alteração inteira, corrigir Important/Critical comprovados com reprodução RED/GREEN e repetir as verificações afetadas. Revisão/testes não autorizam publish.
- [ ] Aceite físico: Expo Go iOS e Android; Safari e PWA instalada, galeria com3 fotos/reorder, Biblioteca/Curtidas, perfil normal/ampliado, gesto/câmera/remoção, reduzir movimento, background e logout/troca de conta. Registrar vídeo/frame, GETs/bytes e memória quando disponíveis. Separar resultado de navegador desktop de Safari real.
- [ ] Commit de docs/evidências revisadas: `docs(media): record image continuity validation`. Usar arquivos exatos e excluir exports/logs/imagens temporárias.

## 8. Integração e publicação posteriores

Método recomendado: **execução sequencial pelo agente principal**, com revisão independente ao final. As tarefas compartilham contratos/estado de mídia; separar implementadores em paralelo aumentaria conflitos sem ganho claro.

Antes de executar, confirmar a base e o isolamento com o usuário: usar branch `codex/` em checkout apropriado; não publicar automaticamente o menu de perfil ainda local nem perder o WIP. Testar o SHA que será efetivamente entregue, não combinar resultados de branches diferentes.

Quando houver autorização específica para integrar/publicar: API com coverImageId primeiro, app/PWA depois; fallback de cliente permite servidor antigo. Nenhuma migração de banco é necessária para esse campo. Conferir SHA/deploy da Railway, atualização do worker e bundle real; para Expo, conferir checkout do Metro e reiniciar somente com autorização da execução. Expo Go inclui Expo Image, mas development build próprio deve ser compatível com o novo módulo.

Rollback: reverter os commits desta tarefa, preservando o DTO aditivo compatível; não remover fotos/objetos R2. Se o aceite frio revelar arquivos muito grandes, planejar derivados/tamanhos de entrega em tarefa separada, com métricas, sem ampliar este plano silenciosamente.

## 9. Autorrevisão do planejamento

- Cobertura: capas e avatares incluídos, telas mapeadas, renovação/erro/retry/remoção/reorder/gates tratados e aceites de hardware separados.
- Contratos: IDs existentes reutilizados; único campo novo de API é coverImageId; assinaturas de builders, renderer e fila consistentes entre tarefas.
- Plataforma/cache: não confundir identidade React com cache URI; memória explícita no nativo, DOM apenas Web, sem prometer limpeza de cache HTTP ou abort não suportado.
- Proporção: corrigir continuidade e antecipação limitada primeiro; sem redesign, migração, thumbnails ou infraestrutura nova.
- Estado original do planejamento: a implementação ainda não havia iniciado em 09/10. Estado atual: tarefas1–4 implementadas, validação automatizada/revisão inicial da tarefa5 realizadas e integração do menu retomada em13/10. Aceites de dispositivos reais e publicação continuam separados; consultar o registro de execução.
