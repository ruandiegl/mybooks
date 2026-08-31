# 8. Tempo real e chat

O histórico é carregado por HTTP. Socket.IO mantém entrega instantânea, presença efêmera e confirmação; se o socket cair, o app envia mensagens pelo endpoint HTTP.

## Autenticação e salas

O handshake recebe token Clerk em `auth.token` ou `devUserId` no modo local. Cada conexão entra em `user:<userId>`; após confirmar membership, entra em `conversation:<conversationId>`. Nunca aceite um ID de usuário informado pelo cliente como autorização.

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
