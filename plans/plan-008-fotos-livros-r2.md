# Plano 008 — Até três fotos por livro no Cloudflare R2

> **Para execução:** usar `superpowers:executing-plans` tarefa por tarefa. Este documento é planejamento; nenhum código de produto foi alterado nesta etapa.

**Objetivo:** permitir que a pessoa selecione, envie, reordene e remova até três fotos próprias de cada livro; a foto na posição 0 é sempre a capa, e os arquivos ficam no R2.

**Arquitetura:** o app mantém uma lista ordenada de fotos em rascunho. A API, autenticada pela sessão própria, autoriza cada PUT curto para o R2, confirma o objeto por HEAD e mantém a ordem e a capa no PostgreSQL. O banco é a autoridade de ordem, limite e ownership. A leitura das imagens de um bucket privado usa URLs GET pré-assinadas com expiração explícita nas respostas; o app renova os dados quando necessário.

**Stack:** Expo 57, React Native 0.86, TypeScript, `expo-image-picker`, TanStack Query, Express 5, Zod, Prisma 6, PostgreSQL 16, Cloudflare R2 via AWS SDK JavaScript v3.

**Referências do projeto:** [documentação](../docs/README.md), especialmente [arquitetura](../docs/02-arquitetura.md), [mobile](../docs/03-frontend-mobile.md), [API](../docs/04-backend-api.md), [contrato](../docs/05-contrato-api.md), [banco](../docs/06-banco-de-dados.md), [segurança](../docs/07-autenticacao-seguranca.md), [design system](../docs/09-design-system-components.md), [ambientes](../docs/10-docker-ambientes.md) e [testes](../docs/11-qualidade-testes.md). O fluxo anterior de capa está em `app/src/pages/BookCreate/index.tsx` e `API/src/modules/media/`.

## Regras globais

- Aceitar 0 a 3 fotos por livro para preservar livros existentes sem imagem. Quando houver fotos, a de `sortOrder = 0` é a capa. O usuário pode trocar a capa movendo outra foto para a primeira posição.
- Aceitar apenas JPEG, PNG ou WebP, até 8 MiB **por arquivo**, conforme a regra atual; rejeitar tipos, tamanho ausente, arquivo vazio e quantidade acima do limite no app e na API. HEIC deve ser convertido para um tipo aceito antes do upload ou recusado com mensagem clara.
- Nunca enviar credenciais R2, `userId` nem uma URL arbitrária no payload do app. Ownership vem de `req.currentUser.id`; a API gera chaves sob `books/<owner>/<book>/<uuid>.<ext>` e valida a chave/objeto antes de vincular.
- Manter o envelope `{ data }` / `{ error: { code, message, requestId, fields? } }`, com rate limit, logs sanitizados e tratamento de `503 STORAGE_NOT_CONFIGURED`.
- Preservar a capa externa de ISBN como fallback somente enquanto não houver foto própria; a consulta de ISBN não salva imagem automaticamente.
- Usar `theme.ts`, Be Vietnam Pro, componentes nativos e acessibilidade. Implementar em `BookCreate`, `BookEdit`, `BookDetails` e consumidores de capa; não alterar scanner, autenticação ou Premium.
- Como `docs/` pede bucket privado, não tratar `R2_PUBLIC_URL` como URL de leitura de fotos novas. URLs GET pré-assinadas vencem e precisam de renovação no cliente. A revisão de avatares, que ainda usam `R2_PUBLIC_URL`, é uma pendência de infraestrutura separada.

## Estado atual confirmado

