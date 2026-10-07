# 3. Frontend mobile e PWA

Telas ficam em `app/src/pages/<Nome>/index.tsx` com `styles.ts`; componentes reutilizáveis seguem a mesma dupla. Parâmetros de navegação vivem em `src/types/navigation.ts`.

## Sessão

- use `useSession()`; não leia o SecureStore diretamente fora do transporte nativo;
- no web, `SessionProvider` usa refresh HttpOnly no mesmo domínio; refresh token nunca entra em localStorage, sessionStorage ou no bundle;
- use a instância Axios de `services/api.ts` para rotas privadas;
- um 401 tenta exatamente um refresh compartilhado por requisições concorrentes e repete cada requisição no máximo uma vez;
- sessão inválida/revogada no refresh invalida a sessão local e limpa o cache TanStack Query; falha transitória web preserva cookie e estado para retry;
- Socket.IO recebe o mesmo access token em `handshake.auth.token`.

Na PWA, o access token vive apenas em memória e o refresh token fica em cookie HttpOnly e Secure. O contrato da main usa `X-Session-Transport: cookie` e `SameSite=Strict`; a variante `authApi.web.ts` usa `/api/v1/auth/browser/*` com cookie `__Host-`. Os dois contratos devem manter HTTPS e validação de Origin. Publique a API no mesmo endereço HTTPS da PWA usando `/api` como proxy. Não envie credenciais por HTTP de LAN; o modo HTTP efêmero existe apenas para `localhost`/loopback, sem refresh cookie persistente.

Web Locks coordena a rotação entre abas; sua indisponibilidade não autoriza rotações concorrentes. O logout espera a revogação no servidor; se a API estiver indisponível, mantém a conta aberta, preserva o cookie e oferece retry. A política antiga da branch PWA de concluir logout offline não é aceite para a versão integrada. Socket.IO consulta o access token atual por handshake e tenta um único refresh quando necessário.

## Fluxo

`Auth` contém entrada, cadastro, confirmação de e-mail, login e recuperação. Cadastro exige e-mail, senha/confirmacão, CPF e celular. A senha tem 6–72 bytes UTF-8, maiúscula, minúscula, número e especial.

Após confirmação, os guards derivam `auth → profile → books → app`. Perfil e livros exibem "Pular/Concluir depois"; a ação grava a conclusão da apresentação e libera o app. Perfil e Biblioteca permanecem como caminhos para completar os dados depois. Após o onboarding, conta nova elegível recebe o bottom sheet de Premium; em login de conta existente elegível, ele abre imediatamente, uma vez por sessão. O painel fica ancorado no rodapé, entra com animação de baixo para cima e fecha ao tocar fora ou arrastá-lo para baixo. Fechar o painel não consome a oferta.

## Navegação principal

O app autenticado exibe 5 abas na barra inferior: **Descobrir**, **Biblioteca**, **Curtidas**, **Mensagens** e **Perfil**, com Curtidas na posição central. No Android/Web, a tab bar usa `@react-navigation/bottom-tabs` com ícones MaterialIcons. No iOS, usa `@bottom-tabs/react-navigation` com SF Symbols nativos (`sparkles`, `books.vertical`, `heart.fill`, `bubble.left.and.bubble.right`, `person.crop.circle`) e efeito de translucidez.

Telas acessíveis via push/modal a partir das tabs: `BookCreate` (modal), `BookDetails`, `BookEdit` (modal), `Matches` e `Chat`.

## Variantes web, deep links e instalação

`env.web.ts` usa `window.location.origin` para API e Socket.IO; `authTransport.web.ts` concentra sessão em memória e refresh por cookie, `notice.web.ts` preserva callbacks de confirmação e `preparePickedImage.web.ts` prepara mídia no navegador. As variantes nativas continuam usando SecureStore, avisos nativos e validação de imagem sem conversão HEIC.

O linking usa a origem da página na Web e o esquema `mybooks://` no nativo. Mapeia `/auth`, `/onboarding/profile`, `/onboarding/books`, `/discover`, `/library`, `/likes`, `/messages`, `/profile`, `/books/new`, `/books/:bookId`, `/books/:bookId/edit`, `/matches` e `/chat/:conversationId`. Abrir uma URL mantém os guards de autenticação/onboarding e a autorização da API. Curtidas permanece no centro das cinco tabs.

