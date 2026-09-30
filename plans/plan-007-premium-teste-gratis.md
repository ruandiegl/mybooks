# Plano 007 — TrocaLivros Premium com acesso gratuito de 30 dias

> Implementar este plano tarefa por tarefa com superpowers:executing-plans. O escopo aprovado é simular o benefício Premium; nenhuma tarefa deste plano pode movimentar dinheiro.

**Objetivo:** permitir que cada conta elegível escolha experimentar os benefícios Premium por 30 dias exatos, sem cartão, gateway, transação, renovação ou cobrança.

**Arquitetura:** API e banco são a autoridade do período e dos limites. O APK Android distribuído diretamente e a PWA acessada pelo Safari no iOS usam a mesma conta e recebem os mesmos entitlements. O cliente apresenta a oferta, pede confirmação e reflete a resposta da API.

**Stack:** Expo 57, React Native 0.86, TypeScript, TanStack Query, Express 5, Zod, Prisma 6 e PostgreSQL 16.

**Spec:** decisões refinadas e aprovadas em 24/09/2026; documentos 01–16 listados em docs/README.md; plano relacionado plans/plan-006-tela-curtidas.md.

## Restrições globais

- User.id da sessão autenticada determina a conta; o cliente não escolhe identidade para Premium, like ou cota.
- A API inicia o período no aceite e calcula fim = início + 30 × 24 horas em UTC; acesso ativo somente quando startedAt <= now < endsAt.
- Conta verificada pode ativar uma vez; recusar não inicia o período nem consome elegibilidade.
- MVP não coleta cartão, não integra gateway, não cobra, não renova e não cria produto de assinatura.
- Cards semanal, mensal e anual são informativos, desabilitados e exibem “Em breve”, sem preço ou ação de compra.
- Plano gratuito pode curtir 15 livros distintos por dia em America/Sao_Paulo; PASS não gasta cota e retirar uma curtida não devolve a vaga naquele dia.
- O backend aplica entitlements e limites; relógio do dispositivo e sinalizadores locais nunca autorizam benefícios.
- O período e o limite são compartilhados entre APK e PWA.
- Testes e demonstração não podem realizar transação.

## Decisões funcionais aprovadas

| Tema | Regra |
| --- | --- |
| Usuário novo | Após concluir ou pular onboarding, abre modal perguntando se deseja experimentar 30 dias grátis. Ativa somente ao confirmar. |
| Conta existente | Ao entrar sem Premium, recebe o bottom sheet da oferta imediatamente, no máximo uma vez por sessão de login. |
| Recusa | Fecha a oferta sem alterar elegibilidade; ela pode reaparecer no próximo login, no máximo uma vez por sessão. Perfil mantém o convite. |
| Elegibilidade | Contas existentes e novas verificadas; uma ativação por User.id, compartilhada entre plataformas. |
| Premium temporário | Ver nomes e lista histórica de quem curtiu os livros do usuário; filtro de recebidas; likes ilimitados. |
| Plano gratuito | Contagem agregada de likes recebidos, curtidas enviadas disponíveis e limite de 15 livros curtidos por dia. |
| Expiração | Ao completar 30 × 24 h, retorna aos limites gratuitos automaticamente, sem cobrança, renovação ou reativação. |
| Apresentação | Oferta gratuita em destaque; planos semanal, mensal e anual com “Em breve”, sem preços, links ou compra. |

Texto anterior ao aceite: “30 dias de acesso grátis. Sem cartão e sem cobrança. O acesso Premium termina automaticamente; nada será renovado.” Recusar preserva o plano gratuito. O aceite inicia o relógio apenas após resposta confirmada da API.

## Entitlements

| Recurso | Gratuito | Premium ativo |
| --- | --- | --- |
| Contagem agregada de likes recebidos | Sim | Sim |
| Ver lista, pessoa e livro de cada like recebido | Não | Sim |
| Filtrar likes recebidos por livro | Não | Sim |
| Ver/remover curtidas enviadas | Sim | Sim |
| Curtir livro distinto no dia local | Até 15 | Ilimitado |
| PASS/dispensar | Sim, sem consumir cota | Sim |
| Curtir de volta | LIKE e cota normal | Ilimitado |
| Convite e status no Perfil | Sim | Status e data final |

