# Plano 013 — Registro de execução

**Data:** 16/10/2026. **Branch:** `codex/web-icons-splash`. **Base:** `16bc2c8`.
**Estado:** implementação local e validação final em andamento; revisão independente pendente. Não integrado/publicado.

## Entrega

- Símbolo oficial Material Icons `auto_stories`, escolhido pelo usuário; vetor/proporções preservados, cores da paleta existente e licença Apache-2.0 incluída.
- Favicon Expo 48, ICO exportado com tamanhos pequenos, Apple touch icon 180, ícones PWA 192/512 e maskable 512 separado. Ícone do launcher nativo não alterado.
- Splash PNG nativa clara/escura e HTML antecipado com a mesma identidade. A marca usa arquivos locais, nunca R2/API/fontes externas para aparecer.
- `BootSplash` sem duração mínima ou animação. Handoff idempotente, imagem/fallback e primeiro frame; no nativo também aguarda layout. Não aguarda API para esconder a superfície do SO.
- Fontes/tema pendentes mostram marca em vez de branco. Erro local/8 s oferece recuperação; sessão lenta/10 s só informa, sem outro refresh/logout; bundle ausente/15 s mostra reload no HTML. Prazos são de feedback, não atrasos artificiais.
- Gate 1024/1025, captura antecipada de instalação, deep links, draft, runtime e política de cache privado preservados. Assets públicos `/brand/*` revalidam no Caddy.

## Evidências

| Verificação | Resultado / limite |
| --- | --- |
| Baseline app | 87 arquivos / 442 testes passaram antes da implementação |
| Assets, Node | 7 testes passaram; dimensões/pixels/alpha, zona circular maskable e referências reais |
| RED → GREEN HTML | 9 regressões observadas falhando sem a superfície/bridge; passaram após implementação |
| RED → GREEN App | 4 falhas reais de hidratação/primeiro frame/draft/erro observadas e corrigidas |
| Ponte/primeiro frame | Testes de retenção, erros, Strict Mode, layout nativo, imagem falha e cancelamento |
| Foco de recuperação | Regressão observada em RED (borda 0), corrigida e GREEN; borda reservada evita layout shift |
| App após integração inicial | 94 arquivos / 473 testes; TypeScript, export web/PWA, bundles Hermes Android/iOS passaram |
| Chrome local | Bundle atrasado, watchdog/reload real preservando URL, temas, imagem/fontes recusadas, sete larguras 320–1440, paisagem, tema salvo oposto ao sistema; zero pageerrors |
| PWA QA preexistente | Oito viewports, instalação/guia, foco, formulário mantido em resize e redução de movimento passaram |

Rodada final, revisão e eventuais fixes serão registrados abaixo. Os resultados acima não comprovam Safari, PWA instalada, hardware nativo ou deploy.

### Verificação pré-revisão da árvore final

- App: **94 arquivos / 474 testes passaram**; TypeScript passou.
- Build Web e smoke PWA comportamental passaram, incluindo bypass de API/R2 no worker real e bootstrap antecipado de instalação.
- Exports Hermes Android e iOS repetidos e aprovados após o foco de recuperação; somente bundles, sem APK/IPA ou envio EAS.
- QA Chrome repetido: fonte pendente por 8 s mostrou o erro e avançou quando o download terminou; foco no botão visível; quatro máscaras de ícone conferidas visualmente. Zero pageerrors. Amostras locais finais 225 ms fria / 102 ms reload, sem alegação de melhoria contra baseline.
- `git diff --check`, teste Node dos 7 assets e links dos dois registros passaram.

Comandos principais: `node --test web/tests/brand-assets.test.mjs` na raiz; em `app/`, `npm test -- --reporter=dot`, `npm run typecheck`, `npm run build:web`, `npm run test:pwa`, `npx expo config --type public` e exports `--platform android/ios` para diretórios QA isolados.

QA de navegador: `node web/tests/serve-pwa-qa.mjs`, depois `node web/tests/pwa-boot-browser-smoke.cjs` e `node web/tests/pwa-browser-smoke.cjs`, com `PWA_PLAYWRIGHT_MODULE` apontando para Playwright já instalado. Nenhum navegador/pacote foi instalado. API/sessão são fictícias em loopback; nenhuma conta, senha ou foto pessoal foi usada.

Assets públicos medidos: SVGs 422 bytes; ícones PNG 1.954–6.659 bytes, todos abaixo dos orçamentos do plano. Uma amostra local inicial de abertura foi 225 ms fria / 101 ms reload. Não é comparação antes/depois, percentil ou medição de produção.

## Decisões de execução e custos

1. Branch no checkout atual, respeitando preferência anterior; preserva Expo/node_modules. Se inadequado, muda-se o local do checkout, sem impacto publicado.
2. A restrição “somente planejamento” do documento descreve a etapa anterior; o pedido de execução autoriza código/commits locais, não merge/push/deploy. Custo de interpretação: alterações locais reversíveis.
3. Marcadores dos títulos convertidos para `Task N` para os helpers extraírem os briefs; restante em português. Custo: nomenclatura documental apenas.
4. Reutilizar o livro escolhido, sem um novo gate de redesign; conferir exports visualmente. Custo: eventual ajuste de assets antes da integração.
5. `/brand/*` acrescentado ao matcher `no-cache` de metadados públicos. Custo: revalidação de um SVG público; nenhum cache privado ampliado.
6. Abertura sem animação, opção permitida no plano. Custo: eventual refinamento visual futuro, sem dependência de movimento.
7. `BootMark` por plataforma e `useLaunchPresentation` isolam imagem DOM/layout nativo. Custo: pequenos adaptadores e cuidado com timing, cobertos por testes/QA.
8. Retenção importada na tarefa 4 junto do host que libera, não no commit intermediário da tarefa 3. Evita congelar um build intermediário; custo: mudança de sequência apenas.
9. Não há benchmark anterior à feature preservado; medir frio/reload atual sem atribuir ganho ou p95. Custo: comparação de performance antes/depois permanece pendente.
10. Caddy não está disponível no PATH: não baixar executável nem alterar o sistema para esse ensaio. Smoke de headers/proxy real fica pendente; matcher pequeno é revisado e os erros 404 exercitados no servidor QA.

## Limites de aceite e publicação

- Não houve mudança de API, schema, banco, R2, segredos, permissões, cookies, locks ou regra de sessão. Nenhum pacote foi adicionado ou atualizado; advisories anteriores não foram corrigidos fora de escopo.
- Expo Go/dev-client não aprovam a splash final. É necessário novo binário preview/release, instalação física e teste de abrir/reabrir em Android/iOS.
- A PWA pode receber abertura e atualização de ícone controladas pelo navegador/SO. Validar no Safari/PWA de iPhone/iPad e Chrome Android, incluindo notch/home indicator, VoiceOver/TalkBack e zoom físico. Não prometer aparência idêntica entre sistemas.
- O tema nativo de pré-JS segue o SO; preferência salva é aplicada depois de hidratada. A identidade do manifest não mudou; não limpar cookies/cache do usuário para forçar ícone novo.
- Publicação requer autorização posterior, SHA da main e confirmação do deploy/arquivos servidos. Push não equivale a deploy aceito.
- Três arquivos locais preexistentes permanecem fora dos commits: seed SQL e rascunhos locais dos planos 008/011.

## Revisão final

Pendente da avaliação independente da branch. Nada neste registro declara aceite físico ou produção pronta.
