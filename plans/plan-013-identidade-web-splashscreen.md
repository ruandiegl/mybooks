# Plano 013 — Logo nos ícones web e splash de abertura

> **Para execução por agentes:** usar `superpowers:executing-plans` na execução sequencial recomendada, ou `superpowers:subagent-driven-development` se esse método for escolhido pelo usuário. Executar tarefa por tarefa, com TDD, commits focados e revisão final independente. As caixas preservam o roteiro original; o status real está no [registro de execução](./plan-013-identidade-web-splashscreen-execucao.md).

**Estado:** execução local autorizada, implementação em validação/revisão na branch `codex/web-icons-splash`; sem integração/publicação. **Data:** 16/10/2026. Ver [registro](./plan-013-identidade-web-splashscreen-execucao.md).

**Objetivo:** substituir os placeholders dos ícones web pela identidade do TrocaLivros e apresentar uma abertura identificável, leve e sem espera artificial no navegador/PWA e no app nativo.

**Arquitetura:** aproveitar o manifesto, o HTML público, o plugin `expo-splash-screen` e os providers existentes. Separar a apresentação controlada pelo sistema operacional/navegador do carregamento HTML e React; transferir a apresentação entre essas camadas sem recriar sessão ou navegação.

**Stack:** Expo ~57.0.22, `expo-splash-screen` instalado 57.0.9, React Native 0.86.3, React 19.2.3, React Native Web, TypeScript, React Navigation e Vitest. Manter versões e lockfiles, salvo necessidade demonstrada e aprovada; não adotar Expo Router, Lottie ou nova biblioteca de splash.

**Especificação:** pedido do usuário e seções 1–6 deste documento. Escolha de identidade confirmada pelo usuário em 16/10/2026: **“Usar o símbolo de livro atual”**, já presente na entrada. Não criar uma logo nova. Essa confirmação define o asset de origem; não autoriza implementação ou publicação por si só.

## Restrições globais

- A etapa inicial entregou apenas este planejamento. O usuário autorizou posteriormente a execução local; merge/push/deploy e builds remotos continuam sujeitos a autorização própria.
- Preservar nome TrocaLivros, paleta, tema claro/escuro, Be Vietnam Pro e identificadores técnicos `mybooks` existentes.
- Não redesenhar a marca. Usar o símbolo de livro atual (`auto-stories`), conforme escolha confirmada, preservando suas proporções e a paleta existente.
- Ícones e splash são assets públicos empacotados, não fotos de usuário: **não usar R2, URLs assinadas, API ou serviço externo para carregá-los**.
- Não alterar API, Prisma, banco, seeds, autenticação, cookies, locks, Premium, Curtidas, matches, chat ou upload de fotos.
- Preservar o plano 012: acesso web permitido até **1024 CSS px, inclusive**; primeiro acesso acima disso não monta sessão/queries/socket. Não promover instalação no desktop largo.
- Preservar captura antecipada de instalação, identidade do manifest, deep links e o runtime montado ao redimensionar.
- Não desabilitar zoom, não duplicar safe areas e não transformar a splash em uma nova rota da navegação.
- Não atrasar o app para exibir a marca por um tempo mínimo. Não esperar capas, avatar, feed, polling ou API para esconder a splash do sistema.
- Não ampliar a política do service worker: API, sessão, fotos e assinaturas continuam fora do cache persistente.
- O ícone do launcher nativo não está neste pedido de ícone web. Não alterar `expo.icon`, Android adaptive icon, bundle ID ou package nesta tarefa; a splash nativa tem asset/configuração próprios.
- Build/export local não comprova PWA instalada, splash nativa real ou versão publicada. Publicação e builds remotos exigem autorização própria.

## Foco da revisão

1. Fontes com erro, tema pendente, logo ausente e bundle lento: mostrar feedback/erro alcançável, sem tela branca ou splash sem explicação — tarefas 2–4.
2. Desktop inicial largo e transição 1024/1025 com formulário/modal/upload: não montar sessão indevidamente nem remontar um runtime ativo — tarefas 2 e 4.
3. Strict Mode, múltiplos layouts, callbacks atrasados e warm resume: handoff idempotente, timers limpos e splash somente no boot — tarefas 2–4.
4. Tema salvo diferente do sistema, fontes ainda indisponíveis e redução de movimento: cores legíveis e transição sem depender de fonte/animador — tarefas 1–4.
5. Ícone instalado antigo, máscara Android, favicon no export e falha de rede: validar artefatos/headers sem apagar cache privado, desinstalar PWA ou prometer atualização imediata do SO — tarefas 1 e 5.