- `BookImage` já existe com `id`, `url`, `storageKey`, `mimeType`, `size`, `isCover`, `bookId` e `createdAt`, mas não possui ordem nem limite no banco.
- `POST /books/:bookId/images/presign`, `POST /complete` e `DELETE /:imageId` já existem. O app só seleciona uma imagem em `BookCreate`, sempre como capa; `BookEdit` não edita fotos.
- `books.serializer.js` escolhe `isCover` e depois o primeiro registro por data. `likes.repository.js` também usa a primeira imagem por data; por isso apenas alterar a tela deixaria capas diferentes em Biblioteca, Descobrir e Curtidas.
- `storage.service.js` já assina PUT, faz HEAD e exclui objetos. Hoje exige `R2_PUBLIC_URL`, monta `url` permanente e assina `ContentType`/`ContentLength`. Há conflito com a exigência documental de bucket privado.
- A seleção usa `expo-image-picker ~57.0.17`. A opção atual `allowsEditing: true` é de imagem única e não combina com seleção múltipla.
- As habilidades em `.agents/` são específicas de Clerk. O runtime usa autenticação nativa própria; aplicar uma habilidade Clerk introduziria premissas incorretas. Para esta tarefa, as normas do projeto e as referências oficiais obtidas via Context7 são as guias pertinentes.

## Contrato proposto

1. `POST /api/v1/books/:bookId/images/presign` mantém `{ mimeType, size }` e retorna `{ imageId, uploadUrl, storageKey, headers, expiresIn }`. Para novos uploads, `storageKey` é temporária sob `pending/books/<owner>/<book>/<imageId>.<ext>`; a URL expira em 300 s por padrão.
2. `POST /api/v1/books/:bookId/images/complete` mantém `{ imageId, storageKey, mimeType, size }`; `isCover` legado pode ser aceito e ignorado. A API valida HEAD, confirma e insere a imagem na última posição livre. Retorna a imagem com `id`, `url`, `sortOrder`, `isCover` e `expiresAt` para URL privada. Para o primeiro upload, `sortOrder = 0` e `isCover = true`.
3. **Novo** `PUT /api/v1/books/:bookId/images/order` recebe `{ imageIds: [id1, id2, id3] }` com a lista **completa** de imagens atuais, já na ordem desejada. Retorna o livro serializado com `images` em ordem e `coverUrl = images[0].url`. Rejeita ID duplicado, omitido, de outro livro ou lista com mais de três (`422`/`403` conforme o caso).
4. `DELETE /api/v1/books/:bookId/images/:imageId` continua `204`. Após remover, a API renumera posições de 0 a N-1 e promove a nova primeira foto a capa. Se a última for removida, `coverUrl` volta a `coverExternalUrl` ou `null`.
5. `GET /books`, `/books/:id`, `/discover` e respostas de Curtidas conservam `coverUrl` para compatibilidade. `Book.images` passa a incluir `sortOrder` e `expiresAt`; `coverUrlExpiresAt` permite renovar a lista antes de usar uma URL assinada vencida. URLs externas da seed podem ter expiração `null`.

**Erros definidos:** `IMAGE_LIMIT_REACHED` (409), `IMAGE_ORDER_INVALID` (422), `IMAGE_NOT_FOUND` (404), `BOOK_NOT_FOUND` (404), `IMAGE_TYPE_INVALID` (422), `IMAGE_SIZE_INVALID` (422), `IMAGE_UPLOAD_MISMATCH` (422), `STORAGE_NOT_CONFIGURED` (503). O cliente mostra retry por foto, preserva o rascunho e não duplica upload confirmado.

## Dados, concorrência e R2

