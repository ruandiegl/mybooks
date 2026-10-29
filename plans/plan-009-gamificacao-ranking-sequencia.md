# Gamificação de sequência diária — Plano de implementação

> **Para agentes implementadores:** executar este plano tarefa por tarefa usando `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. As etapas usam caixas de seleção para acompanhamento.

**Objetivo:** registrar presenças diárias autenticadas e mostrar a sequência atual e o ranking no Perfil, compartilhados pelo app e pela PWA.

**Arquitetura:** a API calcula o dia em `America/Sao_Paulo`, registra no máximo uma presença por usuário/dia e fornece o ranking; a persistência guarda somente o último dia e a sequência atual. Um coordenador no app faz check-in ao restaurar/estabelecer uma sessão e ao voltar ao primeiro plano; o Perfil apresenta o cartão e abre uma rota empilhada de ranking.

**Stack:** Express 5, Prisma 6, PostgreSQL, Zod, Supertest/Vitest; Expo 57, React Native 0.86, React Navigation 7, TanStack Query 5 e Vitest. Sem dependências externas novas.

**Especificação:** [docs/superpowers/specs/2026-10-26-gamificacao-sequencia-ranking-design.md](../docs/superpowers/specs/2026-10-26-gamificacao-sequencia-ranking-design.md)

## Restrições globais

- A sequência e o ranking medem dias consecutivos atuais, não recorde histórico nem quantidade de aberturas.
- O servidor usa `America/Sao_Paulo`; presença repetida no mesmo dia não incrementa e solicitações simultâneas não podem perder nem duplicar atualizações.
- Um dia civil sem presença reinicia a sequência em 1; sequência vencida é tratada como zero no ranking antes do próximo check-in.
- Só sequências positivas ativas participam; empates usam posição competitiva, e o ranking inclui todos empatados na 20ª posição.
- A posição do usuário atual aparece separadamente mesmo fora da lista; a lista pública contém somente nome e avatar.
- As novas datas e sequências não entram nos DTOs públicos ou de autenticação; a identidade vem somente de `req.currentUser.id`.
- Não adicionar aba, histórico diário, recorde, pontos, medalhas, recompensas, notificações, check-in manual ou mudanças no Premium.
- Compartilhar os fluxos entre Android, iOS e PWA; reutilizar tokens, componentes e estados de carregamento/erro existentes.
- Testes com PostgreSQL usam somente banco local descartável `*_test`, `TEST_DATABASE_URL` e `TEST_DATABASE_DISPOSABLE=true`; nunca Railway ou produção.

## Foco de revisão

1. Duas solicitações simultâneas, mesmo usuário em dispositivos diferentes: uma só presença e nenhum incremento perdido — `API/tests/gamification.integration.test.js`, teste `serializes concurrent check-ins for one user and day`.
2. Virada de dia, fuso e dia perdido: sequência incrementa somente em dias consecutivos e reinicia após um dia civil sem presença — `API/tests/gamification.service.test.js`, testes `uses the Sao Paulo day around UTC midnight`, `increments on the next Sao Paulo day` e `restarts after a missed calendar day`.
3. Dados antigos ou atividade vencida: sequência nula/inativa não entra na lista, mas a própria posição continua correta — `API/tests/gamification.service.test.js`, testes `excludes expired streaks` e `returns current user's rank outside the top 20`.
4. Empate na 20ª posição e privacidade: listar todos os empatados, atribuir posições competitivas e nunca serializar e-mail, telefone ou datas — `API/tests/gamification.service.test.js` e `API/tests/gamification.routes.test.js`, testes `includes ties at rank 20` e `returns only public leaderboard fields`.
5. Sessão restaurada e retorno ao primeiro plano: enviar check-in sem exigir novo login, evitar chamadas duplicadas e permitir retry após falha — `app/src/features/gamification/__tests__/checkInScheduler.test.ts`, testes `checks in once when restored authenticated session becomes ready`, `checks in after foreground on a new Sao Paulo day`, `skips repeated active events for the same day` e `retries after failure`.

---

### Tarefa 1: Definir e testar as regras de data e sequência

**Arquivos:**
- Criar: `API/src/modules/gamification/gamification.service.js`
- Criar: `API/tests/gamification.service.test.js`

