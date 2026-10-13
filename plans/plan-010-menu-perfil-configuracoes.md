# Plano 010 — Menu do perfil e configurações de conta

> **Para execução por agentes:** usar `superpowers:executing-plans` para execução sequencial ou `superpowers:subagent-driven-development` se esse método for escolhido pelo usuário. Passos com `- [ ]` representam trabalho futuro, não funcionalidades implementadas. Ler os requisitos, contratos e restrições deste documento antes das tarefas.

**Estado:** desenho aprovado e implementação local em validação final na branch `codex/profile-settings`; não publicado. **Data:** 08/10/2026. As seções abaixo preservam a especificação e os fatos da base no planejamento; o estado atual e as evidências estão na [execução](./plan-010-menu-perfil-configuracoes-execucao.md).

**Objetivo:** substituir o botão Editar do perfil por um menu hambúrguer que abre um modal de configurações, centralizando edição, conta, aparência, senha, saída, notificações disponíveis, ajuda e informações do app.

**Arquitetura:** manter as primitives React Native e o padrão do modal de edição existente; hospedar menu e suas seções num único modal. Introduzir tema reativo para o app inteiro e persistência de aparência por dispositivo. Evoluir a autenticação própria para troca de senha e encerramento global seguro; não reintroduzir Clerk nem prometer push sem infraestrutura de entrega.

**Stack:** Expo 57.0.22, React Native 0.86.3, React 19, TypeScript, React Navigation, TanStack Query, Express 5/Zod/Prisma 6/PostgreSQL 16 e Socket.IO. Reutilizar Expo SecureStore apenas para sessão; propor AsyncStorage 2.2.0 para aparência pública e `expo-system-ui` compatível com o SDK57. Nenhuma instalação faz parte deste planejamento.

**Especificação:** o pedido do usuário e as seções 1–5 deste documento constituem o desenho proposto. As tarefas seguintes o operacionalizam. A aprovação do plano/desenho e a escolha do método de execução precedem qualquer implementação.

**Referências locais:** [índice documental](../docs/README.md), [frontend](../docs/03-frontend-mobile.md), [segurança](../docs/07-autenticacao-seguranca.md), [design system](../docs/09-design-system-components.md), [qualidade](../docs/11-qualidade-testes.md) e [contribuição](../docs/12-contribuicao.md).

## 1. Contexto verificado e limites

Base inspecionada: `main` em `0c935526fb2d1c43fcb2ffc5ac4d4b9e0e008311`. A inspeção e as análises dos agentes foram somente leitura. Não houve teste novo, acesso ao banco, alteração de Railway/R2 ou instalação nesta tarefa.

| Área | Estado real da base | Consequência para o plano |
| --- | --- | --- |
| Perfil | `TopBar.action` contém Editar; edição já possui modal full-screen/slide, teclado e rolagem | Trocar somente o acionamento; preservar o formulário e integrar suas transições ao novo host |
| Avatar | Visualização, câmera/galeria, recorte e animação já publicados | Preservar enquadramento, estados ocupados, proteção Safari e fluxo R2; não criar outro editor |
| Logout | `useSession().signOut()` revoga antes de limpar estado; falha oferece retry | Mover para o menu sem simular logout local/offline |
| Logout global | `POST /auth/logout-all` existe; não há ação equivalente no app e o controller não limpa cookies | Completar os adapters, a limpeza correta de sessão e a revogação em sockets |
| Senha | Recuperação por e-mail/código existe; troca autenticada não existe | Criar contrato próprio com senha atual; não chamar reset como se fosse troca autenticada |
| Conta | `GET/PATCH /me` permite nome, sobrenome, telefone, cidade, bio e interesses | E-mail é somente leitura; CPF, senha e e-mail não entram nesse PATCH |
| Exclusão de conta | Não há `DELETE /me` nem reautenticação para isso | Não oferecer um botão destrutivo fictício; tratar como evolução separada |
| Tema | Uma paleta clara estática; `app.json` força light e StatusBar é dark | Tema escuro exige provider, estilos reativos, navegação e shell PWA; não basta um switch |
| Notificações | Badge de Curtidas por polling, avisos de match após ação local e socket somente no Chat | Não há inbox/global listener, push SDK, subscriptions ou preferências |
| PWA | Worker guarda assets e offline genérico; não possui push/notificationclick | Não alterar a política de cache privado para implementar configurações |

Inventário inicial de tema: 84 arquivos importam theme; 49 usam StyleSheet; 48 arquivos de estilo consomem cores/sombra. Recontar na execução, porque esses números não são uma regra permanente.

### Fontes internas consideradas

- `docs/README.md`, documentos 01–15 e `seguranca-auth-runbook.md`: produto, arquitetura, contratos, modelos, segurança, UI, ambientes e validação. `docs/16-historico-de-alteracoes.md`: registros recentes de publicação/avatares.
- `plans/plan-003-perfil-usuario-visual.md`, plano009 e seus registros: continuidade do perfil e do avatar; seus estados históricos não substituem o código atual.
- App: `pages/profile`, `providers/SessionProvider.tsx`, `features/auth`, `styles/theme.ts`, `routes`, modais de avatar/Premium e `public/`.
- API: módulos auth/users/chat, schema Prisma e middleware de sessão.

Os textos antigos sobre “avatar não publicado”, branches Railway antigas ou logout web que limpa cookie mesmo em falha não descrevem a base atual. O plano preserva a regra verificada de revogação confirmada e os dois contratos de cookie existentes; atualizar os documentos afetados durante a implementação, sem apagar evidências históricas.

### Especialistas e skills utilizados

- Agente de conta/segurança: auditoria de rotas, sessões, concorrência, cookies e sockets.
- Agente de frontend/temas: auditoria do perfil, modais, consumidores de tema, persistência e notificações.
- Skills `brainstorming`, `writing-plans`, `frontend-design`, `ui-ux-pro-max` e `dispatching-parallel-agents`: escopo, desenho, fases e análises independentes. A auto-revisão final do planejamento cabe ao agente principal.
- `.agents/skills/` do projeto foi inspecionada: contém skills Clerk. Elas não foram aplicadas porque o runtime utiliza autenticação própria; migrar para Clerk contraria a documentação.

