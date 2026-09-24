# 14. Execução do MVP

## Entregue nesta retomada

- arquitetura modular da API e remoção do backend JWT/Multer legado;
- schema/migração Prisma para usuários, livros, imagens, interações, matches, conversas e mensagens;
- autenticação nativa no mobile e na API, com sessões persistidas e revogáveis;
- BrasilAPI para ISBN com validação local de dígito;
- leitura nativa de EAN-13 de livro pela câmera, com permissão sob demanda, preenchimento automático para revisão e fallback manual;
- selo ISBN calculado no servidor;
- presign/complete/delete de capas no Cloudflare R2;
- Resend com e-mail de boas-vindas idempotente;
- descoberta, match mútuo, histórico e Socket.IO;
- biblioteca com busca, ordenação, refresh e paginação por cursor;
- chat com paginação, indicador de digitação, ack, fallback HTTP, reconexão e retry idempotente;
- cadastro, consulta, edição e exclusão de livros no app;
- novo frontend mobile com design system nativo inspirado em shadcn;
- Dockerfile, Compose, exemplos de ambiente, testes e documentação.

## Evidências locais

Em 31/08/2026: TypeScript do app passou; Expo Doctor passou 18/18 verificações; o bundle Android/Hermes de 1.182 módulos foi gerado com sucesso; lint da API passou; 29 testes em 9 arquivos passaram; o schema Prisma foi validado e o Client gerado. O Compose foi executado no Docker Desktop: PostgreSQL ficou saudável em `localhost:5433`, a API ficou ativa em `localhost:3001` e as 5 migrações foram aplicadas. A API containerizada respondeu `200` em `/health`, criou um usuário local por rota privada, retornou ISBN `FOUND` pela BrasilAPI e completou um smoke test temporário de criação, busca por título, selo/origem ISBN e exclusão de livro.

A BrasilAPI pública respondeu `200` em `/api/isbn/v1/9788545702870`, confirmando a base URL e o formato usados pelo adapter. R2 e Resend não foram exercitados com contas reais porque não há credenciais fornecidas.

Na validação do scanner, o app teve 7 arquivos e 32 testes aprovados, typecheck aprovado, Expo Doctor 21/21 e export Android concluído. Na API, o lint passou sem erros; 23 arquivos e 161 testes foram aprovados, com 1 arquivo e 1 teste ignorados. O schema Prisma foi validado e o Prisma Client 6.19.3 foi gerado. O teste físico Android/iOS permanece como aceite externo.

Consulte a [matriz de validação](./15-matriz-validacao-mvp.md) para os comandos, resultados e limites da evidência.

## Roteiro de aceite completo

1. confirmar Docker Desktop ativo e subir `docker compose up --build -d` (PostgreSQL em `localhost:5433`);
2. confirmar no log que `prisma migrate deploy` terminou antes da API;
3. criar e verificar duas contas nativas distintas e cadastrar livros de ambas;
4. criar interesses reversos e confirmar match/conversa;
5. configurar Resend e testar cadastro, confirmação, login, logout e recuperação de acesso;
6. configurar R2 e validar upload/visualização/exclusão de capa;
7. configurar domínio Resend e validar a mensagem de boas-vindas;
8. executar o app em Android e iOS físicos e revisar teclado, safe area e reconexão do chat;
9. validar a câmera com permissão negada/bloqueada, baixa luz, código danificado, offline, `404`, `503` e `429`, confirmando que o cadastro manual continua disponível.
