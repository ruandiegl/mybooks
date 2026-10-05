# Plano 009 — Foto de perfil do usuário no R2: especificação

**Estado:** planejado, sem implementação ou deploy. **Data:** 05/10/2026. **Base inspecionada:** `main`, commit `6eb3300`.

**Solicitação:** escolher a foto da galeria, visualizar o enquadramento circular, arrastar e ampliar para ajustar o rosto/conteúdo e salvar o avatar no Cloudflare R2. A referência de interação é a foto de perfil do Instagram, preservando a identidade visual do TrocaLivros.

**Plano de execução:** [plan-009-foto-perfil-usuario-r2.md](./plan-009-foto-perfil-usuario-r2.md).

## 1. Base documental e código atual

Todos os documentos atuais de `docs/` foram considerados. As evidências antigas de deploy e teste não são aceite desta funcionalidade.

| Documentos | Decisão aplicada |
| --- | --- |
| [README](../docs/README.md), [01](../docs/01-visao-geral.md), [02](../docs/02-arquitetura.md) | mesma conta entre app e PWA; API controla identidade; cliente não recebe credenciais R2 |
| [03](../docs/03-frontend-mobile.md), [09](../docs/09-design-system-components.md) | preservar perfil clean, componentes React Native, variantes web, paleta e Be Vietnam Pro |
| [04](../docs/04-backend-api.md), [05](../docs/05-contrato-api.md) | evoluir as rotas existentes de avatar; controllers/services/repositories; envelopes e erros sanitizados |
| [06](../docs/06-banco-de-dados.md), [07](../docs/07-autenticacao-seguranca.md), [runbook](../docs/seguranca-auth-runbook.md) | migração aditiva, ownership, arquivo validado e exclusão de objetos do usuário |
| [08](../docs/08-tempo-real-chat.md) | atualizar DTOs de remetentes e conversas, preservando autenticação, membership e eventos existentes |
| [10](../docs/10-docker-ambientes.md) | bucket privado, CORS limitado, lifecycle temporário, dependências compatíveis com Docker |
| [11](../docs/11-qualidade-testes.md), [12](../docs/12-contribuicao.md) | testes de risco, revisão por área, commits focados e compatibilidade com clientes existentes |
| [13](../docs/13-pendencias-conhecidas.md), [14](../docs/14-execucao-do-mvp.md), [15](../docs/15-matriz-validacao-mvp.md), [16](../docs/16-historico-de-alteracoes.md) | conferir estado do ambiente antes de publicar; diferenciar mocks/builds de banco, R2 e aparelhos reais |

O plano 008 estabeleceu armazenamento privado e limpeza persistente para livros, deixando avatares como evolução separada. O plano 003 é histórico visual; a composição vigente é a de `docs/09`, sem banner ou cartões de identidade sobrepostos.

### Achados confirmados

- `AvatarPicker` já está em `profile` e `OnboardingProfile`. Usa `allowsEditing: true`, recorte quadrado do sistema, `fetch(uri).blob()` em todas as plataformas e envia imediatamente após escolher.
- Existem `POST /me/avatar/presign`, `POST /me/avatar/complete` e `DELETE /me/avatar`. O avatar legado usa `avatars/<user>/<uuid>.<ext>`, HEAD e `R2_PUBLIC_URL`; `User` persiste apenas `avatarUrl`.
- A remoção do objeto anterior é best-effort, sem fila, sem controle de concorrência e sem grant persistido que vincule autorização/tamanho à confirmação.
- `storage.service.js` da main ainda inclui `ContentLength` no comando de presign; a ref local `origin/codex/railway-mvp-api` o omite. Essa ref também não contém o fluxo privado completo da main. Portar o ajuste relevante exige preservar PUT temporário, GET assinado, livros e limpeza.
- Avatares aparecem em perfil, onboarding, donos de livros, Curtidas, matches, conversas e remetentes de mensagens. Vários DTOs retornam diretamente uma relação do repositório; adicionar campos privados ao select sem serialização explícita vazaria a chave R2.
- O editor do perfil já é um `Modal`. O recorte deve ocupar seu conteúdo, preservando o formulário, para evitar empilhar outro modal nativo no iOS.
- A sincronização atual do formulário do perfil acompanha qualquer refetch de `['me']`; salvar foto não pode sobrescrever nome/bio ainda em edição.

