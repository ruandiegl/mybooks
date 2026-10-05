# 16. Histórico de alterações

Os resultados abaixo pertencem às execuções e branches indicadas em cada registro; não comprovam testes, deploy ou aceite da integração em curso.

## 05/10/2026 — Integração da PWA com a main

- Conciliados os documentos 01, 02, 03, 04, 11, 15, 16 e README entre a main `249751e` e a branch PWA `89733ef`, preservando Curtidas, Premium implementado, até três fotos ordenadas e GET privado renovável do R2.
- Incorporados manifesto/ícones, service worker restrito, proxy Caddy, deep links e variantes web de sessão, avisos e mídia. Uso autenticado offline, push e cobrança real continuam fora do que foi implementado.
- Registrada a coexistência dos contratos `X-Session-Transport: cookie` e `/auth/browser/*` com cookie `__Host-`, com HTTPS/Origin nas duas entradas e preservação da regra da main de revogar antes de encerrar o logout local. A conciliação de código e seus testes estão a cargo da integração, ainda sem aceite neste registro.
- Mantidos os resultados anteriores como históricos, incluindo publicação e GETs básicos registrados na branch PWA. Login/cookies, WebSocket, R2 real, migração no banco alvo e Safari/iPhone não foram aprovados por esta revisão documental.
- Nenhum teste npm, deploy, staging, commit ou push foi executado nesta conciliação documental.

Após a conciliação documental, a integração de código preservou as funcionalidades da main e foi validada localmente: app 26 arquivos/91 testes; API 34 arquivos/228 testes com 3 arquivos/7 testes condicionais ignorados; typecheck, lint, exports Web/Android e smoke PWA/Caddy aprovados. A revisão independente identificou e confirmou correções do prefixo native, refresh compartilhado HTTP/socket e escolhas do adapter web. Também foram preservados HTTPS/Origin e logout após revogação confirmada, acrescentado `/likes`, evitada recursão Metro na preparação JPEG e mantidos os blobs de drafts para retry. Serviços Railway e aceite físico não foram alterados/realizados; o checkout principal permaneceu intacto.

## 30/09/2026 — Até três fotos por livro no R2

- `BookImage` passou a ter ordem estável, capa única e migração com backfill determinístico e pré-condição que aborta sem excluir fotos quando encontra dados fora da regra.
- A API assina PUT temporário no prefixo `pending/books/`, valida o objeto por HEAD, copia para `books/`, impõe o limite sob lock, reordena a lista completa e assina GET privado com expiração explícita.
- Exclusões de fotos, livros e contas pendentes criam jobs persistentes para retry de limpeza R2. `R2_PUBLIC_URL` deixou de ser requisito para fotos de livros; GET usa `R2_GET_URL_EXPIRES_IN`.
- O app aceita JPEG/PNG/WebP de até 8 MiB, com até três imagens, seleção sequencial, retry em `BookEdit`, capa na posição 0 e galeria em `BookDetails`.
- Validação local: API 27 arquivos/177 testes aprovados, 1 ignorado; lint e Prisma validate/generate passaram. App 9 arquivos/39 testes, typecheck e export Web/Android passaram.
- Migração, inventário do banco, R2 real, CORS/lifecycle no bucket e teste em dispositivos permanecem pendentes; não havia DATABASE_URL, Docker disponível ou credenciais R2 configuradas no checkout isolado.

## 28/09/2026 — Base Web/PWA compartilhada (branch PWA)

- Adicionada a área `web/` com Dockerfile multi-stage, Caddy, roteiro Railway e smoke de proxy HTTP/WebSocket/cache. Na validação local registrada, o proxy não foi executado por ausência de Caddy e daemon Docker acessível.
- O Expo Web recebeu manifesto instalável, ícones 192/512/180, metadados iOS, build `single` e service worker limitado a assets com hash e página offline sem dados privados.
- A configuração web usa a origem da página para API e Socket.IO; o smoke de build registrado confirmou ausência do IP local/fallback nativo no bundle.
- A branch PWA introduziu access token em memória, refresh rotativo no cookie `__Host-trocalivros_refresh`, allowlist de Origin e omissão do refresh no JSON web. Refresh/logout usam Web Locks; falha transitória de refresh preserva cookie e memória e cookie inválido/malformado é expirado. O logout offline com marcador não secreto era comportamento dessa branch; a integração deve preservar a regra mais forte da main de confirmar revogação antes de encerrar a sessão local.
- Adicionados linking React Navigation, avisos com callbacks, preparação HEIC/JPEG grande e token atual no handshake Socket.IO.
- Validação histórica: app 12 arquivos/47 testes e typecheck; API lint e 23 arquivos/170 testes, 1 ignorado; export web 821 módulos com smoke PWA; Android Hermes 1.067 módulos. O resumo da matriz informa API 24 arquivos/172 testes, 1 ignorado; a divergência entre registros fica explícita e nenhum total aprova o merge atual.
- A matriz da branch registra deploys `SUCCESS`, GET `/` e `/health` `200`, e `/api/v1/auth/me` `401` JSON via proxy. Esse histórico comprova publicação/HTTP básico daquela versão, sem aceite de login/cookie, Socket.IO, cache ou Safari/iPhone e sem comprovar deploy da integração.
- O Premium e a galeria privada ainda não estavam presentes naquele checkout PWA; ambos já existem na main e são preservados na integração. Os aceites de serviços reais e dispositivos continuam pendentes.

