# 14. Execução do MVP

## Entregue nesta retomada

- arquitetura modular da API e remoção do backend JWT/Multer legado;
- schema/migração Prisma para usuários, livros, imagens, interações, matches, conversas e mensagens;
- Clerk no mobile e na API, com modo local controlado;
- BrasilAPI para ISBN com validação local de dígito;
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

A BrasilAPI pública respondeu `200` em `/api/isbn/v1/9788545702870`, confirmando a base URL e o formato usados pelo adapter. Clerk, R2 e Resend não foram exercitados com contas reais porque não há credenciais fornecidas.

Consulte a [matriz de validação](./15-matriz-validacao-mvp.md) para os comandos, resultados e limites da evidência.

## Roteiro de aceite completo

1. confirmar Docker Desktop ativo e subir `docker compose up --build -d` (PostgreSQL em `localhost:5433`);
2. confirmar no log que `prisma migrate deploy` terminou antes da API;
3. testar modo local com dois `x-dev-user-id` diferentes e livros de ambos;
4. criar interesses reversos e confirmar match/conversa;
5. configurar Clerk e testar cadastro, login, logout e recuperação de acesso;
6. configurar R2 e validar upload/visualização/exclusão de capa;
7. configurar domínio Resend e validar a mensagem de boas-vindas;
8. executar o app em dispositivo físico e revisar teclado, safe area e reconexão do chat.
