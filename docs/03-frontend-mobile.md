# 3. Frontend mobile

Telas ficam em `app/src/pages/<Nome>/index.tsx` com `styles.ts`; componentes reutilizáveis seguem a mesma dupla. Parâmetros de navegação vivem em `src/types/navigation.ts`.

## Sessão

- use `useSession()`; não leia o SecureStore diretamente fora de `authStorage.ts`;
- use a instância Axios de `services/api.ts` para rotas privadas;
- um 401 tenta exatamente um refresh compartilhado por requisições concorrentes e repete cada requisição no máximo uma vez;
- falha no refresh invalida a sessão local e limpa o cache TanStack Query;
- Socket.IO recebe o mesmo access token em `handshake.auth.token`.

Na PWA, o access token vive apenas em memória e o refresh token fica em cookie HttpOnly, Secure e SameSite=Strict. Publique a API no mesmo endereço HTTPS da PWA usando `/api` como proxy. Não envie credenciais por HTTP de LAN; o modo HTTP efêmero existe apenas para `localhost`/loopback. O logout espera a revogação no servidor; se a API estiver indisponível, mantém a conta aberta e oferece retry.

## Fluxo

`Auth` contém entrada, cadastro, confirmação de e-mail, login e recuperação. Cadastro exige e-mail, senha/confirmacão, CPF e celular. A senha tem 6–72 bytes UTF-8, maiúscula, minúscula, número e especial.

Após confirmação, os guards derivam `auth → profile → books → app`. Perfil e livros exibem "Pular/Concluir depois"; a ação grava a conclusão da apresentação e libera o app. Perfil e Biblioteca permanecem como caminhos para completar os dados depois. Após o onboarding, conta nova elegível recebe o bottom sheet de Premium; em login de conta existente elegível, ele abre imediatamente, uma vez por sessão. O painel fica ancorado no rodapé, entra com animação de baixo para cima e fecha ao tocar fora ou arrastá-lo para baixo. Fechar o painel não consome a oferta.

## Navegação principal

O app autenticado exibe 5 abas na barra inferior: **Descobrir**, **Curtidas**, **Biblioteca**, **Mensagens** e **Perfil**. No Android/Web, a tab bar usa `@react-navigation/bottom-tabs` com ícones MaterialIcons. No iOS, usa `@bottom-tabs/react-navigation` com SF Symbols nativos (`sparkles`, `heart.fill`, `books.vertical`, `bubble.left.and.bubble.right`, `person.crop.circle`) e efeito de translucidez.

Telas acessíveis via push/modal a partir das tabs: `BookCreate` (modal), `BookDetails`, `BookEdit` (modal), `Matches` e `Chat`.

## Curtidas

A aba Curtidas exibe um grid de 2 colunas com as curtidas recebidas (quem curtiu os livros do usuário). Cada card mostra a capa do livro curtido como fundo, avatar e nome do ator no topo, e botões de curtir de volta e dispensar quando há um livro disponível de quem enviou a curtida. Um toggle alterna para "Minhas curtidas" (livros que o usuário curtiu), onde é possível remover a curtida com confirmação. Falhas ao consultar qualquer uma das listas mostram uma mensagem com ação de tentar novamente em vez de apresentar a lista como vazia.

O acesso gratuito de 30 dias libera a lista e a identidade das curtidas recebidas e likes ilimitados. Sem Premium, o app mantém a contagem agregada de curtidas pendentes e a lista de curtidas enviadas; o limite é de 15 livros curtidos por dia local. A oferta depende de aceite explícito e pode ser aberta pelo perfil; os cards semanal, mensal e anual apenas dizem “Em breve”. O app esconde identidades no prazo exato calculado a partir do relógio do servidor, limpa o cache correspondente e consulta novamente ao voltar ao primeiro plano.

A aba exibe um badge com a contagem de curtidas pendentes (recebidas e ainda não respondidas), atualizado por polling a cada 30 segundos. Filtros de ordenação (mais recentes/mais antigos) e por livro específico estão disponíveis nas curtidas recebidas.

Toda tela deve tratar loading, erro, vazio e retry, respeitar safe area/teclado, usar rótulos visíveis e `accessibilityLabel`/`accessibilityRole` em ações por ícone.

## Imagens

O app escolhe JPEG/PNG/WebP de até 8 MB, pede `presign`, envia com PUT e chama `complete`. Cancelamento da galeria não altera o estado. Uma URL arbitrária nunca é enviada como avatar.

## Leitura de código de barras

O app usa Expo 57, React Native 0.86 e `expo-camera` 57.0.5. Em `BookCreate`, a ação de leitura abre `BarcodeScannerModal`, que solicita permissão de câmera somente nesse momento e usa `CameraView` traseira configurada apenas para `ean13`.

Antes de qualquer chamada HTTP, o cliente aceita somente 13 dígitos com prefixo de livro `978` ou `979` e checksum EAN-13 válido. QR, URL, texto e EAN de produto não consultam a API. Uma leitura aceita preenche o ISBN e chama automaticamente `GET /api/v1/isbn/:isbn`; os dados retornados permanecem editáveis e precisam ser revisados antes do cadastro.

O cadastro manual continua disponível em todos os estados e aceita ISBN-10 válido. A leitura física direta de ISBN-10 não faz parte do scanner, e a câmera não é prometida na Web. Nenhum frame ou foto é enviado ou armazenado; uma capa externa retornada pela consulta também não é persistida automaticamente.
