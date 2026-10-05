# 11. Qualidade e testes

Antes de uma entrega, executar os checks abaixo na versão integrada e registrar os resultados. Esta conciliação documental não executou esses comandos:

```bash
cd API
npm run lint
npm test
npx prisma validate
npx prisma generate

cd ../app
npm test
npm run typecheck
npx expo-doctor
npx expo export --platform android --output-dir .validation-export --clear

npm run build:web
npm run test:pwa
node ../web/tests/proxy-smoke.mjs
node ../web/tests/proxy-https-smoke.mjs
```

A suíte deve cobrir política/limite bcrypt, CPF/celular/e-mail, códigos, concorrência de cadastro, enumeração, refresh/replay, sessão revogada, rate limit, ownership HTTP/Socket.IO, avatar e decisões de onboarding. No app, cobre regras puras de senha, refresh único e guards.

Para o fluxo de ISBN, cubra no app aceitação exclusiva de EAN-13 `978`/`979` com checksum válido, rejeição sem chamada HTTP de QR/URL/texto/EAN de produto, preenchimento após leitura e fallback manual. Na API, cubra Zod/checksum, cache, timeout, chave do rate limit e respostas `404/422/429/503` sem vazamento.

Para fotos, cobrir limite de três, ownership, ordem completa, capa na posição 0, upload temporário/HEAD/cópia, retry sem duplicar fotos confirmadas, fila de limpeza e serialização/renovação de GET privado com `expiresAt`. O adaptador web de conversão não pode substituir a galeria nem reduzir essas garantias.

Os testes web adicionados cobrem transporte de sessão em memória, refresh cookie na API, deep links, adaptador de aviso, conversão HEIC, credencial atual por handshake Socket.IO, manifesto/ícones, ausência de URL local e lista restrita do service worker. Na integração, verificar os dois contratos: `X-Session-Transport: cookie` e `/auth/browser/*` com cookie `__Host-`. Ambos exigem HTTPS e Origin autorizado; testar HTTP de LAN, origem ausente/indevida, CSRF, sessão revogada, cookie malformado, refresh concorrente entre abas e logout com falha transitória. Logout deve preservar cookie e sessão para retry até confirmar revogação; os testes antigos que aprovavam logout offline/local não aprovam essa regra.

O smoke Caddy verifica status/corpo HTTP, cookies/Origin/IP/protocolo encaminhados, WebSocket, navegação profunda e cache. O smoke HTTPS verifica preservação de `X-Forwarded-Proto: https`, de `http` e da ausência do cabeçalho, sem inventar TLS. Esses checks locais não comprovam login real ou a cadeia de proxies publicada; o aceite deve ser repetido no domínio HTTPS da versão integrada.

## Evidências históricas e limites

Na main, a validação da galeria registrada em 30/09 teve app com 9 arquivos/39 testes, typecheck e exports Web/Android aprovados; API com lint e 27 arquivos/177 testes aprovados, 1 ignorado; Prisma validate/generate e Client 6.19.3. Os testes incluíam limite, ownership, ordem, capa, retry da fila e URLs privadas. O registro separado de Premium/revisão final informou API com 198 aprovados/2 ignorados, app com 57 aprovados e checks/exports aprovados. São execuções anteriores, não resultados da integração PWA.

Na branch PWA, o registro de 28/09 informou app com 12 arquivos/47 testes e typecheck; API com lint e 23 arquivos/170 testes aprovados, 1 ignorado. A matriz da mesma branch informa 24 arquivos/172 testes aprovados, 1 ignorado; a divergência entre resumos é mantida com contexto, sem afirmar uma nova execução que a reconcilie. O export web gerou 821 módulos e passou o smoke de manifesto, ícones, service worker e bundle; Android Hermes gerou 1.067 módulos. O smoke local do proxy ficou pendente naquele registro por ausência de Caddy e daemon Docker acessível. Esses totais não se somam nem aprovam a versão integrada. A evidência histórica está em `docs/15-matriz-validacao-mvp.md`.

No checkout isolado da galeria, a migração de `BookImage` não foi executada em PostgreSQL limpo nem em cópia do banco existente: faltavam URL de banco e Docker disponível. A consulta `API/prisma/book-image-preflight.sql` identifica exceções antes da aplicação. Também faltavam bucket e credenciais R2 naquele ambiente. PUT/HEAD/copy/GET/DELETE reais, lifecycle, CORS e prova física Android/iOS/Web continuam como aceites pendentes; validação em banco descartável do Premium não comprova migração das fotos no banco alvo.

Migração em PostgreSQL limpo, entrega Resend, R2, dois usuários no Socket.IO e dispositivo Android/iOS são evidências separadas. O aceite físico do scanner deve incluir permissão negada e bloqueada, baixa luz, código danificado, offline, `404`, `503` e limite excedido. Se o ambiente não existir, registre como pendente; typecheck, export e mocks não equivalem a teste ponta a ponta.