## 2. Escopo e decisões

Inclui adicionar, substituir e remover uma foto opcional no próprio perfil e no onboarding, com recorte circular ajustável em Android, iOS e PWA. A foto permanece opcional e não conclui o onboarding por si só.

O editor replica o comportamento de enquadramento solicitado: círculo fixo, foto móvel, zoom com pinça, prévia e confirmação. Não há evidência pública consultada sobre o processamento interno do Instagram; resolução, compressão e storage abaixo são decisões do TrocaLivros. A página de ajuda da Meta tentou ser consultada, mas não ficou acessível nesta pesquisa.

Não entram câmera para selfie, filtros, stories, remoção de fundo, reconhecimento facial, banner de perfil, upload de documentos, rebranding ou mudança na autenticação. Depois de salvo, ajustar novamente começa escolhendo uma foto da galeria; o original completo não será guardado para edição futura.

### Alternativas consideradas

| Opção | Avaliação |
| --- | --- |
| Recorte do `expo-image-picker` | menos código, porém edição varia por plataforma e não fornece a experiência circular comum na Web/iOS |
| Editor próprio nativo + editor DOM na Web | **recomendado**: mesma experiência e contrato de recorte, com processamento local e adapters por plataforma |
| Biblioteca de crop nativa externa | avaliar somente se a solução escolhida falhar em aparelho; introduz compatibilidade nativa/build adicional sem necessidade demonstrada |

## 3. Experiência de uso

1. No próprio perfil, tocar no avatar ou em “Alterar foto” abre a galeria. No editor e no onboarding, usar o mesmo `AvatarPicker`.
2. Selecionar uma imagem; cancelamento mantém a foto atual. O picker seleciona só imagens, com `allowsEditing: false`, `allowsMultipleSelection: false`, `quality: 1`, sem Base64/EXIF solicitados.
3. Preparar a imagem e abrir “Ajustar foto”. Mostrar um círculo central fixo, a área externa escurecida e a instrução “Arraste a foto e use dois dedos para ajustar”.
4. Arrastar move a imagem; pinça amplia/reduz mantendo o ponto sob os dedos. Na Web, permitir mouse, toque, roda sobre a área de recorte e teclado. O círculo sempre fica preenchido.
5. Exibir “Diminuir”, “Ampliar”, “Centralizar” e controles de mover em quatro direções como alternativas acessíveis. “Outra foto” reabre a galeria; cancelar essa escolha conserva o recorte em edição.
6. “Salvar foto” exporta exatamente a área mostrada, exibe a prévia processada e inicia o upload. Indicar “Preparando foto…”, “Enviando foto…” e “Confirmando foto…”. Durante o envio, bloquear novas mutações da foto e navegação que destrua o rascunho.
7. Após confirmação da API, atualizar a foto imediatamente no próprio perfil e caches ativos. O upload é independente do botão que salva nome/bio; os campos não salvos continuam intactos.
8. Falha mantém o avatar anterior e o rascunho local. Oferecer “Tentar novamente”, “Voltar ao ajuste” e “Cancelar”. Se o PUT já foi confirmado, repetir apenas `complete`.
9. “Remover foto” exige confirmação e volta às iniciais após a API confirmar a operação.

### Apresentação e acessibilidade

- Usar `theme.colors.background`, `surface`, `overlay`, `outline`, `foreground` e `primary`; ação principal magenta e família Be Vietnam Pro. Sem copiar a marca/cores do Instagram.
- Diâmetro do círculo adaptado ao espaço disponível, com teto de 320 pt; header/rodapé respeitam safe area. Em fonte ampliada/telas pequenas, controles podem rolar fora da região do gesto.
- Na edição do perfil, alternar formulário e `AvatarEditor` dentro do **mesmo** modal. No onboarding, apresentar o editor em um único modal. Não desmontar o estado dos campos do perfil.
- Alvos mínimos 44 pt iOS e 48 dp Android; labels, estados disabled/busy, foco restaurado ao gatilho e Escape/voltar que cancela o ajuste antes de fechar o editor do perfil.
- Nenhuma operação depende somente de arraste/pinça. VoiceOver/TalkBack podem mover, centralizar e alterar zoom por controles. Redução de movimento remove animações decorativas.

