# Plano 001 — Criação do MVP do MyBooks

- Status: IMPLEMENTADO — ACEITE PONTA A PONTA PENDENTE DE AMBIENTE
- Tipo: MOBILE
- Prioridade: ALTA
- Data de criação: 31/08/2026
- Escopo: retomada do projeto, modernização visual, base técnica e entrega do MVP
- Repositórios envolvidos: app mobile e API

## Registro da execução — 31/08/2026

O escopo técnico do MVP foi implementado no checkout: nova interface mobile, API modular, schema e migração Prisma, Clerk, ISBN/BrasilAPI, R2, Resend, matches e Socket.IO. A documentação de evidências está em `docs/14-execucao-do-mvp.md`.

Validações concluídas: TypeScript do app, Expo Doctor 18/18, bundle Android/Hermes, geração e validação do Prisma Client/schema, Docker Compose com PostgreSQL saudável e 5 migrações aplicadas, inicialização e health check da API, lint e 29 testes automatizados em 9 arquivos. Busca/ordenação/paginação da biblioteca, paginação da descoberta, lista de matches e chat com ack/retry/reconexão também foram concluídos. O aceite com credenciais reais de Clerk/R2/Resend e dois dispositivos continua pendente porque esses recursos não estão disponíveis nesta máquina.

## 1. Objetivo

Retomar o MyBooks, que está parado e tecnicamente desatualizado, transformando o código existente em um MVP mobile funcional, seguro, demonstrável e documentado para o TCC.

O MVP deverá permitir que uma pessoa:

1. crie e acesse sua conta usando Clerk;
2. mantenha seu perfil;
3. cadastre livros manualmente ou use o ISBN como preenchimento assistido, em um fluxo semelhante ao ViaCEP;
4. consulte e edite sua biblioteca;
5. envie imagens de seus livros para um bucket Cloudflare compatível com S3;
6. descubra livros e pessoas dentro do recorte de produto definido;
7. visualize matches;
8. converse com um match usando histórico HTTP e atualização em tempo real com Socket.IO;
9. receba os e-mails transacionais necessários por Resend;
10. execute todo o ambiente local com PostgreSQL e API orquestrados por Docker.

O plano preserva JavaScript, React/React Native, Node.js, Express, PostgreSQL, Prisma ORM e Socket.IO. A interface continuará mobile-first, mas será reconstruída usando uma estratégia de componentes compatível com React Native inspirada em shadcn, sem importar componentes web baseados em DOM para telas nativas.

## 2. Referências utilizadas

### Documentação do projeto

- docs/README.md — índice, princípios obrigatórios e mapa do repositório.
- docs/01-visao-geral.md — objetivo, limites e stack observada.
- docs/02-arquitetura.md — fluxo entre app, API, serviços, repositórios e banco.
- docs/03-frontend-mobile.md — navegação, telas, formulários, rede, teclado e acessibilidade.
- docs/04-backend-api.md — convenções de Express, módulos, validação, DTOs e respostas.
- docs/05-contrato-api.md — rotas legadas e padrão para novos endpoints.
- docs/06-banco-de-dados.md — Prisma, PostgreSQL, migrações, relações e performance.
- docs/07-autenticacao-seguranca.md — proteção de sessão, autorização, uploads e dados sensíveis.
- docs/08-tempo-real-chat.md — contrato-alvo para Socket.IO, salas, idempotência e reconexão.
- docs/09-design-system-components.md — tokens, acessibilidade, componentes e UX mobile.
- docs/10-docker-ambientes.md — topologia e fluxo de ambientes.
- docs/11-qualidade-testes.md — estratégia de testes e Definition of Done.
- docs/12-contribuicao.md — branches, commits, revisão e documentação viva.
- docs/13-pendencias-conhecidas.md — problemas já identificados no checkout atual.

### Referência visual enviada

O arquivo colado em C:\Users\ESTUDIO-TREINAMENTO\.codex\attachments\7ee81e65-be2e-41ff-a380-4c2a2332a3d1\pasted-text.txt foi tratado como referência de produto e interface, não como código pronto para ser copiado.

Foram identificadas as seguintes superfícies visuais:

- Minha Biblioteca, com grid de livros, estado vazio e botão de adicionar.
- Perfil do utilizador.
- Mensagens e novos matches.
- Descoberta, com cartão de livro e ações de gostar ou passar.
- Navegação mobile inferior com Home/Descoberta, Biblioteca, Mensagens e Perfil.
- Identidade visual baseada em superfície clara quente, magenta/bordô como ação principal, roxo como cor secundária, gradientes de marca, cards arredondados e tipografia de destaque.

### Skills que orientam a execução

- shadcn: será usado na escolha, composição e padronização dos componentes reutilizáveis. Para chat, utilizar somente primitives/adaptadores compatíveis com React Native.
- frontend-design: será usado para consolidar uma direção visual intencional, tokens semânticos, hierarquia tipográfica, estados completos de interface, acessibilidade e revisão visual das telas.

## 3. Agente de IA recomendado

A referência solicitada em agents/README.md não foi encontrada neste checkout: não existe a pasta agents nem o arquivo .agents/README.md disponível para consulta. Portanto, a escolha abaixo é uma recomendação explícita por aderência ao trabalho, e deve ser revisada quando o catálogo de agentes for disponibilizado.

### Perfil recomendado

Agente de arquitetura e implementação full-stack para produto mobile.

### Responsabilidades do agente

- auditar código legado antes de modificar comportamento;
- transformar requisitos de produto em decisões técnicas registradas;
- trabalhar simultaneamente em app mobile, API, banco e infraestrutura;
- respeitar a separação pages/components/services/hooks no app;
- respeitar a separação module/controller/service/repository/validator/DTO no backend;
- desenhar contratos antes de conectar telas;
- validar autenticação, autorização, ownership e exposição de dados;
- coordenar migrações Prisma e ambiente Docker;
- integrar Clerk, Cloudflare S3/R2, Resend e o provedor de ISBN por adapters isolados;
- criar testes proporcionais ao risco;
- manter docs e contratos sincronizados para a apresentação do TCC.

### Forma de trabalho esperada