- Criar `BookImage.sortOrder Int` com `@@unique([bookId, sortOrder])`, índice por livro/ordem e manter `isCover` durante a transição. Um índice parcial SQL para `isCover = true` garante no máximo uma capa por livro. A aplicação garante que uma imagem na posição 0 tenha `isCover = true`; mais adiante, `isCover` poderá ser removido em plano próprio. Tornar `BookImage.url` nullable para uploads privados novos; linhas legadas sem `storageKey` mantêm sua URL externa.
- Antes da migração, auditar `BookImage` por livro. Se houver mais de três imagens ou capas conflitantes, gerar relatório e resolver os registros explicitamente, sem excluir dados automaticamente. Fazer backfill determinístico por `isCover DESC, createdAt ASC, id ASC`; depois impor unicidade e `NOT NULL`.
- `complete`, reordenação e exclusão adquirem lock transacional da linha `Book` (`SELECT ... FOR UPDATE`) após validar owner. A contagem e a gravação ocorrem sob o mesmo lock, impedindo duas confirmações simultâneas de criar a quarta foto.
- Reordenação com índice único usa duas fases na mesma transação: posições provisórias fora de 0–2 e posições finais 0–2; em seguida atualiza `isCover` e retorna a lista ordenada. Retry com a mesma lista é idempotente.
- Para bucket privado, a API assina GET no endpoint S3 do R2, devolve a expiração e nunca persiste a URL assinada no banco. `BookImage.storageKey` identifica o objeto; `url` de linhas legadas sem `storageKey` permanece como fallback. Não reutilizar URL assinada vencida no cache do app.
- Os novos PUTs vão para `pending/books/...`; `complete` verifica MIME e bytes por HEAD, copia para `books/...`, registra a chave definitiva no banco e remove o temporário. Regra de lifecycle de 1 dia para o prefixo `pending/books/` limpa uploads abandonados. A cópia e limpeza precisam de teste real no R2, pois DB e storage não compartilham transação.
- Para exclusão, criar `StorageCleanupJob` com `storageKey` único, `attempts`, `nextAttemptAt` e timestamps; inserir a intenção na transação que remove o vínculo, remover o objeto após commit e repetir falhas de R2 até sucesso. O mesmo mecanismo cobre exclusão do livro e da conta. Se uma cópia final ocorrer antes de uma falha no banco, tentar remoção imediata e incluir reconciliação periódica de objetos finais sem `BookImage` para não depender apenas do processo HTTP.
- A CORS do bucket permite `PUT` com `Content-Type` e `GET` somente para as origens Web aprovadas; o GET assinado usa o endpoint S3. Em Android/iOS, testar acesso real à URL assinada. Credencial R2 com escopo mínimo no bucket, HTTPS e lifecycle são itens de deploy.

## Arquivos e responsabilidades

| Área | Arquivos previstos | Responsabilidade |
| --- | --- | --- |
| Banco | `API/prisma/schema.prisma`, nova pasta em `API/prisma/migrations/` | ordem, URL nullable, índices, backfill e `StorageCleanupJob` |
| Storage | `API/src/modules/media/storage.service.js`, `API/src/config/env.js` | PUT/GET assinados, HEAD, cópia, exclusão R2 e configuração de leitura privada |
| Imagens | `API/src/modules/media/media.schemas.js`, `media.routes.js`, `media.controller.js`, `media.service.js`, `media.repository.js` | limite, ownership, confirmação, ordem, exclusão e consistência |
| Livros | `API/src/modules/books/books.repository.js`, `books.serializer.js`, `books.service.js` | carregar ordem e serializar capa; limpeza ao apagar livro |
| Curtidas | `API/src/modules/likes/likes.repository.js`, `likes.service.js` | usar capa na posição 0 e URL de leitura válida |
| App: estado | `app/src/features/books/bookPhotos.ts`, `bookPhotoUpload.ts`; `app/src/types/api.ts` | lista de rascunho, validação, PUT/complete e tipagem |
| App: UI | `app/src/components/BookPhotoPicker/`, `app/src/pages/BookCreate/`, `BookEdit/`, `BookDetails/` | selecionar, pré-visualizar, reordenar, remover, enviar e exibir galeria |
| App: consumo | `app/src/pages/Discover/`, `Likes/`, `Library/`, `app/src/components/BookCard/` | capa coerente e refresh de URL expirada |
| Ambiente/docs | `API/.env.example`, `docs/02` a `07`, `09` a `11`, `13`, `14` a `16` | contrato, R2 privado, CORS, migração e evidências reais |

## Revisão de foco

- Duas confirmações simultâneas quando já existem duas fotos: exatamente uma entra; a outra recebe `409`, sem quarta linha nem objeto final órfão.
- Exclusão da capa ou reordenação: todos os endpoints e telas, inclusive Curtidas, usam a nova primeira foto.
- URL GET vencida com app aberto ou retorno do segundo plano: recarregar dados e imagens sem pedir novo login nem mostrar capa quebrada.
- Upload interrompido após PUT, antes de `complete`: `pending/` expira sem virar foto; retry não cria duplicata.
- Falha na exclusão R2 após commit: livro e galeria permanecem coerentes no banco, e a limpeza é repetida até concluir.

