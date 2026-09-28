# 10. Docker e ambientes

O `compose.yaml` inicia PostgreSQL 16 e API; o container aplica `prisma migrate deploy`. PostgreSQL usa `localhost:5433` por padrão e `postgres:5432` dentro da rede.

1. copie/preencha `API/.env` e `app/.env` sem versionar valores reais;
2. gere quatro segredos aleatórios base64 de 32 bytes para autenticação;
3. mantenha `AUTH_MODE=native` em todos os ambientes;
4. execute `docker compose up --build -d` e depois `npm install && npm start` em `app/`.

A seed é proibida quando `NODE_ENV=production`. Em desenvolvimento, `npx prisma db seed` cria quatro contas nativas verificadas e dados de demonstração; a senha local documentada no código da seed é apenas de teste e deve ser trocada ao compartilhar o ambiente.

R2 é opcional localmente (`STORAGE_MODE=development` retorna 503 para upload). Para testar imagens, configure credenciais mínimas, bucket privado, CORS e `R2_PUBLIC_URL`. Para e-mail real, configure Resend e domínio remetente. Em dispositivo físico, use o IP LAN da máquina em `EXPO_PUBLIC_API_BASE_URL`/`EXPO_PUBLIC_SOCKET_URL`.

A consulta ISBN usa `ISBN_RATE_LIMIT_WINDOW_MS=60000` e `ISBN_LOOKUP_LIMIT=30`; registre apenas esses nomes e valores de configuração, nunca credenciais ou conteúdo real de `.env`. No app, o plugin de `expo-camera` declara a mensagem de permissão em português, `microphonePermission=false` e `recordAudioAndroid=false`. Mudanças nessa configuração nativa exigem novo development build; o scanner não é requisito da execução Web.

`docker compose down` preserva o volume; `docker compose down -v` apaga o banco e só deve ser usado quando a perda for intencional.

## Web/PWA na Railway

O frontend web é um serviço separado e não altera `API/Dockerfile`. A partir da raiz do repositório, `web/Dockerfile` usa Node 22 para `npm ci`, exporta `app/` com `npm run build:web` e serve `app/dist` no Caddy. Configure Root Directory `/`, Dockerfile Path `/web/Dockerfile` e `API_UPSTREAM=http://<dominio-privado-api>:<porta>` somente depois de confirmar o hostname e a porta privados do serviço API; publique então o domínio HTTPS do serviço web.

Depois da criação do domínio, adicione a origem completa do site à variável `CLIENT_ORIGINS` da API, mantendo a origem atual necessária ao APK. O proxy recebe `/api/v1`, `/health`, `/socket.io` e `/covers`; o navegador nunca recebe o endereço privado da API. Consulte [`web/README.md`](../web/README.md) para smoke tests e configurações.

Build local e teste do manifesto: `cd app; npm ci; npm run build:web; npm run test:pwa`. Com Caddy instalado, `node web/tests/proxy-smoke.mjs` valida SPA, proxy, WebSocket, cache e cookie sem depender de contas externas.