---

## 1. Contexto verificado

Inspeção em `main`, HEAD `16bc2c8`; conferir novamente antes de executar. Não foi inspecionado o deploy Railway nesta tarefa.

- Foram visualizados `app/assets/icon.png`, `app/assets/splash-icon.png` e `app/public/icons/icon-512.png`: ainda são placeholders de grade/círculos do Expo.
- `app/assets/favicon.png` é a origem do favicon em `expo.web.favicon`. O export precisa ser conferido: a imagem usada no manifest não substitui automaticamente o favicon da aba.
- `app/public/manifest.json` já define `id: /`, `start_url: /`, `scope: /`, `standalone`, cores da marca e ícones 192/512. O de 512 está declarado `any maskable`, mas a arte ainda é placeholder.
- `app/public/index.html` já aponta para o manifest e o Apple touch icon 180, preserva zoom/safe areas, captura eventos de instalação e aplica tema antes do React. Não contém uma abertura com logo.
- `app/app.json` já configura `expo-splash-screen` com placeholder e fundo branco. O pacote está instalado: não é necessário reinstalá-lo para planejar ou iniciar esta entrega.
- `app/App.tsx` retorna `null` enquanto o tema hidrata e um spinner enquanto fontes carregam. O erro retornado por `useFonts` não é consumido.
- `src/routes/index.tsx` exibe outro spinner durante `!isLoaded` da sessão. Substituí-los sem coordenação pode produzir duas aberturas, flashes ou remontagem da sessão.
- `ThemeProvider` resolve preferência pública local; `SessionProvider` restaura a sessão e finaliza `isLoaded` em `finally`. Não usar timeout visual para considerar uma sessão inválida ou iniciar outro refresh.
- `WebExperience` está antes de `QueryClientProvider`/`SessionProvider`. Seu posicionamento relativo deve continuar preservado.
- A entrada é `app/index.ts`, com React Navigation e export `single`; não há Expo Router.
- A marca na entrada é texto TrocaLivros e o MaterialIcons `auto-stories` branco em superfície magenta. Não foi encontrado um arquivo vetorial oficial independente em `app/assets`.
- O Caddy serve HTML como `no-store`, metadados/ícones como `no-cache` e assets com hash como imutáveis. O worker só precacheia assets com hash e `offline.html`.

### Leitura de toda a documentação

Os 18 arquivos de `docs/` foram lidos, além de `web/README.md` e do plano 012. Há registros históricos que ainda mencionam branches locais; não são prova do estado atual do código ou da produção.

| Referência | Como orienta esta tarefa |
| --- | --- |
| [README](../docs/README.md), [01](../docs/01-visao-geral.md) | Produto mobile/PWA e escopo de apresentação, sem promessas de operação offline |
| [02](../docs/02-arquitetura.md), [03](../docs/03-frontend-mobile.md) | Ordem dos providers, variantes web, guards, deep links e boot sem sessão no desktop largo |
| [04](../docs/04-backend-api.md), [05](../docs/05-contrato-api.md), [06](../docs/06-banco-de-dados.md) | Nenhuma alteração de endpoint, schema, migração, seed ou banco |
| [07](../docs/07-autenticacao-seguranca.md), [runbook](../docs/seguranca-auth-runbook.md), [08](../docs/08-tempo-real-chat.md) | Não expor dados na splash, duplicar refresh/socket ou limpar credenciais para resolver aparência |
| [09](../docs/09-design-system-components.md) | Tokens, composição clean, acessibilidade, safe areas e redução de movimento |
| [10](../docs/10-docker-ambientes.md), [12](../docs/12-contribuicao.md), [web](../web/README.md) | Assets versionados, build Expo/Caddy e publicação separada de planejamento |
| [11](../docs/11-qualidade-testes.md), [15](../docs/15-matriz-validacao-mvp.md) | Testes comportamentais, export real e distinção entre fixtures e aceite físico |
| [13](../docs/13-pendencias-conhecidas.md), [14](../docs/14-execucao-do-mvp.md), [16](../docs/16-historico-de-alteracoes.md) | Registrar limites e novas evidências sem converter resultados antigos em aceite desta entrega |

### Skills e responsáveis por área

