# 6. Banco de dados

## Preferências (plano010, migração ainda não publicada)

`UserPreferences` usa `userId` como PK/FK com cascade, `showLikesBadge` boolean defaulttrue e `updatedAt`. Migração aditiva `20261008140000_user_preferences`, sem regravar contas existentes. GET sem linha retorna default; PATCH faz upsert. Preferência pública de tema fica por dispositivo, fora do PostgreSQL e das chaves de autenticação.

`API/prisma/schema.prisma` é a fonte de verdade; PostgreSQL 16 e Prisma 6 são o caminho de acesso.

## Identidade

- `User`: e-mail único, hash bcrypt, verificação, expiração de cadastro pendente, CPF com HMAC único + AES-256-GCM, celular, perfil e timestamps de onboarding;
- `AuthSession`: hash do refresh, família de rotação, expiração, revogação, substituição e metadados protegidos;
- `AuthCode`: hash de código de verificação/reset, tipo, TTL, uso único, tentativas e cooldown.

Livros, imagens, interações, matches, conversas e mensagens mantêm ownership e índices do domínio. IDs são UUIDs e timestamps são ISO 8601 nas respostas.

`BookImage` guarda `sortOrder` não nulo, único por livro; a posição 0 é a capa (`isCover = true`) e um índice parcial permite apenas uma capa. `url` é nullable para imagens privadas novas; `storageKey` é a referência permanente do objeto R2. URLs assinadas nunca são persistidas. `StorageCleanupJob` registra chave única, tentativas, próximo horário, erro sanitizado e timestamps para repetir exclusões de storage.

A migração `20260930120000_book_image_order_cleanup` primeiro aborta se houver livro com mais de três fotos ou mais de uma capa, depois faz backfill estável por `isCover DESC, createdAt ASC, id ASC` e promove a primeira foto como capa. Antes de produção, execute a consulta somente-leitura `API/prisma/book-image-preflight.sql` sobre um backup/alvo e resolva cada exceção explicitamente; a migração não exclui fotos. A migração não foi aplicada ao banco Railway durante esta execução.

## Moderação básica — plano 014 (implementação local)

`20261029140000_user_moderation` cria `UserReport` (par único denunciante/denunciado, motivo, descrição privada, timestamp) e `UserBlock` (par único bloqueador/bloqueado, timestamp). Índices reversos dão suporte à contagem de reputação e ao filtro de relações. Exclusão de conta remove as linhas associadas em cascata. Contas existentes não recebem registros fictícios: reputação derivada começa em 5,0. Cada denúncia distinta reduz 0,5 e cada bloqueio ativo recebido reduz 0,25; piso 1,0. Desbloqueio remove a linha e devolve a parcela da nota. Não há coluna de nota persistida nem banimento automático.

## Sequência diária

A migração `20261026120000_daily_active_streak` acrescenta `User.lastActiveDay DATE NULL` e `User.currentActiveStreak INTEGER NULL`, com índice para a consulta temporal do ranking. Os valores legados ficam nulos porque não existe histórico confiável para backfill; o primeiro check-in registrado inicia em 1. A solução armazena somente a última data ativa e a sequência atual, sem tabela de eventos ou recorde histórico. Esses campos não fazem parte dos seletores de usuário público/autenticação.

O check-in usa transação `ReadCommitted` e `SELECT ... FOR UPDATE` na linha de `User`: requisições simultâneas aguardam a primeira atualização, relêem o estado já confirmado e calculam o dia de São Paulo depois do lock, evitando gravar uma data antiga após uma espera que atravessou a meia-noite. A consulta do ranking usa snapshot `RepeatableRead`, filtra datas hoje/ontem no fuso da aplicação e calcula posição a partir da sequência positiva.

## Livros da troca e recibos de interação

A migração `20261020120000_match_exchange_books_and_interaction_receipts` adiciona `Match.bookAId` e `Match.bookBId` como relações opcionais com `Book`, ambas com `ON DELETE SET NULL`. Para novos matches, A/B seguem a ordem canônica dos IDs dos donos. Matches antigos permanecem sem livros associados: a migração não tenta deduzir a troca a partir de curtidas históricas. Se um dos livros for apagado, o outro vínculo é preservado.

`InteractionActionReceipt` mantém o `clientActionId` como chave global única, além de ator, livro-alvo, ação e data original. A migração faz backfill usando os valores já registrados em `Interaction`. O recibo não possui relação com `Match`: portanto, continua após a remoção do match e impede que um identificador antigo reproduza uma curtida. A exclusão do usuário ou do livro-alvo apaga os recibos correspondentes por cascata.

Cada ação inédita aceita grava ou atualiza seu registro de interação e cria um recibo durável em transação serializável; um replay válido consulta o recibo e retorna a interação atual sem reprocessar a ação. Somente quando há curtidas recíprocas válidas entre os dois donos a transação cria ou reutiliza um match e sua conversa. Remover um match também é serializável: as curtidas atuais do par passam a `PASS`, o match é excluído e as relações em cascata apagam conversa, membros e histórico de mensagens. Um match futuro entre o mesmo par depende de novas curtidas com novos `clientActionId`; recibos anteriores não reativam a relação.

## Migração nativa

`20260911120000_native_auth_onboarding` adiciona credenciais e sessões sem apagar registros. Contas legadas permanecem inativas e sem senha inventada; precisam passar por um procedimento explícito de recuperação/migração. `clerkUserId` fica nullable temporariamente para auditoria e futura remoção.

`20260911143000_pending_registration_retry` adiciona `pendingRegistrationExpiresAt`. Uma nova tentativa com o mesmo e-mail de um cadastro ainda não verificado reutiliza o mesmo `User` imediatamente, substitui senha/CPF/celular/código e reenvia a confirmação, desde que o novo CPF não esteja vinculado a outra conta. Cadastros pendentes expirados são removidos junto com seus códigos antes de uma nova tentativa.

Antes de produção: gerar backup testado, aplicar `prisma migrate deploy`, conferir contagens/relações, validar contas legadas e ensaiar restore. Nunca altere banco compartilhado manualmente.

## Premium gratuito de demonstração

A migração `20260924193100_premium_trial_and_daily_like_usage` adiciona a `User` os timestamps `premiumTrialStartedAt` e `premiumTrialEndsAt`, preservados após expiração, `premiumOfferPromptedAt` e `premiumOfferCohort` (`EXISTING`/`NEW`). Usuários presentes na migração são marcados `EXISTING`; novas contas usam `NEW`.

`LikeDailyUsage` guarda usuário, livro-alvo, `quotaDate` (DATE civil em `America/Sao_Paulo`) e criação, com chave única por usuário/livro/data. A linha não possui FK para Book e sobrevive à remoção do livro/interação durante o dia; exclusão da conta remove usos em cascata. A transação com lock de User grava o uso e a Interaction juntos. O estado Premium é derivado dos timestamps do banco, nunca de sinalizador local; não existem produto de assinatura, preço ou dados de pagamento.

## Foto de perfil — plano 009 (implementação não publicada)

Migração 20261005120000_private_user_avatar adiciona User.avatarStorageKey único, avatarVersion e AvatarUpload com estados PENDING/PROCESSING/COMMITTED/CANCELED/EXPIRED. Preserva avatarUrl legado. Grants vinculam bytes/MIME/protocolo/prazo/versão e CAS usa lock curto da User; assinaturas não são persistidas.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).
