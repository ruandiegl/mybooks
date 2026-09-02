# Plano 003 — Perfil do usuário com linguagem editorial

## Escopo e leitura da referência

A imagem anexada é uma referência visual, não um documento de requisitos. O texto incorporado nela — “Which one do you like more?” — e os créditos do designer não são instruções para o Mybooks. A decisão deste plano usa somente a primeira tela, no canto superior esquerdo, como referência de composição.

## Objetivo

Transformar o perfil atual em uma tela de identidade + estante pessoal: a pessoa entende rapidamente quem é o leitor, o que ele busca trocar e quais livros estão em circulação. A tela continua sendo o perfil do usuário autenticado, com edição própria, sem assumir que já existe um perfil público de terceiros.

## Base existente do app

- App Expo/React Native com TypeScript.
- `app/src/styles/theme.ts` é a fonte única de cores, espaçamento, tipografia, raios e sombras.
- A família tipográfica oficial é Be Vietnam Pro.
- A tela atual já lê e altera `/api/v1/me` com `name`, `city`, `phone` e `bio`.
- A biblioteca já possui `BookCard`, grid de duas colunas, estado vazio e paginação em `/api/v1/books`.
- A navegação principal já possui a aba Perfil.
- O contrato de usuário já tem `avatarUrl`, mas não existe fluxo próprio de upload de avatar; não liberar edição arbitrária de URL como solução visual.

## Design system extraído da primeira tela

### Composição

1. Cabeçalho visual de tela cheia com imagem/capa e controles de navegação sobrepostos.
2. Cartão de identidade branco invadindo o limite inferior do cabeçalho.
3. Avatar em destaque, inicialmente sobreposto à capa.
4. Nome, localização e biografia centralizados.
5. Linha de três métricas com divisores verticais.
6. Cabeçalho de coleção com título e alternância de visualização.
7. Grade de itens em duas colunas, com imagem dominante e legenda curta.
8. Navegação inferior persistente.

### Princípios visuais

- A capa cria reconhecimento antes do conteúdo textual.
- O branco organiza a leitura e dá contraste ao conteúdo.
- O avatar funciona como âncora de identidade.
- Métricas curtas são escaneáveis e ficam separadas da biografia.
- A grade transforma o perfil em uma vitrine, não em um formulário.
- Ícones são lineares, simples e usados com uma única linguagem de traço.
- A referência usa verde botânico; no Mybooks essa função será exercida pelo bordô/magenta da marca e pelo violeta de conexão.

## Adaptação para o Mybooks

### Direção visual

“Capa editorial do leitor”: o topo deve lembrar a sobrecapa de um livro, com gradiente de marca, textura geométrica discreta baseada em lombadas/páginas e uma fita de marcador magenta como elemento memorável. Não usar foto de planta ou imagem genérica só para reproduzir a referência.

### Tokens a reutilizar

| Papel | Token existente | Uso no perfil |
| --- | --- | --- |
| Fundo | `background` `#FFF8F7` | Área de rolagem e respiro externo |
| Superfície | `surface` `#FFFFFF` | Cartão de identidade, métricas e abas |
| Texto principal | `foreground` `#271719` | Nome, títulos e conteúdo |
| Texto secundário | `mutedForeground` `#6F5558` | Cidade, e-mail, rótulos e metadados |
| Ação principal | `primary` `#B90041` | Editar perfil, marcador e estado ativo |
| Ação de conexão | `secondary` `#7145BA` | Badge, links e estados de conexão |
| Borda | `outline` `#E3BDC0` | Divisores, contornos e cartões |
| Confirmação | `success` `#236B4A` | Disponibilidade e feedback positivo |

### Extensões de tema propostas

Adicionar somente tokens semânticos ao tema, se a implementação precisar deles:

- `profileHeroStart`: `foreground` ou derivação escura da marca.
- `profileHeroEnd`: `secondary`.
- `profileHeroAccent`: `primary`.
- `profileHeroScrim`: branco com baixa opacidade.
- `profileMetricDivider`: `outline`.

