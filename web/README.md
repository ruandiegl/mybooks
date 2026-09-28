# TrocaLivros Web / PWA

Este serviço publica a exportação web do app Expo e encaminha chamadas da PWA para a API TrocaLivros. O código de telas continua em `app/`; esta pasta contém a publicação e o proxy.

## Build

Na raiz do repositório, o serviço Railway deve usar:

- Root Directory: `/`
- Builder: Dockerfile
- Dockerfile Path: `/web/Dockerfile`

O estágio Node usa Node 22, compatível com `app/package.json`, executa `npm ci` usando o lockfile do app e chama `npm run build:web`. O estágio final serve `app/dist` pelo Caddy.

## Railway

Crie um serviço separado chamado `web` no mesmo projeto e ambiente Railway da API e do PostgreSQL. Configure:

- `API_UPSTREAM=http://mybooks-api.railway.internal:3001` (domínio privado e porta alinhados à porta de destino do domínio público da API)
- `PORT=8080` (a plataforma costuma injetar essa variável; o valor padrão local também é 8080)

Na Railway, a API define `PORT=3001` para corresponder à porta de destino do domínio público já existente, e o proxy privado usa `http://mybooks-api.railway.internal:3001`. A instância Caddy do serviço web escuta em `PORT=8080`. O valor de `API_UPSTREAM` é consumido somente pelo Caddy e não aparece no bundle.

O serviço Railway `TrocaLivros Web` está publicado em `https://trocalivros-web-production.up.railway.app`; `PWA_CLIENT_ORIGIN` já está configurada na API e combinada com `CLIENT_ORIGINS`, preservando as origens necessárias ao APK. Foram verificados `GET /`, `/health` através do proxy e o encaminhamento de `/api/v1/auth/me` sem fallback SPA. O login/cookie, Socket.IO e instalação ainda exigem aceite em navegador e iPhone.

A renovação de sessão entre abas usa Web Locks, disponível em Safari/iOS 15.4 ou mais recente. Versões anteriores não renovam a sessão por cookie para evitar duas rotações concorrentes da mesma família.

## Proxy e cache

O Caddy encaminha `/api/v1`, `/health`, `/socket.io` e `/covers`, preservando URI, método, corpo, Origin e cookies. O suporte WebSocket vem do `reverse_proxy` do Caddy. O Caddy considera os proxies privados da Railway confiáveis, lê `X-Forwarded-For` da direita para a esquerda e passa ao backend o IP de cliente já resolvido; isso mantém a API atual em `trust proxy=1`. O smoke test precisa confirmar `X-Forwarded-For` e `X-Forwarded-Proto` depois que o domínio público estiver ativo. A página shell e o manifesto revalidam; bundles Expo com hash são imutáveis; respostas da API, capas e arquivos não encontrados não recebem fallback SPA.

O fallback `index.html` só atende navegação `GET`/`HEAD` que aceita HTML e não parece um arquivo com extensão. Assim, um 401 JSON da API, uma capa ausente, um bundle quebrado ou um `POST` nunca são mascarados como sucesso do app.

## Validação local

Com Caddy instalado, gere primeiro a exportação e execute:

```powershell
cd app
npm ci
npm run build:web
npm run test:pwa
cd ..
node web/tests/proxy-smoke.mjs
```

O smoke test do proxy inicia uma API de teste local e Caddy, e verifica navegação profunda, asset inexistente, preservação de um 401 JSON/cookie, `/health`, WebSocket, método `POST` e cache dos arquivos exportados. O teste PWA confirma o manifesto e ícones, metadados iOS e a ausência das URLs configuradas em `app/.env` no bundle.
