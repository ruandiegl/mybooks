# 3. Frontend mobile

## Estrutura obrigatória

Cada tela fica em `app/src/pages/<Nome>/index.tsx` com `styles.ts` ao lado. Componentes reutilizáveis seguem a mesma dupla em `app/src/components/<Nome>`. Não crie um arquivo central com estilos específicos de páginas.

## Rotas

- pública: `Auth`;
- abas: `Discover`, `Library`, `Messages`, `Profile`;
- stack: `BookCreate`, `BookDetails`, `Chat`.

Os parâmetros são tipados em `src/types/navigation.ts`. Navegação nova deve atualizar esse contrato.

## Dados e sessão

- use a instância Axios de `src/services/api.ts`;
- use TanStack Query para cache, carregamento e invalidação;
- obtenha sessão por `useSession()`; não leia token diretamente;
- o token Clerk é persistido pelo cache seguro do pacote Clerk/Expo;
- o modo local usa `expo-secure-store` e nunca pode ser habilitado em produção.

## Estados de tela

Toda tela de dados deve tratar carregamento, erro, vazio, sucesso e atualização. Campos precisam de rótulo visível; ações só por ícone precisam de `accessibilityLabel`; botões devem ter alvo confortável; formulários devem considerar teclado e safe area.

O fluxo `Auth` é nativo e mantém login, cadastro, confirmação de e-mail, MFA e recuperação de senha dentro do app. Use `useSignIn`/`useSignUp` do `@clerk/expo`, mostre os estados `fetching` e erros de campo, e chame `finalize()` somente após a etapa do Clerk estar completa. O cadastro deve manter o mount `nativeID="clerk-captcha"` para as verificações de segurança. O botão Google usa `useSignInWithGoogle` em builds nativos e `useSSO` somente como fallback OAuth na web.

## ISBN e imagens

A busca ISBN preenche título, autores, editora, sinopse, ano, páginas, temas e capa quando disponíveis, sem bloquear edição. O ISBN só é enviado como verificado quando a consulta teve sucesso. Para imagem própria, o app solicita `presign`, envia o binário por `PUT` ao R2 e chama `complete`.
