# 8. Tempo real e chat

O histórico é carregado por HTTP. Socket.IO mantém entrega instantânea, presença efêmera e confirmação; se o socket cair, o app envia mensagens pelo endpoint HTTP.

## Autenticação e salas

O handshake recebe o access token atual em `auth.token`; no web, o cliente obtém o token em memória a cada tentativa de conexão/reconexão. Se o servidor recusar por sessão inválida, o cliente tenta um refresh compartilhado e conecta novamente uma vez. O servidor valida assinatura/claims e confirma no banco que `sid` está ativo antes de carregar o usuário de `sub`. Cada conexão entra em `user:<userId>`; após confirmar membership, entra em `conversation:<conversationId>`. Nunca aceite um ID de usuário informado pelo cliente como autorização.

## Eventos

| Direção | Evento | Finalidade |
| --- | --- | --- |
| cliente → servidor | `conversation:join` | entrar na sala autorizada |
| cliente → servidor | `message:send` | persistir mensagem idempotente |
| servidor → sala | `message:created` | entregar mensagem persistida |
| servidor → cliente | `message:ack` | confirmar `clientMessageId` aceito |
| cliente → servidor | `message:read` | atualizar leitura |
| servidor → sala | `message:read` | informar leitura |
| ambos | `presence:typing` | estado efêmero de digitação |
| servidor → sala | `presence:updated` | presença básica |

Eventos duráveis retornam acknowledgement `{ ok, data? }` ou `{ ok: false, error }`. `clientMessageId` impede duplicação durante reconexão. O app mantém estados locais `sending`, `sent` e `failed`; o retry reutiliza o mesmo identificador. Ao reconectar, o histórico HTTP é invalidado e sincronizado.

## UI

As primitives nativas `MessageScroller`, `Message`, `Bubble`, `TypingIndicator`, `MessageComposer`, `ConnectionStateBanner` e `DeliveryStatus` vivem em `app/src/components/chat`. O header é fornecido pela stack nativa. Anexos não fazem parte do contrato atual do MVP. Não importe componentes shadcn web/DOM no React Native.

## Foto de perfil — plano 009 (implementação não publicada)

Resumos de otherUser e sender agora são allowlists com avatarUrl/expiração/versão, inclusive mensagens emitidas por Socket.IO. Eventos e membership são preservados. O cliente invalida mensagens pela chave real [messages,conversationId], além de conversations/matches.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).
