# Plano 009 — Foto de perfil do usuário no R2 com ajuste circular

> **Para execução por agentes:** usar `superpowers:executing-plans` para executar as tarefas em sequência; se houver delegação explicitamente autorizada, `superpowers:subagent-driven-development`. Checkboxes representam trabalho pendente, não funcionalidades implementadas.

**Estado:** planejamento concluído; implementação, migração e publicação pendentes. **Data:** 05/10/2026.

**Objetivo:** selecionar uma foto da galeria, ajustar sua posição/zoom dentro de um círculo como na experiência solicitada do Instagram e salvar o avatar no R2, com leitura coerente em todas as telas.

**Arquitetura:** evoluir o avatar existente com editor próprio, preparação local e adapters nativo/Web. A API registra a autorização, valida e normaliza o recorte, persiste uma chave privada com versão e reutiliza a fila de limpeza; serializers renovam GETs assinados nos consumidores.

**Stack:** Expo 57/React Native 0.86/React 19/TypeScript, ImagePicker e File System existentes, ImageManipulator compatível com o SDK, PanResponder/Animated, react-easy-crop exclusivo Web, TanStack Query; Express 5/Zod/Prisma 6/PostgreSQL 16, AWS SDK v3/R2 e sharp na API.

**Especificação:** [plan-009-foto-perfil-usuario-r2-especificacao.md](./plan-009-foto-perfil-usuario-r2-especificacao.md). Ela contém o fluxo, contratos, geometria, limites, compatibilidade, revisão de toda a documentação e fontes Context7/oficiais.

## Regras globais

- Foto opcional no perfil e no onboarding. Galeria de uma imagem; editor com círculo, pan/zoom e controles equivalentes. Preservar nome/bio não salvos ao atualizar avatar.
- Entrada local: até 24 MiB/40 milhões de pixels, lado mínimo 128 px; fonte orientada até 2048 px. Novo upload PNG 512×512 até 2 MiB; arquivo final JPEG 512×512, qualidade 82/sRGB/fundo branco, sem metadados.
- Usar auth própria e `req.currentUser.id`; nenhuma migração para Clerk. Não inserir DOM nas variantes nativas.
- Bucket privado, grant persistido, PUT em `pending/avatars/`, final em `avatars/`, GET assinado com expiração declarada; não exigir `R2_PUBLIC_URL` para avatares novos.
- Reutilizar contratos/infraestrutura existentes, preservar clientes legados conforme especificação, preservar fotos de livros/GET privado e adaptar apenas o ajuste de assinatura necessário da branch de produção.
- Paleta/tipografia/spacing de `theme.ts`; componente de perfil permanece clean. Fonte do plano é `main` em `6eb3300`, não uma afirmação de deploy dessa versão.
- Não gerar/commitar fotos de usuário, PDFs, exports, executáveis ou arquivos temporários no repositório. Fixtures de teste devem ser mínimas e sintéticas, sem dados pessoais.
- Branch de execução sugerida: `codex/foto-perfil-usuario-r2`; usar checkout isolado e revisar por área. Este planejamento não autoriza migração de produção ou troca de branch Railway automaticamente.

## Revisão de foco

| Risco | Comportamento esperado | Tarefa que valida |
| --- | --- | --- |
| EXIF/espelhamento e mudança de tamanho durante pinch | arquivo final mantém a área/rosto mostrados, sem salto nem buraco no círculo | 3, 4 |
| Timeout após PUT/complete e troca entre contas | confirmar o mesmo grant; nunca aplicar resultado a outra sessão nem reenviar bytes desnecessariamente | 2, 5 |
| Duas confirmações ou remover durante envio | CAS/lock preserva a versão válida e limpeza não exclui a foto atual | 2 |
| URLs assinadas vencidas em listas/chat/login | fallback e refresh deduplicado, sem vazamento de chave nem tempestade de requisições | 6 |
| Upload da foto enquanto nome/bio estão em edição | atualização do avatar não apaga texto, não fecha editor e não conclui onboarding | 5 |

