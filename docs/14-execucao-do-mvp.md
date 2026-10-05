# 14. Execução do MVP

## Entregue nesta retomada

- arquitetura modular da API e remoção do backend JWT/Multer legado;
- schema/migração Prisma para usuários, livros, imagens, interações, matches, conversas e mensagens;
- autenticação nativa no mobile e na API, com sessões persistidas e revogáveis;
- BrasilAPI para ISBN com validação local de dígito;
- leitura nativa de EAN-13 de livro pela câmera, com permissão sob demanda, preenchimento automático para revisão e fallback manual;
- selo ISBN calculado no servidor;
- uploads de até três fotos por livro com ordem/capa persistidas, URLs GET assinadas e limpeza de objetos no Cloudflare R2;
- seleção, reordenação, remoção e retry de fotos em `BookCreate`/`BookEdit`, com galeria em `BookDetails`;
- Resend com e-mail de boas-vindas idempotente;
- descoberta, match mútuo, histórico e Socket.IO;
- biblioteca com busca, ordenação, refresh e paginação por cursor;
- tela de Curtidas recebidas/enviadas com gate Premium e limite gratuito de 15 likes distintos por dia;
- teste Premium opt-in por 30 dias exatos, compartilhado entre conta Android e PWA, sem pagamento ou renovação;
- oferta no onboarding/Perfil, com planos semanal, mensal e anual informativos “Em breve” e sem preço;
- sessão PWA com access token em memória, refresh cookie HttpOnly e logout revogável;
- chat com paginação, indicador de digitação, ack, fallback HTTP, reconexão e retry idempotente;
- cadastro, consulta, edição e exclusão de livros no app;
- novo frontend mobile com design system nativo inspirado em shadcn;
- Dockerfile, Compose, exemplos de ambiente, testes e documentação.
- transporte de sessão web com cookie HttpOnly, sem refresh token no JSON do navegador;
- infraestrutura de build PWA, manifesto/iOS, ícones, linking, notices web, tratamento de fotos HEIC/JPEG e cache limitado;
- proxy Caddy e serviço Railway publicados em `https://trocalivros-web-production.up.railway.app`; GET público histórico confirma HTML da PWA, `/health` pela API privada e preservação do `401` em endpoint protegido; smoke local do Caddy passou na integração, enquanto o aceite físico e a publicação da versão integrada permanecem separados.

## Evidências locais

### Premium gratuito (24/09/2026)

O plano 007 implementa trial sem pagamento, gate de curtidas recebidas, quota diária transacional, ativação por usuário verificado, oferta em bottom sheet no onboarding/login e sessão PWA. A oferta de login aparece imediatamente para contas elegíveis, uma vez por sessão, com animação de baixo para cima. A cota e o Premium usam o relógio do servidor. A PWA só pode autenticar em HTTPS com API no mesmo origin por proxy `/api`; HTTP com sessão em memória é restrito a loopback para desenvolvimento.

Resultados atuais e comandos estão na [matriz de validação](./15-matriz-validacao-mvp.md). O export Web gera arquivos estáticos para servir no mesmo host que encaminha `/api` à API; o iPhone precisa acessar esse host por HTTPS. O aceite físico em Android/iOS permanece uma etapa da apresentação.

Em 31/08/2026: TypeScript do app passou; Expo Doctor passou 18/18 verificações; o bundle Android/Hermes de 1.182 módulos foi gerado com sucesso; lint da API passou; 29 testes em 9 arquivos passaram; o schema Prisma foi validado e o Client gerado. O Compose foi executado no Docker Desktop: PostgreSQL ficou saudável em `localhost:5433`, a API ficou ativa em `localhost:3001` e as 5 migrações foram aplicadas. A API containerizada respondeu `200` em `/health`, criou um usuário local por rota privada, retornou ISBN `FOUND` pela BrasilAPI e completou um smoke test temporário de criação, busca por título, selo/origem ISBN e exclusão de livro.

A BrasilAPI pública respondeu `200` em `/api/isbn/v1/9788545702870`, confirmando a base URL e o formato usados pelo adapter. R2 e Resend não foram exercitados com contas reais porque não há credenciais fornecidas.

Na validação da galeria, o app teve 9 arquivos e 39 testes aprovados, typecheck aprovado e export Web/Android concluído. Na API, o lint passou sem erros; 27 arquivos e 177 testes foram aprovados, com 1 arquivo/teste ignorado. O schema Prisma foi validado e o Prisma Client 6.19.3 foi gerado. A migração não foi aplicada e o R2 real não foi exercitado porque não há conexão de banco nem credenciais R2 disponíveis no checkout isolado. O teste físico Android/iOS permanece como aceite externo.

Consulte a [matriz de validação](./15-matriz-validacao-mvp.md) para os comandos, resultados e limites da evidência.

Em 28/09/2026, o app passou typecheck e 47 testes em 12 arquivos; a API passou lint e teve 172 testes em 24 arquivos aprovados, com 1 ignorado. A PWA exportou 821 módulos e passou seu smoke de manifesto/cache/bundle. O Android exportou 1.067 módulos Hermes. Os serviços API e Web estão online na Railway. O domínio público da API continua na porta 3001; a variável `PORT=3001` mantém essa URL e a API também escuta nessa porta. O PWA encaminha pelo DNS privado `mybooks-api.railway.internal:3001`. Testes GET públicos confirmaram `/health` da API, `/` e `/health` da PWA, e `401` JSON em `/api/v1/auth/me` pelo proxy. O smoke Caddy local foi escrito, mas não executou porque Caddy não está instalado e o daemon Docker não está acessível.

O plano 007 da PWA adicionou adaptadores web de API/sessão, avisos, deep links, conversão local de fotos HEIC/JPEG e token atualizado no handshake Socket.IO. A integração preserva o Premium e a galeria de três fotos privadas da main. A exportação, o manifesto, o service worker e os smoke tests locais HTTP/WebSocket/HTTPS do Caddy foram validados; os GETs públicos anteriores pertencem à branch de produção, não aprovam o deploy deste merge. Sessão, Premium, câmera e instalação em Safari/iPhone ainda exigem aceite físico.

## Roteiro de aceite completo
1. confirmar Docker Desktop ativo e subir `docker compose up --build -d` (PostgreSQL em `localhost:5433`);
2. confirmar no log que `prisma migrate deploy` terminou antes da API;
3. criar e verificar duas contas nativas distintas e cadastrar livros de ambas;
4. criar interesses reversos e confirmar match/conversa;
5. configurar Resend e testar cadastro, confirmação, login, logout e recuperação de acesso;
6. configurar bucket R2 privado e validar três fotos, HEAD/copy, GET assinado/expiração, reordenação, capa e exclusão;
7. configurar domínio Resend e validar a mensagem de boas-vindas;
8. executar o app em Android e iOS físicos e revisar teclado, safe area e reconexão do chat;
9. validar a câmera com permissão negada/bloqueada, baixa luz, código danificado, offline, `404`, `503` e `429`, confirmando que o cadastro manual continua disponível.