## 2. Escopo e decisões propostas

Esta é uma evolução arquitetural de tema e sessão, organizada em entregas verificáveis. O planejamento solicitado não autoriza execução, produção, alteração de segredos, exclusão de dados ou publicação.

### Primeira entrega recomendada

1. Hambúrguer no lugar de Editar, com rótulo acessível “Abrir configurações”.
2. Menu modal com Editar perfil, Minha conta, Aparência, Senha e segurança, Notificações, Ajuda, Sobre e Sair da conta.
3. Claro, Escuro e Usar tema do dispositivo; aplicação global e preferência local persistida.
4. Edição existente preservada; informações da conta e troca de senha autenticada.
5. Logout atual e “Sair de todos os dispositivos”, com revogação efetiva e confirmação.
6. Notificações do app: controle real do indicador de Curtidas. Push indisponível, com explicação clara; sem switches de mensagens/matches/push que não tenham consumidores.
7. Ajuda local baseada no comportamento atual e versão do app; links legais/suporte somente quando fornecidos e aprovados.

### Decisões para revisão

| Decisão | Recomendação do plano | Efeito |
| --- | --- | --- |
| Tema inicial | `system`; fallback light quando o sistema não informar esquema | Oferece as duas opções explícitas e acompanha o dispositivo |
| Persistência de tema | Por instalação/browser, sobrevivendo ao logout; sem sincronização de conta | Não mistura uma preferência pública com tokens/dados privados |
| Troca de senha | Revogar todas as sessões, inclusive a atual; pedir novo login | Reaproveita a política de segurança do reset, sem reutilizar o fluxo por código |
| Notificações push | Etapa separada; pergunta de escopo enviada ao usuário, ainda sem resposta registrada | Este plano prepara menu e preferência realmente consumida; não instala SDK push |
| Exclusão de conta/troca de e-mail | Fora da primeira entrega, exigem desenho e aprovação próprios | São novos fluxos sensíveis, não simples opções do menu |
| Termos/privacidade/suporte | Não inventar URLs ou conteúdo jurídico | Exibir links somente após definição; Ajuda e Sobre locais continuam úteis |

Se o usuário escolher incluir push, revisar este escopo e seu desenho antes da execução: orçamento técnico, builds próprios, credenciais, subscriptions, outbox/worker e política de conteúdo são outra entrega. Não inferir essa aprovação ao executar as tarefas da primeira entrega.

## 3. Desenho do modal

```text
Meu perfil                              [menu]

Modal de configurações (um host)
  Configurações                         [X]
  CONTA
    Editar perfil                       >
    Minha conta                         >
  PREFERÊNCIAS
    Aparência                 Dispositivo >
    Notificações                        >
  SEGURANÇA
    Senha e segurança                   >
  INFORMAÇÕES
    Ajuda                               >
    Sobre o TrocaLivros                  >
  ───────────────────────────────────────
    Sair da conta
```

- Reutilizar o padrão de edição: Modal React Native full-screen com slide, cabeçalho de pelo menos72, SafeAreaView, fechamento48, KeyboardAvoidingView nos formulários e conteúdo rolável. Não criar drawer lateral nem adotar o bottom sheet Premium como padrão desse menu.
- Nas seções internas, trocar X por voltar quando houver navegação interna; manter uma saída explícita. Back/Escape volta à seção anterior e só fecha no nível principal, respeitando formulário sujo e operações pendentes.
- Lista clean com divisores discretos, ícones MaterialIcons24, texto16 e linhas de pelo menos56. Nada de novo banner ou segundo card de identidade. Mostrar informações pessoais na seção Conta, não num cartão duplicado no menu.
- Usar Be Vietnam Pro e tokens atuais de raio/spacing. Indicador da aparência usa o valor selecionado, não um ícone ambíguo.
- Uma única instância do host para menu, edição, conta, aparência, senha, notificações e confirmações. Extrair o conteúdo do editor atual para composição; não abrir o modal antigo por baixo/por cima do menu.
- Avatar ampliado continua em sua superfície existente, mutuamente exclusiva com configurações. Dentro de Editar perfil, recorte substitui conteúdo do mesmo host, como hoje; cancelar volta ao formulário sem apagar nome/bio.
- Suspender apresentação automática do Premium enquanto houver configurações/avatar abertos; retomar somente para a conta/sessão ainda elegível. Não consumir o trial nem perder o prompt por causa do bloqueio.
- Corrigir bloqueio de fechamento durante `saveMutation.isPending`, além de avatar ocupado. Fechar/voltar ao ter texto sujo pede confirmação dentro do host, sem empilhar outro Modal.
- Safe area deve ter um proprietário por borda; incluir laterais em paisagem. Não desabilitar zoom no viewport PWA. Texto grande reflow/scroll, sem esconder X, salvar ou saída.
- Foco começa no título/primeiro controle adequado, permanece no modal e retorna ao hambúrguer. Ícones decorativos ficam fora da árvore acessível. Reduzir movimento desativa slide/expansão; não bloquear entrada durante a animação.

## 4. Tema global

### Interfaces

```ts
type ThemePreference = 'system' | 'light' | 'dark';
type ThemeMode = 'light' | 'dark';
type ThemeContextValue = {
  preference: ThemePreference;
  mode: ThemeMode;
  theme: AppTheme;
  hydrated: boolean;
  persistenceError?: string;
  setPreference(value: ThemePreference): Promise<void>;
};
// useAppTheme(): ThemeContextValue
// useThemedStyles<T>(factory: (theme: AppTheme) => T): T
// loadThemePreference(): Promise<{ preference: ThemePreference; warning?: string }>
// saveThemePreference(value: ThemePreference): Promise<void>
```

`AppTheme` reutiliza spacing/radius/typography; cores têm tipos string por chave, não literais restritos à paleta clara. Paletas e factories são estáveis; `useThemedStyles` memoiza por factory/tema. Não mutar o objeto `theme` importado nem usar `key={mode}` para remontar formulários/cropper.

### Paleta escura proposta

A clara preserva os valores atuais. A escura adapta luminância do magenta/violeta já existentes, sem trocar família visual. Valores são proposta de design, sujeitos ao teste de contraste da tarefa1.

