# 3. Frontend mobile

Telas ficam em `app/src/pages/<Nome>/index.tsx` com `styles.ts`; componentes reutilizáveis seguem a mesma dupla. Parâmetros de navegação vivem em `src/types/navigation.ts`.

## Sessão

- use `useSession()`; não leia o SecureStore diretamente fora de `authStorage.ts`;
- use a instância Axios de `services/api.ts` para rotas privadas;
- um 401 tenta exatamente um refresh compartilhado por requisições concorrentes e repete cada requisição no máximo uma vez;
- falha no refresh limpa tokens e cache TanStack Query;
- Socket.IO recebe o mesmo access token em `handshake.auth.token`.

## Fluxo

`Auth` contém entrada, cadastro, confirmação de e-mail, login e recuperação. Cadastro exige e-mail, senha/confirmacão, CPF e celular. A senha tem 6–72 bytes UTF-8, maiúscula, minúscula, número e especial.

Após confirmação, os guards derivam `auth → profile → books → app`. Perfil e livros exibem “Pular/Concluir depois”; a ação grava a conclusão da apresentação e libera o app. Perfil e Biblioteca permanecem como caminhos para completar os dados depois.

Toda tela deve tratar loading, erro, vazio e retry, respeitar safe area/teclado, usar rótulos visíveis e `accessibilityLabel` em ações por ícone.

## Imagens

`BookCreate` e `BookEdit` aceitam até três fotos JPEG/PNG/WebP de até 8 MiB cada. A faixa compartilhada de miniaturas mostra ordem, identifica a primeira como capa e oferece controles acessíveis para mover ou remover. O primeiro item é enviado como capa; no detalhe, as fotos aparecem em galeria horizontal.

A seleção múltipla não usa recorte simultâneo; fotos HEIC ou sem tamanho conhecido recebem mensagem e não são enviadas. O app pede `presign`, envia bytes por PUT e chama `complete` sequencialmente. Se uma etapa falhar, preserva o rascunho em memória e permite retry em `BookEdit`; livros já confirmados não são enviados de novo. A ordem final é persistida pelo endpoint completo de reordenação. O app renova URLs privadas em intervalo inferior à expiração e ao retornar ao primeiro plano. Cancelar a galeria não altera o estado, e nenhuma URL arbitrária é enviada pelo app.

## Leitura de código de barras

O app usa Expo 57, React Native 0.86 e `expo-camera` 57.0.5. Em `BookCreate`, a ação de leitura abre `BarcodeScannerModal`, que solicita permissão de câmera somente nesse momento e usa `CameraView` traseira configurada apenas para `ean13`.

Antes de qualquer chamada HTTP, o cliente aceita somente 13 dígitos com prefixo de livro `978` ou `979` e checksum EAN-13 válido. QR, URL, texto e EAN de produto não consultam a API. Uma leitura aceita preenche o ISBN e chama automaticamente `GET /api/v1/isbn/:isbn`; os dados retornados permanecem editáveis e precisam ser revisados antes do cadastro.

O cadastro manual continua disponível em todos os estados e aceita ISBN-10 válido. A leitura física direta de ISBN-10 não faz parte do scanner, e a câmera não é prometida na Web. Nenhum frame ou foto é enviado ou armazenado; uma capa externa retornada pela consulta também não é persistida automaticamente.