Foram utilizadas `brainstorming`, `writing-plans` e `ui-ux-pro-max`. A busca UX `loading feedback progress` destacou feedback estável, espera proporcional e prevenção de spinners piscando. Foi aplicado esse resultado, não a sugestão genérica de adicionar shimmer; o design system atual prefere superfícies estáticas.

O diretório local `.agents/skills/` contém skills de Clerk. Elas não atendem ícones/splash, e Clerk não participa do runtime: não aplicá-las nem reintroduzir autenticação externa. Os papéis abaixo são responsabilidades de execução, não nomes de agentes inexistentes. Nenhum subagente foi usado neste planejamento.

| Responsabilidade | Trabalho | Orientação adequada |
| --- | --- | --- |
| UI/identidade | Símbolo existente, contraste, exports e máscaras | `ui-ux-pro-max`; `frontend-design` se houver decisão visual adicional na execução |
| Frontend Expo | Primeiro frame e encerramento da splash nativa | `executing-plans` e TDD; documentação Expo SDK 57 |
| Frontend Web/PWA | Favicon, manifest, HTML antecipado e handoff DOM | `executing-plans` e TDD; Context7/MDN e padrões existentes |
| Qualidade/revisão | Corridas de boot, gate, temas, build e aparelhos | `verification-before-completion` e revisão independente ao finalizar |

## 2. Pesquisa e abordagem recomendada

Context7 consultado com `/websites/expo_dev` e `/mdn/content`: splash nativa, ícones/manifest e máscara de ícones. A documentação oficial SDK 57 e o código instalado foram conferidos para não copiar exemplos de Expo Router ou de outra versão.

### Alternativas

1. **Recomendada: assets locais + abertura HTML/React + splash nativa existente.** Cobre navegador, PWA e binário; não depende de rede privada e mantém diferenças de plataforma em adaptadores pequenos.
2. **Só trocar imagens/configuração.** Resolve a identidade instalada, mas não cobre o vazio antes do React nem os spinners de fontes/sessão. Insuficiente para a experiência solicitada.
3. **Nova biblioteca de animação/uma tela temporizada.** Adiciona dependências e tempo de espera sem resolver o primeiro frame. Fora do escopo.

### Boas práticas aplicáveis

- A splash nativa deve ser configurada pelo plugin; a API permite reter em escopo de módulo e esconder quando há conteúdo. Confirmado também no pacote instalado. Testar em preview/release, pois Expo Go/dev-client não reproduzem o resultado final: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/).
- Splash PNG, com transparência, e configuração de variante escura; alterações nativas exigem novo binário. O app atual não precisa migrar de navegação: [Expo — splash e app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).
- Definir separadamente ícones comuns e maskable. Arte importante dentro de um círculo central de diâmetro 80% e fundo opaco no maskable: [MDN — ícones de PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons).
- Parte da abertura de uma PWA instalada é gerada pelo navegador/SO a partir do manifest; não há controle React dessa etapa. Cor do manifest e primeira superfície devem ser coerentes, sem prometer comportamento idêntico em todos os sistemas: [MDN — background_color](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/background_color).

## 3. Direção visual proposta

- **Ícone web:** fundo magenta `#B90041`, livro branco, sem texto miúdo, moldura externa, arredondamento desenhado ou sombra. O sistema aplica a forma do ícone instalado.
- **Splash clara:** fundo papel `#FFF8F7`, símbolo magenta central e nome TrocaLivros. **Escura:** fundo `#181318`, símbolo/contraste usando os tokens escuros (`primary: #FF8FB5`, `foreground: #FFF8F7`). Não introduzir novas cores.
- **React:** marca com largura visual inicial de 96 unidades e nome de 24; padding mínimo 24. Em telas/fontes grandes, permitir reflow e rolagem do estado de erro. Nome em Be Vietnam Pro somente após disponibilidade; usar fonte de sistema antes disso.
- **Splash nativa:** símbolo sem texto em PNG transparente 1024×1024, `imageWidth: 96`, `resizeMode: contain`, fundos claro/escuro correspondentes. Restrições de máscara/tamanho do Android prevalecem; ajustar pela evidência do preview, não por screenshot do Expo Go.
- **Feedback:** marca estática. Texto inicial “Abrindo o TrocaLivros…”; na sessão, “Preparando sua conta…”. Sem porcentagem falsa, slogans longos, fotos, cards, shimmer ou vibração.
- **Movimento:** nenhum movimento no handoff HTML → React ou nativo → React. Uma eventual saída React usa somente opacity, até 120 ms, sem duração mínima. Preferência reduzida ou desconhecida: 0 ms. O progresso não depende de `animationend`.
- **Acessibilidade:** um único status de carregamento ativo; imagem decorativa se o nome já está presente. Não anunciar repetidamente a marca por troca de fase. Estados de erro têm heading e ação identificados; contraste e zoom preservados.