| Token | Escuro |
| --- | --- |
| background / surface | `#181318` / `#241B24` |
| surfaceMuted / surfaceStrong | `#302331` / `#3B2A3B` |
| foreground / mutedForeground | `#FFF8F7` / `#CCBAC4` |
| primary / primaryPressed / primarySoft | `#FF8FB5` / `#FFB3CD` / `#4B1F33` |
| secondary / secondaryPressed / secondarySoft | `#C6ABFF` / `#DDCCFF` / `#332746` |
| outline | `#9C8292` |
| danger / dangerSoft | `#FFB4AB` / `#4C2020` |
| success / successSoft | `#8EDCB5` / `#17372B` |
| profileHeroStart / profileHeroEnd / profileHeroAccent | `#1A121C` / `#332244` / `#FF8FB5` |
| profileHeroScrim / profileHeroPattern | `rgba(24,19,24,0.84)` / `rgba(255,248,247,0.08)` |
| profileMetricDivider / overlay | `#5D4857` / `rgba(0,0,0,0.72)` |
| white / black | Absolutos existentes `#FFFFFF` / `#1A1014`, não foregrounds genéricos |
| onPrimary / onSecondary / onDanger / onSuccess (novos) | `#271719` no escuro; branco no claro para preenchimentos fortes correspondentes |
| viewerBackground / viewerForeground (novos) | `#271719` / `#FFFFFF` nos dois modos, preservando a visualização de fotos |

Texto normal: contraste mínimo4.5:1; ícones significativos/controles:3:1. Não manter branco em um preenchimento pastel só porque o botão antes usava white. `foreground` deixa de servir como background do avatar ampliado. Não inverter/reprocessar fotos ou mudar o fundo branco do JPEG salvo no R2.

### Persistência e plataforma

- Chave pública dedicada `trocalivros.appearance.v1`; JSON `{version:1, theme:'system'|'light'|'dark'}`. Native: AsyncStorage; Web: localStorage protegido contra exceções. Nunca reutilizar chaves de auth nem persistir tokens/senhas/preferências privadas de conta aqui.
- Ausência/corrupção de valor usa system; persistência indisponível não bloqueia o app. Aplicar escolha imediatamente e avisar se não pôde salvá-la. Serializar escritas e ignorar leitura/erro tardio de uma escolha anterior.
- ThemeProvider acima do SessionProvider, incluindo carregamento de fontes, Auth/onboarding e logout. Aparência local sobrevive à saída sem preservar dados da pessoa.
- `userInterfaceStyle` muda para automatic; `expo-system-ui` é necessário para suporte Android em development builds. Aplicar override nativo de Appearance somente no nativo; system remove override. Não usar uma API nativa inexistente no adapter Web.
- NavigationContainer recebe tema reativo completo, preservando fonts/default fields e `dark`. Tabs customizadas, UIKit/fallback, stacks, StatusBar e crop seguem o esquema apropriado.
- Shell PWA, meta theme-color, body/root e offline.html acompanham modo sem duplicar safe area. Bootstrap lê somente a preferência pública validada antes do bundle. Manifesto estático não é prova de cor do chrome instalado; manter ícones/identidade e testar aparelhos.
- Evitar flash claro na árvore React/PWA durante hidratação. Splash/chrome nativos exigem configuração e novo binário; não prometer validação deles apenas com Metro/export.

### Inventário de migração

Todos os diretórios abaixo possuem `styles.ts`; auditar também cores diretas em seus `index.tsx`. Converter apenas consumidores de cores/sombra; helpers que usam só medidas invariantes podem permanecer estáticos.

- `pages/`: profile, Auth, BookCreate, BookEdit, BookDetails, Chat, Discover, Library, Likes, Matches, Messages, OnboardingBooks, OnboardingProfile.
- `components/`: AppScreen, AppButton, Avatar, AvatarPhotoModal, AvatarPicker, Badge, BarcodeScannerModal, BookCard, BookGallery, BookPhoto, BookPhotoPicker, Card, IsbnBadge, LikeCard, OnboardingProgress, PasswordRequirements, ProfileHero, ProfileMetricRow, ProfileTabs, SearchField, StateView, TextField, ToggleGroup, TopBar.
- `components/chat/`: Attachment, Bubble, ConnectionStateBanner, DeliveryStatus, Marker, Message, MessageComposer, TypingIndicator.
- `components/AvatarEditor/editorStyles.shared.ts`, `styles.web.ts` e `index.web.tsx`; `features/premium/premiumStyles.ts`, PremiumOfferModal/StatusCard/LikesGate; App.tsx e as três variantes de navegação relevantes.

## 5. Conta, senha, sessão e notificações

### Conta e edição

Minha conta mostra e-mail/verificação e telefone já disponíveis; não retorna CPF completo, hashes, chaves R2 ou tokens. Nome/bio/cidade/interesses/foto permanecem no editor existente. Não oferecer alteração de e-mail/CPF ou visibilidade de perfil sem contrato correspondente.

Corrigir a inconsistência identificada ao mover o formulário: `lastName.trim()` vazio hoje falha na API. Proposta: sobrenome opcional com limpeza explícita para null, mantendo máximo80; nome continua obrigatório1–50. Reutilizar demais limites e deduplicação atuais. Atualizar API/schema/documentação e sincronizar o usuário da sessão após salvar, sem sobrescrever rascunho nem versão recente do avatar.

### Contratos propostos — ainda inexistentes

| Endpoint | Body/resultado | Regras |
| --- | --- | --- |
| `GET /me/preferences` | `{data:{schemaVersion:1,userId,notifications:{showLikesBadge:boolean},capabilities:{changePassword:boolean,logoutAll:boolean,push:false}}}` | Privado/no-store; leitura sem criar linha; defaults quando ausente |
| `PATCH /me/preferences` | Body estrito `{showLikesBadge:boolean}`; mesmo DTO | Owner da sessão; upsert de UserPreferences; nenhum userId no body |
| `POST /auth/change-password` | `{currentPassword,newPassword}` → `200 {data:{ok:true}}` | Bearer válido, senha atual, nova política, revogação global e novo login |
| `POST /auth/browser/change-password` | Mesmo contrato | Bearer + Origin/HTTPS/CSRF e limpeza do cookie correto depois do commit |
| `POST /auth/browser/logout-all` | Sem body → `200 {data:{ok:true}}` | Alias web da regra global, com cookie/Origin e sequência segura |

