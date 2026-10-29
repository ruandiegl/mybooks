# 9. Design system e componentes

## Identidade de abertura — plano 013 (local)

Ícones web usam livro branco sobre magenta, com variante maskable separada. `BootSplash` usa fundo/foreground/primary semânticos, marca96 e título24, sem cards, shimmer ou duração mínima. Antes das fontes, usa fonte de sistema; erro mantém nome mesmo sem imagem. Botão web de recuperação tem alvo48 e foco visível sem alterar borda/tamanho. Splash nativa usa PNG transparente e variante escura; SVG local atende o HTML. Launcher nativo não foi redesenhado. [Evidências e limites](../plans/plan-013-identidade-web-splashscreen-execucao.md).

## Apresentação de mídia — plano011

Avatar/BookPhoto continuam responsáveis por fallback, paleta, dimensões e acessibilidade; RemoteMediaImage apenas apresenta a mídia. Reservar o slot e usar fallback estático, sem shimmer. Revelação nova recebe120 ms quando permitida; redução de movimento/desconhecida recebe0 ms. Não repetir a revelação em assinatura renovada/retry com frame pronto. Na Web, texto alternativo/fit atualizam sem recarregar os pixels e o movimento próprio é cancelado se a preferência mudar.

Biblioteca/estante mantêm cover; Descobrir/Curtidas/galeria mantêm contain. A proteção Safari continua opt-in nas superfícies do avatar próprio; não bloquear zoom global, toque/pinch ou ações de imagens não protegidas. O avatar dentro da superfície ampliada é decorativo: o host já possui o rótulo, evitando anúncio duplicado. Reordenação identifica a capa pelo ID da primeira foto, sem key por URL/timestamp.

## Configurações e temas — plano010 (local)

Perfil clean mantém uma identidade e usa hambúrguer48; edição/saída migram ao modal de configurações. Lista com divisores, ícones24, labels16 e linhas56; nenhuma nova dupla de cards ou drawer. Novo tema escuro adapta magenta/violeta, usando onPrimary/onSecondary/onDanger/onSuccess em fills claros. Viewer mantém fundo escuro absoluto e fotos não são invertidas. Usar createStyles(AppTheme)/useThemedStyles e useAppTheme, não constantes de cor congeladas. Safe area pertence a um componente por borda; redução de movimento evita slide.

A direção “biblioteca social de bolso” usa papel quente como fundo, capas em destaque, magenta para ações e violeta para conexão. O selo verde de ISBN verificado é a assinatura funcional da experiência.

## Tokens

Tokens estão em `app/src/styles/theme.ts`. Use nomes semânticos (`background`, `surface`, `foreground`, `primary`, `secondary`, `outline`, `danger`, `success`) em vez de cores soltas. Espaçamento, raio, tipografia e sombra também vêm do tema.

## Tipografia

A família oficial é Be Vietnam Pro. Títulos usam peso 700/800; corpo usa 400; rótulos e ações usam 500/600. Não adicione outra família sem decisão de design registrada.

## Componentes base

`AppButton`, `TextField`, `Card`, `Badge`, `Avatar`, `IsbnBadge`, `AppScreen`, `TopBar`, `StateView`, `BookCard`, `SearchField` e `ToggleGroup` são reutilizáveis. O chat possui primitives próprias em `components/chat`. Estenda variantes nesses componentes antes de copiar estilos para páginas.

`BarcodeScannerModal` é a superfície nativa de leitura em `BookCreate`. O modal mantém enquadramento legível, ação explícita para fechar e acesso visível ao cadastro manual. A permissão é pedida sob demanda; estados negado e bloqueado devem explicar o próximo passo sem impedir digitação, e leituras inválidas não substituem o ISBN atual nem disparam carregamento remoto.

`BookPhotoPicker` é compartilhado entre `BookCreate` e `BookEdit`. Usa superfície `#FFF8F7`, ação principal `#B90041`, violeta `#7145BA` apenas como apoio e Be Vietnam Pro. As miniaturas numeradas representam uma ordem real; a primeira recebe o selo “Capa”. Mover, remover e adicionar são ações com rótulos acessíveis e alvos de toque de pelo menos 44 pt. No detalhe, a galeria mantém a capa em primeiro lugar e deixa as próprias fotos dominarem a composição.

## Componentes de conversa e livros da troca

O header do chat combina `Avatar`, nome e ações por ícone com rótulos de acessibilidade. O bottom sheet de livros da troca entra de baixo para cima, usa safe area, mantém no mínimo 48 dp/pt nos controles de toque e pode fechar pelo botão, backdrop, voltar do Android ou gesto para baixo no handle. Cada cartão mostra lado da troca, capa ou fallback, título, autores e disponibilidade; dados legados/removidos têm estado indisponível explícito.

A confirmação de remoção informa que o histórico será apagado para ambos, oferece Cancelar sem efeito remoto e mantém estados distintos para match removido, ainda ativo ou resultado incerto. No resultado incerto, a ação verifica a lista de conversas; se o match seguir ativo, a pessoa pode tentar novamente. Avisos em Mensagens usam região viva acessível e podem ser dispensados individualmente.

## Regras shadcn no mobile