A contagem não pode retornar nome, avatar, livro, ator ou identificador. Ao expirar, a API volta a negar listas de recebidas e de livros com likes; count e sent continuam livres. O app invalida o cache de identidade ao trocar de estado.

## Política de loja e caminho para cobrança futura

Na apresentação atual não existe produto pago: o APK é distribuído diretamente e a experiência iOS é uma PWA. O período aprovado é uma permissão gratuita da conta, sem transação, dados de pagamento ou cobrança posterior. Não configurar compra in-app ou billing para a demonstração.

Se futuramente houver venda de recursos digitais em versão distribuída pela App Store, seguir StoreKit/In-App Purchase; no Google Play, seguir Play Billing para o país e programa aplicáveis. As políticas e exceções variam por loja/região e devem ser revisadas antes de habilitar preços. A PWA pode ter uma decisão de checkout Web em plano separado; não adicionar links de pagamento à versão nativa sem revisão da política aplicável.

Uma oferta de acesso gratuito criada no backend não deve ser apresentada como assinatura de loja, trial que converte em cobrança ou renovação automática. A aprovação futura de venda requer produtos, preço e frequência claros, gestão de cancelamento/restauração e verificação server-side de compras. Isso não faz parte do MVP.

## Revisão de foco

- Ativações simultâneas/retry não duplicam ou estendem o prazo: testar compare-and-set e chamada repetida.
- No instante now = endsAt, o usuário já é gratuito; um milissegundo antes ainda é Premium.
- LIKE → PASS, remoção, exclusão de livro, retry e concorrência não devolvem nem duplicam vaga diária.
- Expiração esconde identidades pela API, preserva count agregado e curtidas enviadas.
- A PWA não persiste refresh token em armazenamento acessível a JavaScript e o logout revoga a sessão.

## Modelo de dados proposto

- User.premiumTrialStartedAt e User.premiumTrialEndsAt são DateTime nullable e ficam preenchidos após expiração para impedir nova ativação.
- User.premiumOfferCohort enum EXISTING/NEW distingue contas presentes na migração das novas; migration marca contas existentes como EXISTING e novas recebem NEW.
- LikeDailyUsage guarda id, userId, targetBookId como identificador sem FK para Book, quotaDate como DATE local e createdAt. Índice único em userId + targetBookId + quotaDate.
- LikeDailyUsage tem relação com User com cascade na exclusão da conta. Não deve apagar o consumo do dia quando o livro é removido.
- Não persistir boolean Premium derivado, cartão, CVV, preço ou token de compra. Estado ativo deriva dos timestamps da API.
- A ativação grava timestamps com compare-and-set sobre premiumTrialStartedAt nulo. Retry retorna o estado já persistido sem alterar endsAt.
- A data diária é calculada usando a zona IANA America/Sao_Paulo. Remover registros de dias anteriores do próprio usuário ao processar uma ação reduz retenção desnecessária sem tarefa agendada.

## Contrato API planejado

Rotas privadas, envelope padrão e validação de sessão nativa:

- GET /api/v1/premium/status retorna eligible, trialState (NOT_STARTED, ACTIVE, EXPIRED), trialStartedAt, trialEndsAt, promptMode e benefícios.
- POST /api/v1/premium/trial/activate inicia 30 × 24 h. Repetição retorna o estado atual e não estende o prazo.
- GET /api/v1/likes/received exige Premium ativo; plano gratuito recebe 403 PREMIUM_REQUIRED antes de consultar/serializar dados de identidade.
- GET /api/v1/likes/received/books também exige Premium.
- GET /api/v1/likes/received/count permanece disponível e retorna somente count agregado.
- GET /api/v1/likes/sent permanece disponível.
- POST /api/v1/interactions com action LIKE registra uso e verifica entitlement/cota; action PASS não consome cota.
- Resposta a like usa um livro AVAILABLE de quem curtiu, nunca o livro do próprio usuário. Sem livro disponível, a UI não apresenta as ações.

Para registrar uma interação LIKE, adquirir lock transacional por usuário, computar quotaDate, procurar a chave única de uso e conferir o estado Premium com o relógio do servidor. Registrar cada livro LIKE uma vez por dia, inclusive durante Premium, mas rejeitar nova chave apenas quando a conta estiver gratuita e já houver 15 usos. Depois gravar/upsert a Interaction na mesma transação. PASS não remove a linha de uso. Retry da mesma chave não conta outra vaga. Se houver conflito serializável, repetir a transação com limite de tentativas e sem duplicar a Interaction. Criar teste concorrente para o último slot.

