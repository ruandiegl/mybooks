# 10. Docker e ambientes

O `compose.yaml` inicia PostgreSQL 16 e a API. O `API/Dockerfile` usa Node 20, instala OpenSSL e dependências com npm, gera o Prisma Client e inicia o servidor. O PostgreSQL fica publicado em `localhost:5433` por padrão para não conflitar com outros projetos; dentro da rede Compose, a API continua usando `postgres:5432`.

## Preparação

1. instale Docker Desktop com Compose;
2. confirme que `API/.env` existe — o workspace já deixa um arquivo local de desenvolvimento sem credenciais;
3. confirme que `app/.env` existe — o workspace já deixa um arquivo local de desenvolvimento sem credenciais;
4. preencha credenciais externas quando quiser testar Clerk, R2 e Resend;
5. nunca versione os `.env` reais.

## Execução

```bash
docker compose up --build -d
cd app
npm install
npm start
```

O container da API aguarda a saúde do PostgreSQL e executa `prisma migrate deploy` antes de iniciar o servidor.

Se `5433` estiver ocupado, defina `POSTGRES_HOST_PORT=5434` antes do Compose e altere a porta correspondente no `API/.env` quando executar a API fora do container. Em dispositivo físico, `localhost` aponta para o telefone. Troque `EXPO_PUBLIC_API_BASE_URL` e `EXPO_PUBLIC_SOCKET_URL` pelo IP da máquina na rede, por exemplo `http://192.168.0.10:3001`.

## Modos externos

Para validação sem credenciais, mantenha `AUTH_MODE=development`, `STORAGE_MODE=development` e o modo equivalente no app. Esse modo permite login local, mas upload R2 retorna 503 de propósito. Para a demonstração completa, use `AUTH_MODE=clerk`, `STORAGE_MODE=r2` e configure Resend/R2.

## Parada

`docker compose down` para os serviços e preserva o volume. `docker compose down -v` apaga o banco local e só deve ser usado quando a perda for intencional.