O manifesto, os ícones e metadados iOS permitem preparar a instalação PWA. O proxy serve o fallback SPA para navegações profundas e mantém erros da API como JSON. O service worker oferece página offline sem dados privados e cache restrito a assets com hash; não fornece login, chat ou sincronização offline. Instalação, deep links em Safari/PWA instalada e atualização do service worker ainda precisam de aceite no iPhone físico.

## Descobrir e visualização do livro

O card do Descobrir ocupa o espaço disponível, com avatar/nome/cidade do dono no topo, capa inteira (`contain`), título e autores. Tocar no card abre `BookDetails`, sem gerar curtida ou dispensa. Os gestos horizontais e os botões de curtir/dispensar permanecem; rolagem vertical permite acessar o conteúdo em telas pequenas, paisagem ou com fontes ampliadas.

`BookDetails` apresenta galeria na ordem salva (primeira foto = capa), contador, miniaturas e botões anterior/próxima como alternativas ao swipe. Inclui dono, disponibilidade, título/subtítulo, autores, sinopse, editora, ano, páginas, ISBN e assuntos. Não anuncia condição física ou outros dados que a API ainda não fornece. URLs privadas mantêm renovação automática; há recarga manual e fallback para fotos ausentes/com falha. Capas externas legadas também aparecem na galeria.

O seed local (`API/prisma/seed.js`) adiciona uma foto de capa a cada livro demonstrativo com galeria vazia, sem substituir fotos enviadas. As capas de demonstração vêm das URLs já configuradas nos livros; fotos enviadas por usuários continuam no R2.

## Curtidas

A aba Curtidas usa uma grade de duas colunas nas curtidas recebidas e em "Minhas curtidas" (2×2 para quatro itens, com rolagem para os demais). Os cards compactos mantêm avatar e nome no topo, capa inteira e título; o toque abre `BookDetails` com todas as fotos e os dados da edição. Nas recebidas, o texto "Curtiu seu livro" identifica que a capa principal é do livro do usuário que recebeu a curtida. Quando há um livro disponível de quem enviou a curtida, um atalho separado "Para troca" permite visualizar esse livro; os botões com ícones de curtir de volta e dispensar continuam respondendo ao livro dessa pessoa e têm rótulos acessíveis. Em "Minhas curtidas", a cidade aparece no topo quando informada, e "Remover" solicita confirmação. As ações têm áreas de toque de pelo menos 48 e são controles separados da área que abre os detalhes, evitando navegação acidental. Um item isolado na última linha mantém a largura de uma coluna. Falhas ao consultar qualquer uma das listas mostram uma mensagem com ação de tentar novamente em vez de apresentar a lista como vazia.

O acesso gratuito de 30 dias libera a lista e a identidade das curtidas recebidas e likes ilimitados. Sem Premium, o app mantém a contagem agregada de curtidas pendentes e a lista de curtidas enviadas; o limite é de 15 livros distintos curtidos por dia em `America/Sao_Paulo`. A oferta depende de aceite explícito e pode ser aberta pelo perfil; os cards semanal, mensal e anual apenas dizem “Em breve”. O app esconde identidades no prazo exato calculado a partir do relógio do servidor, limpa o cache correspondente e consulta novamente ao voltar ao primeiro plano.

A aba exibe um badge com a contagem de curtidas pendentes (recebidas e ainda não respondidas), atualizado por polling a cada 30 segundos. Filtros de ordenação (mais recentes/mais antigos) e por livro específico estão disponíveis nas curtidas recebidas.

Toda tela deve tratar loading, erro, vazio e retry, respeitar safe area/teclado, usar rótulos visíveis e `accessibilityLabel`/`accessibilityRole` em ações por ícone.

## Imagens

`BookCreate` e `BookEdit` aceitam até três fotos JPEG/PNG/WebP de até 8 MiB cada. A faixa compartilhada de miniaturas mostra ordem, identifica a primeira como capa e oferece controles acessíveis para mover ou remover. O primeiro item é enviado como capa; no detalhe, as fotos aparecem em galeria horizontal.

A seleção múltipla não usa recorte simultâneo. No nativo, HEIC e arquivos sem tamanho conhecido recebem mensagem e não são enviados. Na Web, HEIC/HEIF ou JPEG acima de 8 MiB podem ser convertidos/redimensionados localmente, desde que o original tenha tamanho conhecido e até 24 MiB. A saída JPEG ainda precisa respeitar 8 MiB; se o navegador não decodificar HEIC, a orientação é exportar como JPEG. Esse comportamento exige aceite real em Safari/iPhone.

