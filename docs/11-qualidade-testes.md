# 11. Qualidade e testes

Antes de uma entrega:

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

cd ../app
npm run build:web
npm run test:pwa
node ../web/tests/proxy-smoke.mjs
```

A suíte deve cobrir política/limite bcrypt, CPF/celular/e-mail, códigos, concorrência de cadastro, enumeração, refresh/replay, sessão revogada, rate limit, ownership HTTP/Socket.IO, avatar e decisões de onboarding. No app, cobre regras puras de senha, refresh único e guards.

Para o fluxo de ISBN, cubra no app aceitação exclusiva de EAN-13 `978`/`979` com checksum válido, rejeição sem chamada HTTP de QR/URL/texto/EAN de produto, preenchimento após leitura e fallback manual. Na API, cubra Zod/checksum, cache, timeout, chave do rate limit e respostas `404/422/429/503` sem vazamento.

Os testes web cobrem transporte de sessão em memória, refresh cookie na API, deep links, adaptador de aviso, conversão HEIC, credencial atual por handshake Socket.IO, manifesto/ícones, ausência de URL local e lista restrita do service worker. O smoke test Caddy valida status e corpo HTTP, cookies/Origin/IP/protocolo encaminhados, WebSocket e cache; para o aceite completo, executá-lo com o domínio Railway.

Na validação de 28/09, o app teve 12 arquivos e 47 testes aprovados, além de typecheck. A API passou no lint e teve 23 arquivos/170 testes aprovados, com 1 teste ignorado. O export web gerou 821 módulos e passou o smoke de manifesto, ícones, service worker e bundle; o export Android Hermes gerou 1.067 módulos. O smoke do proxy ainda não foi executado: Caddy não está instalado e o daemon Docker local está inacessível. A evidência completa está em `docs/15-matriz-validacao-mvp.md`.

Migração em PostgreSQL limpo, entrega Resend, R2, dois usuários no Socket.IO e dispositivo Android/iOS são evidências separadas. O aceite físico do scanner deve incluir permissão negada e bloqueada, baixa luz, código danificado, offline, `404`, `503` e limite excedido. Se o ambiente não existir, registre como pendente; typecheck, export e mocks não equivalem a teste ponta a ponta.

## Cobertura de conversas, troca e remoção de match

Na API, cubra: orientação `mine`/`theirs` e resumo mínimo dos livros; livros legados/removidos; leitura contextual apenas por participante e vínculo exato; `404` indistinguível para ausente/sem acesso; `RESERVED`/`EXCHANGED`; recibo `clientActionId` com replay sem reaplicar ação; conflito de escopo `409`; livros canônicos do par; e remoção que altera curtidas atuais para `PASS`, apaga a conversa/histórico e preserva recibos. Rotas e sockets também cobrem publicação somente pós-commit, saída/evicção de sala, membership revalidado durante escrita e recusa de mensagem após remoção concorrente.

No app, cubra header com avatar/nome, bottom sheet e estados de livro indisponível, rota contextual e deep link com reload, manutenção da rota genérica de livro, cancelamento sem requisição, sucesso `204`, reconciliação incerta/ativa, confirmação HTTP com socket offline, deduplicação do evento, limpeza seletiva de cache, aviso único dispensável e saída da navegação apenas quando a conversa removida estiver no caminho ativo.

As integrações PostgreSQL devem usar exclusivamente `TEST_DATABASE_URL` para banco local descartável `*_test` e `TEST_DATABASE_DISPOSABLE=true`; não usar `DATABASE_URL` nem banco Railway. A execução de 20/10/2026 rodou `npm run test:integration -- tests/matches.migration.integration.test.js tests/matches.integration.test.js` em PostgreSQL 16 local de loopback: 2 arquivos e 12 testes aprovados, cobrindo migração/backfill/FKs e ciclo de match/replay/concorrência.

Após os ajustes finais, a suíte completa do app passou em 17 arquivos e 83 testes; `npm run typecheck`, `npm run build:web` e `npm run test:pwa` também passaram, com 32 recursos fingerprintados no service worker. A API passou em 29 arquivos/232 testes, com 1 ignorado, e no lint; `prisma validate` e `prisma generate` passaram. A integração PostgreSQL 16 local descartável passou em 2 arquivos/12 testes. A inspeção em dispositivo Android/iOS não foi executada nesta validação: não havia dispositivo local e o usuário optou por pular o teste remoto; nenhum aparelho remoto foi alocado. Não registrar teste simulado ou build como aceite físico.
