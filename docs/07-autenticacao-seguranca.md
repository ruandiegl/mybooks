# 7. Autenticação e segurança

Clerk é a autoridade de identidade. O app usa as telas nativas de login e cadastro com `useSignIn` e `useSignUp`, além do token cache seguro; a API valida a requisição com `@clerk/express`, converte `clerkUserId` em usuário do domínio e aplica autorização por recurso.

O fluxo de autenticação acontece dentro do app, sem abrir uma tela hospedada externa. Senhas e tokens continuam sob responsabilidade do Clerk: o MyBooks apenas coleta os campos necessários, exibe erros e estados de carregamento, e finaliza a sessão com `finalize()` após o Clerk concluir cada etapa.

## Recuperação de senha

Recuperação de senha, código por e-mail e políticas de credencial pertencem ao Clerk e são apresentados em telas nativas do MyBooks. Resend não cria ou valida tokens de senha: ele é usado pelo MyBooks para e-mails transacionais, começando pela mensagem de boas-vindas. Se a equipe configurar entrega customizada no painel do provedor de identidade, isso deve manter o Clerk como emissor e verificador dos códigos.

Após o cadastro, o app solicita a confirmação do e-mail antes de finalizar a sessão. Quando a instância exigir MFA, a tela também trata código por e-mail, telefone, autenticador ou código de recuperação, conforme os fatores habilitados no Clerk.

## Login com Google

O botão `Continuar com Google` usa o login nativo do Google em Android/iOS, com o seletor seguro de contas do aparelho. Para web, o Clerk usa o fallback OAuth oficial e retorna à aplicação após o consentimento do Google. O provedor Google precisa estar habilitado no Dashboard Clerk; o login nativo exige development build e os client IDs públicos configurados no ambiente do app. Nenhum secret do Google ou do Clerk é enviado ao frontend.

## Modos

- `AUTH_MODE=development`: aceita `x-dev-user-id`; somente para máquina local.
- `AUTH_MODE=clerk`: exige chaves Clerk e Bearer token.
- produção falha na inicialização se não estiver em modo Clerk.

## Upload seguro

A API autoriza JPEG, PNG ou WebP de até 8 MB, gera chave restrita a `books/<owner>/<book>/<image>`, cria URL PUT curta, confirma tamanho/tipo com HEAD e só então registra a imagem. Chaves secretas R2 nunca chegam ao app.

## Checklist

- configurar `CLERK_AUTHORIZED_PARTIES` em produção;
- restringir CORS a origens conhecidas;
- usar bucket privado e domínio público/controlado em `R2_PUBLIC_URL`;
- não registrar `Authorization`, tokens, chaves ou mensagens privadas;
- rotacionar imediatamente qualquer segredo versionado por engano;
- manter rate limit e limite de corpo ativos.