**Interfaces:**
- Produz `getSaoPauloDayKey(date: Date): string`, retornando `YYYY-MM-DD` em `America/Sao_Paulo`.
- Produz `calculateCheckIn({ lastActiveDay: string | null, currentActiveStreak: number | null }, today: string): { lastActiveDay: string, currentActiveStreak: number, checkedInToday: boolean }`.
- Produz `isStreakActive({ lastActiveDay: string | null, currentActiveStreak: number | null }, today: string): boolean`; somente sequência positiva com última presença hoje ou ontem permanece ativa.
- Datas são comparadas como chaves de dia civil, sem usar aritmética local dependente do fuso da máquina.

- [x] **Passo 1: Escrever testes unitários falhando** para primeiro check-in (1), repetição no mesmo dia (sem incremento), dia seguinte (incrementa), dia perdido (reinicia em 1), sequência nula e conversão em torno da meia-noite UTC para o dia de São Paulo.
- [x] **Passo 2: Rodar `npm test -- tests/gamification.service.test.js` em `API/`** e confirmar falha por módulo/exports ainda ausentes.
- [x] **Passo 3: Implementar as três funções em `gamification.service.js`**, recebendo `Date`/chaves explícitas para manter os cálculos determinísticos.
- [x] **Passo 4: Acrescentar testes para `isStreakActive`**: hoje e ontem ativos; anteontem, data futura, nula ou sequência zero não ativa.
- [x] **Passo 5: Rodar `npm test -- tests/gamification.service.test.js` em `API/`** e confirmar aprovação de todos os casos de regra e fuso.
- [x] **Passo 6: Commitar somente os dois arquivos desta tarefa** com `feat(gamification): define daily streak rules`.

### Tarefa 2: Persistir check-in concorrente e disponibilizar APIs privadas

**Arquivos:**
- Modificar: `API/prisma/schema.prisma`
- Criar: `API/prisma/migrations/20261026120000_daily_active_streak/migration.sql`
- Criar: `API/src/modules/gamification/gamification.repository.js`
- Criar: `API/src/modules/gamification/gamification.controller.js`
- Criar: `API/src/modules/gamification/gamification.routes.js`
- Criar: `API/src/modules/gamification/gamification.schemas.js`
- Modificar: `API/src/routes/index.js`
- Modificar: `API/vitest.integration.config.js`
- Criar: `API/tests/gamification.routes.test.js`
- Criar: `API/tests/gamification.repository.test.js`
- Criar: `API/tests/gamification.integration.test.js`

**Interfaces:**
- Adicionar a `User` `lastActiveDay DateTime? @db.Date` e `currentActiveStreak Int?`; usuários anteriores começam sem sequência e o primeiro check-in inicia em 1. Não adicionar tabela de eventos.
- `gamificationRepository.recordCheckIn(userId: string, today: string)` retorna `{ dayKey: string, currentStreak: number, checkedInToday: true }`; dentro de transação Prisma, bloquear a linha de usuário com `SELECT ... FOR UPDATE`, aplicar `calculateCheckIn` e persistir o resultado para serializar dispositivos concorrentes.
- `gamificationRepository.listLeaderboard({ currentUserId: string, today: string })` retorna `{ currentUser: { currentStreak: number, rank: number | null }, entries: Array<{ name: string, avatarUrl: string | null, currentStreak: number, rank: number }> }`, sem campos privados.
- `POST /api/v1/gamification/check-in` retorna `{ data: { dayKey: string, currentStreak: number, checkedInToday: true } }`; data e usuário vêm do servidor/autenticação, nunca do corpo do cliente.
- `GET /api/v1/gamification/leaderboard` retorna `{ data: { currentUser: { currentStreak: number, rank: number | null }, entries: Array<{ name: string, avatarUrl: string | null, currentStreak: number, rank: number }> } }`. `rank` nulo indica ausência de sequência ativa. `entries` não inclui IDs, e-mail, telefone ou datas.
- Montar `gamificationRouter` em `API/src/routes/index.js` depois do middleware privado já aplicado. Validar corpo vazio do check-in com Zod e manter o envelope/erros padrão da API.
- Consultar somente usuários ativos com sequência positiva e `lastActiveDay` entre ontem e hoje em São Paulo. Ordenar empates de forma determinística por nome e ID interno; calcular posição competitiva. Trazer posições até 20 e todos empatados no corte. Calcular a posição do usuário autenticado mesmo que fora da lista.