## 4. Recorte e processamento

### Política proposta

| Etapa | Regra |
| --- | --- |
| Entrada local | JPEG/PNG/WebP e HEIC/HEIF quando o decoder da plataforma conseguir abrir; até 24 MiB, 40 milhões de pixels e lado mínimo de 128 px |
| Preparação | orientar corretamente a imagem, ler dimensões reais e produzir fonte de edição com lado maior até 2048 px, sem ampliar o original |
| Editor | proporção 1:1, zoom relativo entre 1 e 3, centro inicial, posição limitada para não deixar vazios |
| Arquivo enviado pelo novo cliente | PNG estático 512×512, até 2 MiB; tamanho lido do arquivo/Blob final |
| Arquivo final no R2 | JPEG estático 512×512, qualidade 82, sRGB, transparência composta sobre branco e metadados descartados |
| Exibição | círculo no componente `Avatar`; o arquivo armazenado é quadrado |

PNG no transporte preserva o enquadramento/alpha até a composição final; a prévia usa fundo branco para coincidir com o JPEG final. Fotos pequenas são permitidas a partir de 128 px, com aviso de possível perda de nitidez. GIF, vídeo, SVG, arquivo vazio ou corrompido são rejeitados. HEIC sem suporte recebe orientação de escolher/exportar JPEG, preservando o avatar atual.

`expo-image-manipulator` faz preparação/export no nativo. Usar sua API contextual, não a API depreciada, e instalar a versão compatível com o Expo 57 existente. O manifesto local do Expo inspecionado aponta `~57.0.17`, enquanto a página SDK 57 consultada recomenda `~57.0.20`; `npx expo install` e o lockfile devem registrar a resolução real sem atualizar todo o SDK nesta tarefa.

Na Web, usar `react-easy-crop` somente na variante `.web`, com `aspect=1`, `cropShape='round'`, `restrictPosition=true` e `showGrid=false`. Canvas/decoder local orienta, recorta e exporta o PNG; liberar `ImageBitmap`, canvases e object URLs. O recorte nativo usa `PanResponder`/`Animated`, já disponíveis, sem introduzir outro módulo nativo de gestos.

### Geometria comum

Para fonte já orientada `W×H`, círculo com diâmetro `D`, zoom `z` e translação relativa ao centro `(tx, ty)`:

- escala base `s0 = max(D/W, D/H)` e escala final `s = s0*z`;
- limites `|tx| <= (W*s-D)/2` e `|ty| <= (H*s-D)/2`;
- lado recortado na fonte `L = D/s`;
- origem `x = (W*s-D)/(2*s) - tx/s` e `y = (H*s-D)/(2*s) - ty/s`.

Arredondar e limitar o retângulo final inteiro à fonte antes de exportar. Não multiplicar coordenadas da fonte pelo pixel ratio da tela. Pinça mantém o ponto da imagem sob o centro dos dedos; mudança entre um e dois dedos reinicia a referência do gesto sem salto. Alterar tamanho do editor preserva o recorte por frações da fonte. No nativo, imagem externa escurecida e janela circular usam a mesma transformação; nenhuma máscara entra no arquivo exportado.

## 5. Dados, API e protocolo R2

### Migração aditiva

- `User.avatarStorageKey String? @unique`: chave permanente para avatares privados novos.
- `User.avatarVersion Int @default(0)`: incrementado na troca/remoção efetiva; impede confirmação antiga de substituir uma escolha já persistida.
- Preservar `User.avatarUrl` como URL legada. Não gravar novas URLs assinadas nesse campo.
- Criar `AvatarUpload`: `id` UUID, `userId` FK, `storageKey` único, `mimeType`, `size`, `protocolVersion`, `expectedAvatarVersion`, `expiresAt`, `status` (`PENDING`, `PROCESSING`, `COMMITTED`, `CANCELED`, `EXPIRED`), `processingStartedAt` e `resultVersion` nullable, `createdAt`, `updatedAt`; índices de usuário/status e expiração. Chave final deriva do ID, não de entrada livre.
- Reutilizar `StorageCleanupJob`; novos tipos de objeto não precisam de outra fila.

