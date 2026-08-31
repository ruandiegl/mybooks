# 7. Autenticação e segurança

Clerk é a autoridade de identidade. O app usa Hosted Auth e token cache seguro; a API valida a requisição com `@clerk/express`, converte `clerkUserId` em usuário do domínio e aplica autorização por recurso.

## Recuperação de senha

Recuperação de senha, código por e-mail e políticas de credencial pertencem ao fluxo hospedado do Clerk. Resend não cria ou valida tokens de senha: ele é usado pelo MyBooks para e-mails transacionais, começando pela mensagem de boas-vindas. Se a equipe configurar entrega customizada no painel do provedor de identidade, isso deve manter o Clerk como emissor e verificador dos códigos.

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