- [x] **Passo 1: Escrever testes de rota falhando** para `POST` autenticado, `GET` autenticado, rejeição sem sessão, corpo inválido, identidade sempre derivada de `req.currentUser.id` e formato público sem campos privados.
- [x] **Passo 2: Escrever testes de integração PostgreSQL falhando** para migração dos campos nulos, primeiro check-in, repetição idempotente e duas chamadas simultâneas do mesmo usuário/dia.
- [x] **Passo 3: Estender o `include` de `API/vitest.integration.config.js`** para executar `tests/gamification.integration.test.js`, mantendo a validação de banco local descartável existente.
- [x] **Passo 4: Criar a migração Prisma e gerar o client**; executar `npx prisma validate` e `npx prisma generate` em `API/`.
- [x] **Passo 5: Implementar `recordCheckIn`** com transação e lock da linha, reutilizando `calculateCheckIn` da Tarefa 1; tratar usuário ausente com erro sanitizado e nunca confiar em ID/data enviados pelo cliente.
- [x] **Passo 6: Implementar consulta e cálculo do ranking** usando a data de São Paulo, ordenação estável, posição competitiva e inclusão dos empatados no limite; manter o usuário atual separado da lista.
- [x] **Passo 7: Implementar schemas, controller, router e montagem privada**; assegurar que campos de gamificação não sejam incluídos em `publicUserSelect` ou `authUserSelect`.
- [x] **Passo 8: Rodar `npm test -- tests/gamification.service.test.js tests/gamification.routes.test.js` em `API/`** e confirmar aprovação, incluindo o teste de privacidade.
- [ ] **Passo 9: Rodar `npm run test:integration -- tests/gamification.integration.test.js` em `API/`** apenas com `TEST_DATABASE_URL` localhost em banco `*_test` e `TEST_DATABASE_DISPOSABLE=true`; confirmar serialização concorrente e idempotência. A regressão de virada de dia também tem teste unitário em `tests/gamification.repository.test.js`, que confirma que a data só é lida depois do lock.
- [x] **Passo 10: Rodar `npm run lint` em `API/`**; confirmar lint aprovado.
- [x] **Passo 11: Commitar apenas schema, migração, módulo, rotas, configuração e testes desta tarefa** com `feat(api): add private daily streak and leaderboard endpoints`.

### Tarefa 3: Fazer check-in após sessão e retorno ao primeiro plano

**Arquivos:**
- Criar: `app/src/features/gamification/checkInScheduler.ts`
- Criar: `app/src/features/gamification/DailyCheckInCoordinator.tsx`
- Criar: `app/src/features/gamification/__tests__/checkInScheduler.test.ts`
- Modificar: `app/src/routes/index.tsx`
- Modificar: `app/src/types/api.ts`

**Interfaces:**
- `getSaoPauloDayKey(date: Date): string` retorna chave `YYYY-MM-DD` no fuso do servidor para deduplicação local; isso é apenas otimização, a API continua autoridade.
- `createDailyCheckInScheduler({ getToday, checkIn, onSuccess })` retorna `setSession({ isLoaded, isSignedIn, userId })` e `onAppStateChange(state)`. O scheduler deduplica pelo `dayKey` confirmado pelo servidor, evita requisições simultâneas, limpa estado ao trocar usuário e só marca sucesso depois da resposta.
- `DailyCheckInCoordinator` observa o estado inicial da sessão e `AppState` (`active`); chama `POST /api/v1/gamification/check-in` uma vez por dia de São Paulo, armazena o dia somente depois de resposta bem-sucedida e invalida `['gamification', 'leaderboard']`. Falha não bloqueia o app e permite retry no próximo retorno ao primeiro plano.
- Limpar o controle local quando `user.id` mudar; ao restaurar sessão, executar o primeiro check-in sem exigir novo login. Nenhum token ou dado de ranking é salvo pelo coordenador.