O helper hasActiveTrial(userId, now) centraliza a regra e é usado nos endpoints recebidos e nas mutações. Não duplicar entitlement em controller ou frontend. Erros de limite retornam 403 DAILY_LIKE_LIMIT_REACHED sem expor dados de terceiros.

## Plano de execução

### Tarefa 1 — Persistir elegibilidade, período e uso diário

**Arquivos:** alterar API/prisma/schema.prisma; criar migração em API/prisma/migrations/; cobrir com API/tests/premium.schema.test.js ou integração Prisma existente.

**Interface:** timestamps e cohort em User; LikeDailyUsage com unicidade conta/livro/data local; sem migração destrutiva.

- [x] Antes da mudança, confirmar relações e migrações atuais do Prisma.
- [x] Adicionar os campos e modelo descritos acima; backfill de cohort marca todos os usuários existentes como EXISTING.
- [x] Gerar migração versionada e validar com npx prisma validate.
- [x] Testar que a segunda linha da mesma conta/livro/data viola a constraint e que outro dia aceita a linha.
- [x] Aplicar a migração em banco descartável vazio e confirmar que contas e interações existentes permanecem.

### Tarefa 2 — Expor status e ativação do acesso grátis

**Arquivos:** criar API/src/modules/premium/premium.routes.js, premium.controller.js, premium.service.js, premium.repository.js e premium.schemas.js; registrar em API/src/routes/index.js; criar API/tests/premium.service.test.js e teste de rota.

**Interface:** getPremiumStatus(userId, now) deriva status; activateTrial(userId, now) usa compare-and-set e devolve datas UTC.

- [x] Cobrir NOT_STARTED, ACTIVE, EXPIRED, conta inelegível e NOW exatamente igual a endsAt.
- [x] Cobrir ativação concorrente/repetida: uma única gravação e mesmo endsAt.
- [x] Criar GET status, POST offer/prompted e POST activate atrás da autenticação; erro mantém envelope sanitizado.
- [x] Calcular fim com 30 × 24 × 60 × 60 × 1000 ms usando relógio injetável no service.
- [x] Exigir conta verificada; elegibilidade independe de a conta ser anterior ou posterior à migração.

### Tarefa 3 — Aplicar bloqueios de likes e quota

**Arquivos:** alterar API/src/modules/likes/likes.service.js, API/src/modules/matches/matches.service.js e matches.repository.js; criar API/src/modules/premium/likesQuota.service.js e likesQuota.repository.js; cobrir nos testes desses módulos e em novo teste de quota.

**Interface:** hasActiveTrial(userId, now) é o único helper Premium; consumeDailyLike(userId, targetBookId, persistInteraction) lê o relógio do servidor depois de obter o lock da conta e grava quota + Interaction na mesma transação.

- [x] Bloquear received e received/books antes de retornar nome/avatar/livro para conta gratuita; count e sent permanecem acessíveis.
- [x] Para LIKE gratuito, bloquear o usuário no banco, validar a chave existente, contar usos do dia, rejeitar a 16ª chave e gravar quota + Interaction atomicamente.
- [x] Registrar quota também enquanto Premium está ativo para impedir usar outras 15 vagas no mesmo dia após uma expiração.
- [x] Não consumir em PASS; não apagar quota ao passar de LIKE para PASS; repetir a chave no mesmo dia não aumenta contagem.
- [x] Cobrir 15/16 livros, remoção/desativação, retry, virada de dia em America/Sao_Paulo e duas curtidas concorrentes no último slot. (quota usa chave sem FK para Book, então remover o livro não apaga o uso)
- [x] Cobrir que curtir de volta também consome quota free e que Premium ativo permite exceder 15.

### Tarefa 4 — Suportar sessão segura na PWA

**Arquivos:** revisar o armazenamento em `app/src/features/auth/`, `app/src/providers/SessionProvider.tsx`, os endpoints de refresh/logout e a configuração CORS da API.