O agente deverá executar uma etapa por vez, deixar evidência verificável ao final de cada etapa, não apagar o legado sem decisão de compatibilidade e separar correção bloqueadora de débito técnico não relacionado.

## 4. Estado atual e pontos de atenção

O checkout atual já possui:

- app Expo/React Native com TypeScript e JavaScript misturados;
- React Navigation com rotas públicas e privadas;
- telas iniciais de dashboard, busca e perfil;
- API Express em módulos parcialmente separados;
- Prisma configurado para PostgreSQL;
- autenticação própria com JWT e bcrypt;
- upload local com Multer;
- modelos User, Book e BookImage.

O checkout ainda não possui, de forma concluída:

- Clerk;
- integração com Cloudflare R2/S3;
- Resend;
- consulta de ISBN;
- Dockerfile e compose.yaml;
- Socket.IO instalado e integrado;
- biblioteca/adaptador shadcn para React Native;
- suíte de testes completa;
- contrato de API versionado;
- ownership consistente em todas as operações.

Pendências conhecidas que podem bloquear o MVP:

- uso de __dirname em módulo ES na API;
- repository de imagens sem Prisma inicializado;
- divergência entre req.user e req.user_id;
- DTO de usuário com nome inconsistente;
- referência a relação inexistente no UserRepository;
- URLs e configurações fixas no cliente;
- possíveis respostas duplicadas em controllers;
- ausência de tratamento centralizado de erros;
- ausência de health check;
- divergência entre schema SQL legado e Prisma.

## 5. Decisões arquiteturais do MVP

### 5.1 Identidade

Clerk será a fonte de verdade para identidade, sessão, senha, verificação de e-mail e recuperação de acesso.

O banco do MyBooks manterá um usuário de domínio com um campo único clerkUserId. O usuário local armazenará apenas os dados necessários ao produto, como nome público, preferências e relações com livros. Não manteremos uma segunda senha no PostgreSQL.

O login e o cadastro antigos poderão permanecer temporariamente isolados para migração e compatibilidade, mas não devem ser usados pelo novo app após a conclusão da troca.

### 5.2 Recuperação de senha e Resend

O fluxo de redefinição deve continuar sob controle do Clerk, evitando que o MyBooks armazene tokens de recuperação ou implemente uma segunda política de senha.

Na fase de decisões externas, verificar a configuração suportada para entrega de e-mails do Clerk usando Resend. Se a configuração direta não estiver disponível no ambiente escolhido, usar Clerk para o fluxo de recuperação e Resend para e-mails transacionais do produto, sem criar tokens paralelos. Essa decisão deverá ser registrada antes da implementação.

### 5.3 Imagens

Cloudflare R2, por ser compatível com a API S3, será acessado no backend por um cliente S3 e por URLs pré-assinadas quando isso reduzir o tráfego da API.

O PostgreSQL armazenará metadados, como storageKey, tipo, tamanho, isCover e relação com o livro. Não armazenar binário de imagem no banco.

### 5.4 ISBN como complemento do cadastro

O ISBN será um complemento opcional do cadastro de livros, e não uma etapa obrigatória. A experiência esperada é semelhante ao ViaCEP:

1. a pessoa digita ou cola o ISBN;
2. o app normaliza espaços, hífens e demais caracteres;
3. a pessoa toca em Consultar ou o app consulta ao sair do campo;
4. a API valida o formato e consulta o adapter API Brasil/BrasilAPI;
5. os dados encontrados preenchem os campos do formulário;
6. a pessoa revisa, corrige ou completa os dados;
7. somente ao salvar a API revalida o ISBN e persiste o livro;
8. livros com ISBN normalizado e válido recebem o selo de ISBN.

O app nunca chamará o provedor externo diretamente. A consulta enriquece o formulário, mas não substitui a revisão da pessoa usuária. Se o provedor estiver indisponível, o cadastro manual continuará possível.

Estados do campo:

- vazio: cadastro sem ISBN, sem selo;
- consultando: loading no campo e botão desabilitado contra chamadas duplicadas;
- encontrado: dados preenchidos e ISBN pronto para revisão;
- não encontrado: manter o que a pessoa digitou, permitir preenchimento manual e informar o resultado;
- erro de rede/provedor: permitir continuar manualmente;
- inválido: informar o problema de formato ou dígito verificador e não aplicar o selo.

Regra recomendada para o selo:

- o selo é concedido pelo backend quando o ISBN normalizado passa a validação oficial de formato/dígito verificador;
- a consulta API Brasil é a fonte preferencial para preencher metadados, mas sua indisponibilidade não deve impedir um ISBN válido informado manualmente;
- ISBN vazio, inválido ou removido não possui selo;
- o app não deve decidir o selo somente a partir do texto digitado;
- o selo deve ser renderizado como um Badge/BookBadge reutilizável, com texto acessível equivalente a “ISBN informado e válido”.

Persistir, conforme a decisão de modelagem, o ISBN normalizado, status de validação, origem da informação e data de validação. O valor formatado para exibição pode ser derivado no app.

### 5.5 API

Novos endpoints usarão /api/v1, nomes em minúsculas e substantivos no plural. Rotas legadas como /Books/Create e /Users/Update/:id serão marcadas para migração, não ampliadas.

Fluxo obrigatório:

routes → middleware → controller → service/use case → repository → Prisma → DTO/serializer

### 5.6 App mobile

O app permanecerá em Expo/React Native. React Navigation continuará sendo a base de navegação, salvo decisão posterior com justificativa.

Estrutura obrigatória para páginas:

    app/src/pages/
      NomeDaPagina/
        index.tsx
        styles.ts

Estrutura obrigatória para componentes reutilizáveis:

    app/src/components/
      NomeDoComponente/
        index.tsx
        styles.ts
        types.ts

Cada página deverá compor componentes, hooks e services. Regras de negócio não devem ficar dentro de componentes visuais.

### 5.7 shadcn em React Native

Antes de fixar a dependência, fazer um spike técnico curto para validar o adaptador escolhido e executar a busca/documentação de componentes prevista pela skill shadcn.

Primitives mínimos para validar:

