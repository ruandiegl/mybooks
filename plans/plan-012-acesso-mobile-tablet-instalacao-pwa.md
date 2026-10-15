# Plano 012 — Acesso mobile/tablet e instalação da PWA

> **Para execução por agentes:** usar `superpowers:executing-plans` na execução sequencial recomendada, ou `superpowers:subagent-driven-development` se esse método for escolhido pelo usuário. Executar e verificar uma tarefa por vez; as caixas abaixo não indicam implementação concluída.

**Estado:** planejado, não implementado. **Data:** 15/10/2026.

**Objetivo:** apresentar um informativo em janelas web acima de 1024 px e facilitar o acesso e a instalação da PWA em celulares e tablets, preservando o app Expo e a identidade visual existente.

**Arquitetura:** adicionar uma fronteira de apresentação exclusivamente web, antes da inicialização da sessão em acessos inicialmente largos. Um controlador público de instalação tratará o prompt disponibilizado pelo navegador e os guias manuais; os fluxos autenticados, a API e o service worker existente não serão substituídos.

**Stack:** Expo ~57.0.22, React Native 0.86.3, React 19.2.3, React Native Web, TypeScript, React Navigation, Vitest e a publicação Expo/Caddy já existente. Prever somente `qrcode-generator` como nova dependência de produção, importada em arquivo `.web.tsx`; conferir e fixar a versão resolvida na execução, sem atualizar SDK ou demais pacotes.

**Especificação:** pedido do usuário e seções 1–5 deste documento. Decisão confirmada pelo usuário: **“Por largura: até 1024 px”**, inclusive permitindo uma janela desktop estreita. A execução depende da revisão deste planejamento.

## Restrições globais

- Acesso web ao app em **largura de viewport até 1024 CSS px, inclusive**; acima disso, apresentar o informativo. Não distinguir computador de tablet por sistema operacional, mouse, touch, resolução física ou user agent.
- Essa é uma política de experiência, não um controle de segurança. Uma janela desktop reduzida poderá acessar o app, conforme a escolha confirmada.
- Expo iOS/Android não recebe bloqueio por largura nem promoção de instalação PWA.
- Não exigir instalação para utilizar o app no navegador com largura permitida.
- Manter paleta, tema claro/escuro, Be Vietnam Pro, botões, espaçamentos, ícones e linguagem dos modais existentes.
- Não prometer um botão de instalação automática no iOS/iPadOS. Mostrar instalação direta somente quando houver um evento utilizável do navegador.
- Não alterar autenticação própria, cookies, contratos da API, banco, chat, matches, R2, permissões ou gates Premium. Não reintroduzir Clerk.
- Não persistir sessão, fotos privadas, URLs assinadas ou respostas da API no service worker ou na funcionalidade de instalação.
- Não desabilitar zoom, mudar `manifest.id`/`scope`/`start_url`, forçar orientação web ou redirecionar o usuário para lojas sem uma versão pública verificada.
- Esta entrega é somente planejamento: sem instalação de dependências, implementação, commit, push, deploy, SSH, backup ou operações em serviços externos.

## Foco da revisão

1. Evento de instalação recebido antes de fontes/React estarem prontos: preservar somente em memória e consumir uma única vez — tarefa 1.
2. Duplo toque, recusa do prompt, exceção e `appinstalled` antes de `userChoice`: não repetir o prompt nem regredir uma instalação confirmada — tarefa 1.
3. Transição 1024 → 1025 → 1024 com formulário, upload e modal aberto: preservar estado e impedir interação/foco em portais atrás do aviso — tarefas 2 e 4.
4. iPad com identificação de desktop, navegador sem prompt e PWA já aberta em standalone: largura decide acesso; capacidade decide CTA; guia pode ser corrigido pelo usuário — tarefas 1 e 3.
5. QR/link originado em URL com token, query ou hash, clipboard recusado, zoom e safe areas: não vazar dados nem deixar o usuário sem alternativa — tarefas 2, 3 e 5.

---

## 1. Contexto verificado

Base da inspeção: `main`, HEAD `a79829c3509e04b5f94d282196f61b8ade7adbb9`. Conferir novamente na execução; esta inspeção não atesta o SHA atualmente servido pela Railway.

- `app/App.tsx` já fornece tema público, fontes e safe areas, mas monta `SessionProvider` sem uma política de largura. O informativo deve funcionar sem consultar dados de uma conta.
- A navegação é React Navigation, com entrada `app/index.ts` e export web `single`. Não há Expo Router nem justificativa para adotá-lo nesta tarefa.
- `app/public/index.html` já possui viewport com `viewport-fit=cover`, bootstrap do tema, manifest, ícone Apple e registro de `/sw.js`. Não há captura de `beforeinstallprompt` ou `appinstalled`.
- O manifest já possui identidade, ícones e `display: standalone`. O build web passa por `web/scripts/build-service-worker.mjs` e a entrega por `web/Caddyfile`.
- O service worker só armazena o fallback público e assets estáticos permitidos. Instalação da PWA não habilita chat offline, sincronização offline ou notificações push automaticamente.
- `ProfileSettingsModal` já tem navegação interna, rota Ajuda e proteções para edição ocupada. Adicionar uma entrada web nesse menu, sem abrir um segundo modal por cima dele.
- `MatchModal` fornece a referência visual para o novo guia público: bottom sheet, largura máxima de 560, overlay, cantos superiores arredondados e botão de fechar acessível.
- Os modais React Native Web usam portais fora da árvore visual do app. Esconder apenas o contêiner de `Routes` não basta para cobri-los ou bloquear seu foco.

