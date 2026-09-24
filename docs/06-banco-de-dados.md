# 6. Banco de dados

`API/prisma/schema.prisma` é a fonte de verdade; PostgreSQL 16 e Prisma 6 são o caminho de acesso.

## Identidade

- `User`: e-mail único, hash bcrypt, verificação, expiração de cadastro pendente, CPF com HMAC único + AES-256-GCM, celular, perfil e timestamps de onboarding;
- `AuthSession`: hash do refresh, família de rotação, expiração, revogação, substituição e metadados protegidos;
- `AuthCode`: hash de código de verificação/reset, tipo, TTL, uso único, tentativas e cooldown.

Livros, imagens, interações, matches, conversas e mensagens mantêm ownership e índices do domínio. IDs são UUIDs e timestamps são ISO 8601 nas respostas.

## Migração nativa

`20260911120000_native_auth_onboarding` adiciona credenciais e sessões sem apagar registros. Contas legadas permanecem inativas e sem senha inventada; precisam passar por um procedimento explícito de recuperação/migração. `clerkUserId` fica nullable temporariamente para auditoria e futura remoção.

`20260911143000_pending_registration_retry` adiciona `pendingRegistrationExpiresAt`. Uma nova tentativa com o mesmo e-mail de um cadastro ainda não verificado reutiliza o mesmo `User` imediatamente, substitui senha/CPF/celular/código e reenvia a confirmação, desde que o novo CPF não esteja vinculado a outra conta. Cadastros pendentes expirados são removidos junto com seus códigos antes de uma nova tentativa.

Antes de produção: gerar backup testado, aplicar `prisma migrate deploy`, conferir contagens/relações, validar contas legadas e ensaiar restore. Nunca altere banco compartilhado manualmente.