### Rotas existentes, sem duplicar endpoints

| Operação | Contrato proposto |
| --- | --- |
| `POST /api/v1/me/avatar/presign` | novo cliente envia `{ mimeType: 'image/png', size, width: 512, height: 512, protocolVersion: 2 }`; API grava grant ligado à sessão e responde `201` com `{ imageId, uploadUrl, storageKey, headers, expiresIn, expiresAt, protocolVersion: 2 }` |
| PUT direto no R2 | bytes exatos do PNG em `pending/avatars/<user>/<imageId>.png`; usar os headers autorizados, sem bearer/cookie da API |
| `POST /api/v1/me/avatar/complete` | novo cliente envia `{ imageId }`; API recupera os valores autorizados, valida objeto e persiste; resposta `200` com `AvatarDescriptor` |
| `DELETE /api/v1/me/avatar` | mantém `204`; remove referência, invalida grants pendentes e enfileira chaves controladas pelo servidor na transação |
| DTOs que mostram usuário | preservar `avatarUrl`; acrescentar `avatarUrlExpiresAt: string|null` e `avatarVersion: number` |

`AvatarDescriptor = { avatarUrl: string|null; avatarUrlExpiresAt: string|null; avatarVersion: number }`. A ausência de avatar retorna URL/expiração `null`. Um URL externo legado pode ter expiração `null`.

PUT usa o endpoint S3 do R2 e validade configurada (300 s padrão), sem assinar `ContentLength`; tamanho autorizado fica no grant e é comparado no HEAD. O cliente mede o arquivo final, mantém `Content-Type` idêntico e não altera a URL assinada. No nativo usa envio binário por URI de arquivo; na Web, Blob e nenhum header manual `Content-Length`. A configuração de checksum do AWS SDK deve ser exercitada com a versão instalada/R2, sem transportar a implementação pública antiga por inteiro.

### Confirmação e consistência

1. Localizar grant pelo ID **e** usuário autenticado, checar status/expiração e limites antes de tocar no storage. Fazer claim atômico `PENDING → PROCESSING`, registrando `processingStartedAt`; somente esse processador pode escrever a chave final. Outra confirmação enquanto processa recebe `409 AVATAR_UPLOAD_IN_PROGRESS` e retry com backoff. Um grant nunca permite duas normalizações/escritas simultâneas.
2. HEAD compara MIME e bytes com o grant, não com novos valores enviados pelo cliente. Ler objeto com teto de bytes e timeout.
3. `sharp` verifica formato decodificado, dimensões 512×512 e uma única imagem no protocolo 2. Rejeitar payload com formato real diferente, SVG/GIF, corrupção ou excesso de pixels; normalizar para o JPEG definido acima. HEAD sozinho não prova conteúdo de imagem.
4. Gravar JPEG sob chave nova e imutável `avatars/<user>/<imageId>.jpg`. Final e pending têm tipos próprios; não usar CopyObject para preservar um PNG como se fosse JPEG.
5. Em transação curta com lock de User e grant, revalidar `PROCESSING`, prazo de processamento e versão, atualizar `avatarStorageKey`, limpar URL legada substituída, incrementar versão e marcar grant `COMMITTED`. Registrar limpeza do objeto anterior e do temporário na mesma transação. Não manter a transação aberta durante o download/processamento/R2.
6. Se processamento/DB/CAS falhar, preservar avatar anterior, encerrar o grant como `EXPIRED` ou `CANCELED` e agendar exclusão da chave final não vinculada. Depois de um erro terminal, retry usa grant novo e o mesmo recorte local. Claim parado por mais de 60 s expira; não recolocar esse grant em `PENDING`, para impedir um processador atrasado de sobrescrever o objeto de outra tentativa. O processador antigo não pode confirmar após expiração; o sweep reconcilia pending/final sem depender apenas do processo HTTP que caiu.
7. Retry de `complete` para o grant já confirmado e ainda atual retorna o mesmo resultado, sem nova gravação. Se já houver avatar mais recente, responder `409 AVATAR_UPLOAD_SUPERSEDED`, sem ressuscitar a foto anterior. Duas edições em dispositivos diferentes usam primeiro commit válido; a outra recarrega e pode iniciar nova escolha.

