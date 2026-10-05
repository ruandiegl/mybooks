FROM node:22-alpine AS build

WORKDIR /workspace/app

COPY app/package.json app/package-lock.json ./
RUN npm ci

COPY app/app.config.ts app/app.json app/App.tsx app/index.ts app/tsconfig.json ./
COPY app/assets/ ./assets/
COPY app/public/ ./public/
COPY app/src/ ./src/
COPY web/scripts/ /workspace/web/scripts/
RUN npm run build:web

FROM caddy:2.10-alpine

ENV PORT=8080
ENV WEB_ROOT=/srv

COPY web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /workspace/app/dist /srv

EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