## 24/09/2026 — Implementação do Premium gratuito de demonstração

- Implementados os campos/tabela de trial e uso diário, status/ativação API, prompts de onboarding e conta existente, status no Perfil e gate da lista de curtidas recebidas.
- Trial começa após aceite, dura 30 × 24 horas, é ativado uma vez por conta verificada e não cobra nem renova. Conta gratuita tem 15 likes distintos por dia de São Paulo; PASS não consome vaga.
- PWA usa access token em memória e refresh cookie seguro na mesma origem HTTPS via proxy `/api`; HTTP de LAN é bloqueado, refresh entre abas usa Web Locks e logout só limpa local após revogar no servidor.
- Ajustes de revisão: data da quota é lida depois do lock transacional; `serverNow` e timer do cliente escondem identidades exatamente no fim e limpam o cache; a contagem é rotulada como curtidas pendentes.
- Revisão final: timeout de 30 dias dividido em blocos inferiores ao limite do navegador; logout preserva cookie quando revogação falha; Curtidas enviadas tem erro/retry e ações por ícone recebem rótulos para leitor de tela.
- Ajuste solicitado: a oferta passou de toast a bottom sheet ancorado no rodapé, com entrada animada de baixo para cima; contas existentes elegíveis veem o painel logo após login, uma vez por sessão.
- O bottom sheet Premium também fecha ao tocar na área externa ou ao arrastar a alça/cabeçalho para baixo; gestos curtos só fecham quando são rápidos o suficiente.
- Validação do gesto: app 57/57, typecheck e exports Web/Android aprovados; arraste e toque fora ainda precisam de conferência em aparelhos físicos.
- Validação: API 198 aprovados/2 ignorados, app 57 aprovados, typecheck/lint/Prisma aprovados e exports PWA/Android concluídos. Build APK e aceite físico/leitor de tela permanecem pendentes por falta de Android SDK/JDK e dispositivos.
- Atualizados docs/01, 02, 03, 04, 05, 06, 07, 13, 14, 15, README e plano 007. A cobrança real continua fora do escopo.

## 24/09/2026 — Planejamento do Premium gratuito para o MVP

- Criado o plano 007 para um acesso Premium de 30 dias exatos, iniciado somente após escolha explícita; contas novas e existentes podem ativar uma vez.
- No MVP de TCC não haverá pagamento real, cartão, transação, renovação ou gateway. Os cards semanal, mensal e anual ficam como “Em breve”, sem preço ou botão de compra.
- Durante o período: lista/identidade de curtidas recebidas e likes ilimitados. Sem Premium: contador agregado permanece, curtidas enviadas continuam acessíveis e o limite é 15 livros curtidos por dia em America/Sao_Paulo.
- Registrados no plano a expiração sem cobrança, os prompts distintos para contas novas/existentes, o estado no servidor e a dependência de autenticação PWA segura.
- A revisão das políticas Apple, Google Play e Expo foi feita via Context7 e documentação oficial. A cobrança futura de recursos digitais fica para outra fase e exige novo aceite das regras por loja/região.
- Atualizados os documentos 01, 02, 03, 04, 05, 06, 07, README, 13, 14 e 15 para distinguir decisões aprovadas, itens planejados e funcionalidades implementadas.

## 24/09/2026 — Correções técnicas da tela de Curtidas

- O app agora adapta nextCursor/hasMore da resposta de Curtidas ao contrato interno pageInfo, reativando a paginação infinita.
- Curtir de volta e dispensar passaram a usar um livro disponível pertencente a quem curtiu. Quando não há livro disponível, a resposta da API é actorBook: null e o card informa por que as ações não aparecem.
- Adicionados testes de regressão para o mapeamento da paginação e a serialização do livro de resposta.

## 24/09/2026 — Tela de Curtidas

- Criado módulo `likes` na API com 4 endpoints privados: `GET /likes/received` (curtidas recebidas com paginação), `GET /likes/sent` (curtidas enviadas), `GET /likes/received/count` (contagem de pendentes para badge) e `GET /likes/received/books` (livros com curtidas para filtro).
- A contagem de pendentes usa query raw `NOT EXISTS` para identificar curtidas recebidas onde o usuário ainda não interagiu com nenhum livro do ator.
- Ações de curtir de volta, dispensar e remover curtida reutilizam `POST /interactions` existente com upsert (`LIKE` ou `PASS`).
- Criado componente `LikeCard` com `ImageBackground` (capa do livro), `Avatar` (28px) e gradiente inferior, suportando variantes `received` (botões de curtir/dispensar) e `sent` (botão de remover curtida).
- Criada tela `Likes` com `ToggleGroup` (recebidas/enviadas), grid de 2 colunas via `FlatList`, paginação infinita por cursor, pull-to-refresh, filtros de ordenação e por livro, estados vazios via `StateView` e confirmação modal ao remover curtida.
- Navegação atualizada para 5 abas: Descobrir, **Curtidas** (nova, posição central), Biblioteca, Mensagens e Perfil. Badge de contagem na aba com polling a cada 30 segundos.
- iOS: SF Symbol `heart.fill` com badge nativo. Android/Web: MaterialIcons `favorite`.
- Documentação atualizada: `03-frontend-mobile.md` (navegação e tela), `05-contrato-api.md` (endpoints).

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