### Cobertura de toda a documentação

Os 18 arquivos de `docs/` foram lidos. As decisões abaixo se apoiam no código atual; registros históricos não equivalem ao estado publicado.

| Documentação | Aplicação neste plano |
| --- | --- |
| [Índice](../docs/README.md), [01 — visão geral](../docs/01-visao-geral.md) | Escopo mobile-first, terminologia do produto e orientação simples, sem inventar funcionalidades |
| [02 — arquitetura](../docs/02-arquitetura.md), [03 — frontend](../docs/03-frontend-mobile.md) | Compartilhamento React Native; fronteiras DOM em arquivos web; preservar navegação e safe areas |
| [04 — backend](../docs/04-backend-api.md), [05 — contratos](../docs/05-contrato-api.md), [06 — banco](../docs/06-banco-de-dados.md) | Nenhum endpoint, schema, seed ou migração necessário |
| [07 — autenticação](../docs/07-autenticacao-seguranca.md), [runbook](../docs/seguranca-auth-runbook.md) | Não transportar credenciais no QR; não inicializar sessão no primeiro acesso bloqueado; manter proteções de sessão |
| [08 — chat](../docs/08-tempo-real-chat.md) | Não abrir conexão autenticada no primeiro acesso bloqueado; não prometer mensagens offline |
| [09 — design system](../docs/09-design-system-components.md) | Reutilizar tokens, Be Vietnam Pro, AppButton, ícones e padrão dos modais |
| [10 — ambientes](../docs/10-docker-ambientes.md), [12 — contribuição](../docs/12-contribuicao.md) | Preservar build Expo/Caddy, proxy same-origin e separação entre implementação e publicação autorizada |
| [11 — testes](../docs/11-qualidade-testes.md), [15 — matriz](../docs/15-matriz-validacao-mvp.md) | Testar componentes reais e limites do navegador; separar testes sintéticos de aceite físico |
| [13 — pendências](../docs/13-pendencias-conhecidas.md), [14 — execução](../docs/14-execucao-do-mvp.md), [16 — histórico](../docs/16-historico-de-alteracoes.md) | Preservar melhorias recentes de perfil, imagens, curtidas e modais; registrar limitações e evidências novas sem reescrever histórico |

### Skills e `.agents/`

Foram aplicadas `brainstorming`, `writing-plans`, `frontend-design` e `ui-ux-pro-max`: delimitação do produto, plano verificável, direção visual coerente e revisão de responsividade/acessibilidade. A busca de UX `responsive breakpoint reflow` reforçou testes em vários viewports, reflow de texto e ausência de rolagem horizontal. Não foi gerada uma paleta alternativa.

O catálogo local `.agents/skills/` contém skills de Clerk, que não se aplicam à autenticação própria nem a esta funcionalidade. Não inventar agentes especializados ausentes nem reintroduzir essa integração. Não foram usados subagentes neste planejamento; a autorrevisão cabe ao agente principal. Na execução, usar TDD, verificação antes de conclusão e revisão final independente, respeitando as skills disponíveis.

## 2. Pesquisa técnica e referências de produto

### Context7 e documentação oficial

Context7 foi utilizado para MDN (`/mdn/content`) e Expo (`/websites/expo_dev`). Uma resposta inicial sobre o evento `install` do service worker foi descartada: ele não é o prompt de instalação da PWA. Exemplos Expo Router/`+html.tsx` também não se aplicam à entrada atual. A consulta não justifica migração de SDK.