- [x] Manter `expo-secure-store` para sessão nativa.
- [x] Na PWA, manter access token somente em memória e refresh token em cookie HttpOnly, Secure e SameSite=Strict; API e PWA precisam compartilhar a mesma origem HTTPS via proxy `/api`.
- [x] Restringir origem CORS, validar origem nas mutações e proteger refresh/logout contra CSRF.
- [x] Fazer logout revogar a sessão no servidor em ambas as plataformas.
- [x] Permitir HTTP com sessão efêmera em memória apenas quando app e API usam loopback (`localhost`, `127.0.0.1` ou `::1`); bloquear credenciais em HTTP de LAN/Internet.
- [x] Serializar refresh por origem entre abas com Web Locks; se a revogação do logout falhar, manter a sessão visível e permitir retry.

### Tarefa 5 — Apresentar e operar a oferta

**Arquivos:** criar componentes/hooks em `app/src/features/premium/`; integrar onboarding, `SessionProvider`, Perfil e os pontos de entrada da oferta.

- [x] Após o onboarding de conta nova, abrir bottom sheet com a oferta e confirmação explícita.
- [x] Para conta existente sem Premium, abrir o bottom sheet imediatamente após o login, no máximo uma vez por sessão.
- [x] Recusa fecha a oferta sem consumir elegibilidade; novo login pode mostrá-la de novo.
- [x] Manter convite no Perfil e exibir estado ativo e data/hora de término quando aceito.
- [x] Informar claramente “30 dias grátis, sem cartão e sem cobrança” e que o acesso termina automaticamente.
- [x] Mostrar três cards semanal, mensal e anual com “Em breve”; sem preço, link, checkout ou ação de compra.
- [x] Apresentar a oferta em bottom sheet com entrada de baixo para cima, fechamento ao tocar fora e ao arrastar para baixo.
- [x] Atualizar/invalidate queries após aceite e expiração; não usar estado local como autorização.
- [x] Tratar conta não verificada, falha/offline, ativação já realizada e expiração com mensagens compreensíveis.

### Tarefa 6 — Integrar, validar e documentar

- [x] Testar API: elegibilidade, ativação única, limites temporais, corrida no 15º/16º like, privacidade das curtidas e expiração.
- [x] Testar regras do app para bottom sheet, entitlement e expiração; conferir fluxo no export Web.
- [x] Cobrir timer maior que o limite de setTimeout, retry do logout quando a revogação falha, erro da lista de curtidas enviadas e rótulos de acessibilidade dos botões por ícone.
- [x] Cobrir os limiares de arrasto para fechar; a conferência manual do toque fora e do gesto nos aparelhos permanece no aceite físico.
- [ ] Testar a mesma conta no APK Android e PWA iOS em dispositivos físicos; aceite externo pendente.
- [ ] Verificar acessibilidade em Android/iOS físicos, incluindo navegação por leitor de tela; aceite externo pendente.
- [x] Rodar testes, typecheck, lint, Prisma e migração; export PWA aprovado. Build APK pendente porque o checkout não tem Java/JDK nem Android SDK.
- [x] Atualizar docs/01, 02, 03, 04, 05, 06, 07, 13, 14, 15, 16 e README conforme o código efetivamente entregue.

### Tarefa 7 — Portão para cobrança futura

A cobrança real exige um plano e aprovação de escopo separados. Antes de implementá-la, revisar as políticas oficiais vigentes para cada loja, país e modalidade de distribuição; definir produtos, preços, renovação/cancelamento, restauração, reembolso, validação server-side e notificações. Na distribuição nativa, avaliar StoreKit/In-App Purchase para App Store e Google Play Billing para vendas digitais no Google Play. Na PWA, decidir checkout Web em separado. Nenhum desses componentes deve ser incluído no plano de teste gratuito.

**Referências oficiais consultadas em 24/09/2026:** [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple — visão geral de In-App Purchase](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases), [Google Play — pagamentos](https://support.google.com/googleplay/android-developer/answer/9858738), [Google Play — assinaturas](https://support.google.com/googleplay/android-developer/answer/9900533), [Expo — autenticação e armazenamento Web](https://docs.expo.dev/guides/authentication/).

## Critério de conclusão

O trial só está pronto quando uma conta verificada pode ativar uma vez, usar os benefícios por exatamente 30 dias, receber a mesma decisão de entitlement na API/APK/PWA e voltar automaticamente ao gratuito sem transação. A demonstração não coleta dados de pagamento, não inicia cobrança e não cria renovação.