O projeto segue princípios de composição, variantes e tokens do shadcn, implementados com primitives React Native. Não há DOM, Tailwind web ou Radix nas telas nativas. Estados de hover não substituem pressed, focus, disabled, loading, erro e acessibilidade mobile.

## Perfil do leitor

O perfil tem uma única área de identidade em fluxo vertical, sem banner, cartões sobrepostos ou margens negativas. Na branch do plano010, o topo reúne “Meu perfil” e o hambúrguer de configurações; Editar fica no menu. Foto e nome aparecem lado a lado, com empilhamento em telas menores que 360 pt ou com fonte ampliada. Cidade e bio são opcionais. A linha de livros, matches e conversas usa apenas estatísticas retornadas pela API, sem um cartão próprio.

As abas “Minha estante” e “Sobre você” ficam antes do conteúdo. A estante mantém duas colunas de largura igual, inclusive com quantidade ímpar de livros, e uma ação magenta de adicionar. No estado vazio, a ação aparece junto da orientação para cadastrar o primeiro livro. Sobre você mantém informações em linhas; configurações de conta e saída ficam no menu do plano010. O avatar usa iniciais quando a imagem está ausente ou falha.

O Perfil também inclui um cartão de sequência diária dentro da identidade, com dias atuais, posição e affordance para abrir o ranking. O ranking é uma tela empilhada, não uma aba: primeiro apresenta a sequência/posição da própria pessoa e depois linhas públicas com posição, avatar, nome e dias. Use os tokens existentes, ícone vetorial `local-fire-department` e alvos acessíveis; a cor não é o único modo de comunicar posição ou sequência. Estados de carregamento, erro/retry e lista vazia ficam explícitos.

Referências de organização: [perfil do Spotify](https://support.spotify.com/us/article/spotify-profile/) (identidade e coleção) e [perfil do Strava](https://support.strava.com/en-us/articles/15402175-your-strava-profile-page) (resumo de atividade). A composição adapta Avatar, Tabs, Empty e Button do [shadcn/ui](https://ui.shadcn.com/docs/components) aos componentes React Native existentes. Paleta e família Be Vietnam Pro permanecem as oficiais.

## Navegação nativa no iOS

No iOS, as abas principais usam `@bottom-tabs/react-navigation` e `react-native-bottom-tabs`, que expõem a tab bar nativa do UIKit. A variante fica em `src/routes/main-tabs.ios.tsx`; Android e Web continuam usando `src/routes/main-tabs.tsx`. Os ícones do iOS usam SF Symbols e a barra habilita comportamento translúcido e minimização durante a rolagem, deixando o sistema aplicar o Liquid Glass em dispositivos compatíveis.

Como esse fluxo depende de código nativo, ele precisa de um development build ou de uma versão distribuída do app. O Expo Go não carrega módulos nativos adicionados pelo projeto.

## Revisão visual

Verifique telas pequenas, teclado aberto, texto longo, capa ausente, safe area, contraste, alvos de toque de pelo menos 44 pt/48 dp e todos os estados assíncronos. No scanner, inclua permissão negada/bloqueada, baixa luz, código danificado, offline, ISBN ausente, indisponibilidade externa e limite excedido; o fallback manual deve permanecer alcançável. O swipe de descoberta sempre mantém botões equivalentes. A tela respeita redução de movimento e adapta o cartão quando recebe dimensões horizontais, embora o binário atual seja distribuído em orientação retrato.

## Foto de perfil — plano 009 (implementação não publicada)

AvatarPicker é entrada/estado; AvatarEditor é conteúdo hospedado por um único modal. Mantém tokens/Be Vietnam Pro e ação magenta; círculo fixo com exterior escurecido, alvos 48 e alternativas de movimento/zoom sem gestos obrigatórios.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).

## Componentes PWA — plano 012

`DesktopAccessNotice` é uma superfície informativa de texto + QR, com largura máxima 960, cores semânticas e Be Vietnam Pro. Não é dashboard ou coleção de cards. `PwaInstallPanel` compartilha os passos entre o guia público e as configurações; `InstallGuideModal` segue o bottom sheet do MatchModal, máximo 560, header/fechamento sempre alcançáveis, rolagem, Escape/backdrop, retorno de foco e reduced motion. A versão larga do guia não oferece instalar no computador.

Preservar contraste, alvos 48 CSS px, reflow/zoom e safe areas com um responsável por borda. O QR mantém área de silêncio e contraste próprios em ambos os temas, com URL textual equivalente. Não colocar contas, fotos ou URLs assinadas no QR. [Execução e limitações](../plans/plan-012-acesso-mobile-tablet-instalacao-pwa-execucao.md).
## Reputação e ações de segurança — plano 014 (implementação local)

O perfil público usa a paleta e os componentes compartilhados, com cinco ícones de estrela, nota numérica e texto de acessibilidade “Reputação X de 5 estrelas”. O motivo da denúncia é explícito; erro, envio e confirmação são estados visíveis. O bloqueio explica a ocultação do match e a preservação das mensagens antes da confirmação. A lista de bloqueados oferece um caminho de volta. Tema escuro, texto ampliado, safe areas e leitor de tela exigem aceite físico posterior.