O app pede `presign`, envia bytes por PUT e chama `complete` sequencialmente. Se uma etapa falhar, preserva o rascunho em memória e permite retry em `BookEdit`; livros já confirmados não são enviados de novo. A ordem final é persistida pelo endpoint completo de reordenação. O app renova URLs privadas em intervalo inferior à expiração e ao retornar ao primeiro plano. Cancelar a galeria não altera o estado, e nenhuma URL arbitrária é enviada pelo app. A conversão web não altera limite, ordem, capa, ownership ou renovação de URL privada.

## Leitura de código de barras

O app usa Expo 57, React Native 0.86 e `expo-camera` 57.0.5. Em `BookCreate`, a ação de leitura abre `BarcodeScannerModal`, que solicita permissão de câmera somente nesse momento e usa `CameraView` traseira configurada apenas para `ean13`. A implementação web usa a API de detecção de código de barras do Expo e requer HTTPS; ainda não foi aceita em iPhone físico.

Antes de qualquer chamada HTTP, o cliente aceita somente 13 dígitos com prefixo de livro `978` ou `979` e checksum EAN-13 válido. QR, URL, texto e EAN de produto não consultam a API. Uma leitura aceita preenche o ISBN e chama automaticamente `GET /api/v1/isbn/:isbn`; os dados retornados permanecem editáveis e precisam ser revisados antes do cadastro.

O cadastro manual continua disponível em todos os estados e aceita ISBN-10 válido. A leitura física direta de ISBN-10 não faz parte do scanner. Nenhum frame ou foto é enviado ou armazenado; uma capa externa retornada pela consulta também não é persistida automaticamente.

## Foto de perfil — plano 009

AvatarEditor nativo usa PanResponder/Animated; variante Web usa react-easy-crop. Fonte orientada até 2048 px, export PNG 512×512 até 2 MiB, prévia circular com movimento/zoom e alternativas por botão. O editor troca o conteúdo do modal existente e não salva nome/bio nem conclui onboarding.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).

### Visualização ampliada e câmera (07/10/2026)

No perfil, tocar ou segurar o avatar por 500 ms abre `AvatarPhotoModal`, com foto circular ampliada e apenas **Editar foto**, **Tirar foto** e **Remover foto**. Não há compartilhamento, link, QR code ou criação de avatar. O modal usa a paleta existente, safe area e conteúdo rolável; fecha pelo X, pela área externa ou por Escape/voltar. Na web, o foco começa no botão de fechar e os elementos decorativos não entram na sequência de Tab.

Editar abre a galeria; tirar foto usa `expo-image-picker`, preferindo a câmera frontal e somente imagem, sem áudio. A permissão nativa é solicitada apenas nessa ação; na web, a abertura ocorre diretamente no clique para preservar a ativação do usuário. O controle também fica disponível em Editar perfil e no onboarding. Cancelamento e permissão negada não substituem a foto salva.

Galeria/câmera e recorte usam o mesmo modal; trocar a URI reinicia o enquadramento, e cancelar o recorte retorna à foto atual. O envio só ocorre ao salvar, reaproveitando o fluxo privado de R2, limites, renovação, ownership e retry existentes. Remover mantém a confirmação e retorna às iniciais. Durante operações, ações e fechamento ficam bloqueados; trocar de conta cancela respostas tardias e fecha a visualização.

Na web, o avatar do próprio perfil, a foto ampliada e o seletor de foto usam proteção opt-in contra o callout de imagem do Safari (`-webkit-touch-callout: none`), seleção e menu contextual do navegador. Os pixels da imagem deixam de receber hit-test, mas o controle pai continua recebendo toque/pressão longa. A proteção não se aplica ao editor de recorte, não cancela eventos touch/pinch, não restringe o viewport e não muda os avatares nativos ou de outros leitores. A correção está em `codex/pwa-avatar-touch-callout`, ainda não publicada; a prévia/menu do iOS precisa ser revalidada na PWA do iPhone ([referência Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html)).

Esta extensão e a correção de safe area `3d5160d` foram integradas à `main` e publicadas na PWA em 07/10/2026, pelo commit `fe07f80`. Para testar no Expo Go, reinicie o Metro em `app/` com `npx expo start --clear` e recarregue o aplicativo. Na PWA instalada, feche e abra novamente depois de atualizar a página, para carregar o bundle/service worker novos. Captura física, permissões e VoiceOver/TalkBack em iOS/Android, além do seletor de câmera em Safari/PWA no iPhone, exigem aceite em aparelho real. A nova descrição de permissão em `app.json` só aparece em um novo build nativo; não é aplicada a um binário já instalado ([ImagePicker SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)).
