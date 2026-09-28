# 3. Frontend mobile

Telas ficam em `app/src/pages/<Nome>/index.tsx` com `styles.ts`; componentes reutilizáveis seguem a mesma dupla. Parâmetros de navegação vivem em `src/types/navigation.ts`.

## Sessão

- use `useSession()`; não leia o SecureStore diretamente fora do transporte nativo;
- no web, `SessionProvider` usa refresh HttpOnly no mesmo domínio; refresh token nunca entra em localStorage, sessionStorage ou no bundle;
- use a instância Axios de `services/api.ts` para rotas privadas;
- um 401 tenta exatamente um refresh compartilhado por requisições concorrentes e repete cada requisição no máximo uma vez;
- falha no refresh limpa tokens e cache TanStack Query;
- Socket.IO recebe o mesmo access token em `handshake.auth.token`.

## Fluxo

`Auth` contém entrada, cadastro, confirmação de e-mail, login e recuperação. Cadastro exige e-mail, senha/confirmacão, CPF e celular. A senha tem 6–72 bytes UTF-8, maiúscula, minúscula, número e especial.

Após confirmação, os guards derivam `auth → profile → books → app`. Perfil e livros exibem “Pular/Concluir depois”; a ação grava a conclusão da apresentação e libera o app. Perfil e Biblioteca permanecem como caminhos para completar os dados depois.

Toda tela deve tratar loading, erro, vazio e retry, respeitar safe area/teclado, usar rótulos visíveis e `accessibilityLabel` em ações por ícone.

## Imagens

O app escolhe JPEG/PNG/WebP de até 8 MB, pede `presign`, envia com PUT e chama `complete`. No Safari, imagens HEIC e JPEG grandes podem ser redimensionadas e convertidas para JPEG antes do presign; se o navegador não conseguir decodificar HEIC, mostra orientação para exportar a foto como JPEG. Cancelamento da galeria não altera o estado. Uma URL arbitrária nunca é enviada como avatar.

## Leitura de código de barras

O app usa Expo 57, React Native 0.86 e `expo-camera` 57.0.5. Em `BookCreate`, a ação de leitura abre `BarcodeScannerModal`, que solicita permissão de câmera somente nesse momento e usa `CameraView` traseira configurada apenas para `ean13`. A implementação web usa a API de detecção de código de barras do Expo e requer HTTPS; ainda não foi aceita em iPhone físico.

Antes de qualquer chamada HTTP, o cliente aceita somente 13 dígitos com prefixo de livro `978` ou `979` e checksum EAN-13 válido. QR, URL, texto e EAN de produto não consultam a API. Uma leitura aceita preenche o ISBN e chama automaticamente `GET /api/v1/isbn/:isbn`; os dados retornados permanecem editáveis e precisam ser revisados antes do cadastro.

O cadastro manual continua disponível em todos os estados e aceita ISBN-10 válido. A leitura física direta de ISBN-10 não faz parte do scanner. Nenhum frame ou foto é enviado ou armazenado; uma capa externa retornada pela consulta também não é persistida automaticamente.
