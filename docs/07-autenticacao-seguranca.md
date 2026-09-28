# 7. Autenticação e segurança

A API é a autoridade. Senhas usam bcrypt assíncrono com custo configurável, rehash progressivo e rejeição acima de 72 bytes UTF-8. A política mínima é 6 caracteres, maiúscula, minúscula, número e especial, validada no app e na API.

E-mail é normalizado e confirmado por código. CPF passa por dígitos verificadores; HMAC separado detecta duplicidade e AES-256-GCM protege o valor em repouso. Telefone brasileiro é normalizado para E.164.

Access tokens JWT HS256 têm `iss`, `aud`, `sub`, `sid`, `jti`, `iat` e `exp` curto. Refresh tokens são aleatórios, persistidos apenas por hash, rotacionados a cada uso e agrupados por família. Reuso de token revogado revoga a família. Reset de senha e logout global revogam todas as sessões.

## Transporte por plataforma

Android/iOS mantém o refresh no SecureStore e usa `/auth/login`, `/auth/verify-email`, `/auth/refresh` e `/auth/logout`. A PWA guarda somente o access token curto em memória; o refresh permanece no cookie first-party `__Host-trocalivros_refresh` (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sem `Domain`). Login, verificação, refresh e logout web exigem uma origem exata de `CLIENT_ORIGINS` e rejeitam `Sec-Fetch-Site: cross-site`. A rotação e o logout web são serializados entre abas pela Web Locks API. O armazenamento local mantém apenas um marcador não secreto de logout offline, para não restaurar o cookie ao reabrir outra aba; nenhum token é salvo em `localStorage` ou `sessionStorage`.

O domínio público PWA deve ser servido por HTTPS no mesmo origin usado para API e Socket.IO. Renovação entre abas requer Safari/iOS 15.4 ou mais recente, que inclui Web Locks. Caddy encaminha os cookies e os cabeçalhos; antes do aceite público, verificar `X-Forwarded-For` e `X-Forwarded-Proto` através dos proxies reais da Railway sem aumentar `trust proxy` da API por suposição.

Códigos têm 6 dígitos, hash, TTL de 15 minutos, uso único e até 5 tentativas. Reenvio tem cooldown. Cadastro/login/verificação/reenvio/recuperação/reset/refresh têm limites separados por IP e identificador protegido por hash.

O cadastro não verificado permanece pendente por 24 horas. Repetir o cadastro com o mesmo e-mail reutiliza imediatamente o registro pendente, invalida o código anterior, atualiza senha/CPF/celular e envia um novo código, desde que o novo CPF não esteja associado a outra conta. Após a validade, o registro pendente e seus códigos são removidos de forma oportunista na próxima tentativa. Uma conta não verificada nunca pode iniciar sessão.

Helmet, CORS restrito, corpo máximo de 1 MB, request ID e erros sanitizados ficam ativos. Logs não incluem Authorization, senha, refresh, código, CPF ou telefone completo. Ownership sempre deriva da sessão.

Uploads aceitam JPEG, PNG ou WebP até 8 MB, URL pré-assinada curta, chave por usuário e confirmação por HEAD. Configure lifecycle do bucket para objetos não confirmados.

A consulta de ISBN é autenticada e possui proteção própria contra abuso: 30 consultas por janela de 60 segundos, identificadas pelo usuário da sessão e por IP como fallback. No fluxo de câmera, formato, prefixo de livro e checksum são filtrados no app para evitar tráfego desnecessário, mas a API não confia nessa validação e verifica o parâmetro novamente com Zod e checksum.

O scanner processa o código de barras no dispositivo. Nenhum frame ou foto é enviado, registrado ou armazenado, e uma URL de capa fornecida pelo catálogo externo não é automaticamente incorporada ao armazenamento do usuário. A resposta do catálogo passa por schema antes do cache, e os logs substituem o ISBN por `/api/v1/isbn/:isbn`. Respostas `404`, `422`, `429` e `503` seguem o envelope sanitizado, sem dados do provedor, stack ou informações de outra sessão.

Produção exige `AUTH_MODE=native`, HTTPS, segredos aleatórios base64 de 32 bytes, proxy confiável documentado, PostgreSQL com backup e R2 privado. Consulte `seguranca-auth-runbook.md` para incidentes e rotação.
