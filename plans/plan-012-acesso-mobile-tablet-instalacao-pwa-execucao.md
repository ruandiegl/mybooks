# Execução — plano 012: acesso mobile/tablet e instalação PWA

**Data:** 15/10/2026. **Branch:** `codex/mobile-pwa-access`. **Base:** `a79829c3509e04b5f94d282196f61b8ade7adbb9`.

Implementação local do [plano](./plan-012-acesso-mobile-tablet-instalacao-pwa.md) concluída, sem merge, push ou publicação. Revisão independente realizada e ambos os achados corrigidos em uma rodada de TDD; aceites em aparelhos continuam separados.

## Entregas

- Web até 1024 CSS px inclusive; informativo em janelas maiores, inclusive tablets largos. Desktop estreito permitido, conforme escolha confirmada.
- QR local/link da raiz da origem; sem credenciais, rota privada, query ou hash e sem login transferido entre dispositivos.
- Prompt do navegador apenas por ação explícita e uma vez por evento; guia manual em Auth e menu do Perfil. Não contorna o menu de instalação no iOS.
- Guia público bottom sheet com tokens atuais, header/fechamento alcançáveis e seleção de plataforma; no Perfil, conteúdo no modal existente.
- Runtime não monta no primeiro acesso largo. Depois de entrar em viewport permitido, não é destruído ao ampliar: preserva formulários, uploads já iniciados e modais. Não promete suspender todo tráfego de background.
- Variantes Expo são no-op/passthrough. API, banco, R2, proxy e regras do service worker não foram alterados.

## Evidências e TDD

| Etapa | Evidência |
| --- | --- |
| Base | 78 arquivos / 399 testes passaram; warnings RN Web de depreciação já existiam |
| Controlador | Bootstrap ausente observado vermelho; controlador/ponte novos; 8 testes verdes e suíte 407/407 |
| Viewport/QR | Módulos ausentes observados vermelhos; 17 casos verdes, typecheck passou |
| Guia/menu | Componentes ausentes observados vermelhos; 32 testes de guia/configurações verdes |
| Integração | App real inicialmente montava sessão largo e não tinha CTA/gate: 3 falhas; depois 41 testes verdes nos grupos App/guia/native/gate/settings |
| Suíte anterior aos refinamentos finais | 86 arquivos / 434 testes passaram; typecheck e smoke PWA passaram |
| Browser real | Chrome headless: 320/375/414/768/1024/1025/1280/1440, nenhum boot de API inicialmente largo, rascunho preservado, guia modal, light/dark/reduced motion, nenhum erro JS |
| Portais reais | Fixture com ProfileSettingsModal/MatchModal reais; gate em top layer conteve foco, impediu foco no input do portal e preservou rascunho/modal após retorno |
| Correções encontradas em QA | Teste Chrome reproduziu header fora da área visível: sticky header/foco sem scroll corrigiram; testes também reproduziram retorno de foco e erro antigo após confirmação; refinamentos verificados na rodada final |
| Exports nativos | iOS e Android gerados com sucesso; não equivalem a teste em Expo Go/aparelho |

Comandos principais: `npm test -- --reporter=dot`, `npm run typecheck`, `npm run build:web`, `npm run test:pwa` em `app`; exports iOS/Android em diretórios de QA; browser smoke e servidores locais descritos em [web/README](../web/README.md). Não foram usados login real, API Railway ou banco para o QA.

## Decisões registradas

| Decisão / motivo | Custo se inadequada |
| --- | --- |
| Branch no checkout atual, respeitando preferência já declarada e preservando untracked | Pode ser necessário transferir para worktree se o usuário preferir depois |
| Ledger/briefs manuais: scripts Bash da skill só reconhecem `Task`, mas o plano usa `Tarefa` | Mais cuidado no registro manual de progresso |
| `WebExperience` como fronteira native/web de composição | Um pequeno módulo adicional para manter, evitando DOM no bundle nativo |
| Landing rolável para não cortar a nova ação em telas baixas/texto ampliado | Pequena mudança de rolagem em telas nativas baixas, sem mudar ações ou design |
| Auto-review recusou adicionar tipos via outro pacote; declaração restrita às APIs ReactDOM usadas nos testes | Manutenção de duas assinaturas de teste; nenhuma nova dependência além do QR |
| Painel reutilizado permite suprimir instalação direta no guia largo | Um parâmetro opcional de apresentação para manter; evita oferecer instalar neste computador |

