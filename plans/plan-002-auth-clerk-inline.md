# Plano 002 — Autenticação Clerk dentro do app

- Status: CONCLUÍDO — atualizado com login Google
- Tipo: MOBILE / UX / IDENTIDADE
- Prioridade: ALTA
- Data de criação: 01/09/2026
- Escopo: substituir o Hosted Auth e os componentes web do Clerk por fluxos nativos, com login, cadastro e login Google integrados à linguagem visual do MyBooks.

## 1. Objetivo

Permitir que a pessoa entre ou crie uma conta sem sair do app, sem abrir uma URL externa e sem depender de uma tela hospedada do Clerk. O formulário deve usar os controles já existentes, funcionar no Expo Go, manter a sessão Clerk e conduzir a verificação de e-mail dentro da própria tela.

## 2. Contexto e decisões

- O app é Expo 54 / React Native 0.81 com React Navigation, TypeScript e `@clerk/expo` 4.6.1.
- A fonte de identidade continua sendo o Clerk; o app não cria senha, token ou sessão própria.
- O fluxo usará `useSignIn()` e `useSignUp()` da API atual do Clerk, com `password()`, `verifications.sendEmailCode()`, `verifications.verifyEmailCode()` e `finalize()`.
- O login e o cadastro permanecem como modos distintos porque a landing screen já oferece duas ações claras.
- Login, cadastro e verificação de e-mail serão etapas da mesma tela nativa. `finalize()` será chamado sem navegação externa; a troca para as rotas privadas ocorrerá pelo estado da sessão.
- A recuperação de senha ficará acessível no login e será feita com código de e-mail e nova senha na própria tela, sem criar tokens no backend.
- O botão Google usará `useSignInWithGoogle()` e `@clerk/expo-google-signin` em Android/iOS; na web, usará `useSSO({ strategy: 'oauth_google' })` como fallback inevitável do provedor.
- MFA será tratado quando o Clerk retornar `needs_second_factor` ou `needs_client_trust`, priorizando os fatores disponíveis e apresentando uma mensagem orientativa quando a confirmação de dispositivo exigir uma configuração adicional.
- Não será instalado shadcn web nem usado DOM/Tailwind/Radix: o projeto não possui `components.json` e sua regra de UI é shadcn adaptado a primitives React Native.

## 3. Direção visual

Manter a direção “biblioteca social de bolso” já registrada em `docs/09-design-system-components.md`:

- fundo quente `background`, superfícies brancas e contornos suaves do tema;
- magenta como ação principal e violeta como sinal de conexão;
- Be Vietnam Pro com títulos fortes e rótulos legíveis;
- cartão de autenticação arredondado, com hierarquia curta e respiro para teclado/safe area;
- assinatura da tela: marca `mybooks.` e um pequeno selo de capítulo junto ao ícone de livros;
- estados visíveis de foco, erro, carregamento, confirmação de código e senha inválida;
- alvos de toque confortáveis e `accessibilityLabel` nos controles de senha, retorno e reenvio.

## 4. Arquivos previstos

- `app/src/pages/Auth/index.tsx`: composição da landing e do formulário nativo, estados das etapas, chamadas Clerk e mensagens de erro.
- `app/src/pages/Auth/styles.ts`: layout responsivo, cartão, cabeçalho, campos, código e feedback visual.
- `app/src/providers/SessionProvider.tsx`: remover o `useHostedAuth` do fluxo Clerk; manter apenas o bridge de sessão/token e o modo local legado.
- `app/app.json`, `app/package.json` e `app/.env.example`: registrar o plugin/dependência do Google nativo e os client IDs públicos necessários.
- `app/src/components/AppButton/*`: estender somente se faltar uma variante ou estado reutilizável para o auth.
- `app/src/components/TextField/*`: estender somente se faltar suporte de acessibilidade/ícone sem duplicar campo.
- `docs/07-autenticacao-seguranca.md`: atualizar a decisão de Hosted Auth para custom flow nativo e registrar limites de MFA/recuperação.
- `docs/03-frontend-mobile.md`: registrar as etapas do formulário, teclado, safe area e verificação inline.

## 5. Sequência de implementação

1. Remover `@clerk/expo/web` e `useHostedAuth` do caminho principal.
2. Criar o modelo local de etapas: formulário, verificação de e-mail, MFA, recuperação e nova senha.
3. Implementar login com e-mail e senha, `signIn.password()` e `signIn.finalize()`.
4. Implementar cadastro com nome, e-mail, senha, confirmação client-side, envio e validação do código Clerk.
5. Implementar recuperação de senha por código de e-mail, mantendo o Clerk como emissor/verificador.
6. Adaptar a composição aos componentes e tokens existentes, incluindo feedback assíncrono e teclado.
7. Atualizar documentação e registrar limitações que dependem das estratégias habilitadas no Dashboard Clerk.
8. Adicionar o botão Google com tratamento de cancelamento, estado de carregamento e ativação da sessão retornada pelo Clerk.

## 6. Validação e critérios de aceite

- `npm run typecheck` passa sem uso da API legada do Clerk.
- Não existem imports de `@clerk/expo/web`, `useHostedAuth`, `prepareFirstFactor`, `attemptFirstFactor` ou `setActive({ session })` no novo fluxo.
- O botão Entrar abre o formulário dentro do app, autentica e exibe as rotas privadas sem alterar a URL.
- O botão Criar minha conta abre o formulário dentro do app, aceita nome/e-mail/senha, pede o código de verificação e finaliza a sessão sem redirecionamento.
- Campos inválidos exibem erro no campo correspondente; erros globais aparecem em linguagem clara.
- O botão fica bloqueado durante a requisição e oferece estado de carregamento.
- O código pode ser reenviado e a etapa pode ser reiniciada sem perder a tela.
- O teclado não cobre os campos nem o botão principal em telas pequenas.
- O botão Google aparece em login e cadastro, usa o seletor nativo em mobile e tratamento OAuth no web.
- O logout continua limpando cache e retornando à tela pública.
- API permanece protegida pelo Bearer token Clerk; nenhuma senha ou chave secreta chega ao frontend.
- Teste visual no web local confirmou a landing, a tela de login, a tela de cadastro, a validação client-side e a URL preservada sem redirecionamento. O teste completo de credenciais depende de um usuário de teste e das estratégias habilitadas no Dashboard.

## 7. Referências

- `docs/README.md`, `docs/01-visao-geral.md`, `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/07-autenticacao-seguranca.md` e `docs/09-design-system-components.md`.
- Skill local `.agents/skills/clerk-expo/SKILL.md` e `references/custom-flows.md`.
- Skill local `.agents/skills/clerk-custom-ui/SKILL.md` e `core-3/custom-sign-in.md` / `core-3/custom-sign-up.md`.
- Skill `frontend-design` para direção visual, estados, acessibilidade e crítica de layout.
- Skill `shadcn` para composição por variantes, semântica de estados e reutilização de primitives.
- Context7: biblioteca `/clerk/clerk-docs`, fluxo oficial “Unified Sign-In/Sign-Up Flow in Expo” e exemplos atuais de `useSignIn` / `useSignUp`.
- Documentação shadcn consultada para Button, Input e Card como referência de composição: `https://ui.shadcn.com/docs/components/base/button`, `https://ui.shadcn.com/docs/components/base/input` e `https://ui.shadcn.com/docs/components/base/card`.