## Arquivos e responsabilidades

| Área | Criar/modificar |
| --- | --- |
| Banco | `API/prisma/schema.prisma`; `API/prisma/migrations/<timestamp>_private_user_avatar/migration.sql`; `API/prisma/avatar-preflight.sql` somente-leitura |
| Contrato de avatar | criar `API/src/modules/media/avatar.schemas.js`, `avatar.repository.js`; modificar `avatar.service.js`, `avatar.controller.js`, `API/src/modules/users/users.routes.js` |
| R2 e processamento | modificar `API/src/modules/media/storage.service.js`, `storageCleanup.service.js`/`storageCleanup.repository.js`; criar `avatarProcessing.service.js`; dependências em `API/package.json`/lockfile |
| DTOs | criar `API/src/modules/media/avatar.serializer.js`; modificar users/auth services/repositories e books/likes/matches/chat serializers/selects existentes; nenhum retorno por spread de campos privados |
| Geometria/processamento local | criar `app/src/features/avatar/avatarCrop.ts`, `prepareAvatarSource.ts`/`.web.ts`, `exportAvatarCrop.ts`/`.web.ts`, `avatarTypes.ts` |
| Editor compartilhado | criar `app/src/components/AvatarEditor/index.tsx`, `styles.ts`, `index.web.tsx`, `styles.web.ts`; modificar `AvatarPicker/index.tsx`/`styles.ts` |
| Upload/estado | criar `app/src/features/avatar/avatarApi.ts`, `avatarUpload.ts`, `useAvatarEditor.ts`; extrair envio binário compartilhado em `app/src/features/media/putPreparedImage.ts` e adaptar `bookPhotoUpload.ts` com regressões |
| Leitura/consumo | criar `avatarRefresh.ts`/`useAvatarRefresh.ts`; modificar `Avatar`, `SessionProvider`, `types/api.ts`, `types/likes.ts`, profile, OnboardingProfile, Discover, Likes, BookDetails, Matches, Messages e hooks/componentes de chat |
| Ambiente e docs | `app/package.json`/lockfile, `app/app.json`, `API/.env.example` se necessário, documentos afetados e matriz/histórico; infraestrutura PWA continua a excluir mídia privada do cache |

## Plano de execução

### Tarefa 1 — Contrato de dados e base R2 compatível

**Arquivos:** schema/migração/preflight, storage service, `API/tests/storage.service.test.js`, novos `API/tests/avatar.repository.integration.test.js`, `API/tests/avatar.contract.test.js`.

**Interfaces produzidas:** `AvatarDescriptor`; grant `AvatarUpload` com estado/versão definidos na especificação; métodos de storage `createPresignedAvatarUpload`, `readObjectLimited(storageKey, maxBytes)`, `putImageBuffer(storageKey, buffer, mimeType)` e GET assinado.

- [ ] Conferir branch/HEAD e diff de `storage.service.js` contra a ref de produção atualizada. Documentar headers efetivamente assinados; portar a omissão de `ContentLength` sem retirar copy/GET/lifecycle de livros ou exigir acesso público.
- [ ] Adicionar testes de presign que verificam endpoint S3, `Content-Type` e ausência de `ContentLength` no comando assinado; upload Web sem header proibido, leitura limitada e regressão do presign de livro.
- [ ] Criar migração aditiva de `avatarStorageKey`, `avatarVersion`, `AvatarUpload`/enum e índices. Preservar `avatarUrl` legado e toda informação existente; preflight lista URLs legadas de User/BookImage e grants/chaves sem alterar dados. Conferir se o bucket possui exposição pública e registrar a dependência de migração antes do aceite privado.
- [ ] Implementar limites/timeout dos novos métodos R2. Fazer HEAD e leitura segundo grant; nenhum URL do cliente vira destino HTTP do servidor.
- [ ] Executar Prisma validate/generate, migração em PostgreSQL limpo e numa cópia descartável com avatares legados. Verificar contagens preservadas e unicidade.
- [ ] Rodar testes de storage/contrato e integração do repositório. Registrar hash e limitações; commit focado `feat(api): adiciona grant e versão de avatar`.

