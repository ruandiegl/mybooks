# 8. Tempo real e chat

O histórico é carregado por HTTP. Socket.IO mantém entrega instantânea, presença efêmera e confirmação; se o socket cair, o app envia mensagens pelo endpoint HTTP.

## Autenticação e salas

O handshake recebe o access token atual em `auth.token`; no web, o cliente obtém o token em memória a cada tentativa de conexão/reconexão. Se o servidor recusar por sessão inválida, o cliente tenta um refresh compartilhado e conecta novamente uma vez. O servidor valida assinatura/claims e confirma no banco que `sid` está ativo antes de carregar o usuário de `sub`. Cada conexão entra em `user:<userId>`; após confirmar membership, entra em `conversation:<conversationId>`. Nunca aceite um ID de usuário informado pelo cliente como autorização.

## Eventos

| Direção | Evento | Finalidade |
| --- | --- | --- |
| cliente → servidor | `conversation:join` | entrar na sala autorizada |
| cliente → servidor | `conversation:leave` | sair da sala autorizada, inclusive após a conversa ser removida |
| cliente → servidor | `message:send` | persistir mensagem idempotente |
| servidor → sala | `message:created` | entregar mensagem persistida |
| servidor → cliente | `message:ack` | confirmar `clientMessageId` aceito |
| cliente → servidor | `message:read` | atualizar leitura |
| servidor → sala | `message:read` | informar leitura |
| ambos | `presence:typing` | estado efêmero de digitação |
| servidor → sala | `presence:updated` | presença básica |
| servidor → os dois usuários | `match:removed` | informar `{ matchId, conversationId }` depois do commit da remoção |

Eventos duráveis retornam acknowledgement `{ ok, data? }` ou `{ ok: false, error }`. `clientMessageId` impede duplicação durante reconexão. O app mantém estados locais `sending`, `sent` e `failed`; o retry reutiliza o mesmo identificador. Ao reconectar, o histórico HTTP é invalidado e sincronizado.

## Sessão compartilhada e remoção do match

`ChatRealtimeProvider` mantém um único socket para a sessão autenticada e o encerra ao sair ou trocar a sessão. O handshake lê o access token atual; após erro de autenticação tenta um refresh compartilhado uma vez. Ao conectar, invalida as listas de matches e conversas. Entrar ou reentrar na sala exige confirmação de membership por HTTP e confirmação do servidor; ao sair do chat, o cliente emite `conversation:leave`. A escrita de mensagem volta a validar membership dentro da transação para não aceitar envio depois de uma remoção concorrente.

Na remoção, a API confirma a transação antes de enviar `match:removed` aos dois rooms pessoais e remove os sockets da sala da conversa. O cliente valida e deduplica por `matchId`, invalida matches/conversas e cancela/remove apenas o cache de mensagens e livros contextuais daquela conversa. Uma confirmação HTTP `204` também percorre esse mesmo tratamento local, inclusive quando o socket está offline. A pessoa que recebe o evento vê em Mensagens um aviso por match, dispensável individualmente. Se a conversa removida estiver no caminho de navegação ativo, a navegação volta a Mensagens uma única vez; se a pessoa estiver em outra área, o aviso fica disponível sem interromper a navegação.

## UI

As primitives nativas `MessageScroller`, `Message`, `Bubble`, `TypingIndicator`, `MessageComposer`, `ConnectionStateBanner` e `DeliveryStatus` vivem em `app/src/components/chat`. O header é fornecido pela stack nativa. Anexos não fazem parte do contrato atual do MVP. Não importe componentes shadcn web/DOM no React Native.