- [x] **Passo 1: Escrever testes unitários falhando do scheduler** para sessão não carregada/deslogada, primeiro check-in após restauração, evento `active` em novo dia de São Paulo, eventos `active` repetidos no mesmo dia, falha com retry, chamadas concorrentes e mudança de usuário.
- [x] **Passo 2: Rodar `npm test -- src/features/gamification/__tests__/checkInScheduler.test.ts` em `app/`** e confirmar as falhas esperadas.
- [x] **Passo 3: Implementar helper puro e tipos de resposta** para check-in e ranking em `app/src/types/api.ts`.
- [x] **Passo 4: Implementar `createDailyCheckInScheduler`** com estado de sessão, deduplicação pelo `dayKey` retornado, proteção de chamada concorrente e callbacks injetáveis; usar a função no componente para tornar todo o comportamento do ciclo de vida testável sem dependência de renderização.
- [x] **Passo 5: Implementar `DailyCheckInCoordinator`** com listener de `AppState`, chamada ao scheduler para restauração/estabelecimento e retorno ao estado `active`, callback de check-in HTTP e invalidação da query.
- [x] **Passo 6: Montar o coordenador somente no ramo autenticado de `Routes`**; evitar listeners duplicados e chamadas durante navegação ou renovação de token.
- [x] **Passo 7: Rodar `npm test -- src/features/gamification/__tests__/checkInScheduler.test.ts` e `npm run typecheck` em `app/`**; confirmar deduplicação e tipagem.
- [x] **Passo 8: Commitar somente os arquivos desta tarefa** com `feat(app): check in authenticated daily activity`.

### Tarefa 4: Mostrar sequência no Perfil e criar tela de ranking

**Arquivos:**
- Criar: `app/src/features/gamification/api.ts`
- Criar: `app/src/features/gamification/presentation.ts`
- Criar: `app/src/features/gamification/__tests__/presentation.test.ts`
- Criar: `app/src/pages/StreakLeaderboard/index.tsx`
- Criar: `app/src/pages/StreakLeaderboard/styles.ts`
- Modificar: `app/src/pages/profile/index.tsx`
- Modificar: `app/src/pages/profile/styles.ts`
- Modificar: `app/src/types/navigation.ts`
- Modificar: `app/src/routes/app.routes.tsx`
- Modificar: `app/src/routes/linking.ts`
- Modificar: `app/src/routes/__tests__/linking.test.ts`
- Modificar: `app/src/types/api.ts`

**Interfaces:**
- `gamificationApi.getLeaderboard(): Promise<LeaderboardResponse>` chama `GET /api/v1/gamification/leaderboard`; React Query usa a chave compartilhada `['gamification', 'leaderboard']`.
- Acrescentar `StreakLeaderboard: undefined` a `RootStackParamList`; registrar tela empilhada e caminho `ranking/sequencia`, sem modificar `MainTabParamList`.
- O Perfil mostra cartão selecionável com dias atuais e colocação, CTA acessível e comportamento coerente se não houver ranking; ambos os cabeçalhos de abas de perfil preservam o acesso ao cartão.
- A tela mostra posição pessoal e lista pública, inclusive empates no corte, com loading, erro/retry, estado vazio e rótulos de acessibilidade; não oferece dados pessoais ou ações fora do escopo.

- [x] **Passo 1: Escrever testes de linking falhando** para `/ranking/sequencia` gerar rota `StreakLeaderboard` e para navegação de Perfil continuar usando a rota empilhada sem criar quinta aba.
- [x] **Passo 2: Escrever testes unitários de apresentação/transformação** em `presentation.test.ts` para posições 1, 1, 3, usuário fora do top 20, ranking vazio e todos os empatados no corte; campos aceitos se limitam a nome, avatar, sequência e posição.
- [x] **Passo 3: Rodar `npm test -- src/routes/__tests__/linking.test.ts` e os novos testes de gamificação em `app/`**; confirmar falha antes da UI.
- [x] **Passo 4: Implementar cliente tipado e query compartilhada** em `features/gamification/api.ts` e projeção de campos/rótulos públicos em `features/gamification/presentation.ts`, usando o endpoint e a chave definidos.
- [x] **Passo 5: Acrescentar cartão ao Perfil e seus estilos** com tokens existentes, ação de abrir o ranking e estados de carregamento/erro que permitam tentar novamente.
- [x] **Passo 6: Implementar `StreakLeaderboard`** como rota empilhada com lista acessível, posição pessoal separada, empate competitivo e estados vazios/erro/retry.
- [x] **Passo 7: Registrar rota e linking** sem tocar nas quatro abas atuais; garantir que caminho direto/reload da PWA apresente a tela de ranking.
- [x] **Passo 8: Rodar `npm test -- src/routes/__tests__/linking.test.ts` e todos os testes novos de gamificação, depois `npm run typecheck` em `app/`**; confirmar testes e tipos aprovados.
- [x] **Passo 9: Commitar somente os arquivos desta tarefa** com `feat(app): show daily streak leaderboard in profile`.