### Tarefa 2 — Confirmar, substituir e remover com segurança

**Arquivos:** `avatar.schemas.js`, `avatar.repository.js`, `avatarProcessing.service.js`, `avatar.service.js`, `avatar.controller.js`, routes/cleanup/auth repository; `API/tests/avatar.service.test.js`, novos `avatar.routes.test.js`, `avatarProcessing.service.test.js`, `avatar.concurrent.integration.test.js`.

**Interfaces consumidas:** grant/storage da tarefa 1. **Produzidas:** `avatarService.presign(userId,input)`, `complete(userId,input) -> Promise<AvatarDescriptor>`, `delete(userId)`; `normalizeAvatar(buffer, grant) -> Promise<{buffer:Buffer; mimeType:'image/jpeg'; width:512; height:512}>`.

- [ ] Escrever regressões de ownership, arquivo real divergente do MIME, bytes/dimensões divergentes, SVG/GIF disfarçado, objeto faltante, limite, corrupção, grant vencido e payload legado. Falhas preservam o avatar atual.
- [ ] Instalar sharp compatível com Node/Docker do projeto e lockfile. Limitar decoder/concorrência/timeout; produzir JPEG 512×512/82/sRGB, compor alpha sobre branco e retirar metadados. Testar foto orientada, PNG transparente e normalização legacy.
- [ ] Implementar schemas separados para avatar v2 e compatibilidade legada, mantendo os endpoints/envelopes e o `204` da remoção. Limites por conta conforme especificação; não reutilizar body de livros como autorização de avatar.
- [ ] Implementar claim `PENDING → PROCESSING` antes de escrever no storage e transação curta de confirmação com lock User/grant e compare-and-set da versão; retry de grant já atual é idempotente. Testar duplicate complete em PROCESSING, processo parado por 60 s e conclusão tardia: não reativar grant expirado nem permitir duas escritas concorrentes no mesmo final. Repetição de foto já substituída retorna conflito sem ressuscitá-la.
- [ ] Cobrir em PostgreSQL duas confirmações, complete concorrendo com delete e resposta perdida após commit. Asserts: uma versão válida, nenhum avatar de outro dono, jobs apenas de objetos sem referência atual.
- [ ] Estender limpeza/sweep de grants e os caminhos existentes de exclusão de conta. Testar falha R2/retry, processo interrompido entre PUT final e commit e guard de referências vivas antes de delete.
- [ ] Rodar API lint/test e os testes PostgreSQL desta tarefa; construir a imagem Docker com sharp. Commit `feat(api): confirma e limpa avatares privados`.

### Tarefa 3 — Geometria, orientação e export local

**Arquivos:** `avatarTypes.ts`, `avatarCrop.ts`, `prepareAvatarSource.ts`/`.web.ts`, `exportAvatarCrop.ts`/`.web.ts`, novos testes em `app/src/features/avatar/__tests__/` e dependências app.

**Interfaces produzidas:** `AvatarSource {uri,width,height,ownedResource:boolean}`; `AvatarTransform {zoom,offsetX,offsetY}`; `AvatarCropRect {originX,originY,width,height}`; `PreparedAvatar {uri,mimeType:'image/png',size,width:512,height:512}`. Funções `getAvatarCropRect(source,viewportDiameter,transform)`, `clampAvatarTransform(...)`, `prepareAvatarSource(asset)`, `exportAvatarCrop(source,rect)` e `releaseAvatarResource(resource)`.