- Button;
- Input;
- Card;
- Badge;
- Avatar;
- Dialog ou Sheet;
- Toast/Feedback;
- Skeleton;
- componentes de chat equivalentes a MessageScroller, Message/Bubble, Attachment e Marker, caso o adaptador forneça suporte nativo.

Nenhum componente web que dependa de DOM, HTML ou CSS será importado diretamente em uma tela React Native.

## 6. Escopo do MVP

### Incluído

- autenticação, sessão, logout e recuperação via Clerk;
- sincronização do usuário Clerk com o usuário de domínio;
- perfil básico;
- cadastro, listagem, detalhe, edição e exclusão de livros;
- preenchimento assistido por ISBN semelhante ao ViaCEP;
- selo de ISBN para livros com ISBN normalizado e válido;
- até o limite de imagens definido na fase de regras;
- upload e remoção de imagens em Cloudflare R2;
- biblioteca com grid e estado vazio;
- descoberta com paginação e ações de interesse;
- match básico conforme regra aprovada;
- lista de matches e conversas;
- histórico paginado de mensagens;
- envio de mensagem com confirmação e retry;
- atualização em tempo real de mensagens e presença básica;
- e-mails transacionais essenciais;
- PostgreSQL via Docker e migrações Prisma;
- documentação, testes mínimos e roteiro de demonstração do TCC.

### Fora do MVP

- recomendação baseada em machine learning;
- feed offline com sincronização complexa;
- push notifications nativas;
- pagamentos;
- painel administrativo completo;
- moderação automática;
- multi-idioma;
- analytics avançado;
- troca logística ou rastreamento de encomendas;
- chamada de áudio/vídeo;
- microserviços separados;
- busca full-text avançada antes de haver necessidade comprovada.

## 7. Fluxo de dependências

    Fase 0 — decisões e auditoria
        ↓
    Fase 1 — fundação e ambiente
        ↓
    Fase 2 — design system e spike shadcn
        ↓
    Fase 3 — Clerk e usuário de domínio
        ↓
    Fase 4 — PostgreSQL, Prisma e migração
        ↓
    Fase 5 — módulos da API e contratos
        ↓
    Fase 6 — livros, ISBN e imagens
        ↓
    Fase 7 — telas mobile e integração HTTP
        ↓
    Fase 8 — matches, chat e Socket.IO
        ↓
    Fase 9 — Resend, testes, segurança e observabilidade
        ↓
    Fase 10 — validação final e evidências do TCC

Fases 3 e 4 podem avançar em paralelo depois da fundação, mas a integração completa da API depende das duas.

## 8. Plano passo a passo

## Fase 0 — Descoberta, decisões e linha de base

### MVP-001 — Registrar a linha de base

- revisar os scripts de app e API;
- identificar o gerenciador de pacotes oficial;
- fixar a versão de Node.js;
- executar o que já existe sem alterar o código;
- registrar comandos que funcionam e comandos que falham;
- salvar uma fotografia do estado inicial para comparação.

Critério de aceite: qualquer pessoa do time consegue repetir a instalação e sabe exatamente quais partes estão funcionando antes da retomada.

### MVP-002 — Escolher a estratégia de dados antigos

- verificar se há dados que precisam ser preservados;
- separar banco descartável de desenvolvimento de banco compartilhado;
- decidir entre migração de usuários existentes ou reinicialização controlada;
- mapear como usuários antigos serão associados a clerkUserId;
- documentar o plano de rollback.

Critério de aceite: nenhuma migração destrutiva é executada sem decisão registrada e cópia/estratégia de recuperação.

### MVP-003 — Fechar as regras de produto

Definir por escrito:

- o que representa um livro disponível;
- quem pode visualizar um livro;
- o que significa gostar, passar e desfazer;
- quando dois interesses geram um match;
- quem pode abrir uma conversa;
- quais campos são obrigatórios;
- quantidade, tamanho e tipos de imagens;
- retenção e exclusão de imagens;
- limite de mensagens e paginação;
- se notificações exibidas no layout serão apenas in-app no MVP.

Critério de aceite: o time consegue responder às perguntas acima sem depender de interpretação individual durante o desenvolvimento.

### MVP-004 — Registrar decisões de fornecedores

Validar contas, limites, credenciais e ambientes de:

- Clerk;
- Resend;
- Cloudflare R2;
- provedor API Brasil/BrasilAPI;
- PostgreSQL local em Docker.

Registrar a decisão sobre a entrega de e-mails do Clerk via Resend. Nenhuma chave deve ser colocada no repositório.

Critério de aceite: cada integração tem responsável, variáveis esperadas, ambiente de teste e plano de fallback.

### MVP-005 — Definir o spike do shadcn mobile

- listar os componentes necessários ao MVP;
- testar um componente de entrada, um card, um overlay e um componente de chat;
- confirmar compatibilidade com Expo/React Native;
- confirmar suporte a tema, acessibilidade, variantes e estilos;
- decidir o adaptador a ser adotado ou documentar o conjunto de primitives equivalente.

Critério de aceite: existe uma tela de prova visual com os componentes escolhidos e uma decisão que não dependa de componentes DOM.

## Fase 1 — Fundação do repositório e ambiente

### MVP-006 — Padronizar os pacotes

- escolher npm ou yarn como gerenciador oficial;
- remover a ambiguidade entre lockfiles sem apagar arquivos sem revisão;
- fixar Node.js em arquivo de projeto;
- padronizar scripts de dev, build, lint, typecheck e test;
- separar scripts do app e da API.

Critério de aceite: instalação limpa e comandos documentados funcionam com o gerenciador escolhido.

### MVP-007 — Criar configuração por ambiente

Criar arquivos de exemplo sem segredos e separar:

- .env.example para API;
- .env.example para app;
- configuração de teste;
- carregamento validado de variáveis;
- API_BASE_URL alcançável por dispositivo/emulador;
- URLs e endpoints externos.

Variáveis mínimas esperadas:

- DATABASE_URL;
- PORT;
- CLERK_SECRET_KEY;
- CLERK_PUBLISHABLE_KEY;
- CLERK_JWT_ISSUER_DOMAIN;
- CLERK_WEBHOOK_SIGNING_SECRET;
- R2_ACCOUNT_ID ou endpoint S3 equivalente;
- R2_ACCESS_KEY_ID;
- R2_SECRET_ACCESS_KEY;
- R2_BUCKET;
- R2_PUBLIC_URL ou estratégia de URL assinada;
- RESEND_API_KEY;
- RESEND_FROM_EMAIL;
- ISBN_API_BASE_URL;
- ISBN_API_TOKEN, somente se exigido pelo provedor;
- API_BASE_URL;
- SOCKET_URL.

Critério de aceite: nenhuma credencial ou URL de máquina local fica hardcoded no código.

### MVP-008 — Criar Docker para PostgreSQL e API

- criar compose.yaml;
- subir PostgreSQL com volume nomeado;
- adicionar healthcheck;
- configurar API para depender do banco saudável;
- decidir se a API roda em modo desenvolvimento ou produção no container;
- não containerizar o Expo no primeiro momento;
- documentar acesso do dispositivo à API.

Critério de aceite: uma pessoa nova sobe o banco e a API com o fluxo descrito em docs/10-docker-ambientes.md.

### MVP-009 — Corrigir bloqueadores de execução do legado

Corrigir somente o que impede o novo caminho:

- __dirname em módulos ES;
- inicialização/import do Prisma;
- nomes inconsistentes de DTO;
- referências a relações inexistentes;
- fluxo de resposta após 404;
- criação segura do diretório de upload durante a transição;
- health check;
- tratamento centralizado de erros;
- CORS, requestId e logging com redaction.

Critério de aceite: a API inicializa sem erro, responde a /health e não expõe detalhes internos ao cliente.

## Fase 2 — Design system e arquitetura do app

### MVP-010 — Consolidar a direção visual

Usar a referência enviada como base para uma identidade nova, sem transportar classes Tailwind diretamente para o app.

Tokens semânticos iniciais:

- primary: bordô/magenta;
- secondary: roxo;
- background: superfície clara quente;
- surface: branco quente;
- foreground: marrom quase preto;
- muted: texto secundário;
- danger: erro;
- outline: borda;
- success: confirmação.

Definir:

- escala tipográfica para display, título, corpo, label e caption;
- espaçamento baseado em múltiplos de 4;
- raios de cards, botões e avatar;
- elevação/sombra;
- estados pressed, disabled, loading, error e focused;
- contraste e modo de fonte ampliada.

Critério de aceite: as telas usam tokens nomeados e não espalham hexadecimais ou medidas sem justificativa.

### MVP-011 — Criar primitives reutilizáveis

Implementar ou adaptar via shadcn:

- AppScreen;
- AppText;
- Button;
- IconButton;
- TextField;
- PasswordField;
- SearchField;
- Card;
- BookCard;
- Avatar;
- Badge;
- EmptyState;
- LoadingState;
- ErrorState;
- BottomTabBar;
- Sheet/Dialog;
- Toast/feedback;
- ImagePickerField;
- Skeleton.

Cada componente deve aceitar props, ser acessível, não conhecer API/Prisma/socket e ter styles.ts quando houver estilos específicos.

Critério de aceite: páginas novas não repetem markup visual e conseguem compor os estados básicos apenas com componentes reutilizáveis.

### MVP-012 — Definir a árvore de telas

Estrutura prevista:

    app/src/pages/
      Auth/
        index.tsx
        styles.ts
      Discover/
        index.tsx
        styles.ts
      Library/
        index.tsx
        styles.ts
      BookCreate/
        index.tsx
        styles.ts
      BookDetails/
        index.tsx
        styles.ts
      Matches/
        index.tsx
        styles.ts
      Messages/
        index.tsx
        styles.ts
      Chat/
        index.tsx
        styles.ts
      Profile/
        index.tsx
        styles.ts

Cada página terá estilos próprios. A pasta de styles compartilhados conterá somente tokens, tema e helpers visuais, não estilos específicos de várias páginas.

Critério de aceite: a navegação pública e privada está tipada, documentada e não passa tokens ou objetos grandes entre telas.

## Fase 3 — Clerk e ciclo de sessão

### MVP-013 — Integrar o Clerk ao app

- adicionar o provider no ponto único da aplicação;
- configurar chave pública por ambiente;
- criar fluxo de sessão carregando, autenticado e não autenticado;
- criar telas de login, cadastro, verificação e recuperação;
- usar armazenamento seguro compatível com o sistema operacional;
- remover persistência de senha;
- limpar listeners e estado ao fazer logout.

Critério de aceite: fechar e reabrir o app restaura uma sessão válida, sessão inválida retorna ao fluxo de autenticação e nenhum token é exibido em logs.

### MVP-014 — Proteger a API com Clerk

- validar o token recebido no backend;
- rejeitar token ausente, inválido, expirado ou de issuer incorreto;
- extrair identidade do token sem aceitar userId do body;
- criar contexto de usuário autenticado;
- registrar requestId sem registrar Authorization;
- definir resposta 401 estável.

Critério de aceite: todas as rotas privadas exigem Clerk e não aceitam identidade arbitrária enviada pelo app.

### MVP-015 — Sincronizar usuário de domínio

- adicionar clerkUserId único;
- criar use case idempotente de sincronização;
- processar criação/atualização por webhook, se habilitado;
- ter fallback get-or-create no primeiro acesso autenticado;
- mapear nome e e-mail sem sobrescrever dados de forma inesperada;
- tratar exclusão conforme política de privacidade.

Critério de aceite: um usuário Clerk só cria um usuário de domínio e o app consegue carregar /api/v1/me.

### MVP-016 — Retirar o JWT próprio do caminho principal

- marcar /login e /login/register como legado;
- impedir que novas telas dependam dessas rotas;
- remover bcrypt e JWT do fluxo principal quando não houver dependentes;
- atualizar documentação e contrato;
- definir janela de compatibilidade caso existam dados reais.

Critério de aceite: o fluxo oficial do MVP não mantém duas fontes de identidade.

## Fase 4 — PostgreSQL, Prisma e modelo de domínio

### MVP-017 — Revisar e migrar o schema