### Assets previstos

| Arquivo | Finalidade/contrato |
| --- | --- |
| `app/assets/brand/mark.svg` | Fonte vetorial local do símbolo existente, sem fontes externas/scripts; registrar procedência/licença |
| `app/assets/favicon.png` | Fonte 48×48 do favicon Expo; conferir a conversão `favicon.ico` efetivamente exportada |
| `app/public/icons/icon-192.png` e `icon-512.png` | PNG opacos, `purpose: any`, tamanhos exatos |
| `app/public/icons/icon-maskable-512.png` | PNG opaco separado, `purpose: maskable`, zona segura conferida |
| `app/public/icons/icon-180.png` | Apple touch icon 180×180, opaco e sem cantos pré-arredondados |
| `app/assets/splash-icon.png` e `splash-icon-dark.png` | PNG 1024×1024 com transparência; símbolo de abertura, não o quadrado do launcher |
| `app/public/brand/boot-mark.svg` | Cópia pública derivada da fonte, para a abertura HTML; não depende de fonte de ícones |

Manter os caminhos existentes quando possível. Separar variantes maskable/any; não apenas mudar `purpose` sobre uma arte inadequada. A versão nativa usa PNG local; não adicionar `react-native-svg` para renderizar um único símbolo.

## 4. Contrato de inicialização

```text
PWA: abertura do navegador/SO → HTML com marca → primeiro frame React
Nativo: splash do SO → primeiro frame React
React: recursos locais → gate web OU restauração existente da sessão → navegação
```

### Handoff e prontidão

1. **Antes do JavaScript web:** marca estática no HTML e cor aplicada pelo bootstrap de tema atual. A imagem é local; reservar tamanho e ter o nome como fallback se falhar. O HTML é de boot, não conteúdo privado ou rota.
2. **Primeiro frame React:** `BootSplash` aparece mesmo com tema/fontes pendentes. Após layout e logo carregada **ou fallback renderizado**, chamar `releaseLaunchScreen()` uma vez: remove a superfície HTML na web ou esconde a nativa. Se recursos/sessão já estiverem prontos e nenhum BootSplash chegar a montar, o host da primeira superfície real (Auth/app/aviso desktop) também sinaliza apresentação após seu layout; o encerramento não pode depender da montagem de um loader. Não aguardar sessão/API aqui.
3. **Recursos locais:** aguardar `hydrated` e fontes carregadas. Consumir também o erro de `useFonts`. Com erro ou após **8.000 ms** sem prontidão, mostrar erro explícito, não deixar somente o spinner. O prazo é limite de feedback, não atraso mínimo nem autorização para montar UI privada.
4. **WebExperience:** quando os recursos estiverem prontos, decidir largura com o gate existente. Acima de 1024 no primeiro acesso, apresentar aviso e guia sem montar a sessão; encerrar o boot HTML mesmo nesse caminho.
5. **Sessão:** dentro do runtime permitido, `Routes` usa a mesma apresentação durante `!isLoaded`. Após **10.000 ms**, acrescentar “A conexão está demorando. Confira sua internet.” e orientação de reabrir. Continuar aguardando o provider existente; não disparar outro refresh, cancelar locks, limpar cookie ou assumir logout.
6. **Navegação:** ao resolver sessão, preservar a escolha Auth/onboarding/app e a URL original. Usar `BootSplash` como `fallback` da inicialização de linking do `NavigationContainer`, se houver espera, sem recriar o container para trocar de fase.
7. **Depois do boot:** navegação, retorno ao foreground, renovação de token, troca de aba, fetch e carregamento de imagens não reexibem a splash global.

### Erros e recuperação

