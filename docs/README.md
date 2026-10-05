# Documentação do TrocaLivros

Este diretório é a fonte de verdade das guidelines, decisões técnicas e contratos do TrocaLivros. O projeto é um aplicativo mobile e PWA de troca de livros, retomado como MVP de TCC. Identificadores técnicos legados que usam `mybooks` permanecem inalterados para evitar impacto em banco, pacotes e integrações.

## Estado do MVP

A fundação do MVP está implementada: aplicativo Expo/React Native e telas PWA compartilhadas via React Native Web, API Express modular, Prisma/PostgreSQL, autenticação própria com sessões revogáveis, ISBN pela BrasilAPI, até três fotos ordenadas por livro com URLs privadas renováveis do Cloudflare R2, e-mail transacional por Resend, matches, chat Socket.IO, Curtidas e Premium de teste por 30 dias. O Premium começa após aceite explícito, pode ser ativado uma vez por conta verificada, não cobra, não coleta cartão e não renova; a cota gratuita é de 15 livros distintos curtidos por dia de São Paulo. Clerk não faz parte do runtime.

A base PWA acrescenta manifesto/ícones, metadados iOS, deep links, variantes web e proxy Caddy na mesma origem HTTPS. O access token fica em memória e o refresh em cookie HttpOnly/Secure; a integração deve preservar HTTPS/Origin nos contratos da main e `/auth/browser/*`, além de confirmar revogação antes de encerrar o logout. O service worker guarda somente assets com hash e página offline sem dados privados; push e sincronização offline não estão implementados.

Builds, testes e GETs básicos de publicação anteriores estão registrados como históricos na [matriz de validação](./15-matriz-validacao-mvp.md), sem aprovar o merge em curso. A migração de fotos no banco alvo, R2 real, cadeia HTTPS/proxy, login/cookies, Socket.IO/WebSocket e aceites Android/iPhone/Safari/PWA instalada continuam pendentes para a versão integrada. Esta revisão documental não executou testes ou deploy.

## Índice

| Documento | Assunto |
| --- | --- |
| [01 — Visão geral](./01-visao-geral.md) | Produto, escopo, stack e mapa do repositório |
| [02 — Arquitetura](./02-arquitetura.md) | Camadas, módulos e fluxos entre app, API e integrações |
| [03 — Frontend mobile e PWA](./03-frontend-mobile.md) | Telas, sessão, variantes web, deep links e padrões React Native |
| [04 — Backend](./04-backend-api.md) | Estrutura modular, validação, erros e segurança HTTP |
| [05 — Contrato API](./05-contrato-api.md) | Endpoints HTTP e envelopes de resposta |
| [06 — Banco](./06-banco-de-dados.md) | Modelos Prisma, relações e migrações |
| [07 — Autenticação e segurança](./07-autenticacao-seguranca.md) | Sessões próprias nativas e web, autorização, segredos e upload seguro |
| [08 — Chat em tempo real](./08-tempo-real-chat.md) | Eventos Socket.IO, salas e idempotência |
| [09 — Design system](./09-design-system-components.md) | Tokens e componentes reutilizáveis no estilo shadcn |
| [10 — Docker e ambientes](./10-docker-ambientes.md) | Execução local e variáveis de ambiente |
| [11 — Qualidade](./11-qualidade-testes.md) | Testes, lint e critérios de aceite |
| [12 — Contribuição](./12-contribuicao.md) | Branches, revisão e Definition of Done |
| [13 — Pendências](./13-pendencias-conhecidas.md) | Limitações verificadas e próximos passos |
| [14 — Execução do MVP](./14-execucao-do-mvp.md) | O que foi entregue e como validar |
| [15 — Matriz de validação](./15-matriz-validacao-mvp.md) | Evidências executadas, resultados e bloqueios externos |
| [16 — Histórico de alterações](./16-historico-de-alteracoes.md) | Registro das mudanças solicitadas no projeto |
| [Publicação Web/PWA](../web/README.md) | Build Expo, proxy Caddy e variáveis para o serviço Railway |

## Regras obrigatórias

1. O mobile e a PWA nunca acessam o PostgreSQL ou usam credenciais de R2 diretamente.
2. Toda rota privada autentica a identidade e toda mutação verifica ownership.
3. Controllers tratam HTTP; services concentram negócio; repositories concentram Prisma.
4. Dados externos e payloads do cliente são validados antes de entrar no domínio.
5. O selo ISBN é derivado pelo backend e só existe para ISBN-10/13 válido.
6. Cada página mobile possui `index.tsx` e `styles.ts`; CSS web e componentes DOM ficam em variantes web e não entram no app nativo.
7. Componentes compartilhados vivem em `app/src/components`; primitives de chat são compostas, não duplicadas nas telas.
8. Alterações de banco sempre geram migração Prisma versionada.
9. Segredos ficam em `.env`; exemplos versionados nunca contêm credenciais reais.
10. Uma entrega só termina após atualizar teste, contrato e documentação afetados.

## Primeira leitura

Comece por [Visão geral](./01-visao-geral.md) e [Arquitetura](./02-arquitetura.md). Para colocar o projeto em execução, siga [Docker e ambientes](./10-docker-ambientes.md) e [Execução do MVP](./14-execucao-do-mvp.md).

_Última revisão documental: 05/10/2026; validação da integração pendente._

## Foto de perfil — plano 009 (implementação não publicada)

Foto de perfil do plano 009 está em branch isolada, com evidências locais e aceites externos separados. Preflight real confirmou bucket ainda público e sem CORS; não há aprovação de privacidade ou publicação.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).