- [ ] Adicionar testes matemáticos com fonte horizontal/vertical/quadrada, extremos do pan, zoom 1/3, pinch ancorado, transição de quantidade de dedos, tamanho novo do viewport e densidades de tela diferentes. Assert crop quadrado dentro da fonte e centro/área esperados.
- [ ] Executar o teste novo para confirmar a falha; implementar a geometria da especificação e repetir até passar.
- [ ] Instalar `expo-image-manipulator` via `npx expo install`; registrar versão real compatível com Expo 57. Implementar orientação/dimensões, limites e fonte até 2048; converter HEIC somente quando decodificável e rejeitar os demais com instrução clara. Adapters `.web` importam somente tipos/helpers puros, nunca o próprio basename que Metro resolveria de volta à variante Web.
- [ ] Exportar PNG 512×512 usando o mesmo retângulo no nativo e Canvas na Web. Validar tamanho final real, recursos próprios e cleanup; nunca apagar o URI original da galeria.
- [ ] Testar imagem corrompida, tamanho ausente recuperável via File/Blob, dimensões zero, HEIC indisponível, PNG alpha e liberação apenas dos recursos temporários próprios.
- [ ] Rodar recorte Vitest e typecheck. Commit `feat(app): prepara e recorta avatar localmente`.

### Tarefa 4 — Editor circular e alternativas acessíveis

**Arquivos:** `AvatarEditor/index.tsx`, `styles.ts`, `index.web.tsx`, `styles.web.ts`; testes de comportamento do editor/contrato de export em `app/src/features/avatar/__tests__/avatarEditor.test.ts`.

**Interfaces consumidas:** fontes/retângulos da tarefa 3. **Produzida:** `AvatarEditor({source,busy,error,onSave(rect),onCancel,onChooseAnother})`, apenas conteúdo; o host controla apresentação/modal.

- [ ] Implementar editor nativo com PanResponder/Animated, círculo fixo, imagem pan/zoom limitada e exterior escurecido. Usar a geometria comum para as duas representações da foto; não renderizar um estado React a cada frame sem necessidade.
- [ ] Implementar variante Web com react-easy-crop, dimensões estáveis e conversão de `croppedAreaPixels` para `AvatarCropRect`. Isolar import DOM/CSS para não entrar no Metro nativo.
- [ ] Criar controles de zoom, centralização e movimento com labels/valores; garantir teclado/foco/Escape na Web e leitor de tela no nativo. Usar tokens existentes e safe areas.
- [ ] Testar que mover/zoom via botões produz a mesma área dos gestos e que Save envia o retângulo atual uma única vez; incluir gestos interrompidos e resize.
- [ ] Fazer aceite visual com foto sintética orientada e marcadores no centro/bordas: comparar círculo antes de salvar com PNG exportado e JPEG retornado pelo backend. Incluir fonte ampliada, 320/375 px, tablet/Web e redução de movimento.
- [ ] Rodar typecheck e exports Web/Android; verificar ausência da biblioteca DOM no bundle nativo. Commit `feat(app): adiciona editor circular de avatar`.

### Tarefa 5 — Upload, retry e integração no perfil/onboarding

**Arquivos:** `avatarApi.ts`, `avatarUpload.ts`, `useAvatarEditor.ts`, `putPreparedImage.ts`, AvatarPicker, profile, OnboardingProfile, app.json e regressões `avatarUpload.test.ts`, `avatarFlow.test.ts`, `bookPhotoUpload.test.ts`.

**Interfaces consumidas:** API das tarefas 1/2 e crop das tarefas 3/4. **Produzidas:** `useAvatarEditor` com ações `choose`, `save`, `retry`, `cancel`, `remove` e estado tipado `idle/selecting/preparing/editing/exporting/uploading/confirming/error`; `uploadAvatar(draft, grant?) -> Promise<AvatarDescriptor>`; `AvatarPicker({name,avatar,busy,onChoose,onRemove})`.