`DELETE` cancela grants pendentes sob o mesmo lock. Repetir remoção sem foto nem grant ativo é idempotente. Antes de excluir um objeto, a limpeza verifica referências vivas em User/BookImage; um retry antigo não pode excluir a foto atual.

Lifecycle de 1 dia em `pending/avatars/`; sweep limitado reaproveita o worker a cada 60 s, enfileira objetos de grants vencidos não vinculados e remove grants terminais após 24 h. Limpeza antiga mantém backoff existente. Exclusão de conta deve enfileirar avatar final/grants antes de remover a User; adaptar caminhos existentes sem inventar endpoint de exclusão que ainda não exista.

### Compatibilidade

O backend novo continua aceitando o corpo legado `{mimeType,size}` no presign e `{imageId,storageKey,mimeType,size}` no complete para **grants emitidos por ele**. Nesse modo transitório, aceitar JPEG/PNG/WebP até 8 MiB e normalizar no servidor por recorte central 1:1. Campos de chave/MIME/tamanho recebidos no complete devem coincidir com o grant; não autorizam outro objeto.

Para o protocolo 2, PNG, dimensões e teto de 2 MiB são obrigatórios. O cliente novo exige `protocolVersion:2` no presign; API antiga não deve causar downgrade silencioso. Publicar API antes do app/PWA. Autorizações antigas sem registro têm janela curta e recebem orientação de refazer a escolha após o deploy.

Avatares legados continuam visíveis sem migração destrutiva. Backfill só converte URL do domínio R2 controlado, path exato do dono e objeto cuja existência seja confirmada. Não buscar URLs arbitrárias nem deduzir ownership só pela presença de `/avatars/` no texto. O fluxo novo não depende de `R2_PUBLIC_URL`.

**Pré-condição de publicação:** verificar o estado real do bucket. Assinar GET não torna privado um bucket com `r2.dev`/domínio público habilitado. A opção deste plano é reutilizar um bucket efetivamente privado. Se hoje ele for público, publicar primeiro a API compatível com chaves/GET privado, auditar e migrar referências legadas do próprio bucket em User e BookImage sem apagar dados, verificar as leituras e só então desativar a exposição pública e liberar o cliente novo. Referências a fotos compartilhadas de teste precisam de decisão/cópia controlada, nunca exclusão automática do objeto fonte. Uma migração de mídia maior que este escopo deve ser concluída como dependência de infraestrutura antes do aceite do avatar.

### Erros e proteção

Manter os envelopes existentes e `401` de sessão. Usar `422 IMAGE_TYPE_INVALID`, `IMAGE_SIZE_INVALID`, `IMAGE_UPLOAD_MISMATCH`, `AVATAR_CROP_INVALID`; `403 AVATAR_KEY_FORBIDDEN`; `409 AVATAR_UPLOAD_SUPERSEDED`/`AVATAR_UPLOAD_IN_PROGRESS`; `410 AVATAR_UPLOAD_EXPIRED`; `503 STORAGE_NOT_CONFIGURED`/`AVATAR_PROCESSING_BUSY`; `429 RATE_LIMITED`. Erros R2 são sanitizados e não incluem URL assinada, XML completo ou credenciais.

Limite inicial de presign: 10 por 60 s por conta; complete: 20 por 60 s por conta; manter limite geral/IP. Normalização admite no máximo duas operações simultâneas por processo, com timeout e input limitado; excesso retorna erro recuperável. O store compartilhado para rate limits em múltiplas réplicas continua dependência de infraestrutura registrada em docs/13.

## 6. Leitura privada e atualização dos consumidores