## Plano de execução

### Task 1 — Tarefa: ordem e limite no banco

**Arquivos:** `API/prisma/schema.prisma`, migração versionada e testes de integração Prisma em `API/tests/`.

- [ ] Testar migração com livros sem imagem, com uma capa, três imagens, ordem de `createdAt` empatada e registro legado sem `storageKey`.
- [ ] Auditar dados reais quanto a livros com mais de três fotos ou mais de uma capa; parar antes de migrar se houver exceções, preservando todos os arquivos.
- [ ] Adicionar `sortOrder`, backfill determinístico, `NOT NULL`, unicidade por livro/posição, índice parcial para uma capa, `url` nullable e `StorageCleanupJob`.
- [ ] Rodar `npx prisma validate`, `npx prisma generate`, migração em PostgreSQL limpo e cópia descartável do banco existente; confirmar que nenhuma foto foi apagada.

### Task 2 — Tarefa: API de upload, reordenação e exclusão

**Arquivos:** `API/src/modules/media/*`, `API/src/modules/books/books.service.js`, `API/tests/media*.test.js`.

- [ ] Escrever testes de serviço/HTTP para 0, 1, 2, 3 e 4 fotos, ownership, MIME/tamanho, chave forjada, HEAD divergente, retry e concorrência.
- [ ] Implementar `complete` sob lock e posição final; adicionar `PUT /images/order` com lista exata e operação transacional; renumerar após exclusão.
- [ ] Separar prefixo temporário e chave definitiva, com cópia validada, cleanup de falhas e compatibilidade transitória com presigns já emitidos.
- [ ] Adicionar fila persistente de limpeza e executor com retry limitado por rodada para exclusão de imagem/livro/conta; testar falha e recuperação, além da reconciliação de cópia final órfã.
- [ ] Rodar testes da API, lint e testes de integração com PostgreSQL.

### Task 3 — Tarefa: leitura privada e capa consistente

**Arquivos:** `API/src/modules/media/storage.service.js`, `API/src/modules/books/books.repository.js`, `books.serializer.js`, `books.service.js`, `API/src/modules/likes/likes.repository.js`, `likes.service.js`, testes correspondentes.

- [ ] Testar que primeira foto define capa em livro, descoberta e Curtidas; sem fotos, usar capa externa; sem ambas, `null`.
- [ ] Gerar URL GET assinada e `expiresAt` para imagens com `storageKey`; não persistir assinatura. Preservar URLs legadas externas sem expiração.
- [ ] Ordenar todas as consultas de `BookImage` por `sortOrder ASC, id ASC` e ajustar serialização assíncrona onde necessário.
- [ ] Validar resposta de lista, detalhe, likes recebidos/enviados e `actorBook`; rodar regressões de likes e livros.

### Task 4 — Tarefa: seleção e edição de fotos no app

**Arquivos:** `app/src/features/books/bookPhotos.ts`, `bookPhotoUpload.ts`, `app/src/components/BookPhotoPicker/index.tsx` e `styles.ts`, `app/src/pages/BookCreate/`, `BookEdit/`, `BookDetails/`, `app/src/types/api.ts`.