### Tarefa 5: Atualizar documentação e validar Android/PWA integrados

**Arquivos:**
- Atualizar conforme os contratos implementados: `docs/README.md`, `docs/01-visao-geral.md`, `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/04-backend-api.md`, `docs/05-contrato-api.md`, `docs/06-banco-de-dados.md`, `docs/09-design-system-components.md`, `docs/11-qualidade-testes.md`, `docs/15-matriz-validacao-mvp.md` e `docs/16-historico-de-alteracoes.md`.
- Atualizar `API/prisma/migrations/` e registrar a migração no procedimento de deploy documentado, sem aplicar em produção como parte do teste.

**Interfaces:**
- A documentação descreve os endpoints, comportamento diário/fuso, privacidade do ranking, migração, limitação de histórico, teste de integração com banco descartável e o fluxo PWA/Android.
- Nenhuma etapa deste plano aplica migração ou altera dados Railway/produção.

- [x] **Passo 1: Atualizar a documentação de arquitetura/API/schema/testes** com contratos finais e critérios de aceite; corrigir links do índice `docs/README.md`.
- [x] **Passo 2: Atualizar a matriz MVP e histórico** com escopo entregue e validações realmente executadas, deixando teste físico em dispositivo como pendente caso não haja aparelho.
- [ ] **Passo 3: Rodar `npm test`, `npm run lint` e a integração PostgreSQL descartável da API**; não seguir se a integração não estiver configurada com banco local seguro. *(suítes e lint passaram; integração ainda pendente)*
- [x] **Passo 4: Rodar `npm test`, `npm run typecheck`, `npm run build:web` e `npm run test:pwa` em `app/`**; confirmar build Android com o comando de export existente do projeto se estiver disponível no ambiente.
- [ ] **Passo 5: Fazer smoke local autenticado**: login/restauração envia check-in, segunda abertura no dia mantém sequência, mudança do dia incrementa, cartão abre ranking, retry funciona e PWA resolve `/ranking/sequencia`. *(PWA/build/linking validados; fluxo autenticado integrado depende da API e banco local)*
- [x] **Passo 6: Rodar `git diff --check` e revisar que nenhum campo interno foi adicionado aos DTOs públicos, nenhum segredo foi incluído e nenhum arquivo preexistente do usuário foi alterado pelo staging.**
- [x] **Passo 7: Commitar somente documentação e registros de validação desta tarefa** com `docs(gamification): document daily streak ranking`.

## Autorrevisão do plano

- **Cobertura da especificação:** presença por sessão restaurada/primeiro plano (Tarefa 3); horário do servidor e repetição/concorrência (Tarefas 1–2); sequência vencida, elegibilidade, ranking, empate e posição pessoal (Tarefas 1–2); privacidade (Tarefa 2); Perfil, tela empilhada, linking e PWA (Tarefa 4); validação e documentação (Tarefa 5).
- **Consistência de interfaces:** API retorna `dayKey/currentStreak/checkedInToday`; app deduplica por `dayKey` local equivalente a São Paulo e consulta `LeaderboardResponse` pela chave `['gamification', 'leaderboard']`; rota é `StreakLeaderboard` com caminho `ranking/sequencia`.
- **Limite dos dados:** `lastActiveDay` e `currentActiveStreak` são opcionais para usuários legados; os campos não são incluídos em `publicUserSelect` nem no payload de autenticação. A primeira presença registrada inicia em 1, sem backfill inventado.
- **Corte do ranking:** manter todas as linhas cuja posição competitiva seja até 20, incluindo empates na 20ª posição; contar usuários com pontuação estritamente maior para calcular posição compartilhada.
- **Banco de testes:** a execução de integração falha com mensagem clara quando não há `TEST_DATABASE_URL` local descartável; nenhuma URL remota é aceita pela configuração.
