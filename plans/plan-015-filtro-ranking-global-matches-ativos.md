# Filtro Global / Matches ativos no ranking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** alternar o ranking de sequência diária entre toda a comunidade e a pessoa logada com seus matches ativos visíveis.

**Architecture:** a API calcula os dois escopos com a mesma regra de sequência e posição, derivando os matches da sessão autenticada. O app usa consultas e caches distintos para cada filtro; o cartão do Perfil permanece global. Não há migração de banco.

**Tech Stack:** Express, Prisma/PostgreSQL, Zod, Vitest; Expo React Native, TanStack Query, React Navigation.

**Spec:** `docs/superpowers/specs/2026-10-29-ranking-global-matches-design.md`.

## Global Constraints

- `Global` é o padrão e o endpoint sem `scope` mantém o contrato atual.
- `Matches ativos` inclui a pessoa logada quando ela tem ao menos um match `ACTIVE` visível; relações bloqueadas ou matches removidos/arquivados ficam fora.
- Sem matches visíveis, conservar a sequência pessoal e retornar posição nula/lista vazia nesse filtro.
- Somente sequências ativas de hoje/ontem em `America/Sao_Paulo` entram; posições competitivas e empate no corte da 20ª posição permanecem.
- Nunca publicar IDs, contato, datas de atividade ou dados de bloqueio no ranking.

## Review Focus

1. Match com a pessoa em qualquer lado (`userA`/`userB`) deve entrar uma vez no filtro — teste de repositório/integracão da Tarefa 1.
2. Match bloqueado ou removido deve desaparecer sem alterar o global — teste de integração da Tarefa 1.
3. Sem matches, a sequência pessoal permanece, com posição nula e lista vazia — teste de integração da Tarefa 1.
4. Trocar filtros rapidamente não pode mostrar dados do cache oposto — teste de componente da Tarefa 2.
5. Mudança de relacionamento enquanto o ranking está aberto deve invalidar o cache de matches — teste da Tarefa 2.

---

### Task 1: API calcula o ranking no escopo escolhido

**Files:**
- Modify: `API/src/modules/gamification/gamification.schemas.js`
- Modify: `API/src/modules/gamification/gamification.controller.js`
- Modify: `API/src/modules/gamification/gamification.repository.js`
- Modify: `API/tests/gamification.routes.test.js`
- Modify: `API/tests/gamification.repository.test.js`
- Modify: `API/tests/gamification.integration.test.js`

**Interfaces:** `GET /api/v1/gamification/leaderboard?scope=global|matches`; `gamificationRepository.listLeaderboard({ currentUserId, today, scope = 'global' })` retorna o mesmo DTO atual. Ausência de `scope` significa `global`; valor inválido retorna 422.

- [x] **Step 1: Escrever testes de rota falhando** para default global, `scope=matches` e valor inválido, mantendo apenas campos públicos.
- [x] **Step 2: Rodar** `npm test -- gamification.routes.test.js` em `API`; confirmar falha pelos novos casos.
- [x] **Step 3: Validar `scope` com Zod e passar o escopo autenticado ao repositório**; manter o DTO existente.
- [x] **Step 4: Escrever testes de repositório/integracão falhando** para lados A/B, bloqueio, remoção, empate, posição pessoal e ausência de matches.
- [x] **Step 5: Implementar filtro Prisma de candidatos e contagem no mesmo snapshot `RepeatableRead`**. Para `matches`, selecionar somente a própria conta e usuários ligados por match `ACTIVE`, aplicar visibilidade bilateral e retornar lista vazia/posição nula se não houver match visível. Reutilizar ordenação, top 20, empate e assinatura de avatar existentes.
- [x] **Step 6: Rodar** `npm test -- gamification` e, com PostgreSQL descartável configurado, `npm run test:integration -- gamification.integration.test.js`; confirmar passes.
- [x] **Step 7: Commitar apenas API e testes** com `feat(api): filter streak leaderboard by active matches`.

### Task 2: Alternância acessível no app e atualização do cache

**Files:**
- Modify: `app/src/features/gamification/api.ts`
- Modify: `app/src/pages/StreakLeaderboard/index.tsx`
- Modify: `app/src/pages/StreakLeaderboard/styles.ts`
- Modify: `app/src/features/moderation/refreshRelationshipCaches.ts`
- Modify: `app/src/features/chat/realtime.ts` se o evento de remoção não passar pelo refresh central
- Test: `app/src/features/gamification/__tests__/leaderboardScope.component.test.tsx`
- Test: `app/src/features/moderation/__tests__/refreshRelationshipCaches.test.ts` (ou teste existente equivalente)

**Interfaces:** `gamificationApi.getLeaderboard(scope?: 'global' | 'matches')`; chave global atual `GAMIFICATION_LEADERBOARD_QUERY_KEY` e nova chave `GAMIFICATION_LEADERBOARD_MATCHES_QUERY_KEY`.

- [x] **Step 1: Escrever testes de componente falhando** para filtro Global padrão, troca para Matches ativos, posição/lista corretas, loading/erro/vazio e não mistura de caches.
- [x] **Step 2: Rodar** os testes focados em `app`; confirmar falha pelos novos casos.
- [x] **Step 3: Implementar endpoint parametrizado, query key por filtro e botões acessíveis** na tela. Manter cartão do Perfil e check-in na chave global; o check-in invalida ambos pelo prefixo existente.
- [x] **Step 4: Invalidar o cache de matches quando relacionamento mudar** por bloqueio/desbloqueio, match criado/removido ou evento em tempo real; adicionar teste focado.
- [x] **Step 5: Rodar** testes focados, `npm run typecheck`, `npm run build:web` e `npm run test:pwa`; confirmar passes.
- [x] **Step 6: Commitar app e testes** com `feat(app): add global and active-match leaderboard filters`.

### Task 3: Documentação e publicação

**Files:**
- Modify: `docs/03-frontend-mobile.md`
- Modify: `docs/04-backend-api.md`
- Modify: `docs/05-contrato-api.md`
- Modify: `docs/09-design-system-components.md`
- Modify: `docs/11-qualidade-testes.md`
- Modify: `plans/plan-015-filtro-ranking-global-matches-ativos.md`

**Interfaces:** contrato e UI das Tarefas 1–2.

- [x] **Step 1: Documentar os dois filtros, critério de match visível, escopo do cartão do Perfil e `scope` opcional**.
- [x] **Step 2: Rodar a suíte completa de API e app, lint, tipagem e build PWA**; anotar qualquer limitação de PostgreSQL ou aparelho físico sem afirmar validação ausente.
- [x] **Step 3: Revisar diff, confirmar que nenhuma migração/schema foi alterada e commitar documentação** com `docs(gamification): describe active-match leaderboard`.
- [ ] **Step 4: Publicar na `main` e verificar deployments API/PWA e endpoints públicos** conforme autorização de publicação vigente.