`POST /auth/logout-all` existente continua compatível; completar seu tratamento de cookie quando usado com `X-Session-Transport: cookie`. Não confundir `trocalivros_refresh` Strict/Path=/api/v1/auth com `__Host-trocalivros_refresh` Lax/Path=/.

Para ações novas de conta, enviar `X-Settings-Owner` com o ID capturado antes da ação; validar contra `req.currentUser.id`, nunca usá-lo como autorização. Divergência retorna `409 SETTINGS_SESSION_CHANGED` antes de efeitos. Estender proteção de correlação ao logout atual/global sem quebrar clientes legados que não enviam o header. Atualizar headers CORS se a allowlist exigir.

Nas operações que mutam cookie, enviar também `X-Settings-Session` com o sid capturado no início. O servidor resolve esse sid à família e o vincula ao cookie/bearer da operação antes de alterar ou expirar cookie. O sid é só correlação, nunca prova de autenticação; a autorização continua no token/cookie validado. Rotação dentro da mesma família é aceita; outro login/família, mesmo do mesmo userId, retorna409 sem mutação/Set-Cookie. No logout browser existente, aplicar essa correlação quando o cliente novo envia os headers, preservando o contrato legado.

Senha atual incorreta: `403 CURRENT_PASSWORD_INVALID`, sem revogar ou chamar refresh. `401` é exclusivamente falha de sessão, para não acionar o interceptor de auth por senha errada. Validação:422; rate limit:429. Nova senha usa `passwordRules.ts` e helpers atuais da API: mínimo6 caracteres, máximo72 bytes UTF-8, maiúscula/minúscula/número/especial; não fazer trim. Confirmação fica no cliente e é igual ao novo valor. Não mudar a política de cadastro nesta tarefa.

### Revogação consistente

- Comparar senha com bcrypt assíncrono e gerar hash fora da transação. Dentro dela, bloquear User e revalidar sessão/hash esperado antes de escrever; invalidar códigos PASSWORD_RESET pendentes e revogar todas as AuthSession.
- Login/emissão, refresh/rotação, reset, logout atual e logout-all devem participar da mesma ordem de lock por conta e rechecagem. Impedir login verificado com hash antigo ou refresh iniciado antes de revogação de criar sessão válida depois dela.
- Logout atual resolve o token/sid capturado à família e revoga o sucessor ativo que uma rotação concorrente possa ter criado, antes de confirmar sucesso. Não basta tentar revogar uma linha antiga já revogada. Encerrar essa família não encerra famílias de outros dispositivos.
- Após commit, desconectar sockets do usuário e exigir sessão viva nos eventos de chat; hoje só o handshake valida revogação. Não afetar sockets de outra pessoa. Desregistrar listeners ao fechar o servidor.
- Revogação da sessão atual afeta somente seus sid, não todos os dispositivos por engano. Refresh legítimo também troca sid: prever reconexão/rebind com a credencial atual, sem transformar rotação normal em logout e sem deixar o socket antigo autorizado.
- Cookies somente depois de revogação confirmada; falha transitória não encerra sessão local. No sucesso terminal, encerrar estado/cache somente para o mesmo actor `{userId,epoch}` que iniciou a ação; resposta antiga não pode apagar outra sessão, mesmo da mesma conta após novo login.
- Reutilizar o lock web `trocalivros.auth.refresh.v1` e estendê-lo a operações que emitem/expiram cookies, incluindo login/verify. Não adquirir o mesmo lock recursivamente via refresh automático do Axios: requisição terminal sem autorretry dentro do lock; tratar401/refresh fora dele, no máximo uma vez e com actor ainda atual.
- Rechecar actor depois de adquirir o lock, antes do envio e depois da resposta. Verificar no servidor a linhagem cookie↔sid/família capturada, incluindo refresh que antecede uma ação terminal; comparação somente por userId/epoch local não detecta novo login da mesma pessoa em outra aba. Conflito preserva o cookie da outra conta/família. Sem Web Locks, não executar uma mutação de cookie concorrente por fallback inseguro.
- Garantia imediata de sockets pressupõe uma instância de API ou adapter de revogação compartilhado. Antes de escalar réplicas, planejar store/adapter comum; não alegar revogação distribuída por um EventEmitter local.
- Senhas só em memória, sem cache/storage/log/analytics. Limpar ao sair/descartar/trocar de conta. Erro permite retry no mesmo formulário; operações terminais pendentes bloqueiam navegação/fechamento que abandonaria o resultado.

### Notificações da primeira entrega

- Modelo novo `UserPreferences`: userId único/FK cascade, showLikesBadge boolean defaulttrue e updatedAt. Preferência pertence à conta no servidor, não ao dispositivo que guarda o tema.
- Controle com rótulo **“Mostrar indicador de novas curtidas”**: afeta somente o badge da aba Curtidas, em custom/native/fallback. Não muda contagem na tela, acesso Premium, polling/dados ou contabilização de likes.
- Query `['account-preferences',userId]`, estado e respostas isolados por actor. Salvar com confirmação real; falha reverte a alteração visual e apresenta retry. Não mostrar sucesso se a API não gravou.
- Sem preferência conhecida, não aplicar cache de outra pessoa; GET retorna defaults verificáveis. API antiga/404 mantém funcionalidades legadas, informa indisponibilidade da nova configuração e não disponibiliza switch que não funcione.
- A tela explica: não envia push nem alerta com app fechado. Mostra canais futuros como informação, não switches ativáveis. Avisos de confirmação/erro/autenticação e e-mails de segurança não são desabilitados por essa opção.
- Se push for aprovado depois: projeto próprio com Expo/APNs/FCM, Web Push/VAPID, tokens/subscriptions por usuário/dispositivo, outbox/retry/deduplicação, opt-in explícito, limpeza no logout, conteúdo mínimo e deep links validados. Expo Go Android não entrega remote push nesse SDK; PWA iPhone exige app instalado e gesto para consentimento. Não implementar isso automaticamente nesta entrega.