- Erro de fontes: “Não foi possível carregar os recursos do aplicativo.”; timeout local: “O aplicativo demorou para iniciar.”. Web oferece **Recarregar aplicativo**, mantendo a URL atual; nativo orienta **Feche e abra o aplicativo para tentar novamente**. Não oferecer um botão nativo sem implementação real de reload.
- Falha somente da imagem da marca usa o nome em fonte de sistema e libera o handoff; não bloqueia a entrada.
- Recursos concluídos depois do aviso de demora podem avançar normalmente; depois de pronto, um callback/timer antigo não deve voltar ao erro ou remontar o app.
- HTML com bundle que não chega: após **15.000 ms**, trocar o texto por explicação e botão local de recarregar. Se React chegar depois, o handoff remove o aviso e limpa o timer. Não depende de CDN nem de API.
- Sem JavaScript, preservar o `noscript` existente e não cobri-lo com uma splash infinita. A apresentação de boot deve ser ativada pelo bootstrap, não esconder a orientação quando scripts estão desabilitados.
- Um ErrorBoundary de boot apresenta falhas de render inicial e libera a splash ao renderizar o erro. Não promete recuperar encerramento do processo nativo ou erro ocorrido antes da execução de qualquer JavaScript.
- Preferência salva diferente do sistema: o HTML pode ler a preferência pública já existente; o SO nativo não lê AsyncStorage antes do JS. A splash nativa segue a aparência que o sistema disponibiliza; após hidratação aplica-se o tema escolhido. Registrar essa limitação, sem persistir tokens ou criar uma segunda chave de tema.

## 5. Unidades e interfaces planejadas

| Unidade/arquivo | Responsabilidade |
| --- | --- |
| `web/scripts/generate-brand-assets.mjs` | Gerar imagens públicas/PNG a partir da fonte aprovada, somente em manutenção local; resultado versionado |
| `web/tests/brand-assets.test.mjs` | Validar dimensões, referências, opacidade/máscara e origem dos outputs |
| `app/src/features/boot/bootPolicy.ts` | Constantes e tipos de estado; sem acesso a sessão/rede |
| `app/src/features/boot/launchScreen.ts` / `.web.ts` | Ponte da splash nativa ou superfície HTML; API idempotente |
| `app/src/features/boot/useBootResources.ts` | Estado de fontes/tema, erro e deadline local, com limpeza de timer |
| `app/src/components/BootSplash/index.tsx` + `styles.ts` | Marca local e feedback; fonte de sistema quando necessário; callback de apresentação |
| `app/src/components/BootErrorBoundary/index.tsx` | Falha de render de boot com superfície própria, sem mutação de sessão |
| `app/public/index.html` | Superfície antecipada, watchdog e handoff; preservar tema/instalação/viewport atuais |
| `app/App.tsx`, `app/index.ts`, `app/src/routes/index.tsx` | Integrar primeiro frame, recursos e loading de sessão/linking sem remontagem; o host sinaliza apresentação também quando nenhum loader foi necessário |
| `app/app.json`, `app/public/manifest.json` | Caminhos, variantes e metadados de marca; identidades existentes preservadas |

Interfaces a manter entre tarefas:

```ts
type BootPhase = 'resources' | 'session' | 'navigation';
type BootIssue = 'resource-error' | 'resource-timeout' | 'session-slow';
type BootSplashProps = {
  phase: BootPhase;
  fontsReady: boolean;
  issue?: BootIssue;
  onPresented?: () => void;
};
type BootResourceInput = { themeHydrated: boolean; fontsLoaded: boolean; fontError: Error | null };
type BootResourceState = { ready: boolean; issue?: 'resource-error' | 'resource-timeout' };
// useBootResources(input: BootResourceInput): BootResourceState
// releaseLaunchScreen(): Promise<void> — nativo esconde; web retira HTML; falhas não interrompem o app.
```

`launchScreen.ts` chama `preventAutoHideAsync()` em escopo de módulo, sem await bloqueante, somente na implementação nativa. Importá-lo na entrada antes de registrar o app; o resolver escolhe `.web.ts` sem importar o módulo nativo. Calls repetidos de release são no-op; erros da ponte são tratados sem dados privados.

O gerador de imagens deve reutilizar uma ferramenta local já disponível, preferencialmente `sharp` declarado na API, **apenas como ferramenta de manutenção**. O build web regular continua executando `npm ci` só no app e consome os assets versionados; não instala a API para gerar favicon. Se faltar rasterizador compatível, avaliar uma dependência dev separadamente antes de alterar lockfile. Não usar IA generativa para redesenhar o símbolo já adotado.