Nenhuma cor hexadecimal deve ser escrita diretamente nos estilos da página.

### Tipografia e escala

- Título da tela: padrão atual do `TopBar`, sem competir com o cabeçalho editorial.
- Nome do perfil: Be Vietnam Pro 800, 24–26 pt.
- Localização e metadados: 13–14 pt, peso 400/500.
- Biografia: 14 pt, linha de aproximadamente 21 pt, no máximo quatro linhas no resumo.
- Número de métrica: 20–22 pt, peso 700.
- Rótulo de métrica, aba e legenda: 11–13 pt, peso 500/600.
- Corpo nunca abaixo de 14 pt; controles precisam ser legíveis com texto ampliado.

### Forma, espaço e elevação

- Ritmo 4/8 já existente no tema.
- Gutters de 16 pt; aumentar para 24 pt em telas largas.
- Capa editorial de aproximadamente 208–232 pt de altura, ajustada ao espaço disponível.
- Avatar de 88–96 pt, com borda de 3 pt da superfície.
- Cartões com raio 24 pt; controles pequenos com raio pill.
- Divisores de 1 pt; sombra curta e suave, baseada em `theme.shadow`.
- Alvos de toque de 44 pt no iOS e 48 dp no Android, inclusive para editar, menu, abas e alternância de grid.

## Arquitetura proposta da tela

```text
┌─────────────────────────────────┐
│ capa editorial / marcador       │  ← menu editar (44–48 pt)
│                                 │
│            avatar               │  ← avatar invade o cartão
├─────────────────────────────────┤
│           Ana Leitora           │
│        ◉ São Paulo, SP          │
│  “Leio ficção e procuro...”     │
│                                 │
│  12              4              9│
│ livros        matches       chats│
├─────────────────────────────────┤
│ Minha estante       Editar      │
│ Estante | Sobre                 │
│                                 │
│  [capa]          [capa]         │
│  título          título         │
│                                 │
│        navegação inferior       │
└─────────────────────────────────┘
```

### Blocos da experiência

1. `ProfileHero`
   - `LinearGradient` com tokens do tema.
   - Ícone de editar/menu em `Pressable` com label acessível.
   - Elemento de assinatura: marcador magenta vertical, com comprimento fixo e baixa opacidade no fundo.
   - Respeitar safe area e manter o topo operável.

2. `ProfileIdentityCard`
   - Avatar, nome, cidade, bio resumida e badge opcional de conta.
   - Para o estado atual, manter e-mail somente na área de edição ou como metadado secundário do próprio usuário; não deixar o e-mail dominar a apresentação.

3. `ProfileMetricRow`
   - Três métricas reais, com `accessibilityLabel` que leia número + significado.
   - Sugestão MVP: `livros`, `matches` e `conversas`.
   - Nunca exibir contadores fictícios ou inferidos de uma página parcial.

4. `ProfileTabs`
   - Duas abas: `Minha estante` e `Sobre`.
   - Aba ativa com linha magenta e texto em `primary`; inativa em `mutedForeground`.
   - Usar semântica de abas, estado selecionado e área de toque confortável; não reaproveitar o `ToggleGroup` de filtros sem adaptar a semântica.

5. `ProfileBookGrid`
   - Reutilizar `BookCard` e o contrato de livro atual.
   - Manter duas colunas em retrato; em paisagem usar mais espaço horizontal sem forçar miniaturas estreitas.
   - Ação de adicionar livro no cabeçalho da coleção ou como primeiro item de estado vazio.

6. `ProfileAbout`
   - Exibir bio completa, cidade e informações públicas permitidas.
   - Botão `Editar perfil` abre a edição; `Sair da conta` fica separado no final da tela.

## Dados e integração

### MVP de leitura

- Manter `GET /api/v1/me` para identidade.
- Buscar livros com `GET /api/v1/books` usando o mesmo `useInfiniteQuery` da Biblioteca.
- Buscar ou expor contagens agregadas de matches e conversas.

