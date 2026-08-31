# Documentação do MyBooks

Este diretório é a fonte de verdade das guidelines, decisões técnicas e contratos do MyBooks. O projeto é um aplicativo mobile de troca de livros, retomado como MVP de TCC.

## Estado do MVP

A fundação do MVP está implementada: aplicativo Expo/React Native, API Express modular, Prisma/PostgreSQL via Docker, autenticação Clerk, consulta ISBN pela BrasilAPI, upload direto para Cloudflare R2, e-mail transacional por Resend, matches e chat Socket.IO. O ambiente local Docker já está configurado; credenciais externas e aceite em dispositivo ainda dependem do ambiente de teste.

## Índice

| Documento | Assunto |
| --- | --- |
| [01 — Visão geral](./01-visao-geral.md) | Produto, escopo, stack e mapa do repositório |
| [02 — Arquitetura](./02-arquitetura.md) | Camadas, módulos e fluxos entre app, API e integrações |
| [03 — Frontend mobile](./03-frontend-mobile.md) | Estrutura das telas, estado, navegação e padrões React Native |
| [04 — Backend](./04-backend-api.md) | Estrutura modular, validação, erros e segurança HTTP |
| [05 — Contrato API](./05-contrato-api.md) | Endpoints HTTP e envelopes de resposta |
| [06 — Banco](./06-banco-de-dados.md) | Modelos Prisma, relações e migrações |
| [07 — Autenticação e segurança](./07-autenticacao-seguranca.md) | Clerk, autorização, segredos e upload seguro |
| [08 — Chat em tempo real](./08-tempo-real-chat.md) | Eventos Socket.IO, salas e idempotência |
| [09 — Design system](./09-design-system-components.md) | Tokens e componentes reutilizáveis no estilo shadcn |
| [10 — Docker e ambientes](./10-docker-ambientes.md) | Execução local e variáveis de ambiente |
| [11 — Qualidade](./11-qualidade-testes.md) | Testes, lint e critérios de aceite |
| [12 — Contribuição](./12-contribuicao.md) | Branches, revisão e Definition of Done |
| [13 — Pendências](./13-pendencias-conhecidas.md) | Limitações verificadas e próximos passos |
| [14 — Execução do MVP](./14-execucao-do-mvp.md) | O que foi entregue e como validar |
| [15 — Matriz de validação](./15-matriz-validacao-mvp.md) | Evidências executadas, resultados e bloqueios externos |

## Regras obrigatórias

1. O mobile nunca acessa o PostgreSQL ou usa credenciais de R2 diretamente.
2. Toda rota privada autentica a identidade e toda mutação verifica ownership.
3. Controllers tratam HTTP; services concentram negócio; repositories concentram Prisma.
4. Dados externos e payloads do cliente são validados antes de entrar no domínio.
5. O selo ISBN é derivado pelo backend e só existe para ISBN-10/13 válido.
6. Cada página mobile possui `index.tsx` e `styles.ts`; CSS web e componentes DOM não entram no app nativo.
7. Componentes compartilhados vivem em `app/src/components`; primitives de chat são compostas, não duplicadas nas telas.
8. Alterações de banco sempre geram migração Prisma versionada.
9. Segredos ficam em `.env`; exemplos versionados nunca contêm credenciais reais.
10. Uma entrega só termina após atualizar teste, contrato e documentação afetados.

## Primeira leitura

Comece por [Visão geral](./01-visao-geral.md) e [Arquitetura](./02-arquitetura.md). Para colocar o projeto em execução, siga [Docker e ambientes](./10-docker-ambientes.md) e [Execução do MVP](./14-execucao-do-mvp.md).

_Última revisão: 31/08/2026._