## 6. Escopo fora desta entrega

- Launcher/adaptive icon nativo e variações tinted de iOS; App Store/Play Store e screenshots de marketing.
- Animação cinematográfica, vídeo, Lottie, progresso percentual, feed pré-carregado ou nova arquitetura de sessão.
- Catálogo completo de `apple-touch-startup-image` por modelo/orientação; só considerar uma necessidade específica após teste físico e novo escopo.
- Login offline, cache de dados privados, novas permissões, push, novos domínios ou alterações de infraestrutura.
- Limpeza geral do projeto, upgrades de SDK/dependências e correção dos advisories preexistentes.

## 7. Plano de execução

### Task 1 — Assets de marca e ícones web corretos

**Responsável:** UI/identidade + frontend web. **Arquivos:** assets da seção 3; criar gerador e `web/tests/brand-assets.test.mjs`; modificar `app/public/manifest.json`, `app/app.json` e smoke PWA quando necessário.

**Consome:** escolha da logo e cores existentes. **Produz:** assets versionados nos caminhos definidos, sem alteração do launcher nativo.

- [x] Escolha da origem confirmada em 16/10/2026: usar o símbolo de livro atual (`auto-stories`). Essa decisão não representa geração ou aprovação dos exports finais.
- [ ] Conferir visualmente as derivações do símbolo atual nos tamanhos e máscaras previstos, sem redesenhar a marca.
- [ ] Escrever testes de dimensões PNG 48/180/192/512/1024, opacidade dos ícones instaláveis, `any` e `maskable` separados, arquivos presentes e `id/start_url/scope` inalterados. Para o SVG, rejeitar scripts, referências remotas e fontes externas. Conferir a caixa de conteúdo importante dentro da zona maskable e as quatro máscaras visualmente.
- [ ] Executar `node --test web/tests/brand-assets.test.mjs`; confirmar RED com os placeholders/referências atuais.
- [ ] Produzir a fonte com procedência/licença, gerar variantes e configurar manifesto/favicon. Não copiar screenshot nem redesenhar o livro com emoji.
- [ ] Reexecutar o teste e export PWA; confirmar GREEN, favicon real no export e ícones legíveis a 16/32 px. Conferir o favicon de 48 convertido pelo Expo, não apenas a existência do PNG de origem.
- [ ] Commit sugerido: `feat(web): aplica marca aos icones da PWA` — adicionar somente fontes/assets/scripts/configs da tarefa.

### Task 2 — Abertura HTML antecipada e handoff web

**Responsável:** frontend web/PWA. **Arquivos:** modificar `app/public/index.html`; criar `launchScreen.web.ts`, testes `app/src/features/boot/__tests__/webLaunchScreen.test.ts`; ampliar `web/tests/pwa-build-smoke.mjs`.

**Consome:** SVG público e cores da tarefa 1. **Produz:** superfície HTML com marca e `releaseLaunchScreen()` idempotente, independente de sessão/fontes.

- [ ] Escrever testes executando os scripts reais do HTML: logo/texto antes do React, tema salvo/system/storage recusado, watchdog em 15.000 ms, handoff repetido, React tardio após aviso, logo com erro e `noscript` alcançável. Confirmar que a captura antecipada de `beforeinstallprompt` permanece funcional.
- [ ] Executar `npm test -- src/features/boot/__tests__/webLaunchScreen.test.ts` em `app/`; confirmar RED.
- [ ] Implementar camada HTML leve e bridge. Reserva visual estável; script do boot separado do de instalação, sem leituras de credenciais. Timer encerrado em release; chamada antes da existência do elemento também deve ser segura.
- [ ] Reexecutar testes, `npm run build:web` e `npm run test:pwa`; confirmar GREEN no HTML **exportado**, sem mudar zoom, safe areas, manifest identity ou cache privado.
- [ ] Commit sugerido: `feat(web): adiciona abertura antecipada com a marca`.

### Task 3 — Superfície React e ponte nativa

**Responsável:** frontend Expo + UI. **Arquivos:** `BootSplash`, `styles.ts`, `bootPolicy.ts`, `launchScreen.ts`, `BootErrorBoundary`; modificar entrada `app/index.ts` e plugin em `app/app.json`; criar testes de componente/ponte em `features/boot/__tests__`.

**Consome:** PNGs da tarefa 1 e interfaces da seção 5. **Produz:** primeiro frame com marca e release nativo seguro, sem esperar API.

