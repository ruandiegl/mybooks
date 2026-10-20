# 16. Histórico de alterações

## 20/10/2026 — Livros da troca e remoção segura de match

- Matches novos guardam as duas referências de livros em ordem canônica; os antigos não recebem relações inferidas. `InteractionActionReceipt` preserva os identificadores de curtida (com backfill dos existentes) para impedir que replay reative uma ação depois da remoção.
- `GET /conversations` passou a retornar resumos de livros orientados para cada participante. `GET /conversations/:conversationId/exchange-books/:bookId` autoriza detalhes pelo membership e vínculo do livro ao match; dados ausentes ou sem acesso usam `404` sanitizado.
- `DELETE /matches/:matchId` exige participante e remove o match, conversa, membros e mensagens para ambos, mudando as curtidas atuais do par para `PASS`. O endpoint responde sem corpo `204` após o commit e emite `match:removed` aos dois usuários.
- O chat mostra avatar e nome no header, abre um bottom sheet para os livros e adiciona rota contextual com deep link compatível com reload na PWA. Remoção confirmada limpa os caches relacionados, mostra aviso dispensável ao outro participante e encerra a conversa ativa; resultados inconclusivos oferecem verificação/repetição.
- Evidências finais: API com 29 arquivos/232 testes aprovados e um ignorado, lint aprovado, Prisma validate/generate aprovados; PostgreSQL 16 descartável com 2 arquivos/12 testes; app com 17 arquivos/83 testes e typecheck aprovados; export web e smoke PWA aprovados após os ajustes finais, com 32 recursos no service worker. O replay consulta o recibo antes de validar disponibilidade do livro e devolve somente match já ativo; falha transitória de refresh preserva a sessão para nova tentativa realtime.
- Permanece pendente a inspeção em dispositivo físico/remoto: não havia dispositivo local e o usuário optou por pular o teste remoto nesta validação; nenhum aparelho remoto foi alocado. O teste PostgreSQL específico do endpoint contextual também não foi executado.

## 28/09/2026 — Base Web/PWA compartilhada

- Foi adicionada a área `web/` com Dockerfile multi-stage, configuração Caddy, roteiro de publicação Railway e smoke test de proxy HTTP/WebSocket/cache. O proxy ainda não foi executado localmente porque Caddy não está instalado e o daemon Docker está inacessível.
- O Expo Web recebeu manifesto instalável, ícones de tamanhos 192/512/180, metadados para iOS, build `single` e service worker limitado a assets com hash e página offline sem dados privados.
- A configuração web aponta API e Socket.IO ao mesmo origin; um smoke de build confirmou que IP local/fallback nativo não entrou no bundle.
- A autenticação web passou a usar access token curto em memória e refresh rotativo no cookie `__Host-trocalivros_refresh`; Android/iOS continuam usando SecureStore. A API rejeita origem inválida e não envia refresh token no JSON web. Refresh/logout web usam Web Locks entre abas, falha transitória preserva cookie e sessão em memória, cookie inválido ou malformado é expirado, e um marcador não secreto preserva logout offline ao reabrir a PWA.
- Foram adicionados linking React Navigation, avisos com callbacks no navegador, conversão HEIC/JPEG grande e renovação do token no handshake Socket.IO.
- Validação local: app com 12 arquivos/47 testes e typecheck; API lint e 23 arquivos/170 testes (1 ignorado); export web de 821 módulos e smoke PWA aprovados; export Android Hermes de 1.067 módulos aprovado.
- Permanecem pendentes publicação/configuração do Railway, domínio e validação de `/health` pelo proxy, smoke do Caddy em ambiente disponível, contas reais/serviços externos e aceite no Safari/iPhone. O código Premium continua ausente neste checkout.

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