Não houve execução de `audit fix`, atualização do Expo, mudanças de credenciais ou ampliação de cache. O npm reportou 30 advisories no grafo (11 moderados/18 altos/1 crítico), sem advisory para o QR; o diff de dependências só acrescenta `qrcode-generator@2.0.4` (MIT).

## Limites, revisão e entrega

- O navegador integrado falhou duas vezes antes de abrir, com erro de inicialização/volume Z (1326); QA foi feito em Chrome instalado, via Playwright já disponível. Não foi instalado outro navegador ou pacote de automação.
- Instalação real no Android e iPhone/iPad, safe areas, VoiceOver/texto ampliado físico e leitura do QR da origem pública final permanecem pendentes. Eventos sintéticos e Chrome desktop não aprovam esses itens.
- O aceite de top layer é real no Chrome; Safari físico continua pendente. `showModal`/`matchMedia` ausentes mostram orientação pública de atualização do navegador, sem iniciar sessão.
- Produção e SHA servido não foram verificados; nenhum push/deploy foi feito. A integração/publicação precisa de autorização.
- Artefatos de build nativo/QA desta execução não serão incluídos no Git; os arquivos locais preexistentes do usuário ficam preservados.

## Revisão independente e verificação final

Revisor Dewey, somente leitura, sobre `a79829c..2048c9e`. Sem achados críticos. Foram encontrados:

1. **Importante:** Escape no aviso alcançava o `keyup` global do Modal RN Web e podia fechar configurações/match ou cancelar recorte. Chrome reproduziu o fechamento indevido (`0 !== 1`). O gate agora contém `keydown` e `keyup` de Escape; o browser smoke confirma configurações, estado de recorte do host e match preservados após Escape e redimensionamento.
2. **Foco:** o revisor classificou como menor o fallback para título sem `tabindex`; foi reclassificado como importante pelo efeito em teclado/leitor de tela e pelo contrato do plano. Dois casos foram observados vermelhos, com campo removido e desabilitado. O título recebe `tabindex=-1` quando necessário; a recuperação verifica o foco e recorre ao host se o alvo não puder recebê-lo.

Ambos foram corrigidos em uma única rodada, com testes vermelho → verde. Não houve segunda revisão; a verificação das correções foi feita pelos testes. Nenhuma sugestão menor ficou adiada.

O revisor separou três comportamentos; as decisões do executor são:

| Decisão sobre item separado da revisão | Limite / custo residual |
| --- | --- |
| Instalação física, Safari/VoiceOver e safe areas permanecem aceite manual | Chrome não exclui defeitos específicos de aparelho |
| Deploy/SHA de produção não foram julgados, porque não houve publicação autorizada | A origem publicada ainda precisará de verificação após deploy |
| Não suspender toda a rede ao ampliar; preservar runtime segue a especificação | O gate é de UX e operações de background existentes podem continuar |

Verificação final na árvore corrigida:

- **87 arquivos / 442 testes passaram** (`npm test -- --reporter=dot`); somente depreciações RN Web já existentes.
- **TypeScript passou**, export web e smoke PWA passaram, mantendo o bypass de API/R2 privados.
- **Chrome headless passou** com os servidores de QA versionados, oito larguras, guia/cabeçalho, foco, formulário e portais; regressão de Escape cobre configurações, modo de recorte do host e MatchModal. Ícones/insets/status bar são as únicas fronteiras de SO substituídas nessa fixture, não as implementações dos modais.
- **iOS e Android exportaram** nesta execução. Os últimos ajustes são exclusivamente web/testes; isso não atesta funcionamento em aparelho.
- **`git diff --check` passou.** Dependências alteradas: somente `qrcode-generator@2.0.4`; sem atualização de SDK/transitivas.

Os builds `app/dist-ios-qa`/`app/dist-android-qa` e a pasta temporária exclusiva do plano foram removidos após a validação; podem ser recriados pelos comandos de export/QA. Os servidores locais da tarefa foram encerrados. Permaneceram intactos os três arquivos locais preexistentes (seed SQL e duas cópias históricas de planos). O export `app/dist`, já ignorado pelo projeto, foi preservado.

**Entrega:** branch local pronta para a decisão de integração. Não houve merge em `main`, push, deploy ou modificação em Railway/R2/PostgreSQL.