Modelar, no mínimo:

- User com clerkUserId único;
- Book com dono obrigatório no novo fluxo;
- campos mínimos aprovados em MVP-003;
- ISBN normalizado, status/origem de validação e data de validação;
- BookImage com storageKey, mimeType, size, isCover e timestamps;
- índices de dono, ISBN, ordenação e busca;
- constraints de unicidade e integridade;
- onDelete coerente com a política.

Se matches e chat entrarem no MVP conforme MVP-003, incluir:

- Interaction ou Interest;
- Match;
- Conversation;
- ConversationMember;
- Message com clientMessageId único por conversa/remetente ou regra equivalente.

Critério de aceite: o schema representa as regras de domínio e não possui campos sensíveis sem justificativa.

### MVP-018 — Criar migrações Prisma

- alterar schema.prisma;
- gerar migrações nomeadas;
- revisar o SQL;
- aplicar no banco local Docker;
- regenerar Prisma Client;
- testar banco vazio;
- testar dados de fixture;
- documentar incompatibilidades com o schema SQL legado.

Critério de aceite: um banco novo chega ao estado esperado somente com migrações versionadas.

### MVP-019 — Isolar ou remover acesso pg legado

- identificar consumidores do módulo SQL legado;
- migrar os fluxos usados pelo MVP para Prisma;
- impedir que novos repositories usem SQL manual sem decisão;
- atualizar docs/06-banco-de-dados.md;
- remover código legado somente depois de validar que não há consumidores.

Critério de aceite: Prisma é a fonte de acesso do MVP e a divergência restante está documentada.

## Fase 5 — Backend modular

### MVP-020 — Reorganizar a API por módulos

Estrutura alvo:

    API/src/
      config/
      shared/
        database/
        errors/
        http/
        observability/
      modules/
        auth/
          controllers/
          services/
          repositories/
          routes/
          middlewares/
          validators/
          DTO/
        users/
          controllers/
          services/
          repositories/
          routes/
          middlewares/
          validators/
          DTO/
        books/
          controllers/
          services/
          repositories/
          routes/
          middlewares/
          validators/
          DTO/
        media/
          controllers/
          services/
          repositories/
          routes/
          middlewares/
          validators/
          DTO/
        isbn/
          controllers/
          services/
          repositories/
          routes/
          validators/
          DTO/
        matches/
          controllers/
          services/
          repositories/
          routes/
          middlewares/
          validators/
          DTO/
        chat/
          controllers/
          services/
          repositories/
          routes/
          middlewares/
          validators/
          DTO/
        email/
          services/
          templates/
        health/
          controllers/
          routes/

A regra de negócio fica dentro do módulo correspondente. Shared conterá apenas infraestrutura realmente transversal.

Critério de aceite: routes não acessam Prisma, controllers são finos e repositories não definem status HTTP.

### MVP-021 — Criar contrato de erro e validação

- padronizar envelope de erro;
- validar body, params e query na API;
- validar UUID, ISBN, paginação, enum, texto e tamanho;
- mapear erros de Prisma para códigos seguros;
- adicionar requestId;
- evitar stack trace e segredo na resposta.

Critério de aceite: app e API tratam erros previsíveis sem depender de mensagens internas.

### MVP-022 — Criar endpoints de perfil

Implementar:

- GET /api/v1/me;
- PATCH /api/v1/me;
- DELETE /api/v1/me, somente se a política de exclusão estiver aprovada.

Critério de aceite: a pessoa só lê e altera o próprio perfil, com DTO sem dados internos.

### MVP-023 — Criar endpoints de livros

Implementar:

- GET /api/v1/books;
- GET /api/v1/books/:id;
- POST /api/v1/books;
- PATCH /api/v1/books/:id;
- DELETE /api/v1/books/:id.

Regras:

- dono derivado da sessão;
- nenhuma operação confia em userId enviado pelo cliente;
- listas paginadas e ordenadas;
- ISBN normalizado;
- título e campos de domínio validados;
- exclusão com política para imagens associadas.

Critério de aceite: usuário A não consegue ler, editar, excluir ou anexar imagens ao livro do usuário B.

## Fase 6 — Integrações de ISBN, R2 e e-mail

### MVP-024 — Implementar o adapter de ISBN

- criar interface de provedor;
- criar implementação API Brasil/BrasilAPI;
- normalizar ISBN-10/ISBN-13;
- validar comprimento, caracteres permitidos e dígito verificador;
- definir timeout;
- tratar não encontrado, rate limit e indisponibilidade;
- mapear título, autores, editora, publicação, capa e demais campos aprovados para o formulário;
- permitir revisão manual;
- aplicar cache curto quando apropriado;
- não expor credencial do provedor no app.

Endpoint sugerido:

- GET /api/v1/isbn/:isbn.

Resposta conceitual sugerida:

    {
      "data": {
        "isbn": "9780000000000",
        "status": "FOUND",
        "source": "BRASIL_API",
        "book": {
          "title": "Título retornado",
          "authors": ["Autoria"],
          "publisher": "Editora",
          "publishedAt": "2026-01-01",
          "coverUrl": "https://..."
        }
      }
    }

Critério de aceite: uma busca válida preenche dados úteis, uma busca inválida mostra erro compreensível, uma indisponibilidade não bloqueia o cadastro manual e o backend retorna status suficiente para a interface decidir o estado do campo.

### MVP-025 — Configurar Cloudflare R2/S3

- criar bucket separado por ambiente;
- configurar CORS mínimo para o fluxo escolhido;
- configurar lifecycle/limpeza para objetos abandonados;
- criar adapter storageService;
- gerar objectKey no backend;
- validar MIME e tamanho;
- impedir path traversal e nome controlado pelo cliente;
- definir URL pública ou assinada;
- definir expiração de URL.

Critério de aceite: uma imagem de usuário só pode ser vinculada a livro autorizado e o bucket não recebe nomes arbitrários.

### MVP-026 — Implementar fluxo de imagens

Endpoints sugeridos:

- POST /api/v1/books/:bookId/images/presign;
- POST /api/v1/books/:bookId/images/complete;
- DELETE /api/v1/books/:bookId/images/:imageId.