## 6. Restrições globais e foco de revisão

- Preservar autenticação própria, cinco abas/Curtidas no centro, contratos existentes e HTTPS/Origin. Nenhum token em localStorage/sessionStorage/service worker.
- Preservar identidade magenta/violeta/Be Vietnam Pro, fotos, recorte por gestos, fontes escaláveis, safe area e movimento reduzido. Nenhum asset/PDF/export gerado no commit.
- Fixtures sintéticas; testes de banco somente em alvo descartável explicitamente validado. Nada de credenciais, conta real ou exclusão/R2 de produção neste planejamento.
- Não corrigir débito não relacionado por `npm audit fix --force`. Há alerta crítico preexistente em shell-quote registrado no histórico; triagem de alcance e remediação devem ser tratadas explicitamente.
- API/banco antes de UI dependente; não publicar frontend com opções apontando para rotas inexistentes. Intermediate commits permanecem na branch até a validação integrada.

| Risco prioritário | Comportamento exigido | Tarefas/testes |
| --- | --- | --- |
| Troca de conta/aba durante request | Não mutar/limpar outra sessão, cookie, preferência ou formulário | 4,5,6: owner header, actor epoch, cookie binding e resposta tardia |
| Refresh/login competindo com revogação | Não ressuscitar sessão nem deadlock de Web Lock | 5,6: PostgreSQL real e transportes/duas abas |
| Tema durante draft/crop e leitura lenta de storage | Não remontar editor, perder campos ou sobrescrever escolha mais nova | 1,2,3: componentes montados e respostas fora de ordem |
| Teclado, fonte3× e paisagem/notch | Todos os controles e foco permanecem alcançáveis | 2,3,6,8: browser real e aceites físicos separados |
| Capacidades indisponíveis/404/5xx | Sem switches fictícios, sucesso falso ou logout offline | 3,4,6: falha/retry e contrato de disponibilidade |

## 7. Tarefas executáveis

### Tarefa 1 — Tema, tokens e persistência pública

**Criar:** `app/src/providers/ThemeProvider.tsx`, `app/src/styles/useThemedStyles.ts`, `app/src/features/preferences/themeTypes.ts`, `themeStorage.ts`, `themeStorage.web.ts`; testes `themeProvider.component.test.tsx`, `themeStorage.test.ts`, `themeContrast.test.ts` no `features/preferences/__tests__/`.
**Modificar:** `app/src/styles/theme.ts`, `app/App.tsx`, `app/package.json`/lock, `app/app.json`.
**Interfaces produzidas:** ThemeContextValue/useAppTheme/useThemedStyles/storage da seção4; paletas completas AppTheme.

- [ ] Escrever testes: system+nativo/Web dark resolve dark; null resolve light; escolha light vence SO dark; corrupção/erro não bloqueiam; leitura inicial tardia não substitui escolha; salvar dark→light fora de ordem termina light; logout conserva somente aparência. Asserts com componentes/provider reais e I/O de storage isolado.
- [ ] Rodar `npm test -- src/features/preferences/__tests__` em app/ e confirmar RED pelo comportamento ausente, não por fixture inválida.
- [ ] Instalar via `npx expo install @react-native-async-storage/async-storage expo-system-ui`; conferir mapping real do SDK/lockfile. Implementar interfaces, queue de escrita e paleta proposta; testar pares de texto/ícones com luminância real, inclusive onPrimary/onSecondary e viewer fixo.
- [ ] Integrar provider na inicialização e config automatic; os passos seguintes completam consumidores antes de habilitar/publicar o seletor.
- [ ] GREEN focado + typecheck; commit focado de tokens/provider/persistência, com arquivos explícitos.

### Tarefa 2 — Migrar tema em telas, navegação e shell

**Modificar:** arquivos do inventário da seção4 e seus index.tsx; `app/src/routes/index.tsx`, `main-tabs.custom.tsx`, `main-tabs.ios.tsx`, `app/public/index.html`, `manifest.json`, `offline.html`.
**Testes:** criar `app/src/features/preferences/__tests__/themeConsumers.component.test.tsx`, `themeNavigation.component.test.tsx`; ampliar `web/tests/pwa-build-smoke.mjs` e fixtures dos testes existentes quando precisarem de provider.
**Consome:** ThemeProvider e factories da tarefa1. **Produz:** todas as superfícies principais reativas, incluindo avatar/crop/Premium/chat e chrome/shell suportados.

- [ ] RED: alternar light→dark em tela já montada atualiza backgrounds/textos/nav/status, sem zerar draft do formulário ou zoom/URI do crop; viewer continua escuro com texto legível; Pure styles não ficam presos ao light inicial.
- [ ] Converter StyleSheet estático colorido para `createStyles(theme)` e uso local de `useThemedStyles`, mantendo medidas invariantes; migrar cores de ícones, buttons/bubbles para papéis onColor. Não esconder pendências atrás de alias estático light.
- [ ] NavigationContainer usa DefaultTheme/DarkTheme completos; adaptar UIKit/fallback/custom e StatusBar; evitar API Appearance nativa no Web. Ajustar bootstrap público validado, meta/body/offline sem ler sessão/caches privados.
- [ ] GREEN focado, suíte completa/typecheck, `npm run build:web` e `npm run test:pwa`; auditar inventário para consumidores esquecidos. Conferir browser375×812 e812×375, texto3× e pares de contraste. Não substituir screenshot/medida por grep de fonte em teste.
- [ ] Commit de migração visual; registrar limites de splash/chrome/novo binário e aceites físicos.

### Tarefa 3 — Host de configurações e edição existente

