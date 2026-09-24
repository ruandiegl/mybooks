# 16. Histórico de alterações

## 11/09/2026 — Leitura de ISBN por câmera

- O app Expo 57/React Native 0.86 passou a usar `expo-camera` 57.0.5 em `BarcodeScannerModal`, aberto por `BookCreate`, com câmera traseira, permissão sob demanda e leitura somente de `ean13`.
- O cliente passou a aceitar apenas EAN-13 de livro com prefixo `978`/`979` e checksum válido antes de chamar automaticamente a rota privada `GET /api/v1/isbn/:isbn` e preencher o formulário para revisão.
- QR, URL, texto, EAN de produto e checksum inválido não consultam a API. O cadastro manual permanece disponível, inclusive para ISBN-10; não há promessa de scanner Web nem leitura física direta de ISBN-10.
- Nenhum frame ou foto é enviado ou armazenado, e capas externas retornadas pela consulta não são persistidas automaticamente.
- A API passou a repetir validação Zod/checksum, validar o payload da BrasilAPI, limitar o cache a 500 entradas e mascarar o ISBN nos logs, além de aplicar rate limit dedicado de 30 consultas por janela de 60 segundos, por usuário autenticado e IP como fallback.
- Falhas `404`, `422`, `429` e `503` mantêm envelope seguro e permitem fallback manual.
- O plugin de câmera usa mensagem de permissão em português e desabilita permissão de microfone e gravação de áudio no Android.

### Validação

- App: 7 arquivos e 32 testes, typecheck, Expo Doctor 21/21 e export Android aprovados.
- API: lint sem erros; 23 arquivos e 161 testes aprovados, com 1 arquivo e 1 teste ignorados.
- Prisma: schema válido e Prisma Client 6.19.3 gerado.
- Permanece pendente o aceite em Android/iOS físicos, incluindo permissão negada/bloqueada, baixa luz, código danificado, offline, `404`, `503` e limite excedido.

## 11/09/2026 — Autenticação própria e onboarding

- Clerk e a identidade local fornecida pelo cliente foram removidos do runtime e das dependências.
- A API passou a persistir hashes bcrypt, códigos, sessões rotativas e CPF protegido no PostgreSQL.
- Foram adicionados cadastro obrigatório, verificação de e-mail, login, recuperação, rate limits e logout global.
- O app passou a armazenar tokens no SecureStore, coordenar refresh concorrente e autenticar o Socket.IO com a sessão nativa.
- O onboarding ganhou perfil e livros opcionais, ambos com opção de pular, além de avatar R2 com ownership.

## 09/09/2026 — Rebranding para TrocaLivros

- O nome visual do aplicativo foi alterado de `MyBooks` para `TrocaLivros` nas telas de autenticação, perfil e descoberta.
- O nome exibido do aplicativo Expo foi atualizado para `TrocaLivros`.
- Mensagens da API, fallback de usuário e e-mail de boas-vindas passaram a usar a nova marca.
- Os ícones atuais de livro foram preservados, pois não contêm o texto `MyBooks` e continuam representando a identidade visual do produto.
- Identificadores técnicos legados (`mybooks` em package/bundle IDs, banco, volume Docker, chaves de sessão e nomes internos) não foram renomeados para evitar migrações e quebras de integração.

### Validação

- `npm run typecheck` no app mobile.
- Busca de referências públicas remanescentes a `MyBooks` no código de interface.

## 09/09/2026 — Dados de demonstração para screenshots

- A seed passou a preencher ISBN válido e capa externa nos doze livros de demonstração.
- O perfil local `dev-mybooks-user` mantém três livros na biblioteca para screenshots.
- Foram adicionados dois matches ativos, duas conversas e seis mensagens idempotentes para demonstrar as telas de conexões e chat.
- As rotas de biblioteca, descoberta, matches e conversas foram validadas após a execução da seed.

## 09/09/2026 — Capas locais para screenshots

- Foram adicionadas doze capas raster locais em `API/assets/covers`.
- A API passou a servir essas imagens em `/covers`.
- A seed passou a gerar URLs usando `PUBLIC_API_BASE_URL`, evitando dependência das capas remotas durante os screenshots.
- A capa foi validada por `http://192.168.29.165:3001/covers/a-hora-da-estrela.jpg` com resposta HTTP `200`.

## 09/09/2026 — Capas reais do catálogo público

- As capas demonstrativas foram substituídas por capas reais de edições encontradas no catálogo público Open Library.
- Os arquivos continuam armazenados localmente em `API/assets/covers`, para que os screenshots não dependam de chamadas externas durante o uso do app.
- A API e a biblioteca foram validadas com capas reais, ISBNs e URLs locais retornando HTTP `200`.

## 09/09/2026 — Infográfico do MVP

- Foi criado o infográfico horizontal `output/infografico-mvp-trocalivros.png` para uso em apresentações.
- A composição utiliza os quatro screenshots fornecidos: entrada, descoberta, biblioteca e chat.
- Os prints foram apresentados dentro de mockups alinhados de iPhone, com textos externos curtos e a paleta vinho, rosa, marfim e cinza quente do aplicativo.
- O infográfico de referência foi usado apenas como orientação de hierarquia, cartões e espaçamento.
- Foi criada uma versão em alta definição 4K (`3840 × 2160`) em `output/infografico-mvp-trocalivros-4k.jpg`, otimizada para apresentações e compatibilidade com PowerPoint e Canva.

## 24/09/2026 — Integração do histórico Git

- A cópia local foi comparada com o repositório original e sua base corresponde ao commit `ade4da2` (`feat: uinavigationbar`).
- As alterações locais posteriores foram integradas em `main`, incluindo configuração local, seeds e capas, TrocaLivros, autenticação própria, onboarding, leitura de ISBN e documentação.
- O arquivo `.env` da raiz permanece local e foi incluído no `.gitignore`.
- A integração foi feita localmente; nenhum commit foi enviado ao GitHub.
