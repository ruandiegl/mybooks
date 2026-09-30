# 5. Contrato HTTP

Base: `/api/v1`. `/health` e as rotas públicas abaixo não exigem bearer. Todo o restante exige `Authorization: Bearer <accessToken>` nativo. Não existe cabeçalho de identidade local.

## Autenticação

| Método | Caminho | Resultado |
| --- | --- | --- |
| POST | `/auth/register` | cria conta pendente; `201` |
| POST | `/auth/verify-email` | ativa conta e emite access/refresh |
| POST | `/auth/resend-verification` | resposta genérica `{ accepted: true }` |
| POST | `/auth/login` | emite access/refresh |
| POST | `/auth/refresh` | rotaciona refresh e access |
| POST | `/auth/logout` | revoga a sessão do refresh |
| POST | `/auth/logout-all` | revoga sessões do usuário autenticado |
| POST | `/auth/forgot-password` | resposta genérica `{ accepted: true }` |
| POST | `/auth/reset-password` | troca senha e revoga todas as sessões |
| GET | `/auth/me` | usuário da sessão atual |

`register` recebe somente `email`, `password`, `cpf` e `phone`. Se já existir um cadastro pendente não verificado com o mesmo e-mail, a chamada reutiliza imediatamente esse cadastro, atualiza senha/CPF/celular, invalida o código anterior e envia uma nova confirmação; se o novo CPF já pertencer a outra conta, ou se o e-mail já estiver verificado, a API retorna erro genérico. `verify-email` recebe `email` e código de 6 dígitos. Respostas de sessão incluem `accessToken`, `refreshToken`, `expiresAt` e `user`. Códigos, hashes, CPF protegido e metadados internos nunca são retornados.

Cada grupo tem limite configurável e headers `RateLimit`; ao exceder, responde `429` com `RATE_LIMITED`. Login usa mensagem genérica para conta ausente/senha errada; recuperação e reenvio não confirmam existência.

## Perfil, onboarding e avatar

| Método | Caminho | Função |
| --- | --- | --- |
| GET/PATCH | `/me` | ler/alterar nome, sobrenome, bio, cidade, celular e interesses |
| POST | `/me/onboarding/profile/skip` | concluir apresentação opcional do perfil |
| POST | `/me/onboarding/books/complete` | concluir/pular apresentação de livros |
| POST | `/me/avatar/presign` | autorizar avatar |
| POST | `/me/avatar/complete` | validar e vincular avatar |
| DELETE | `/me/avatar` | remover avatar atual |

O restante do domínio mantém `/books`, `/discover`, `/interactions`, `/matches`, `/conversations` e as rotas de imagens de livros. Todas as respostas usam `{ data }`; erros usam `{ error: { code, message, requestId, fields? } }`.

## Livros e fotos

| Método | Caminho | Função |
| --- | --- | --- |
| GET/POST | `/books` | listar livros próprios / criar livro |
| GET/PATCH/DELETE | `/books/:bookId` | consultar, editar ou excluir livro próprio |
| POST | `/books/:bookId/images/presign` | autorizar PUT temporário; body `{ mimeType, size }` |
| POST | `/books/:bookId/images/complete` | validar HEAD e vincular a foto |
| PUT | `/books/:bookId/images/order` | persistir a lista completa `{ imageIds: [...] }` |
| DELETE | `/books/:bookId/images/:imageId` | remover foto e promover a primeira restante |

São aceitos 0–3 arquivos JPEG/PNG/WebP de até 8 MiB por livro. `sortOrder = 0` é sempre a capa; o backend deriva owner e chave R2 da sessão e do livro. Uploads novos usam `pending/books/...`, depois são copiados para `books/...`. Fotos privadas recebem `url` GET assinada e `expiresAt` nas respostas; links externos legados têm `expiresAt: null`. `IMAGE_LIMIT_REACHED` é `409`, `IMAGE_ORDER_INVALID` é `422`, e erros de validação de arquivo mantêm códigos `IMAGE_TYPE_INVALID`, `IMAGE_SIZE_INVALID` e `IMAGE_UPLOAD_MISMATCH`.

## ISBN e livros

| Método | Caminho | Função |
| --- | --- | --- |
| GET | `/isbn/:isbn` | consulta privada de ISBN válido e retorna dados normalizados para revisão |

O parâmetro aceita ISBN-10 ou ISBN-13 conforme a validação do domínio; a leitura por câmera envia somente EAN-13 de livro com prefixo `978`/`979`. A API valida formato e checksum novamente, independentemente do cliente, e valida o payload externo antes de mapeá-lo. A consulta usa cache de 10 minutos limitado a 500 entradas, timeout e limite dedicado de 30 requisições por janela de 60 segundos, por usuário autenticado e com IP como fallback.

Os status esperados de falha são `404` para ISBN não encontrado, `422` para parâmetro inválido, `429` para limite excedido e `503` para indisponibilidade da consulta externa. Todos mantêm o envelope seguro de erro e permitem continuar pelo cadastro manual; o endpoint não cadastra o livro nem persiste automaticamente eventual URL de capa externa.