**Criar:** `app/src/components/ProfileSettingsModal/{index.tsx,styles.ts,ProfileSettingsModal.types.ts}`, `ProfileEditForm/{index.tsx,styles.ts}`, `AppearanceSettingsPanel/{index.tsx,styles.ts}`, `app/src/features/settings/settingsTypes.ts`, `useProfileSettings.ts`, `app/src/features/profile/useProfileEditor.ts`, `app/src/features/auth/sessionActor.ts`.
**Modificar:** `pages/profile/index.tsx`/styles, `providers/SessionProvider.tsx` para captura/checagem de actor, `features/premium/PremiumOfferProvider.tsx`, `API/src/modules/users/users.schemas.js`/users.service.js para sobrenome opcional; testes users e profile/avatar existentes.
**Testes:** criar `app/src/features/settings/__tests__/profileSettings.component.test.tsx`, `profileSettingsTransitions.component.test.tsx`; ampliar `API/tests/users.service.test.js`, `users.profile.test.js` e os testes existentes de coordenação profile/avatar.
**Interfaces produzidas:** `SessionActor {userId:string; epoch:number; sessionId:string}`; provider `captureActor():SessionActor|null`, `isActorCurrent(actor):boolean`. Capturar sid do access JWT em memória somente para correlação; ID malformado impede ação sensível. isActorCurrent compara conta/epoch, permitindo rotação normal; vínculo de família é verificado no servidor, não inferido como autorização pelo cliente. SettingsRoute = menu/editProfile/account/appearance/password/notifications/help/about/confirmSignOut/confirmSignOutAll/confirmDiscard. `useProfileSettings({actor,isBusy,hasUnsavedChanges,cropActive,onCancelCrop,onDiscard})` devolve `{visible,route,openMenu():void,openRoute(route:SettingsRoute):void,back():void,requestClose():void,confirmDiscard():void}`. Callbacks onCancelCrop/onDiscard são `()=>void`. Edição usa draft de strings `{firstName,lastName,city,bio,phone,interestsText}`, setters controlados, dirty/pending/errors e submit/reset; preservar a mutation existente. Overlay local mutually-exclusive = none/settings/avatar. Premium expõe bloqueio de apresentação por chave `profile-overlay`, liberado ao fechar/desmontar.

- [ ] RED: hambúrguer abre Configurações; Editar só está dentro dele; Sair deixa Sobre você; editar/crop/voltar nunca produzem dois dialogs; perder/save pendente não fecha; dirty discard preserva/cancela corretamente; mudança de conta encerra overlays e ignora callbacks antigos.
- [ ] Extrair JSX/estado do formulário sem duplicar validação/mutations. Corrigir lastName vazio→null na proposta de contrato, aceitando o vazio legado como null no schema e atualizando nome derivado; não tocar e-mail/CPF. Bloquear fechamento enquanto texto ou foto está salvando. Após sucesso, sincronizar `['me']`/sessão de forma owner-aware, preservando avatar mais recente.
- [ ] Implementar host full-screen/slide e reducer de rotas; conteúdo Editar mantém AvatarEditor no mesmo host. Aplicar tokens, foco inicial/restauração, movimento reduzido, insets laterais e confirmação interna.
- [ ] Testar prompt Premium chegando durante settings/crop: adiado, não consumido/perdido nem repetido depois de conta mudar. Preservar lógica de oferta existente.
- [ ] AppearanceSettingsPanel consome diretamente a tarefa1. Registrar nesta etapa apenas seções com conteúdo/ação real; habilitar as demais conforme tarefas4,6,7, sem placeholders clicáveis. GREEN UI/API afetada e typecheck; commit de menu/relocação sem botões apontando para funcionalidades ainda ausentes.

### Tarefa 4 — Preferências de conta e indicador de Curtidas

**Criar:** módulo `API/src/modules/settings/{settings.routes.js,settings.controller.js,settings.service.js,settings.repository.js,settings.schemas.js}`; `UserPreferences` e migração versionada; `app/src/features/settings/settingsApi.ts`, `useAccountPreferences.ts`, `components/NotificationSettingsPanel/{index.tsx,styles.ts}`.
**Modificar:** `API/src/app.js`, schema Prisma, `app/src/types/api.ts`, tabs custom/ios/fallback.
**Testes:** `API/tests/settings.routes.test.js`, `settings.service.test.js`, `settings.repository.integration.test.js`; `app/src/features/settings/__tests__/accountPreferences.component.test.tsx`, `likesBadgePreference.component.test.tsx`.
**Interfaces:** AccountPreferencesDTO e GET/PATCH da seção5; `settingsApi.getPreferences()` / `updatePreferences(input:{showLikesBadge:boolean},actor:SessionActor)`; hook por userId, sem persistência privada Web.

- [ ] RED: leitura sem linha retorna defaulttrue e schemaVersion1; PATCHfalse persiste só o dono; body userId/campos extras rejeitados; erro de gravação não mostra sucesso. Badge some quando false e count/telas/quotas permanecem intactos.
- [ ] Criar migração aditiva/FK cascade, sem regravar contas existentes; services/schemas strict/no-store. Capacidades reportam somente rotas/canais implementados. Owner header é correlação, não identidade.
- [ ] Implementar UI com confirmação/retry e isolamento `['account-preferences',userId]`; não expor switches push/mensagens/matches. Fonte dos dados e estados conforme seção5; API404/5xx não produz configuração falsamente salva.
- [ ] PostgreSQL descartável: usuários A/B, default, upsert, integridade/FK e persistência depois de reiniciar API. UI: resposta A atrasada após B, erro/rollback, device2 lendo valor, badges dos renderers e API antiga.
- [ ] GREEN focado/full affected, Prisma validate/generate e lint; atualizar contrato05/dados06; commit próprio. Não migrar Railway nesta tarefa de planejamento.

### Tarefa 5 — Backend de senha e revogação efetiva

**Modificar:** `API/src/modules/auth/{auth.routes.js,auth.controller.js,auth.schemas.js,auth.service.js,auth.repository.js,auth.web-session.js}`, `modules/chat/chat.socket.js`, `API/src/index.js`/app.js apenas se necessário à composição.
**Criar:** `API/src/modules/auth/auth.revocation.js` (pub/sub de sessões revogadas, sem segredos) e helper `auth.actor.js` de correlação.
**Testes:** ampliar auth service/routes/web-session; criar `auth.account-settings.integration.test.js`, `auth.revocation-socket.integration.test.js`.
**Interfaces:** `authService.changePassword(userId,sessionId,input)`; repo `changePasswordAndRevokeSessions({userId,sessionId,expectedPasswordHash,newPasswordHash})`; evento `{userId,sessionIds:string[]}` após commit. Publicar/logoutAll/reset reutilizam o mecanismo de revogação, não novas identidades.

