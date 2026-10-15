# Execução — plano 012: acesso mobile/tablet e instalação PWA

**Data:** 15/10/2026. **Branch:** `codex/mobile-pwa-access`. **Base:** `a79829c3509e04b5f94d282196f61b8ade7adbb9`.

Implementação local do [plano](./plan-012-acesso-mobile-tablet-instalacao-pwa.md), sem merge, push ou publicação. Atualização de evidências finais/revisão em andamento.

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

**Revisão independente e verificação final:** pendentes de registro abaixo antes da entrega.