- [ ] Escrever testes com componente real e ponte de SO simulada apenas na fronteira: tema claro/escuro, fonte ainda indisponível, texto grande, erro de logo, `onPresented` após layout+imagem/fallback, release único, chamada nativa rejeitada e ErrorBoundary. Verificar que import web não chama o módulo nativo.
- [ ] Executar `npm test -- src/features/boot/__tests__` e confirmar RED para as unidades novas.
- [ ] Implementar a superfície sem fonte obrigatória, ponte nativa com `preventAutoHideAsync()` antecipado e `hide()`/release idempotente, e variantes claras/escuras do plugin. Não configurar fade nativo como se fosse garantido no Android; o handoff proposto não exige animação.
- [ ] Reexecutar testes e typecheck. Conferir no config resolvido as imagens e cores; erro de logo deve preservar nome e permitir release.
- [ ] Commit sugerido: `feat(app): cria splash compartilhada e ponte nativa`.

### Task 4 — Integrar recursos, sessão e navegação sem piscadas

**Responsável:** frontend Expo/Web. **Arquivos:** `useBootResources.ts`; modificar `app/App.tsx`, `app/src/routes/index.tsx`; atualizar `app/src/__tests__/pwaApp.component.test.tsx`; criar `bootApp.component.test.tsx` e testes do hook.

**Consome:** `BootSplash`, ponte e estado da seção 5. **Produz:** fluxo de boot único, com erro explicado e sem alterar autenticação.

- [ ] Escrever regressões: fontes pendentes/erro, deadline 8.000 ms, tema pendente, conclusão tardia, `isLoaded` imediato/lento, sessão lenta aos 10.000 ms, erro transitório já tratado pelo provider e linking. Usar relógio controlado e promises adiadas; não substituir o fluxo inteiro por mocks.
- [ ] Cobrir primeiro boot 1025 sem montagem de sessão; 1024 com montagem única; recursos e sessão já prontos sem nenhum loader React montado, com HTML/nativo encerrados pelo layout da superfície real; resize com campo/modal/upload preservados; retorno ao foreground e refresh sem reexibir splash. Testar Strict Mode/múltiplos layouts e verificar limpeza de timers no unmount.
- [ ] Rodar os testes direcionados e confirmar RED antes da integração.
- [ ] Integrar SafeAreaProvider/superfície de recursos mantendo ThemeProvider e PwaInstallProvider públicos. Remover `return null` sem feedback; consumir `fontError`. Manter WebExperience antes da sessão e o QueryClient estável; usar BootSplash no loading de Routes/linking sem key de remontagem. O host de primeiro frame libera a camada anterior também no caminho sem loading, sem colocar padding extra de safe area.
- [ ] Implementar a ação web de reload da URL atual e a orientação nativa verdadeira. Fonte que falha não libera conteúdo com tipografia incompleta silenciosamente: apresenta o erro definido; tema com falha de leitura mantém o fallback já oferecido pelo provider.
- [ ] Executar suítes direcionadas, suíte completa e typecheck; confirmar GREEN e zero chamadas adicionais de refresh/socket por mudança visual. Não adicionar timeout que encerra a sessão ou duplica restore.
- [ ] Commit sugerido: `feat(app): coordena abertura sem bloquear sessao ou navegacao`.

### Task 5 — Aceite integrado, documentação e liberação separada

**Responsável:** qualidade + revisão independente. **Arquivos:** testes de assets/PWA/browser; docs/03, 09, 11, 13, 15, 16; `web/README.md`; criar `plans/plan-013-identidade-web-splashscreen-execucao.md` durante a execução.

**Consome:** tarefas 1–4. **Produz:** evidências da árvore final e lista explícita de aceites pendentes, sem publicação implícita.

