# 6. Banco de dados

`API/prisma/schema.prisma` é a fonte de verdade; PostgreSQL 16 e Prisma 6 são o caminho de acesso.

## Identidade

- `User`: e-mail único, hash bcrypt, verificação, expiração de cadastro pendente, CPF com HMAC único + AES-256-GCM, celular, perfil e timestamps de onboarding;
- `AuthSession`: hash do refresh, família de rotação, expiração, revogação, substituição e metadados protegidos;
- `AuthCode`: hash de código de verificação/reset, tipo, TTL, uso único, tentativas e cooldown.

Livros, imagens, interações, matches, conversas e mensagens mantêm ownership e índices do domínio. IDs são UUIDs e timestamps são ISO 8601 nas respostas.

`BookImage` guarda `sortOrder` não nulo, único por livro; a posição 0 é a capa (`isCover = true`) e um índice parcial permite apenas uma capa. `url` é nullable para imagens privadas novas; `storageKey` é a referência permanente do objeto R2. URLs assinadas nunca são persistidas. `StorageCleanupJob` registra chave única, tentativas, próximo horário, erro sanitizado e timestamps para repetir exclusões de storage.

A migração `20260930120000_book_image_order_cleanup` primeiro aborta se houver livro com mais de três fotos ou mais de uma capa, depois faz backfill estável por `isCover DESC, createdAt ASC, id ASC` e promove a primeira foto como capa. Antes de produção, execute a consulta somente-leitura `API/prisma/book-image-preflight.sql` sobre um backup/alvo e resolva cada exceção explicitamente; a migração não exclui fotos. A migração não foi aplicada ao banco Railway durante esta execução.

## Migração nativa

`20260911120000_native_auth_onboarding` adiciona credenciais e sessões sem apagar registros. Contas legadas permanecem inativas e sem senha inventada; precisam passar por um procedimento explícito de recuperação/migração. `clerkUserId` fica nullable temporariamente para auditoria e futura remoção.

`20260911143000_pending_registration_retry` adiciona `pendingRegistrationExpiresAt`. Uma nova tentativa com o mesmo e-mail de um cadastro ainda não verificado reutiliza o mesmo `User` imediatamente, substitui senha/CPF/celular/código e reenvia a confirmação, desde que o novo CPF não esteja vinculado a outra conta. Cadastros pendentes expirados são removidos junto com seus códigos antes de uma nova tentativa.

Antes de produção: gerar backup testado, aplicar `prisma migrate deploy`, conferir contagens/relações, validar contas legadas e ensaiar restore. Nunca altere banco compartilhado manualmente.