- [ ] Testar função pura de inserir/remover/mover fotos, limite três, capa primeira, cancelamento do picker, MIME/tamanho inválido e reconciliação após upload parcial.
- [ ] Criar componente compartilhado com até três miniaturas numeradas, marcador “Capa” na primeira, botões acessíveis de mover para esquerda/direita, remover e adicionar; usar `theme.ts` e alvos de toque adequados.
- [ ] Usar `expo-image-picker` com seleção múltipla até o número de vagas, sem `allowsEditing`; não confiar na ordem da galeria. Validar cada asset. Permitir adicionar uma foto por vez quando a plataforma não oferecer seleção múltipla.
- [ ] Em `BookCreate`, manter fotos locais antes de publicar, criar livro, enviar em sequência, confirmar e salvar ordem. Se uma foto falhar, manter livro e fotos já confirmadas, informar o problema e oferecer retry em `BookEdit`.
- [ ] Em `BookEdit`, carregar imagens do servidor; permitir adicionar até três, reordenar, trocar capa e remover com confirmação. Bloquear ações concorrentes enquanto salva e invalidar `['book', id]`, `['books']`, descoberta e curtidas afetadas.
- [ ] Em `BookDetails`, apresentar galeria na ordem e estado vazio; em Biblioteca/Descobrir/Curtidas usar a capa e renovar respostas quando URL assinada expirar.
- [ ] Rodar `npm test`, `npm run typecheck`, export Web/Android e revisão visual em telas pequenas, fonte ampliada, offline e upload com retry.

### Task 5 — Tarefa: configurar ambiente e validar R2 real

**Arquivos:** `API/.env.example`, `docs/10-docker-ambientes.md`, `docs/13-pendencias-conhecidas.md`, documentação de operação da limpeza.

- [ ] Provisionar ou confirmar bucket privado e credenciais de escopo mínimo, sem registrar valores reais no plano, nos testes ou no Git.
- [ ] Configurar CORS para a origem Web publicada, `PUT`/`GET` e `Content-Type`; lifecycle de 1 dia para `pending/books/`; validar PUT, HEAD, cópia, GET assinado e DELETE em ambiente de teste.
- [ ] Testar em Android/iOS físicos e PWA: três fotos, reordenação, troca de capa, exclusão, URL expirada, conexão lenta, arquivo inválido e duas sessões do mesmo livro. Registrar evidência externa, sem equiparar mock a R2 real.
- [ ] Atualizar contrato, arquitetura, design, qualidade, histórico e matriz de validação com o que foi efetivamente entregue. Executar checklist de `docs/11-qualidade-testes.md`.

## Critérios de aceite

1. Livro novo e existente aceita no máximo três fotos próprias; capa é sempre a foto 1 e pode ser trocada pela reordenação.
2. A ordem persiste após fechar/abrir app, em outra sessão e nos endpoints que exibem livro/capa.
3. Nenhuma conta consegue enviar, reordenar ou excluir fotos de livro alheio. A API impede a quarta foto mesmo sob concorrência.
4. Fotos novas ficam no R2 privado; PUT é curto e autorizado, confirmação verifica o objeto, GET assinado expira e o app o renova.
5. Falhas de rede ou R2 mostram um caminho de retry sem perder dados do livro; uploads abandonados e exclusões pendentes são limpos.
6. Android, iOS e PWA têm fluxo acessível; o scanner ISBN e o fallback de capa externa continuam funcionando.

## Fontes externas consultadas via Context7

- [Cloudflare R2 — presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/): PUT/GET assinados no endpoint S3; não funcionam em domínio customizado.
- [Cloudflare R2 — CORS](https://developers.cloudflare.com/r2/buckets/cors/): regras de origem, métodos e headers para browser.
- [Cloudflare R2 — upload de objetos](https://developers.cloudflare.com/r2/objects/upload-objects/): upload direto com credenciais mantidas no servidor.
- [Cloudflare R2 — lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/): expiração por prefixo e limpeza de objetos temporários.
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/): seleção múltipla e incompatibilidade com recorte simultâneo.
- [AWS SDK JS v3 — presigner](https://github.com/aws/aws-sdk-js-v3/blob/main/packages/s3-request-presigner/README.md): assinatura de operações S3.

## Handoff

Implementar na ordem acima, em branch `codex/fotos-livros-r2`, com commits por tarefa e revisão de migração antes de produção. Antes do deploy, confirmar o estado real do bucket e o inventário de `BookImage` no banco alvo. Se houver mais de três imagens legadas por livro, definir a seleção a preservar e migrar sem perda silenciosa.