- [ ] RED: senha atual errada403 não muda hash/códigos/sessões; nova senha inválida422; sucesso200 revoga todos os sid/invalida reset codes; header de outra conta409 sem efeitos. Códigos/senhas jamais aparecem em DTO/log.
- [ ] Implementar contratos da seção5, usando crypto/policy atuais; limitadores independentes de5 tentativas por conta e20 por IP em60s (429), evitando bypass por trocar IP e mensagens enumeradoras. Helpers para ambos os cookies preservam Origin/HTTPS e só expiram cookie depois de commit confirmado.
- [ ] Compartilhar lock/rechecagem de conta com login/emissão, refresh/rotação, reset, logout atual e logout-all. Fixar ordem User→sessão/código; rollback conserva hash e sessões. Logout atual resolve e revoga sucessor ativo da mesma família se refresh tiver rotacionado antes; preservar outras famílias. Não aceitar uma prova de senha antiga que crie nova sessão depois da mudança.
- [ ] Integrar revogação com sockets já conectados por sid e checagem de sessão nos eventos; teste de outra pessoa/outra sessão não revogada continua conectada/autorizada. Refresh normal aposenta o sid antigo e permite reconexão segura. Cobrir fechamento do servidor sem listener vazado e não alegar funcionamento multi-réplica sem adapter.
- [ ] Rodar PostgreSQL real descartável: change×change, change×reset, refresh/login×revogação e refresh×logout atual; o refresh sucessor da família encerrada falha e outra família permanece válida. Cookie de novo login do mesmo userId em outra família recebe409 sem Set-Cookie/mutação; rotação da família original é aceita. Cobrir cookies inválidos/origem ausente/falha transitória e confirmar que erro tardio depois de commit não é falsamente descrito como rollback.
- [ ] GREEN + lint/full API; atualizar docs05/07/08/runbook distinguindo contratos atuais de registros históricos; commit de segurança antes da UI dependente.

### Tarefa 6 — Conta, formulário de senha e ações terminais no app

**Criar:** `components/AccountSettingsPanel/{index.tsx,styles.ts}`, `PasswordChangeForm/{index.tsx,styles.ts}`; `features/auth/useAccountSecurity.ts`, helper de lock cookie compartilhado em variante Web.
**Modificar:** authApi.ts/.web.ts, authTransport.ts/.web.ts, sessionActions.ts, SessionProvider.tsx, services/api.ts, services/socket.ts, pages/Chat/index.tsx e types/api.ts; host de settings.
**Testes:** novos `accountSecurity.component.test.tsx`, `accountSecuritySession.test.ts` em features/settings; ampliar sessionActions/transportes e passwordRules existentes.
**Consome:** SessionActor/captureActor/isActorCurrent da tarefa3 e contratos da tarefa5. **Produz:** provider `changePassword(input:ChangePasswordInput,actor:SessionActor):Promise<void>`, `signOutAll(actor:SessionActor):Promise<void>`; `signOut(actor?:SessionActor):Promise<void>` mantém callers sem argumento. API input `{currentPassword:string,newPassword:string}`; respostas `{data:{ok:true}}` não são sessões novas.

- [ ] RED: erro403 fica no campo e não dispara refresh; confirmação diferente não envia; paste/gerenciador funciona; senha>72 bytes falha coerentemente; chamadas duplicadas só têm um efeito. Dados/senhas não entram em storage/telemetria.
- [ ] Formulário com senha atual/nova/confirmação, requisitos existentes, mostrar/ocultar acessível, autocomplete correto e mensagens inline. Nova senha salva pede novo login; não fechar/limpar antes de confirmação. Recuperação continua no fluxo Auth existente, sem duplicação nem logout automático por clicar em ajuda.
- [ ] Reaproveitar signOutSession/transportes para ack→limpeza. Actor epoch protege troca de conta e novo login da mesma pessoa; respostas antigas não limpam novo estado. Serializar também accept/clear de storage nativo: cleanup iniciado por A não pode apagar credenciais gravadas por B enquanto um await está pendente. Preservar sessão e formulário no erro transitório e oferecer retry.
- [ ] Diferenciar falha remota de falha local após revogação confirmada: não alegar rollback nem manter dados privados visíveis porque storage falhou ao apagar. Bloquear restauração de snapshot revogado e informar o problema local sem alterar uma sessão nova; cobrir essa fronteira em teste.
- [ ] Serializar operações cookie com chave existente, inclusive emissores login/verify, rechecando actor após adquirir lock. Estender política do API client para request terminal sem refresh automático enquanto lock estiver ocupado;401 é tratado após liberação. Testar lock não recursivo, cookie de outra conta e de novo login da mesma pessoa em outra família, revogação×refresh e resposta fora de ordem em duas abas. Manter sid original como âncora; permitir rotação da família, não rebinding silencioso para outro login.
- [ ] Chat distingue revogação terminal de rotação legítima: reconecta uma vez com token atual após refresh, respeita actor/conta e não entra em loop tentando sessões revogadas; HTTP fallback e ack/clientMessageId continuam idempotentes.
- [ ] Exibir e-mail/verificação/telefone permitidos, não CPF/credentials. Appearance chama tarefa1; “Sair de todos os dispositivos” confirma separadamente de Sair da conta, e chama contrato verdadeiro da tarefa5.
- [ ] GREEN componentes/transportes e suíte completa/typecheck; commit de integrações. Reusar componentes reais; doubles só em rede/storage/ponte de OS, não no comportamento que se quer provar.

### Tarefa 7 — Ajuda, Sobre e continuidade documental

**Criar:** `components/ProfileHelpPanel/{index.tsx,styles.ts}`, `AboutAppPanel/{index.tsx,styles.ts}`, `features/settings/helpContent.ts` (FAQ local não pessoal).
**Modificar:** host settings; docs01/02/03/05/06/07/08/09/11/13/14/15/16 e README apenas nos pontos afetados pela implementação.
**Interfaces:** FAQ de uso real; AppInfo `{name:'TrocaLivros',version:string}` da configuração do app, não da versão do Expo Go. Links HTTPS legais/suporte são opcionais e só habilitados após definição aprovada.