- [ ] Extrair envio binário que usa File.upload no nativo e Blob/fetch na Web. Não reutilizar a antiga conversão de URI nativa por fetch; manter regressões do upload/capa/ordem de livros passando.
- [ ] Implementar grant e etapas do rascunho: presign após export; PUT uma vez; complete por ID; se resposta de confirmação se perder, retry do mesmo ID. Reemitir grant vencido sem perder crop.
- [ ] Testar 403/SignatureDoesNotMatch sanitizado, offline em cada etapa, timeout pós-commit, sessão encerrada/trocada e cancelamento. Não logar URL assinada nem aplicar resultado a outro userId.
- [ ] Tornar AvatarPicker componente de entrada/estado e hospedar AvatarEditor no modal existente do perfil. No onboarding usar um único modal; PhotoPicker Web deve abrir diretamente no clique antes de awaits.
- [ ] Garantir que foto tem persistência independente de nome/bio; impedir refetch de `['me']` de reinicializar formulário dirty. Callback recebe descritor completo, atualiza estado/sessão e mantém formulário aberto.
- [ ] Integrar confirmação de remoção, estados negado/limitado/bloqueado da galeria e permissões em português. Adicionar plugin de image-picker sem habilitar microfone desnecessário nem bloquear a câmera ISBN existente; reconstruir binário se configuração nativa mudar.
- [ ] Testar foto no onboarding sem concluir a etapa; continuar/pular bloqueados só enquanto mutação estiver em andamento. Liberar recursos no sucesso/cancelamento/logout/unmount, preservando retries enquanto o editor continua aberto.
- [ ] Rodar testes relevantes e typecheck; registrar UX manual. Commit `feat(app): integra avatar com perfil e onboarding`.

### Tarefa 6 — Serialização privada e renovação em todas as telas

**Arquivos:** `avatar.serializer.js`; serviços/repositories de users, auth, books, likes, matches, chat; tipos app, Avatar, avatarRefresh/useAvatarRefresh, SessionProvider e consumidores; testes API/app de DTO e expiração.

**Interfaces produzidas:** `serializeAvatar(user, responseCache?) -> Promise<AvatarDescriptor>`; resumos públicos com allowlist; helper `getAvatarRefreshDelay(descriptors, now)` combinado com expiração de fotos de livros; hook de refetch ligado à consulta dona do dado.

- [ ] Escrever testes de todos os DTOs: avatarUrl/expiração/versão, legado, ausente, usuário repetido, assinatura temporariamente indisponível. Assert nenhuma chave/grant/hash/CPF/celular privado aparece no resumo de terceiros.
- [ ] Ajustar selects internos e serialização assíncrona de auth/me, users/me, books/discover, likes, matches e chat, incluindo mensagem emitida por Socket.IO. Não alterar eventos nem membership/entitlement.
- [ ] Adicionar expiração/versão aos tipos de User/resumos/Curtidas. Atualizar Avatar/fallback para URL/versão novas e invalidar as consultas exatas listadas na especificação; localizar a query de mensagens no hook atual antes de alterá-la.
- [ ] Programar renovação pela consulta ativa, combinando menor expiração de fotos/avatares e retorno ao foco/foreground. Deduplicar URL vencida/onError e aplicar backoff quando API falhar.
- [ ] Testar relógio avançado, vários avatares do mesmo usuário, retorno do segundo plano, remoção e resposta antiga com versão menor. Assert requisições limitadas e descritor mais novo preservado.
- [ ] Confirmar que service worker/cache PWA não guarda URL/imagem privada. Rodar recortes API/app e regressões de auth, livros, Curtidas/Premium e chat. Commit `feat: renova avatares privados em todos os consumidores`.

### Tarefa 7 — R2 real, publicação e documentação

**Arquivos:** docs/01–07, 08–11, 13–16 e README conforme impacto; plano/checklist; exemplos de ambiente apenas com nomes e valores não secretos.