### Ajuste recomendado de contrato

Estender a resposta de `/api/v1/me` com um objeto opcional e derivado no servidor:

```ts
stats: {
  bookCount: number;
  matchCount: number;
  conversationCount: number;
}
```

O repositório de usuários pode usar contagens relacionais do Prisma; a resposta deve continuar sem `clerkUserId`, hashes ou chaves internas. Se essa extensão não entrar no MVP, a linha de métricas deve ser adiada, não preenchida com valores de demonstração.

### Edição

- Preservar `PATCH /api/v1/me` e a validação atual.
- Manter campos visíveis: `Nome`, `Cidade`, `Bio` e `Telefone` quando necessário.
- Usar modal/sheet nativo ou bloco de edição dedicado, com confirmação de saída quando houver alterações não salvas.
- Exibir loading, sucesso, erro por campo e recuperação clara.
- Avatar editável somente após endpoint de upload/validação do usuário; até lá, avatar vindo de `avatarUrl` permanece leitura.

## Ordem de implementação

### Fase 1 — Fundação visual

- Adicionar tokens semânticos de hero, se necessários.
- Criar `ProfileHero`, `ProfileMetricRow` e `ProfileTabs` como componentes reutilizáveis.
- Definir estados pressed, disabled, loading, selected e focus/assistive technology.

### Fase 2 — Composição da tela

- Reorganizar `app/src/pages/profile/index.tsx` de formulário-first para view-first.
- Integrar identidade, métricas, abas e grade da biblioteca.
- Reutilizar `BookCard`, `Avatar`, `Badge`, `Card`, `AppButton` e a navegação já existente.

### Fase 3 — Dados

- Conectar a consulta paginada de livros.
- Definir a origem das três métricas e atualizar `User`/serializador se `/me` ganhar `stats`.
- Preservar cache, refresh, erro e estado vazio com TanStack Query.

### Fase 4 — Edição e acabamento

- Mover a edição para sheet/modal ou seção expandida.
- Garantir teclado, safe area, scroll e confirmação de alterações pendentes.
- Adicionar transição curta e interruptível entre abas; desabilitar animação não essencial com redução de movimento.

## Estados obrigatórios

- Carregando perfil e livros.
- Erro de perfil com ação de tentar novamente.
- Erro de estante sem apagar os dados de identidade.
- Estante vazia com convite: “Coloque o primeiro livro em circulação”.
- Busca/refresh em andamento.
- Salvando edição.
- Sucesso de atualização com feedback breve.
- Bio longa, nome longo, cidade ausente e avatar ausente.
- Tela pequena de 375 pt, paisagem, safe area e texto ampliado.

## Critérios de aceite

- A primeira impressão é de um perfil de leitor e de uma estante, não de um formulário administrativo.
- A composição mantém a lógica da referência: capa → identidade → métricas → coleção.
- A paleta usada é a do `theme.ts`, com bordô/magenta como ação e violeta como conexão.
- Nenhum contador ou dado é inventado; a API continua sendo a autoridade.
- A estante usa o mesmo `BookCard` e os mesmos estados da Biblioteca.
- O próprio usuário só edita o próprio perfil e nenhum dado interno é exibido.
- Ícones são vetoriais, têm labels quando são interativos e não dependem de emoji.
- Todos os controles principais têm alvo de toque adequado e feedback pressed.
- Texto normal mantém contraste mínimo de 4.5:1; métricas não dependem apenas de cor para serem entendidas.
- Não há conteúdo escondido pela barra inferior, notch ou teclado.
- A tela permanece utilizável com redução de movimento e texto ampliado.

## Fora do escopo desta primeira entrega

- Perfil público de terceiros com seguir/mensagem.
- Sistema de seguidores e contagem de seguidores.
- Upload de capa de perfil ou avatar sem contrato de mídia específico.
- Recomendação de livros dentro do perfil.
- Nova paleta botânica ou reprodução literal das fotos da referência.