Fluxo mobile:

1. selecionar imagem;
2. validar formato e tamanho localmente;
3. pedir presigned URL;
4. enviar arquivo para R2;
5. confirmar upload na API;
6. atualizar a biblioteca;
7. remover objeto e metadado quando necessário.

Critério de aceite: falha no upload não deixa registro órfão sem política de limpeza e a capa pode ser definida com autorização.

### MVP-027 — Criar módulo de e-mail com Resend

- criar EmailService isolado;
- criar templates versionados;
- validar domínio e remetente;
- implementar e-mails transacionais do produto;
- evitar envio duplicado;
- registrar apenas metadados não sensíveis;
- definir tratamento para falhas e retry seguro;
- separar ambiente de teste de produção.

Critério de aceite: o app consegue disparar um e-mail transacional de teste sem expor a chave do Resend.

### MVP-028 — Fechar o fluxo de recuperação

- testar recuperação nativa do Clerk;
- verificar entrega por Resend conforme decisão de MVP-004;
- validar expiração, uso único e retorno após redefinição;
- testar e-mail não verificado e conta inexistente sem enumeração de usuários;
- não criar tabela própria de reset.

Critério de aceite: recuperação funciona ponta a ponta e a API do MyBooks nunca recebe ou armazena a nova senha.

## Fase 7 — Implementação das telas mobile

### MVP-029 — Reestruturar rotas e providers

- manter NavigationContainer único;
- separar AuthRoutes e AppRoutes;
- adicionar provider de sessão;
- configurar tabs inferiores;
- criar tratamento de loading inicial;
- limpar dados ao logout;
- tipar parâmetros de navegação;
- remover URL fixa do api.js;
- criar cliente HTTP central com interceptor de sessão.

Critério de aceite: não há pisca entre login e área autenticada e 401 encerra a sessão de forma previsível.

### MVP-030 — Criar fluxo de autenticação

Telas:

- login;
- cadastro;
- verificação;
- recuperação;
- estado de sessão expirada.

Cada página terá index.tsx e styles.ts. Os formulários usarão validação client-side para feedback rápido, sem substituir a validação da API/Clerk.

Critério de aceite: erros por campo, loading, prevenção de duplo envio, teclado e safe area funcionam.

### MVP-031 — Criar Descoberta

Reproduzir a intenção visual do cartão de descoberta enviado:

- cartão de livro/pessoa;
- imagem com fallback;
- autor, título, gênero e descrição curta;
- ações de gostar e passar;
- gesto de swipe e botões acessíveis;
- undo somente se a regra de produto permitir;
- loading, vazio, erro e fim da fila;
- paginação/cursor.

Critério de aceite: ação visual gera chamada idempotente e a fila se recupera após erro de rede.

### MVP-032 — Criar Biblioteca

- grid virtualizado;
- BookCard reutilizável;
- botão de adicionar;
- filtros e ordenação mínimos;
- empty state;
- refresh;
- detalhe e edição;
- exclusão confirmada;
- carregamento incremental.

Critério de aceite: a tela corresponde ao usuário autenticado, não carrega tudo sem paginação e funciona em telas pequenas.

### MVP-033 — Criar cadastro e detalhe de livro

- formulário com título e campos aprovados;
- campo ISBN opcional com busca assistida semelhante ao ViaCEP;
- botão de consultar e consulta ao perder foco, sem chamadas duplicadas;
- loading, encontrado, não encontrado, erro de rede e ISBN inválido;
- preenchimento revisável, sem sobrescrever alterações já feitas sem confirmação;
- validação client-side para resposta rápida e revalidação no backend;
- exibição do selo de ISBN somente depois que o backend confirmar ISBN normalizado e válido;
- seletor de imagens;
- definição de capa;
- salvamento em etapas seguras;
- mensagens de sucesso e erro;
- edição usando o mesmo componente de formulário quando possível.

Critério de aceite: é possível cadastrar um livro com ISBN, receber dados preenchidos, revisar/corrigir esses dados, salvar e visualizar o selo de ISBN na biblioteca, no detalhe, na descoberta e onde o BookCard for reutilizado. Também é possível cadastrar sem ISBN, com a mesma qualidade de fluxo e sem selo.

### MVP-034 — Criar Perfil

- carregar dados de /me;
- editar dados permitidos;
- avatar/imagem se estiver dentro da regra aprovada;
- logout;
- acesso a recuperação de conta;
- estados loading, vazio e erro.

Critério de aceite: o perfil não permite alterar identidade de outra pessoa nem exibe dados internos.

## Fase 8 — Matches, chat e Socket.IO

### MVP-035 — Implementar matching mínimo

- persistir a ação de interesse com clientActionId;
- impedir repetição da mesma ação;
- aplicar regra de match mútuo;
- criar conversa apenas quando permitido;
- listar matches do usuário;
- proteger endpoints pelo participante.

Critério de aceite: a mesma ação repetida não cria duplicidade e pessoas sem relação não acessam o match.

### MVP-036 — Implementar histórico HTTP de conversas

- GET /api/v1/conversations;
- GET /api/v1/conversations/:id/messages?cursor=;
- POST /api/v1/conversations/:id/messages como fallback;
- paginação por cursor;
- DTO com status de entrega;
- autorização de membro da conversa.

Critério de aceite: o histórico abre sem Socket.IO e continua funcionando após reconexão.

### MVP-037 — Implementar conexão Socket.IO autenticada

- validar sessão no handshake;
- criar cliente singleton ou provider controlado pela sessão;
- conectar somente após sessão válida;
- desconectar e remover listeners no logout;
- permitir entrada apenas em salas autorizadas;
- limitar payloads e validar eventos;
- definir ack de envio;
- persistir antes de confirmar;
- suportar retry idempotente por clientMessageId;
- recuperar mensagens após reconexão.

Eventos mínimos:

- conversation:join;
- message:send;
- message:created;
- message:ack;
- message:read;
- presence:updated;
- presence:typing.

Critério de aceite: mensagem aceita aparece para os participantes, reenvio não duplica e reconexão recupera o histórico.

### MVP-038 — Criar componentes de chat