- [ ] Ampliar o smoke/browser para verificar a marca com bundle atrasado/bloqueado, recuperação tardia, ausência de sobreposição de loaders, nenhum pageerror e preservação do gate/instalação. Adicionar regressão de cache com o worker real, mantendo bypass de API/R2.
- [ ] Rodar da raiz `node --test web/tests/brand-assets.test.mjs`. Em `app/`: `npm test -- --reporter=dot`, `npm run typecheck`, `npm run build:web`, `npm run test:pwa` e `npx expo config --type public`. Conferir o conteúdo, não só exit code.
- [ ] Exportar Android/iOS para diretórios QA isolados; são evidência de resolução de módulos, não de splash real. Se usar Caddy local disponível, repetir os smokes de proxy/cache sem baixar ferramentas ou alterar ambiente por iniciativa própria.
- [ ] QA web em 320, 375, 414, 768, 1024 e 1025/1440 CSS px; retrato/paisagem, claro/escuro, tema salvo oposto ao sistema, zoom 200%, redução de movimento, cache frio/quente, fonte/imagem/bundle bloqueados e API indisponível. No desktop largo, nenhuma consulta privada no boot.
- [ ] Conferir que assets sob `/icons` e metadados continuam revalidando; paths ausentes continuam 404, não HTML. Não executar unregister/clear de todo o storage, cookies ou service worker para simular sucesso de atualização.
- [ ] Revisão independente do diff: conferir foco da revisão, tamanhos/máscaras, ausência de dados privados, handoffs e preservação do fluxo 012. Corrigir achados com regressão e repetir verificações afetadas.
- [ ] Registrar comandos, SHA, evidências visuais e pendências no relatório. Atualizar somente documentos afetados; não reescrever todo o histórico como se fosse execução atual.
- [ ] Commit sugerido: `test(app): valida identidade e boot nas plataformas`.
- [ ] Somente após autorização: integrar/push/deploy web e gerar novo binário preview/release nativo. Conferir o SHA e os arquivos públicos servidos; não declarar produção atualizada apenas pelo push.

## 8. Critérios de aceite e limites

| Superfície | Aceite exigido |
| --- | --- |
| Aba do navegador | Favicon real do livro, legível e sem placeholder; `/auth` e deep links mantêm o ícone |
| PWA Android | Ícones normal/maskable e abertura por ícone; nada importante cortado pelas máscaras |
| Safari/PWA iPhone/iPad | Apple touch icon correto, abertura instalada, safe areas e temas; registrar qual trecho foi desenhado pelo SO |
| Web antes do React | Marca/feedback com JS lento; watchdog e reload verdadeiros; noscript não encoberto |
| React | Nenhum vazio entre tema/fontes/sessão; erro explicado; estado/URL preservados e loading sem espera mínima |
| Nativo preview/release | Splash configurada e primeiro frame com a mesma identidade; funciona com/sem sessão e não espera API para esconder a superfície nativa |
| Segurança/regressão | Gate 1024/1025, sessão/cookies/locks/cache privado inalterados; sem nova consulta privada para buscar logo |

Aceites físicos em Android e iPhone/iPad, VoiceOver/TalkBack e instalação real são obrigatórios para declarar comportamento final dessas plataformas. Testes em Chrome desktop, viewport simulado, mocks do SO e Expo Go não substituem esses aceites.

Metas de implementação: zero dependência nova de runtime; zero request de API para identidade; zero duração mínima de splash; SVG público simples até 8 KiB e cada PNG público até 100 KiB, medidos após geração. Se ultrapassar, otimizar o asset, não comprimir ou recortar a marca indevidamente. Comparar boot frio/quente antes/depois no mesmo ambiente; não prometer p95 sem medição.

O navegador/SO pode manter o ícone antigo de uma PWA instalada por algum tempo. Revalidar manifesto e assets, fechar/reabrir e observar atualização; reinstalação é último recurso manual de QA, após explicar que pode afetar dados locais. Não trocar `manifest.id` para forçar atualização nem fazer limpeza automática dos dados do usuário.

## 9. Ordem, revisão do plano e próxima decisão

Ordem recomendada: **1 → 2 → 3 → 4 → 5**, no mesmo fluxo sequencial, com revisão independente ao final. As tarefas compartilham contratos de assets/boot; paralelizar a implementação sem necessidade aumentaria o risco de handoffs incompatíveis.

Autorrevisão do planejamento: pedido coberto por tarefas com arquivos/interfaces e testes; cinco riscos ligados aos respectivos aceites; limites de Expo Go/PWA e tema nativo documentados; nenhuma alteração de autenticação, infraestrutura ou armazenamento privado prevista. Os prazos de 8/10/15 s são decisões propostas de feedback e precisam ser confirmados por ensaio, não alegações de desempenho obtido.

Execução local autorizada pelo usuário e em andamento, com origem da logo confirmada e método sequencial. Próximos gates: revisão final e decisão separada de integração/publicação; consultar o registro de execução. Não executar merge/push/deploy por inferência.
