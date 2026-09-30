# 7. Autenticação e segurança

A API é a autoridade. Senhas usam bcrypt assíncrono com custo configurável, rehash progressivo e rejeição acima de 72 bytes UTF-8. A política mínima é 6 caracteres, maiúscula, minúscula, número e especial, validada no app e na API.

E-mail é normalizado e confirmado por código. CPF passa por dígitos verificadores; HMAC separado detecta duplicidade e AES-256-GCM protege o valor em repouso. Telefone brasileiro é normalizado para E.164.

Access tokens JWT HS256 têm `iss`, `aud`, `sub`, `sid`, `jti`, `iat` e `exp` curto. Refresh tokens são aleatórios, persistidos apenas por hash, rotacionados a cada uso e agrupados por família. Reuso de token revogado revoga a família. Reset de senha e logout global revogam todas as sessões.

Códigos têm 6 dígitos, hash, TTL de 15 minutos, uso único e até 5 tentativas. Reenvio tem cooldown. Cadastro/login/verificação/reenvio/recuperação/reset/refresh têm limites separados por IP e identificador protegido por hash.

O cadastro não verificado permanece pendente por 24 horas. Repetir o cadastro com o mesmo e-mail reutiliza imediatamente o registro pendente, invalida o código anterior, atualiza senha/CPF/celular e envia um novo código, desde que o novo CPF não esteja associado a outra conta. Após a validade, o registro pendente e seus códigos são removidos de forma oportunista na próxima tentativa. Uma conta não verificada nunca pode iniciar sessão.

Helmet, CORS restrito, corpo máximo de 1 MB, request ID e erros sanitizados ficam ativos. Logs não incluem Authorization, senha, refresh, código, CPF ou telefone completo. Ownership sempre deriva da sessão.

Fotos de livros aceitam JPEG, PNG ou WebP até 8 MiB cada, com no máximo três por livro. A API deriva owner e chave, emite PUT pré-assinado para `pending/books/<owner>/<book>/...`, valida tipo/tamanho por HEAD e só então copia para `books/...`. Reordenação, confirmação e exclusão verificam ownership e usam lock transacional; a foto 0 é a capa. Não aceite `userId`, chaves ou URLs arbitrárias do cliente.

O bucket de livros é privado. GET é pré-assinado no endpoint S3 do R2 e possui expiração curta declarada na resposta; não persista a assinatura nem a compartilhe em logs. Configure lifecycle de 1 dia para `pending/books/`, CORS apenas para origens Web necessárias e uma credencial de escopo mínimo. Exclusões falhas ficam na fila persistente de limpeza com retry. `R2_PUBLIC_URL` permanece opcional para avatares legados, não para fotos de livros.

A consulta de ISBN é autenticada e possui proteção própria contra abuso: 30 consultas por janela de 60 segundos, identificadas pelo usuário da sessão e por IP como fallback. No fluxo de câmera, formato, prefixo de livro e checksum são filtrados no app para evitar tráfego desnecessário, mas a API não confia nessa validação e verifica o parâmetro novamente com Zod e checksum.

O scanner processa o código de barras no dispositivo. Nenhum frame ou foto é enviado, registrado ou armazenado, e uma URL de capa fornecida pelo catálogo externo não é automaticamente incorporada ao armazenamento do usuário. A resposta do catálogo passa por schema antes do cache, e os logs substituem o ISBN por `/api/v1/isbn/:isbn`. Respostas `404`, `422`, `429` e `503` seguem o envelope sanitizado, sem dados do provedor, stack ou informações de outra sessão.

Produção exige `AUTH_MODE=native`, HTTPS, segredos aleatórios base64 de 32 bytes, proxy confiável documentado, PostgreSQL com backup e R2 privado. Consulte `seguranca-auth-runbook.md` para incidentes e rotação.

## Sessão na PWA

A PWA não usa SecureStore. O access token fica somente em memória; o refresh token usa cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. O cookie é enviado somente quando a PWA e a API compartilham a mesma origem HTTPS. Publique a API atrás de reverse proxy no caminho `/api`, inclua a origem exata em `CLIENT_ORIGINS` e configure TLS e `trust proxy` para que `req.secure` reflita corretamente HTTPS. CORS permite apenas as origens configuradas; operações com cookie exigem `Origin` HTTPS autorizado e `X-Session-Transport: cookie`, e encerramento/refresh sempre passa por guarda de origem.

O refresh cookie fica fora do JavaScript e o refresh entre abas usa Web Locks para evitar duas rotações concorrentes da mesma família. A PWA só habilita o fluxo seguro em navegador com suporte a locks. HTTP é permitido apenas quando tanto a página quanto a API usam host de loopback; nessa execução de desenvolvimento os tokens ficam em memória e somem ao fechar. Credenciais são bloqueadas em HTTP de LAN/Internet. No logout, a API revoga a sessão antes de limpar o cookie. Se a revogação falhar, preserva o cookie para permitir retry; o app mantém a conta ativa e informa que é preciso tentar novamente.
