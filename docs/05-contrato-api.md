# 5. Contrato HTTP

Base: `/api/v1`. Exceto `/health`, todas as rotas exigem `Authorization: Bearer <token Clerk>`. Somente em desenvolvimento, a API aceita `x-dev-user-id`.

## Rotas

| Método | Caminho | Função |
| --- | --- | --- |
| `GET` | `/health` | saúde do serviço |
| `GET/PATCH` | `/api/v1/me` | ler/alterar perfil atual |
| `GET` | `/api/v1/isbn/:isbn` | validar e consultar ISBN na BrasilAPI |
| `GET/POST` | `/api/v1/books?q=&sort=&availability=&cursor=&limit=` | listar biblioteca/criar livro |
| `GET/PATCH/DELETE` | `/api/v1/books/:id` | detalhe/edição/exclusão |
| `GET` | `/api/v1/discover` | livros disponíveis de outras pessoas |
| `POST` | `/api/v1/interactions` | gostar ou passar |
| `GET` | `/api/v1/matches` | listar matches |
| `GET` | `/api/v1/conversations` | listar conversas |
| `GET/POST` | `/api/v1/conversations/:id/messages` | histórico/envio HTTP |
| `POST` | `/api/v1/conversations/:id/read` | marcar leitura |
| `POST` | `/api/v1/books/:id/images/presign` | autorizar upload |
| `POST` | `/api/v1/books/:id/images/complete` | confirmar imagem |
| `DELETE` | `/api/v1/books/:id/images/:imageId` | remover imagem |

## Livro

`title` é obrigatório. `authors` e `subjects` são arrays. `isbn` é opcional, mas quando enviado precisa ter dígito verificador válido. O servidor responde `hasIsbnBadge`; o cliente nunca escolhe esse valor. `isbnProvider`, `isbnStatus`, `coverExternalUrl`, owner e chaves de storage enviados pelo cliente não concedem confiança: origem e selo são derivados no backend.

## Paginação

Listas paginadas respondem `data.items` e `data.pageInfo` com `hasNextPage` e `nextCursor`. Limites máximos são impostos pela API.

## Idempotência

Interações usam `clientActionId`; mensagens usam `clientMessageId`. Repetir o mesmo identificador não deve duplicar o evento durável.
