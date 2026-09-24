# 9. Design system e componentes

A direção “biblioteca social de bolso” usa papel quente como fundo, capas em destaque, magenta para ações e violeta para conexão. O selo verde de ISBN verificado é a assinatura funcional da experiência.

## Tokens

Tokens estão em `app/src/styles/theme.ts`. Use nomes semânticos (`background`, `surface`, `foreground`, `primary`, `secondary`, `outline`, `danger`, `success`) em vez de cores soltas. Espaçamento, raio, tipografia e sombra também vêm do tema.

## Tipografia

A família oficial é Be Vietnam Pro. Títulos usam peso 700/800; corpo usa 400; rótulos e ações usam 500/600. Não adicione outra família sem decisão de design registrada.

## Componentes base

`AppButton`, `TextField`, `Card`, `Badge`, `Avatar`, `IsbnBadge`, `AppScreen`, `TopBar`, `StateView`, `BookCard`, `SearchField` e `ToggleGroup` são reutilizáveis. O chat possui primitives próprias em `components/chat`. Estenda variantes nesses componentes antes de copiar estilos para páginas.

`BarcodeScannerModal` é a superfície nativa de leitura em `BookCreate`. O modal mantém enquadramento legível, ação explícita para fechar e acesso visível ao cadastro manual. A permissão é pedida sob demanda; estados negado e bloqueado devem explicar o próximo passo sem impedir digitação, e leituras inválidas não substituem o ISBN atual nem disparam carregamento remoto.

## Regras shadcn no mobile

O projeto segue princípios de composição, variantes e tokens do shadcn, implementados com primitives React Native. Não há DOM, Tailwind web ou Radix nas telas nativas. Estados de hover não substituem pressed, focus, disabled, loading, erro e acessibilidade mobile.

## Perfil do leitor

O perfil tem uma única área de identidade em fluxo vertical, sem banner, cartões sobrepostos ou margens negativas. O topo reúne “Meu perfil” e “Editar”; foto e nome aparecem lado a lado, com empilhamento em telas menores que 360 pt ou com fonte ampliada. Cidade e bio são opcionais. A linha de livros, matches e conversas usa apenas estatísticas retornadas pela API, sem um cartão próprio.

As abas “Minha estante” e “Sobre você” ficam antes do conteúdo. A estante mantém duas colunas de largura igual, inclusive com quantidade ímpar de livros, e uma ação magenta de adicionar. No estado vazio, a ação aparece junto da orientação para cadastrar o primeiro livro. Dados pessoais e saída da conta ficam em “Sobre você”, separados por linhas discretas. O avatar usa iniciais quando a imagem está ausente ou falha.

Referências de organização: [perfil do Spotify](https://support.spotify.com/us/article/spotify-profile/) (identidade e coleção) e [perfil do Strava](https://support.strava.com/en-us/articles/15402175-your-strava-profile-page) (resumo de atividade). A composição adapta Avatar, Tabs, Empty e Button do [shadcn/ui](https://ui.shadcn.com/docs/components) aos componentes React Native existentes. Paleta e família Be Vietnam Pro permanecem as oficiais.

## Navegação nativa no iOS

No iOS, as abas principais usam `@bottom-tabs/react-navigation` e `react-native-bottom-tabs`, que expõem a tab bar nativa do UIKit. A variante fica em `src/routes/main-tabs.ios.tsx`; Android e Web continuam usando `src/routes/main-tabs.tsx`. Os ícones do iOS usam SF Symbols e a barra habilita comportamento translúcido e minimização durante a rolagem, deixando o sistema aplicar o Liquid Glass em dispositivos compatíveis.

Como esse fluxo depende de código nativo, ele precisa de um development build ou de uma versão distribuída do app. O Expo Go não carrega módulos nativos adicionados pelo projeto.

## Revisão visual

Verifique telas pequenas, teclado aberto, texto longo, capa ausente, safe area, contraste, alvos de toque de pelo menos 44 pt/48 dp e todos os estados assíncronos. No scanner, inclua permissão negada/bloqueada, baixa luz, código danificado, offline, ISBN ausente, indisponibilidade externa e limite excedido; o fallback manual deve permanecer alcançável. O swipe de descoberta sempre mantém botões equivalentes. A tela respeita redução de movimento e adapta o cartão quando recebe dimensões horizontais, embora o binário atual seja distribuído em orientação retrato.
