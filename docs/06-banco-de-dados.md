# 6. Banco de dados

`API/prisma/schema.prisma` é a fonte de verdade; PostgreSQL 16 e Prisma 6 são o caminho de acesso.

## Identidade

- `User`: e-mail único, hash bcrypt, verificação, expiração de cadastro pendente, CPF com HMAC único + AES-256-GCM, celular, perfil e timestamps de onboarding;
- `AuthSession`: hash do refresh, família de rotação, expiração, revogação, substituição e metadados protegidos;
- `AuthCode`: hash de código de verificação/reset, tipo, TTL, uso único, tentativas e cooldown.

Livros, imagens, interações, matches, conversas e mensagens mantêm ownership e índices do domínio. IDs são UUIDs e timestamps são ISO 8601 nas respostas.

## Livros da troca e recibos de interação

A migração `20261020120000_match_exchange_books_and_interaction_receipts` adiciona `Match.bookAId` e `Match.bookBId` como relações opcionais com `Book`, ambas com `ON DELETE SET NULL`. Para novos matches, A/B seguem a ordem canônica dos IDs dos donos. Matches antigos permanecem sem livros associados: a migração não tenta deduzir a troca a partir de curtidas históricas. Se um dos livros for apagado, o outro vínculo é preservado.

`InteractionActionReceipt` mantém o `clientActionId` como chave global única, além de ator, livro-alvo, ação e data original. A migração faz backfill usando os valores já registrados em `Interaction`. O recibo não possui relação com `Match`: portanto, continua após a remoção do match e impede que um identificador antigo reproduza uma curtida. A exclusão do usuário ou do livro-alvo apaga os recibos correspondentes por cascata.

Criar interação, recibo, match e conversa ocorre em transação serializável. Remover um match também é serializável: as curtidas atuais do par passam a `PASS`, o match é excluído e as relações em cascata apagam conversa, membros e histórico de mensagens. Um match futuro entre o mesmo par depende de novas curtidas com novos `clientActionId`; recibos anteriores não reativam a relação.

## Migração nativa

`20260911120000_native_auth_onboarding` adiciona credenciais e sessões sem apagar registros. Contas legadas permanecem inativas e sem senha inventada; precisam passar por um procedimento explícito de recuperação/migração. `clerkUserId` fica nullable temporariamente para auditoria e futura remoção.

`20260911143000_pending_registration_retry` adiciona `pendingRegistrationExpiresAt`. Uma nova tentativa com o mesmo e-mail de um cadastro ainda não verificado reutiliza o mesmo `User` imediatamente, substitui senha/CPF/celular/código e reenvia a confirmação, desde que o novo CPF não esteja vinculado a outra conta. Cadastros pendentes expirados são removidos junto com seus códigos antes de uma nova tentativa.

Antes de produção: gerar backup testado, aplicar `prisma migrate deploy`, conferir contagens/relações, validar contas legadas e ensaiar restore. Nunca altere banco compartilhado manualmente.