Componentes em app/src/components/chat:

- ConversationHeader;
- MessageList;
- MessageBubble;
- TypingIndicator;
- MessageComposer;
- AttachmentButton;
- SendButton;
- ConnectionStateBanner;
- DeliveryStatus.

Os componentes seguirão a linguagem visual shadcn adaptada ao mobile, receberão estado por props e não instanciarão socket diretamente.

Critério de aceite: chat suporta teclado aberto, mensagem longa, envio, falha, retry, vazio, reconexão e acessibilidade.

### MVP-039 — Criar telas de Matches, Messages e Chat

- lista de novos matches;
- lista de conversas;
- detalhe da conversa;
- contador de não lidas se aprovado;
- navegação para perfil/livro;
- estados de conexão;
- retorno previsível;
- scroll e teclado;
- teste com dois usuários.

Critério de aceite: o fluxo visual enviado é convertido para uma experiência nativa sem dependência de HTML/Tailwind.

## Fase 9 — Qualidade, segurança e observabilidade

### MVP-040 — Criar testes de domínio

Cobrir:

- validação e normalização de ISBN;
- cálculo e validação do dígito verificador;
- preenchimento assistido sem sobrescrever edição manual;
- estados encontrado, não encontrado, indisponível e inválido;
- regra de concessão e remoção do selo de ISBN;
- regras de ownership;
- criação e edição de livro;
- definição de capa;
- deduplicação de interesse;
- criação de match;
- idempotência de mensagem;
- serialização sem dados sensíveis;
- erros de integração.

Critério de aceite: regras críticas têm testes independentes de HTTP e de UI.

### MVP-041 — Criar testes de integração da API

Cobrir:

- health check;
- token Clerk válido e inválido;
- sincronização de usuário;
- CRUD de livros;
- acesso cruzado entre usuários;
- migração e constraints Prisma;
- presign/complete/delete de imagens;
- ISBN encontrado, não encontrado, inválido e indisponível;
- persistência do ISBN normalizado e do status de validação;
- livro sem ISBN não exibindo o selo;
- usuário não conseguindo forjar o selo pelo payload;
- e-mail em modo de teste;
- histórico e permissões de conversa;
- handshake, salas e ack do socket.

Critério de aceite: testes rodam em banco isolado e não usam serviços de produção.

### MVP-042 — Criar testes de interface mobile

Cobrir:

- rota pública/privada;
- hidratação da sessão;
- login/cadastro/recuperação;
- formulário com erro;
- biblioteca vazia;
- retry de rede;
- cadastro por ISBN com preenchimento semelhante ao ViaCEP;
- selo de ISBN em cards e detalhe;
- cadastro sem ISBN e estado sem selo;
- seleção e falha de imagem;
- swipe e prevenção de duplo toque;
- chat com envio, falha e reconexão.

Critério de aceite: fluxos críticos possuem verificação reproduzível em simulador/dispositivo.

### MVP-043 — Fazer revisão de segurança

Checklist:

- segredos fora do Git;
- Clerk validado no backend;
- nenhuma senha, hash ou token em log;
- ownership em usuário, livro, imagem, match e conversa;
- MIME, tamanho e autorização em upload;
- URLs de storage com política clara;
- rate limit para endpoints sensíveis;
- CORS restrito por ambiente;
- erro interno não exposto;
- webhook validado;
- e-mail sem enumeração de conta;
- SQL manual legado isolado;
- endpoints versionados e documentados.

Critério de aceite: checklist revisado por outra pessoa do time e pendências de risco alto resolvidas ou formalmente aceitas.

### MVP-044 — Adicionar observabilidade mínima

- requestId;
- logger estruturado;
- duração e status de requisições;
- redaction de headers e campos sensíveis;
- health check;
- log de falha de integração sem segredo;
- métricas simples de erro, latência e conexão do socket;
- instrução de diagnóstico local.

Critério de aceite: uma falha de API pode ser rastreada por requestId sem expor informação privada.

## Fase 10 — Validação final e entrega do TCC

### MVP-045 — Atualizar contratos e documentação

Atualizar:

- docs/README.md;
- docs/04-backend-api.md;
- docs/05-contrato-api.md;
- docs/06-banco-de-dados.md;
- docs/07-autenticacao-seguranca.md;
- docs/08-tempo-real-chat.md;
- docs/09-design-system-components.md;
- docs/10-docker-ambientes.md;
- docs/11-qualidade-testes.md;
- docs/13-pendencias-conhecidas.md.

Adicionar, se necessário:

- ADRs das decisões de Clerk, R2, Resend, ISBN e shadcn mobile;
- diagrama atualizado;
- manual de ambiente;
- roteiro de demonstração;
- matriz de requisitos do TCC.

Critério de aceite: documentação descreve o comportamento real e diferencia implementado, planejado e pendente.

### MVP-046 — Preparar ambiente limpo de demonstração

- clonar ou usar checkout limpo;
- instalar dependências;
- criar .env a partir dos exemplos;
- subir Docker;
- aplicar migrações;
- configurar Clerk de teste;
- configurar bucket de teste;
- configurar Resend de teste;
- iniciar API;
- iniciar Expo;
- validar acesso via dispositivo/emulador;
- carregar fixtures não sensíveis;
- executar roteiro completo com dois usuários.

Critério de aceite: a demonstração não depende do computador ou banco pessoal de quem desenvolveu originalmente.

### MVP-047 — Executar roteiro de aceite do MVP

Roteiro:

1. criar usuário A;
2. verificar e-mail;
3. digitar um ISBN e consultar;
4. verificar o preenchimento dos campos;
5. corrigir um campo retornado e adicionar capa;
6. salvar e confirmar o selo de ISBN;
7. cadastrar outro livro sem ISBN e confirmar que não recebe selo;
8. confirmar presença dos dois livros na biblioteca;
9. criar usuário B;
10. executar interesses conforme regra;
11. gerar match;
12. abrir conversa;
13. enviar mensagens nos dois dispositivos;
14. desconectar e reconectar;
15. editar perfil;
16. testar recuperação de acesso;
17. repetir a consulta com ISBN inválido, não encontrado e provedor indisponível.

