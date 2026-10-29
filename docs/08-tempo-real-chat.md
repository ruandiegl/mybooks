# 8. Tempo real e chat

## Sessões revogadas — plano010 (local)

No Web, recuperação de rotação/expiração/handshake usa rebind autenticado pelo cookie e correlacionado à família; não faz nova rotação para cada aviso rotated. Isto mantém duas abas no sid vivo. Nativo reaproveita a rotação compartilhada em andamento; expiração renova normalmente. Fallback para API antiga ocorre somente após soltar o lock e não ao receber rotated.

Após commit, `session:revoked` informa `terminal`, `rotated` ou `expired`; falha de consulta pode informar `unavailable`. Sockets são selecionados por sid/owner, não por todo usuário no logout atual. Eventos validam JWT e sessão viva; HTTP fallback/idempotência são preservados. O cliente reconecta uma vez por handshake inválido/rotação legítima; terminal limpa somente o actor e sid correspondentes. Listeners do servidor são removidos ao fechar. EventEmitter local pressupõe uma instância; adapter compartilhado é necessário antes de escalar réplicas.

O histórico é carregado por HTTP. Socket.IO mantém entrega instantânea, presença efêmera e confirmação; se o socket cair, o app envia mensagens pelo endpoint HTTP.

## Autenticação e salas

O handshake recebe o access token atual em `auth.token`; no web, o cliente obtém o token em memória a cada tentativa de conexão/reconexão. Se o servidor recusar por sessão inválida, o cliente tenta um refresh compartilhado e conecta novamente; uma falha transitória preserva a sessão e permite nova tentativa na reconexão seguinte, enquanto um `401` no refresh encerra a sessão. O servidor valida assinatura/claims e confirma no banco que `sid` está ativo antes de carregar o usuário de `sub`. Cada conexão entra em `user:<userId>`; após confirmar membership, entra em `conversation:<conversationId>`. Nunca aceite um ID de usuário informado pelo cliente como autorização.

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

`ChatRealtimeProvider` mantém um único socket para a sessão autenticada e o encerra ao sair ou trocar a sessão. O handshake lê o access token atual; após erro de autenticação tenta um refresh compartilhado. Falha transitória do refresh libera uma nova tentativa na reconexão seguinte; `401` encerra a sessão. Ao conectar, invalida as listas de matches e conversas. Entrar ou reentrar na sala exige confirmação de membership por HTTP e confirmação do servidor; ao sair do chat, o cliente emite `conversation:leave`. A escrita de mensagem volta a validar membership dentro da transação para não aceitar envio depois de uma remoção concorrente.

Na remoção, a API confirma a transação antes de enviar `match:removed` aos dois rooms pessoais e remove os sockets da sala da conversa. O cliente valida e deduplica por `matchId`, invalida matches/conversas e cancela/remove apenas o cache de mensagens e livros contextuais daquela conversa. Uma confirmação HTTP `204` também percorre esse mesmo tratamento local, inclusive quando o socket está offline. A pessoa que recebe o evento vê em Mensagens um aviso por match, dispensável individualmente. Se a conversa removida estiver no caminho de navegação ativo, a navegação volta a Mensagens uma única vez; se a pessoa estiver em outra área, o aviso fica disponível sem interromper a navegação.

## UI

As primitives nativas `MessageScroller`, `Message`, `Bubble`, `TypingIndicator`, `MessageComposer`, `ConnectionStateBanner` e `DeliveryStatus` vivem em `app/src/components/chat`. O header é fornecido pela stack nativa. Anexos não fazem parte do contrato atual do MVP. Não importe componentes shadcn web/DOM no React Native.

## Foto de perfil — plano 009 (implementação não publicada)

Resumos de otherUser e sender agora são allowlists com avatarUrl/expiração/versão, inclusive mensagens emitidas por Socket.IO. Eventos e membership são preservados. O cliente invalida mensagens pela chave real [messages,conversationId], além de conversations/matches.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).
# Bloqueio reversível — plano 014 (implementação local)

Bloquear uma pessoa mantém `Match`, `Conversation`, membros e `Message` no banco, mas remove o par das listagens de match/conversa. A autorização de entrada na sala, leitura, envio, presença e marcação de leitura passa pelo filtro de bloqueio. O envio revalida dentro da transação serializável; URLs e salas antigas não concedem acesso. Após commit, `relationship:changed` pede invalidação dos caches dos dois participantes e o servidor retira sockets da sala da conversa. Desbloquear restaura o histórico. Remover match continua sendo a operação destrutiva separada.