- [ ] Executar a validação de docs/11 na branch final: API lint/test, Prisma validate/generate, app test/typecheck, Expo Doctor e exports Web/Android; smoke PWA/proxy sem repetir suites depois de aprovadas se não houver mudança nova.
- [ ] Em banco e bucket de teste identificados, exercer PNG PUT, HEAD, download limitado, JPEG final, GET assinado, expiração, substituição, remoção e limpeza. Conferir CORS da origem Web e lifecycle `pending/avatars/`.
- [ ] Testar Android/iPhone físicos e Safari/PWA instalada: galeria limitada/negada, foto iCloud/HEIC, fonte ampliada, pan/pinch, controles, rede instável, reabertura e edição sem perder nome/bio. Validar avatar de uma segunda conta em feed/Curtidas/chat.
- [ ] Registrar preflight/backup da migração e ensaio de restore. Tratar URLs públicas legadas de User/BookImage explicitamente; não fechar domínio/bucket público antes da auditoria. Se o bucket for público, cumprir a sequência API compatível → referências migradas/testadas → exposição pública desativada → novo cliente, conforme especificação. Assinatura GET sozinha não aprova privacidade.
- [ ] Conferir refs/serviços Railway atuais e preparar deploy API antes do cliente. Aplicar migração aditiva com procedimento aprovado, esperar a janela de presigns antigos e validar `/me/avatar/*` real antes de liberar app/PWA. Publicação é etapa de execução, não foi feita no planejamento.
- [ ] Atualizar documentação com contratos e evidências reais; pendências externas ficam pendentes. Registrar rollback que mantém a migração aditiva e o serializer capaz de ler avatars privados; código legado puro que exige R2_PUBLIC_URL não é rollback suficiente.
- [ ] Revisar diff e commits, garantindo exclusão de uploads pessoais e artefatos gerados. Publicar a branch aprovada pelo fluxo vigente; aceite final depende das provas reais acima.

## Comandos de referência para a execução

```text
API/: npm run lint
API/: npm test -- tests/avatar.service.test.js tests/avatar.routes.test.js tests/avatarProcessing.service.test.js tests/storage.service.test.js
API/: npx prisma validate
API/: npx prisma generate
API/: npm test                      # uma vez na branch final
app/: npx expo install expo-image-manipulator
app/: npm test -- src/features/avatar/__tests__
app/: npm run typecheck
app/: npx expo-doctor
app/: npm run build:web
app/: npm run test:pwa
app/: npx expo export --platform android --output-dir .expo/validation-avatar
```

Integração PostgreSQL deve usar a fixture/flag dedicada dos testes novos, banco descartável e sem seed de produção. Adicionar o comando exato ao README do teste ao implementá-lo. Validar o Docker da API após adicionar sharp e registrar as versões resolvidas, sem instalar dependências durante este planejamento.

## Definition of Done

- [ ] Critérios 1–7 da especificação cumpridos.
- [ ] Migração, ownership, CAS, retry e fila de limpeza validados em PostgreSQL.
- [ ] R2 privado real aceita o arquivo processado; leitura, expiração e remoção funcionam.
- [ ] Prévia circular e imagem final coincidem em iOS/Android/PWA, com alternativas acessíveis.
- [ ] Foto atual e campos do perfil são preservados em falha/cancelamento; todos os consumidores exibem o descritor correto.
- [ ] Documentação distingue entrega, testes locais e aceites externos; fotos de usuário/artefatos ausentes do commit.

## Handoff

Implementação de código das tarefas 1–6 em branch isolada, com evidências locais em [execução](./plan-009-foto-perfil-usuario-r2-execucao.md). A revisão independente e o fix pass local estão concluídos; os aceites externos da tarefa 7 ainda não autorizam publicação. Os checkboxes que envolvem R2 privado, Docker ou aparelhos físicos permanecem pendentes; a migração de produção e a troca das branches Railway não foram executadas.