Critério de aceite: todos os passos têm resultado observado, evidência e responsável pela validação.

### MVP-048 — Fechar a entrega

- revisar diff e arquivos gerados;
- retirar logs temporários;
- confirmar que nenhum segredo entrou no Git;
- executar lint, typecheck, testes e build;
- atualizar pendências conhecidas;
- criar changelog da versão do MVP;
- registrar limitações conhecidas;
- preparar screenshots ou gravação;
- criar branch e pull request conforme docs/12-contribuicao.md.

Critério de aceite: a entrega é reproduzível, revisável e adequada para apresentação acadêmica.

## 9. Contrato mínimo de APIs do MVP

Todos os endpoints privados usam a sessão Clerk. O formato de erro deve seguir o padrão documentado em docs/04-backend-api.md.

### Sessão e usuário

- GET /api/v1/me
- PATCH /api/v1/me
- DELETE /api/v1/me, somente se aprovado

### Livros

- GET /api/v1/books?cursor=&limit=&sort=
- GET /api/v1/books/:id
- POST /api/v1/books
- PATCH /api/v1/books/:id
- DELETE /api/v1/books/:id

### ISBN

- GET /api/v1/isbn/:isbn

### Imagens

- POST /api/v1/books/:bookId/images/presign
- POST /api/v1/books/:bookId/images/complete
- DELETE /api/v1/books/:bookId/images/:imageId

### Descoberta e matches

- GET /api/v1/discover?cursor=&limit=
- POST /api/v1/interactions
- GET /api/v1/matches

### Conversas

- GET /api/v1/conversations
- GET /api/v1/conversations/:id/messages?cursor=&limit=
- POST /api/v1/conversations/:id/messages

### Infraestrutura

- GET /health

O contrato final deve registrar exemplos de request, response, 401, 403, 404, 409, 422, 429 e 500, quando aplicáveis.

## 10. Critérios gerais de aceite

O MVP somente deve ser considerado entregue quando:

- o app roda como experiência mobile real, não como HTML colado;
- todas as páginas seguem index.tsx e styles.ts;
- componentes reutilizáveis estão concentrados em components;
- componentes não acessam API, Prisma ou socket diretamente;
- API está organizada por módulos;
- controllers não contêm consultas Prisma;
- repositories não decidem status HTTP;
- Clerk é a única fonte de sessão do fluxo principal;
- PostgreSQL sobe por Docker;
- Prisma aplica migrações do zero;
- livros têm ownership;
- ISBN é um complemento opcional, com preenchimento assistido semelhante ao ViaCEP;
- ISBN possui normalização e validação no backend;
- o selo de ISBN é derivado de uma validação do backend e aparece em cards/detalhes;
- o cadastro manual funciona sem ISBN e sem selo;
- imagens passam por validação e Cloudflare R2;
- e-mails não expõem segredos;
- chat tem histórico, autenticação, autorização e idempotência;
- loading, erro, vazio, sucesso, teclado e safe area foram tratados;
- testes mínimos rodam de forma reproduzível;
- contratos e documentação estão atualizados;
- o roteiro do TCC pode ser repetido por outra pessoa.

## 11. Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Integração do shadcn web incompatível com React Native | alto | spike obrigatório e adaptador mobile antes de construir telas |
| Recuperação Clerk + Resend não suportada como imaginada | alto | decisão técnica na Fase 0; Clerk permanece dono do reset |
| Dados antigos sem vínculo Clerk | alto | mapear dados antes da migração e evitar reset destrutivo |
| R2 mal configurado | alto | bucket por ambiente, presign, políticas mínimas e teste de limpeza |
| API Brasil indisponível | médio | adapter, timeout, cache curto e cadastro manual |
| Chat consumir o cronograma | alto | entregar primeiro histórico HTTP e depois tempo real |
| Migração quebrar telas legadas | médio | endpoints versionados, compatibilidade temporária e testes |
| Falta de ownership | crítico | regra central de autorização e testes com dois usuários |
| Mistura TypeScript/JavaScript aumentar inconsistência | médio | manter funcionamento atual e migrar arquivo a arquivo, sem reescrita total |
| Escopo acadêmico crescer sem controle | alto | separar MVP de fora do MVP e exigir decisão para qualquer inclusão |

## 12. Definition of Done por tarefa

Cada item MVP-XXX deve cumprir:

- código ou decisão entregue no local esperado;
- validação automatizada ou manual reproduzível;
- tratamento de sucesso, erro e estado vazio quando houver UI;
- segurança e ownership avaliados;
- documentação/contrato atualizado quando houver impacto;
- sem segredo, token, senha ou dado pessoal em logs;
- revisão por outra pessoa do time;
- card do Kanban atualizado com evidência e pendências;
- nenhum débito não relacionado incluído sem registro.

## 13. Ordem recomendada para o Kanban

1. MVP-001 a MVP-005: descoberta e decisões.
2. MVP-006 a MVP-009: base executável.
3. MVP-010 a MVP-012: identidade visual e componentes.
4. MVP-013 a MVP-016: Clerk e sessão.
5. MVP-017 a MVP-019: banco e migrações.
6. MVP-020 a MVP-023: API modular e livros.
7. MVP-024 a MVP-028: ISBN, storage e e-mail.
8. MVP-029 a MVP-034: telas mobile.
9. MVP-035 a MVP-039: matches e chat.
10. MVP-040 a MVP-044: qualidade e segurança.
11. MVP-045 a MVP-048: documentação, demonstração e entrega.

Cada card deve conter: objetivo, contexto, arquivos afetados, dependências, critérios de aceite, como validar, evidência e pendências. Cards em revisão não devem ser movidos para concluído sem link para teste, screenshot, gravação ou validação equivalente.

## 14. Primeiro próximo passo

Configurar as credenciais de teste do Clerk, R2 e Resend, instalar/configurar um dispositivo ou simulador e executar o roteiro de aceite em `docs/14-execucao-do-mvp.md`. Depois, registrar as evidências com dois usuários e concluir MVP-046 a MVP-048 com o grupo; o Compose local já foi validado em `localhost:5433`/`3001`.