- `beforeinstallprompt` tem disponibilidade limitada. Capturar o evento, adiar a interface padrão e chamar `prompt()` diretamente em uma ação do usuário, uma vez por evento: [MDN — BeforeInstallPromptEvent](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent) e [MDN — experiência de instalação](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt).
- iOS/iPadOS não oferecem esse prompt programático. O guia deve explicar o caminho pelo menu do navegador e a adição à tela inicial: [MDN — instalação de PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) e [Apple — transformar site em app](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios).
- A escolha `accepted` não deve ser apresentada como confirmação de instalação concluída; tratar `appinstalled` e o modo de execução separadamente. A promoção deve ser contextual e não intrusiva: [web.dev — instalação no app](https://web.dev/articles/customize-install) e [padrões de promoção](https://web.dev/articles/promote-install).
- Manter export/manifest existentes e avaliar cuidadosamente qualquer mudança em cache: [Expo — progressive web apps](https://docs.expo.dev/guides/progressive-web-apps/).
- Um `dialog.showModal()` ocupa a top layer e torna o restante do documento inerte. Isso permite cobrir portais existentes sem substituir todos os modais: [MDN — showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).
- O QR pode ser gerado localmente a partir da matriz da biblioteca, sem serviço externo nem HTML arbitrário: [qrcode-generator — API oficial](https://github.com/kazuhikoarase/qrcode-generator/blob/master/js/README.md). Validar licença, versão e tamanho na execução.

### Concorrentes e referências adjacentes

| Produto / evidência pública | O que aproveitar | O que não inferir ou copiar |
| --- | --- | --- |
| [Bumble — acesso web indisponível](https://bumble.com/web-not-available/) | Aviso compreensível, orientação para continuar no celular/tablet e QR de transição | Não copiar marca, promessas de recursos, links de lojas ou tratar o QR como login automático |
| [Skoob — página pública](https://www.skoob.com.br/pt/home) | Entrada persistente para obter o app, sem substituir toda a comunicação pelo pedido de instalação | A página pública não comprova instalação PWA, bloqueio desktop ou um fluxo específico de prompt |
| [Tinder — criação de conta](https://www.help.tinder.com/hc/en-us/articles/115003356706-Create-a-Tinder-Account) | Referência de clareza sobre plataformas disponíveis | Também oferece web; bloquear desktop é decisão do TrocaLivros, não limitação inerente da tecnologia |

São padrões observados e inferências de adequação, não provas de conversão. Não foram realizados testes com contas dos concorrentes nem encontradas métricas comparáveis que permitam prometer aumento de instalações.

## 3. Experiência proposta e regra de largura confirmada

### 3.1 Acesso por largura

Usar uma única constante `MOBILE_MAX_WIDTH = 1024` e `matchMedia('(max-width: 1024px)')`. Não usar `screen.width`, DPR, teclado/`visualViewport` ou detecção de plataforma para permitir/bloquear acesso.

| Condição web | Resultado |
| --- | --- |
| 320–1024 CSS px | App e autenticação normais, instalado ou não |
| Acima de 1024 CSS px | Informativo, QR, link público e guia; sem telas privadas expostas |
| Janela desktop reduzida a 1024 px | App permitido, conforme decisão do usuário |
| Tablet largo, inclusive em paisagem acima de 1024 px | Informativo; orientar a usar uma janela menor ou girar o dispositivo |
| PWA instalada em janela larga | Mesma regra de largura; instalação não libera desktop |
| Expo nativo, qualquer largura | Funcionamento atual, sem esse gate |

Antes da primeira medição web, usar estado neutro público; não montar sessão e depois esconder a tela. Não trocar URL nem apagar query/hash de um deep link apenas para apresentar o aviso.

### 3.2 Informativo desktop

Texto principal: **“Continue no celular ou tablet”**. Complemento: **“O TrocaLivros foi pensado para telas menores. Acesse pelo celular ou tablet para descobrir livros e organizar suas trocas.”**

- Marca existente, texto à esquerda e QR à direita, contêiner de até 960 px e respiro de 32/48 conforme os tokens. Adaptar para coluna quando necessário, sem altura fixa de conteúdo.
- QR de 208 CSS px, área de silêncio de quatro módulos, alto contraste e link textual equivalente. Não colocar logo sobre a matriz ou invertê-la no modo escuro.
- Ações: **“Copiar link”** e **“Como instalar no celular”**. Explicar discretamente que janelas de até 1024 px são compatíveis; não sugerir zoom como solução.
- Não mostrar “Instalar neste computador” nem “Desktop em breve”, pois não há suporte/promessa aprovados.
- Gerar QR/link exclusivamente com a raiz da origem pública atual: `new URL('/', window.location.origin)`. Não incluir rota privada, query, fragmento, credencial, user ID ou URL assinada. O usuário entra na própria conta no outro dispositivo.
- Clipboard apenas por ação explícita. Se indisponível/recusado, manter URL selecionável e explicar como copiar; sem `alert()` ou APIs obsoletas de cópia forçada.

### 3.3 Instalação e guia

| Situação | Ação oferecida |
| --- | --- |
| Evento `beforeinstallprompt` capturado e viewport permitido | **“Instalar TrocaLivros”**, que abre a confirmação do próprio navegador |
| Ainda sem evento, evento recusado ou navegador sem essa API | **“Como instalar”**, que abre um guia; não exibir um botão sem efeito |
| iPhone/iPad | Guia manual; não prometer eliminar a etapa de menu/Compartilhar |
| Navegador interno de outro app | Orientação para abrir no Safari/Chrome e copiar o link, sem esquemas de URL forçados |
| Execução standalone ou instalação confirmada nesta página | Ocultar promoção; no menu, manter ajuda sobre o acesso já instalado |

Entradas permanentes: ação terciária na etapa inicial de autenticação, abaixo de Entrar/Criar conta; e **Perfil → menu → Informações → Instalar aplicativo**, apenas web. Não inserir banners durante preenchimento de senha/código, upload ou interação de curtidas. Não abrir prompts automaticamente nem insistir após a recusa.

Guia com seleção explícita **“iPhone/iPad”**, **“Android”** e **“Outro navegador”**. Uma identificação inicial pode sugerir o guia, inclusive iPad com user agent de desktop, mas a pessoa pode mudar a seleção. Essa sugestão nunca decide acesso ou suporte ao prompt.

- iPhone/iPad: abrir no Safari; localizar o menu/Compartilhar conforme a versão; escolher **Adicionar à Tela de Início**; habilitar **Abrir como App da Web**, quando oferecido; confirmar **Adicionar**. Se a ação estiver oculta, orientar sua localização/edição no menu. Indicar que o texto pode variar por versão.
- Android: se o botão direto estiver disponível, usá-lo; caso contrário, orientar o menu do navegador e a opção Instalar/Adicionar à tela inicial, quando disponível. Não chamar qualquer atalho de instalação PWA confirmada.
- Outros/in-app: abrir em um navegador compatível, disponibilizar link copiável e explicar que os comandos variam. Ausência do evento não significa necessariamente erro ou app já instalado.
- Mensagem de expectativa: **“Adicione o TrocaLivros à tela inicial para abrir como um aplicativo. É necessário estar conectado à internet para usar sua conta.”** Sem prometer acesso offline, push ou maior velocidade medidos.

### 3.4 Aparência e acessibilidade

Reutilizar `app/src/styles/theme.ts`: light `background #FFF8F7`, `primary #B90041`, `secondary #7145BA`; dark via tokens atuais, não por inversão. Não fixar esses hex nos novos componentes. Usar Be Vietnam Pro, escala 4/8, AppButton e MaterialIcons existentes.

O guia público será bottom sheet com overlay e largura máxima 560, seguindo `MatchModal`; no Perfil, o mesmo painel será renderizado dentro do modal de configurações existente, sem modal aninhado. Priorizar conteúdo e passos, sem cards decorativos, screenshots com dados pessoais, gradientes novos ou imagem de telefone artificial.

Garantir foco visível, títulos/nomes acessíveis, alternativa textual ao QR, alvos de 48 CSS px nos novos controles, contraste de texto normal ≥4,5:1, reflow, teclado, redução de movimento e retorno ao acionador. Fechar o guia por botão/Escape/backdrop; não confundir esse fechamento com a política de acesso da página.

Preservar zoom do navegador. Respeitar `env(safe-area-inset-*)` com um único responsável por borda, altura dinâmica `100dvh` com fallback e conteúdo rolável; não duplicar padding dos componentes existentes.

## 4. Arquitetura e ciclo de vida

### Instalação pública

Capturar `beforeinstallprompt` e `appinstalled` em um pequeno bootstrap identificado no `index.html`, antes do bundle/fontes. Guardar a referência do evento somente em memória, em uma ponte tipada `window.__trocalivrosPwaInstallBridge`; notificar assinantes por `trocalivros:pwa-install-change`. Nenhum dado de conta nessa ponte.

O controlador consome o evento de forma síncrona antes de chamar `prompt()`, com lock contra duplo toque e sem `await` anterior à chamada. Aguardar o resultado depois; descartar a referência usada tanto em aceitação quanto recusa/erro. Um novo evento válido pode habilitar uma nova tentativa. `appinstalled` deve prevalecer sobre promessas antigas ainda pendentes.

Detectar execução instalada por `(display-mode: standalone)` e fallback `navigator.standalone` no iOS; observar mudanças disponíveis. Isso identifica a janela atual, não todas as instalações em outros navegadores/dispositivos. Não usar storage persistente para afirmar “já instalado”.

### Fronteira de acesso sem reset de sessão

Composição pretendida: `ThemeProvider → PwaInstallProvider → AppContent/fontes → SafeAreaProvider → WebViewportGate → QueryClientProvider → SessionProvider → Routes`. O provider público deve existir antes da espera de fontes; o bootstrap cobre eventos anteriores ao React.

- Primeiro acesso largo: renderizar apenas o informativo; filhos autenticados ainda não montados.
- Ao entrar na largura permitida: montar o runtime uma vez.
- Se voltar a ficar largo: manter o runtime montado, mas visualmente oculto/inoperável; não fazer logout, limpar cache ou trocar keys. Operações já iniciadas podem terminar e os comportamentos de background existentes continuam. Não prometer tráfego zero após essa transição.
- Para cobrir os portais já existentes, usar um `<dialog>` web de tela inteira em **top layer**, com o informativo, apenas enquanto o acesso está bloqueado. O diálogo não representa um erro nem precisa mudar a rota. Não substituir os seis modais existentes nem depender de seletores internos do React Native Web.
- Nesse gate de política, Escape não revela o app largo: manter o informativo. O guia interno pode fechar normalmente. Navegação do navegador permanece disponível. Ao retornar à largura permitida, fechar o gate e restaurar foco ao controle anterior ainda conectado, ou ao título da tela.
- Esconder o host visual do runtime sem desmontá-lo; o diálogo do aviso é seu irmão, nunca descendente desse host oculto. `showModal()` impede foco/interação nos demais portais. Testar em navegador real que o focus trap do RN Web não rouba foco nem torna o aviso inacessível.
- Feature detection de `showModal` e `matchMedia`: se o navegador não suportar a fronteira necessária, mostrar orientação pública de atualização/uso de navegador compatível, sem erro em branco nem inicialização de sessão. Essa degradação deve ter texto específico, diferente do aviso de largura, e ser registrada no aceite.
- Na variante nativa, `WebViewportGate` apenas retorna os filhos, sem consultar DOM/largura; o provider de instalação é no-op e os controles PWA retornam `null`.

## 5. Mapa de arquivos e contratos

Todos os caminhos abaixo são relativos à raiz do repositório. **Criar** significa arquivo proposto, ainda inexistente. Manter módulos pequenos por responsabilidade; não concentrar feature inteira em `App.tsx` ou `Profile`.

| Operação | Arquivo(s) | Responsabilidade |
| --- | --- | --- |
| Criar | `app/src/features/pwa/pwa.types.ts`, `installBridge.web.ts`, `PwaInstallProvider.tsx`, `PwaInstallProvider.web.tsx` | Contratos, bootstrap adapter, controlador e fallback nativo |
| Criar | `app/src/features/pwa/installGuideContent.ts`, `handoffUrl.ts`, `viewportPolicy.ts` | Conteúdo, URL pública e política única de largura |
| Criar | `app/src/components/WebViewportGate/index.tsx`, `index.web.tsx` | Fallback nativo e fronteira web persistente/top layer |
| Criar | `app/src/components/DesktopAccessNotice/index.web.tsx`, `QrCode.web.tsx`, `styles.web.ts` | Informativo, QR local e estilos com tokens |
| Criar | `app/src/components/PwaInstallPanel/index.tsx`, `index.web.tsx`, `styles.web.ts` | Painel reutilizado no guia público e no Perfil; no-op nativo |
| Criar | `app/src/components/PwaInstallAction/index.tsx`, `index.web.tsx`, `InstallGuideModal.web.tsx` | Entrada pública e guia bottom sheet; no-op nativo |
| Alterar | `app/App.tsx`, `app/public/index.html` | Composição, captura antecipada e fallback `noscript` em português |
| Alterar | `app/src/pages/Auth/index.tsx`, `app/src/pages/Profile/index.tsx` | Entradas discretas e painel de instalação |
| Alterar | `app/src/features/settings/settingsTypes.ts`, `app/src/components/ProfileSettingsModal/index.tsx` | Rota interna `install`, título e linha condicionada pela lista `available` |
| Alterar | `app/package.json`, `app/package-lock.json`, `app/vitest.config.mts` | QR web e resolução de variantes nos testes, sem mascarar testes nativos |
| Criar testes | `app/src/features/pwa/__tests__/installController.test.ts`, `installBootstrap.test.ts`, `handoffUrl.test.ts`, `viewportPolicy.test.ts` | Lógica e fronteiras de browser |
| Criar testes | `app/src/__tests__/webViewportGate.component.test.tsx`, `pwaInstall.component.test.tsx`, `pwaNativeBoundary.test.tsx` | Componentes reais e integração |
| Alterar testes/docs | `web/tests/pwa-build-smoke.mjs`, `web/README.md`, docs03/09/11/13/15/16 | Export, instruções, evidências e limites de validação |

Contratos públicos a implementar:

```ts
type InstallState = 'unavailable' | 'manual' | 'ready' | 'prompting' | 'accepted' | 'confirmed' | 'standalone';
type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'error';
type GuidePlatform = 'ios' | 'android' | 'other';
type PwaInstallContextValue = {
  state: InstallState;
  error: string | null;
  requestInstall(): Promise<InstallOutcome>;
};
// pwa.types.ts também declara DeferredInstallPrompt e a ponte Window.
usePwaInstall(): PwaInstallContextValue;
PwaInstallProvider({ children }: { children: React.ReactNode }): React.ReactNode;
const MOBILE_MAX_WIDTH = 1024;
isAllowedWebWidth(width: number): boolean;
getPublicHandoffUrl(origin: string): string; // raiz HTTP(S), sem credenciais; HTTPS em produção
WebViewportGate({ children, notice }: { children: React.ReactNode; notice: React.ReactNode }): React.ReactNode;
DesktopAccessNotice({ onShowGuide }: { onShowGuide(): void }): React.ReactNode;
PwaInstallPanel({ platform, onPlatformChange }: {
  platform: GuidePlatform; onPlatformChange(value: GuidePlatform): void;
}): React.ReactNode;
PwaInstallAction(): React.ReactNode;
```

`PwaInstallAction` controla seu guia público; o informativo alterna entre orientação inicial e o mesmo painel em sua própria superfície, sem abrir outro diálogo. O Perfil hospeda `PwaInstallPanel` na rota `install`. O contexto não guarda estado de conta, rota, e-mail ou fotos. Tipos das funções/constantes acima são interfaces de planejamento, não um arquivo compilável.

## 6. Implementação em tarefas verificáveis

### Tarefa 1 — Controlador de instalação e captura antecipada

**Arquivos:** módulos `features/pwa` de tipos/ponte/provider, bootstrap em `app/public/index.html` e testes `installController.test.ts`/`installBootstrap.test.ts`.

**Interfaces:** produzir `PwaInstallProvider`, `usePwaInstall`, `PwaInstallContextValue` e ponte descritos na seção 5. Consumir somente APIs públicas do navegador.

- [ ] Escrever testes vermelhos: `captures_prompt_before_provider_mounts` guarda o evento antes do React; `consumes_prompt_once_on_double_click` afirma uma chamada; `dismissed_prompt_requires_new_event` volta ao guia; `prompt_error_keeps_manual_recovery` expõe recuperação sem retry automático; `installed_event_wins_over_late_choice` mantém `confirmed`; `standalone_hides_promotion` cobre media query e fallback iOS.
- [ ] Rodar, em `app`: `npx vitest run src/features/pwa/__tests__/installController.test.ts src/features/pwa/__tests__/installBootstrap.test.ts`. Confirmar falha pelas APIs ainda ausentes, não por configuração quebrada.
- [ ] Implementar o bootstrap e o controlador conforme seção 4. Executar o script real do bootstrap no teste com sandbox/VM ou DOM; não substituir o teste por busca de strings. Limpar assinaturas/listeners do React sem remover a captura pública antecipada.
- [ ] Reexecutar o comando: todos os casos verdes. O prompt deve ocorrer antes de qualquer `await` no handler, com referência consumida e lock síncrono.
- [ ] Revisar diff e registrar commit local da tarefa apenas quando a execução/commits forem autorizados; adicionar caminhos explícitos, nunca `git add .`.

### Tarefa 2 — Política de viewport, informativo e transição de dispositivo

**Arquivos:** `viewportPolicy.ts`, `handoffUrl.ts`, `WebViewportGate/*`, `DesktopAccessNotice/*`, testes de largura/link e `webViewportGate.component.test.tsx`; pacote/lock do QR.

**Interfaces:** consumir `MOBILE_MAX_WIDTH`/`isAllowedWebWidth`, produzir gate com `notice` injetado e informativo com `onShowGuide`. O gate não depende do conteúdo do guia da tarefa 3.

- [ ] Escrever testes vermelhos com asserts explícitos: `isAllowedWebWidth(1024) === true`, `isAllowedWebWidth(1024.5) === false`, `isAllowedWebWidth(1025) === false`, além de 320/768/1440 e valores não finitos negados. Em integração, mudar `matchMedia`, não apenas chamar a função pura.

```ts
expect(isAllowedWebWidth(1024)).toBe(true);
expect(isAllowedWebWidth(1024.5)).toBe(false);
expect(isAllowedWebWidth(1025)).toBe(false);
expect(isAllowedWebWidth(Number.NaN)).toBe(false);
expect(getPublicHandoffUrl('https://example.test')).toBe('https://example.test/');
```

- [ ] Escrever `initial_wide_does_not_mount_runtime`, `resize_preserves_child_state`, `gate_does_not_change_current_url`, `handoff_has_only_public_origin_root` e `copy_failure_keeps_selectable_link`. A URL `https://example.test/auth?token=private#secret` nunca pode aparecer no QR ou texto copiável; usar a origem sanitizada.
- [ ] Rodar, em `app`: `npx vitest run src/features/pwa/__tests__/viewportPolicy.test.ts src/features/pwa/__tests__/handoffUrl.test.ts src/__tests__/webViewportGate.component.test.tsx`; confirmar vermelho pelos comportamentos ausentes.
- [ ] Conferir metadados/licença e fixar a versão de `qrcode-generator`; instalar somente esse pacote na execução. Gerar SVG por matriz `getModuleCount`/`isDark`, sem serviço remoto, `dangerouslySetInnerHTML` ou dependência nativa. Usar correção M, quatro módulos de margem e tamanho definido na seção 3.
- [ ] Implementar notice e gate com medição inicial, subscription/cleanup de media query, montagem persistente e top layer. Testar fallback sem APIs, Escape, retorno de foco, remoção do acionador e React Strict Mode sem `showModal()` duplicado inválido.
- [ ] Reexecutar os testes e inspecionar a leitura real do QR com celular; registrar origem/ambiente público usado sem credenciais. Registrar commit local revisado somente se autorizado.

### Tarefa 3 — Guia e entradas públicas/autenticadas

**Arquivos:** conteúdo/painel/ação/modal PWA da seção 5; Auth, Profile, settingsTypes, ProfileSettingsModal; `pwaInstall.component.test.tsx` e testes existentes de configurações.

**Interfaces:** consumir `usePwaInstall`, `GuidePlatform` e `PwaInstallPanel`. Acrescentar `install` ao tipo `SettingsRoute` e `settingsTitles.install = 'Instalar aplicativo'`; incluir em `available` apenas web. Não alterar o contrato de busy/descarte das configurações.

- [ ] Escrever testes vermelhos: `ready_action_requests_browser_prompt`, `manual_action_opens_guide_without_prompt`, `ios_guide_explains_browser_menu`, `ipad_desktop_identity_can_change_guide`, `guide_closes_and_restores_focus`, `settings_install_uses_same_modal`, `native_has_no_install_menu_entry` e `installed_state_keeps_help_without_install_promotion`.
- [ ] Rodar, em `app`: `npx vitest run src/__tests__/pwaInstall.component.test.tsx src/features/settings/__tests__`; confirmar falhas esperadas sem substituir o modal/painel sob teste por mocks.
- [ ] Implementar conteúdo em português e painel com as três seleções, passos da seção 3 e alternativa textual. Na ação pública, usar `prompt()` somente no estado `ready`; nos demais casos abrir o guia. Recusa não reabre automaticamente o guia/prompt nem muda a rota.
- [ ] Implementar bottom sheet público com DOM exclusivamente web, seguindo tokens/estrutura visual do MatchModal, foco, Escape, backdrop, rolagem e redução de movimento. No Perfil, renderizar o painel diretamente na rota `install`, sem abrir esse sheet.
- [ ] Incluir CTA apenas no landing de Auth e linha em Informações do menu. Respeitar busy e não abrir promoção durante formulários, crop/upload ou solicitação de logout.
- [ ] Reexecutar testes, verificar light/dark e teclado; registrar commit local revisado apenas se autorizado.

### Tarefa 4 — Composição do app e preservação das funcionalidades

**Arquivos:** `app/App.tsx`, aliases pontuais em `app/vitest.config.mts`, `webViewportGate.component.test.tsx`, `pwaNativeBoundary.test.tsx` e testes de integração da tarefa 3.

**Interfaces:** consumir provider, gate e componentes das tarefas anteriores; manter os contratos atuais de SessionProvider/QueryClient/Routes. Imports compartilhados resolvem para variantes `.web` apenas no web.

- [ ] Escrever teste vermelho `wide_boot_never_starts_session_or_socket` usando spy na fronteira de inicialização. Escrever `narrow_wide_narrow_keeps_form_and_upload_result`: digitar um valor, iniciar uma promessa controlada, ampliar, concluir a promessa, reduzir e conferir valor/resultado sem remontar a sessão.
- [ ] Escrever `gate_covers_existing_modal_portals`: abrir um modal real do app, ampliar e conferir aviso/foco/interação; reduzir e verificar conteúdo preservado. Cobrir ao menos configurações/crop e match; a confirmação de top layer/inert deve ocorrer também em browser real na tarefa 5, não só no jsdom.
- [ ] Escrever `native_boundary_is_passthrough_without_window`: importar variantes nativas explicitamente, testar filhos mantidos e CTA ausente com DOM indisponível. Evitar alias global que torne esse teste uma verificação da implementação web por acidente.
- [ ] Rodar, em `app`: `npx vitest run src/__tests__/webViewportGate.component.test.tsx src/__tests__/pwaNativeBoundary.test.tsx src/__tests__/pwaInstall.component.test.tsx`; confirmar vermelho nas novas integrações.
- [ ] Integrar conforme seção 4, sem recriar QueryClient/SessionProvider ao redimensionar. Colocar provider público acima da espera das fontes e o gate antes da primeira montagem da sessão. Preservar o tema público e o status bar nativo.
- [ ] Reexecutar testes e `npm run typecheck`; todos verdes. Verificar retorno ao deep link sem redirecionamento para a primeira tela. Registrar commit local revisado somente se autorizado.

### Tarefa 5 — Export, QA de navegador, documentação e entrega

**Arquivos:** `web/tests/pwa-build-smoke.mjs`, `web/README.md`, docs03/09/11/13/15/16 e registro de execução a criar em `plans/plan-012-acesso-mobile-tablet-instalacao-pwa-execucao.md`.

**Interfaces:** consumir o export `app/dist` e os scripts existentes. Não alterar Caddy/service worker por conveniência; mudanças nesses arquivos exigem uma necessidade demonstrada e teste específico de segurança.

- [ ] Estender primeiro o smoke para executar a captura antecipada e conferir sua presença funcional no HTML exportado. Manter asserts de viewport/zoom permitido, manifest, dimensões de ícones e cache público sem dados autenticados.
- [ ] Rodar `npm run test:pwa`, em `app`, contra export anterior e confirmar a falha esperada do novo requisito. Não confundir diretório `dist` ausente com teste vermelho da feature.
- [ ] Ajustar export/HTML somente no necessário, incluindo `noscript` útil em português. Revalidar que manifest mantém identidade e que ícones existentes são legíveis; não gerar novas artes ou mudar assets sem necessidade.
- [ ] Rodar, em `app`: `npm test -- --run`, `npm run typecheck`, `npm run build:web` e `npm run test:pwa`. Fazer também `npx expo export --platform ios --output-dir dist-ios-qa` e `npx expo export --platform android --output-dir dist-android-qa` para verificar que DOM/QR não quebram o bundle nativo; são verificações de build, não aceite físico.
- [ ] Em servidor local com o export e navegador real, executar a matriz da seção 7, inclusive portais reais, teclado/zoom, histórico/deep links, clipboard negado e standalone. Se a ferramenta de automação não conseguir redimensionar/instalar, registrar a limitação e pedir o teste manual correspondente; não simular sucesso.
- [ ] Atualizar documentação e registro com comandos, resultados, versões dos navegadores, screenshots sem dados privados e pendências físicas. Não marcar teste de instalação nativa do navegador como concluído só por disparar evento sintético.
- [ ] Solicitar revisão final independente do diff completo, corrigir achados e repetir os testes afetados. `git diff --check` deve passar. Separar arquivos gerados de código; não incluir `.env`, `dist*`, fotos, executáveis, seeds ou artefatos de outros projetos.
- [ ] Entregar resumo do estado local e pedir autorização específica para integrar/push/publicar, se ainda não concedida. Este planejamento não autoriza publicação.

## 7. Matriz de aceite e publicação posterior

| Cenário | Critério observável |
| --- | --- |
| 320, 375, 414, 768 e 1024 CSS px | App acessível; sem overflow horizontal; CTA discreto e controles fora da ilha/home indicator |
| 1025, 1280 e 1440 CSS px | Informativo com QR/link; primeiro acesso sem boot de sessão ou socket |
| Tablet retrato/paisagem, inclusive 1366 px | Regra segue largura, não user agent; nenhuma promessa de acesso em paisagem larga |
| 1024 → 1025 → 1024, modal e upload abertos | Sem perda de formulário, foto/crop ou conclusão do upload; nenhum portal clicável/focável sobre o informativo |
| Chrome/Edge Android com evento real | Clique abre confirmação do navegador; uma chamada por evento; recusa respeitada |
| iPhone/iPad em Safari e PWA instalada | Guia corresponde ao sistema disponível; abertura instalada oculta promoção; safe areas corretas |
| Navegador sem evento e navegador interno | Guia continua acessível; sem botão falso ou redirecionamento forçado |
| Deep link autenticado, usuário deslogado e sessão expirada | Informativo não revela conteúdo privado; ao reduzir, guards e navegação existentes permanecem corretos |
| QR/link com query/hash sensível e clipboard negado | Somente raiz pública é codificada/copiável; alternativa de cópia disponível |
| Zoom 200%, texto ampliado, teclado, VoiceOver e reduced motion | Conteúdo reflow/rolável, foco visível/contido e instruções disponíveis sem depender de QR ou animação |
| Offline e service worker atualizado | Fallback honesto; nenhuma API, sessão ou mídia privada adicionada ao cache |
| Expo iOS/Android | Sem gate desktop, sem CTA PWA e sem regressão das funcionalidades existentes |

O navegador controla a elegibilidade e a interface final de instalação. Testes de eventos verificam a lógica; instalar e abrir no aparelho é um aceite separado. Uma janela comum também pode não informar que há uma instalação em outro contexto.

Depois de autorização para publicar: integrar somente arquivos da tarefa, verificar SHA remoto, acompanhar o deploy do serviço web e testar a URL HTTPS pública em desktop/mobile. Não alterar o serviço API ou PostgreSQL. A publicação não deve ser declarada concluída apenas pelo push.

Rollback: reverter os commits específicos desta feature e reconstruir/republicar o frontend, preservando manifest/identidade e política de cache. Não exige migração de banco, limpeza de bucket, mudança de credenciais ou logout global. Conferir atualização dos assets antes de atribuir diferenças à PWA instalada.

## 8. Autorrevisão e limites desta entrega

- Os requisitos do pedido estão mapeados: informativo/largura nas tarefas 2/4; instalação direta possível e guia na 1/3; identidade, safe areas e testes na 3/5; pesquisa e documentação nas seções 1/2.
- Os cinco riscos do foco de revisão possuem testes atribuídos nas tarefas correspondentes.
- O critério confirmado é largura, não bloqueio real de dispositivos desktop. O limite inclusivo é o mesmo nos textos, interfaces e testes.
- A experiência iOS não promete contornar restrições do navegador. Instalação opcional, aceitação do prompt e instalação confirmada são estados diferentes.
- Preservação de runtime não equivale a suspensão completa de rede. Top layer/foco e instalação física permanecem critérios de validação, não resultados desta fase.
- Nenhuma funcionalidade foi implementada/testada neste planejamento. Não foram alterados serviços, dependências ou configuração de produção.

**Handoff recomendado:** execução nativa/sequencial na mesma sessão, com revisão independente ao final, porque o controlador, o gate e os pontos de entrada compartilham interfaces e ciclo de vida. Revisar o plano e confirmar o método antes de iniciar a implementação.