- [ ] RED: ajuda explica primeira foto=capa/limite3, localizar Curtidas e editar perfil; Sobre usa nome/versão do app; sem URI inventada, e-mail de suporte presumido ou segredos/IDs internos.
- [ ] Implementar conteúdo curto e útil; não adicionar outro card de perfil, pagamento, links falsos ou claims jurídicos/privacidade sem política validada. Sem endpoint/config funcional, não renderizar ação clicável sem destino.
- [ ] Atualizar o mapa de menu/temas e os novos contratos como implementados somente depois das tarefas entregues; manter histórico contextualizado e novos aceites claramente separados.
- [ ] GREEN focado + verificação de links locais; commit documental/conteúdo sem arquivos gerados.

### Tarefa 8 — Validação integrada e liberação autorizada

**Arquivos de evidência:** docs15/16; ampliar testes existentes de avatar/safe-area/Premium e smoke PWA nos pontos alterados.
**Entrega:** uma versão coerente de app/API, sem UI parcialmente temática ou ações que dão rota não encontrada.

- [ ] Executar app `npm test`, `npm run typecheck`, `npx expo-doctor`, `npm run build:web`, `npm run test:pwa` e exports Android/iOS disponíveis. Export não é APK/IPA nem aceite físico.
- [ ] Executar API `npm run lint`, `npm test`, `npx prisma validate`, `npx prisma generate` e integrações PostgreSQL/Sockets descartáveis. Banco compartilhado, R2 real, e-mail e deploy exigem identificação do alvo e autorização própria; não abrir SSH/túnel ou produzir backup por iniciativa deste plano.
- [ ] Browser375×812/812×375 e fonte3×: menu/leaf/back/keyboard/foco; claro/escuro/system apósreload; outra aba; editar/crop durante tema; erro500/404/offline; LogoutAll/PasswordChange reais em conta de teste autorizada. Caddy/cache mantêm respostas privadas fora do worker.
- [ ] iPhone/Android físicos: SafeArea/teclado/VoiceOver/TalkBack, aparência do SO, tabs nativas/fallback, Splash/StatusBar, formas de sair e novo login após revogação. Repetir Safari e PWA instalada; mudanças nativas de config/dependências podem precisar de novo development build.
- [ ] Revisão independente de auth/cookies/locks/sockets e revisão visual; resolver Critical/Important. Triar alertas de dependências sem upgrades forçados; registrar bloqueios reais, não converter mocks em aceite externo.
- [ ] Atualizar evidências, revisar diff/commits/migração e obter autorização para integrar/push/deploy. Validar API nova antes de habilitar controles dependentes no cliente. Nenhuma publicação é autorizada apenas pela existência deste arquivo.

## 8. Fora da primeira entrega / futuras decisões

- Push nativo e Web, inbox global, som/agendamento/horário silencioso e preferências por categoria de entrega: precisam de pipeline e autorização de escopo.
- Exclusão de conta: exigir senha atual, transação de limpeza de sessões/códigos/prefs, jobs R2 antes de perder chaves e decisão explícita sobre histórico compartilhado. Não usar apenas isActive=false: reset atual reativa conta. Não reutilizar exclusão de cadastro pendente para conta verificada.
- Troca de e-mail/CPF, MFA, lista detalhada de sessões, bloquear leitores, perfil privado, moderação e exportação de dados: contratos e aprovação próprios; não inserir switches locais que a API ignore.
- Compra/assinatura Premium permanece fora do MVP; não adicionar checkout, pagamento ou cancelamento de cobrança inexistente.

## 9. Fontes técnicas externas verificadas

- [Expo — temas](https://docs.expo.dev/develop/user-interface/color-themes/): config automatic e requisito SystemUI Android.
- [React Native — useColorScheme](https://reactnative.dev/docs/usecolorscheme): assinatura do hook e atualização do esquema; null é possível.
- [React Navigation — temas](https://reactnavigation.org/docs/themes/): atualização reativa de NavigationContainer e tema completo.
- [Expo SDK57 — AsyncStorage](https://docs.expo.dev/versions/v57.0.0/sdk/async-storage/): storage não criptografado, versão2.2.0 e instalação compatível; usado somente para aparência pública.
- [OWASP — troca de senha](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#change-password-feature): sessão ativa e prova da senha atual para ação sensível. Os demais contratos/concurrency são decisões propostas para o código deste projeto.
- [Expo SDK57 — Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/): remote push Android requer development build, não Expo Go; documento usado só para delimitar etapa futura.
- [WebKit — Web Push iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): instalação na tela inicial e consentimento por gesto no suporte iOS16.4+. Não é afirmação de push implementado no TrocaLivros.

## 10. Critérios de aceite e próximo passo

- [ ] Hambúrguer substitui Editar e todas as opções relevantes são encontradas no modal, sem cards/modal stacks duplicados.
- [ ] Tema muda o app inteiro e permanece após reabrir; auth/crop/rascunhos/conta não são resetados por cor.
- [ ] Conta/edição refletem a pessoa correta; senha atual é exigida, erro não vira logout, sucesso revoga sessões e sockets com novo login.
- [ ] Logout atual/global preservam sessão/cookie no erro e nunca limpam outra conta por corrida.
- [ ] Preferência do indicador de Curtidas tem efeito real e persistido; não há promessa de push/categorias inexistentes.
- [ ] Estados/contraste/fontes/foco/safe area e aceites de plataforma foram registrados sem claims maiores que a evidência.
- [ ] App/API/DB/docs novos foram validados em conjunto; implementação/publicação dependem de aprovação posterior.

**Execução recomendada:** nativa/sequencial, com interfaces desta especificação e revisão independente da branch ao final. Há acoplamento relevante entre temas, host de modais e sessão; dividir edições concorrentes de providers/Profile aumenta conflitos. Se o usuário preferir subagentes por tarefa, preservar os mesmos contratos e gates de revisão.

**Revisão solicitada ao usuário:** confirmar o escopo/desenho, principalmente a etapa separada de push, aparência local por dispositivo e novo login após troca de senha; depois escolher execução nativa ou por subagentes. Nenhuma tarefa acima foi executada neste planejamento.