- Assinar GET de avatares novos no servidor, usando o prazo já configurado `R2_GET_URL_EXPIRES_IN` (300 s padrão). Nunca persistir assinatura nem expor `avatarStorageKey`/grant no DTO público.
- Criar serializer de avatar compartilhado e allowlists para perfil próprio e resumo público. Aplicar a auth/login/verify/refresh/me, users/me, books/discover/owner, likes/actor/owner, matches/otherUser e chat/conversations/messages/sender, incluindo eventos Socket.IO.
- Um cache **por resposta** pode reutilizar assinatura de usuários repetidos. Falha transitória de assinatura fornece avatar `null` com fallback e retry da consulta; não deve derrubar login ou remover a chave persistida.
- Após troca/remoção, atualizar descritor e `SessionProvider`, invalidar `['me']`, `['books']`, `['book']`, `['likes']`, `['matches']`, `['conversations']` e consultas de mensagens definidas no hook de chat. Recarregar apenas consultas ativas e preservar rascunhos de texto.
- As consultas visíveis renovam antes da menor expiração de fotos/avatares, com margem de 30 s, e ao voltar ao primeiro plano/foco. URL já vencida dispara uma renovação deduplicada e depois backoff; evitar timers a cada milissegundo e uma requisição por Avatar.
- `Avatar` mantém iniciais em imagem ausente/com falha, reinicia a tentativa quando URL/versão mudam e solicita no máximo uma renovação por falha da mesma URL. Fotos R2 ficam fora do service worker e de qualquer cache persistente do aplicativo.
- A atualização em outra conta ocorre no próximo refresh da consulta; não adicionar broadcast global de perfil. APIs e caches continuam respeitando Premium e membership de chat.

## 7. Aceite e exclusões

1. Galeria, círculo, arraste, pinça e alternativas por botão funcionam em Android, iOS e PWA; o enquadramento salvo coincide com o mostrado, inclusive EXIF/orientação e imagem muito vertical/horizontal.
2. O original completo fica local e efêmero; R2 recebe apenas o recorte autorizado e guarda a versão final normalizada. Nenhuma credencial ou chave privada chega ao cliente.
3. Falha/cancelamento não troca a foto atual nem apaga campos de nome/bio. Retry pós-PUT confirma o mesmo grant, sem duplicação.
4. Ownership, concorrência, remoção/retry, limpeza e URLs expiradas são testados; o avatar correto aparece em todos os consumidores, após reabrir a sessão e em outro dispositivo.
5. Remover/substituir registra limpeza persistente; abandonados expiram. Dados legados são preservados durante migração.
6. Não há regressão em fotos/capas/ordem de livros, autenticação, Premium, Curtidas, chat, scanner ou navegação.
7. Testes reais de PostgreSQL/R2 e aparelho são evidências separadas. Typecheck/build/mocks não aprovam crop físico, CORS ou storage real.

## 8. Fontes e ferramentas consultadas

Context7 utilizado com `/expo/expo`, `/websites/developers_cloudflare_r2` e `/valentinh/react-easy-crop`, em três consultas sobre crop, protocolo R2 e editor circular. O índice do Expo encontrado no Context7 não ofereceu versão 57 específica; os detalhes foram conferidos na documentação SDK 57 e nos tipos instalados.

- [Expo SDK 57 — ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/): edição nativa e opções variam; picker Web requer ação direta do usuário; selecionar sem editor do sistema para abrir o nosso.
- [Expo SDK 57 — ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/): crop/resize, API contextual e export local. As operações recebem coordenadas da imagem, não do display.
- [React Native — PanResponder](https://reactnative.dev/docs/panresponder): responder a gestos nativos; a matemática de pinça/limites pertence ao componente do projeto.
- [react-easy-crop — documentação](https://github.com/valentinh/react-easy-crop): máscara round, proporção, zoom, restrição de posição e `croppedAreaPixels`; manter área com dimensões estáveis durante o modal.
- [Cloudflare R2 — presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) e [AWS SDK JS](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js/): endpoint S3, validade curta e headers consistentes na assinatura/envio.
- [Cloudflare R2 — CORS](https://developers.cloudflare.com/r2/buckets/cors/) e [lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/): regras para navegador e expiração por prefixo; CORS não substitui autorização.
- [sharp — instalação](https://sharp.pixelplumbing.com/install/): conferir suporte da dependência no Node/Docker usados pela API antes de publicar normalização.
- Skill `ui-ux-pro-max`, em `.agents/skills` do ambiente: busca `dragging movements crop`, resultado “Dragging Movements”; fundamenta alternativas de gesto por botões e teclado. As skills da `.agents/` do repositório são de Clerk, sem aplicação ao runtime atual.

As dimensões, limites, grant, CAS e política de privacidade são propostas de arquitetura do TrocaLivros, não parâmetros atribuídos ao Instagram.
