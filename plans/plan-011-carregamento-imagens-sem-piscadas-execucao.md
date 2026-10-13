# Execução do plano011 — continuidade de imagens

Data: 09/10/2026. Branch: `codex/media-image-continuity`, base `bbca847`. Worktree existente reutilizada; checkout Expo e WIP do menu preservados. Sem merge/push/deploy ou operação R2 autorizados.

## Progresso

- Tarefa1: concluída — identidade por foto/versão/sujeito/epoch, DTO coverImageId compatível.
- Tarefa2: concluída — reducer e adapters Web/nativo; cache memory e retry com retenção do frame.
- Tarefa3: concluída — consumidores e gestos integrados, testes reais de continuidade e provider cobertos.
- Tarefa4: concluída — próximos2 livros, até4 recursos/2 simultâneos/24 metadados; foco/background/epoch e validade rechecados.
- Tarefa5: validação automatizada e revisão/fix concluídos localmente; aceite físico e publicação pendentes de autorização/dispositivo.

## Decisões de execução

- Ruling: achado de slot vazio regraduado de Minor para Important — retornar rapidamente a foto1 acontece no feed reciclado e contraria o fallback estável; custo: reset de prontidão por identidade, sem reset por assinatura.
- Ruling: proteger respostas de sessão também no transporte/provider, não só na imagem — oito RED mostraram A sobrescrevendo B e writes SecureStore fora de ordem; custo: gravações locais serializadas e respostas supersedidas descartadas. Nenhum endpoint, segredo, regra de permissão ou migração foi alterado.
- Ruling: Biblioteca usa o callback coalescido sem segundo timer; seu polling/buffer20s existente é preservado — custo: parâmetro periodic adicional no hook. RetryToken só avança em ações explícitas, não em refetch comum.
- Ruling: revisão herda o modelo configurado, porque a ferramenta não permite override sem pedido explícito — custo: não prometer modelo diferente/mais caro.
- Ruling: navegador integrado falhou duas vezes; usar Edge headless já instalado com perfil temporário — custo: não equivale a Safari/PWA instalada/iPhone. Middleware da fixture foi corrigido antes do benchmark; não se alterou produção para esconder falha de setup.

- Ruling: fila pura em mediaPrefetchQueue com bridges separados e shim de resolução nativa — permite testar o agendamento real sem simular a lógica; custo: dois arquivos auxiliares. Contadores diagnósticos expõem só números.
- Ruling: não limpar o cache global do loader em logout/troca — referências/metadados próprios são descartados por scope, sem apagar o cache da conta seguinte; custo: bitmaps podem permanecer no cache de memória gerido pelo SDK/SO, sem garantia de apagamento seguro total. Nada é persistido pelo app/worker.
- Ruling: limpar QueryClient ao estabelecer nova geração após aceitar a sessão — reprodução mostrou cache privado da conta anterior ainda disponível; custo: cache frio em novo login, não em renovação comum. Nenhuma regra/token/endpoint de autenticação foi alterado.
- Ruling: hooks de renovação existentes já coalescem erros e preservam buffers/cooldowns — mantidos, em vez de duplicar timers; custo: coordenação continua por query proprietária. Queued grants são rechecados antes do GET.
- Ruling: prefetch por URI não fornece limite de dimensões de decode — buckets são informação de apresentação, não promessa de teto de RAM/bytes; custo: originais grandes continuam custando recursos, derivados permanecem fora do escopo.

- Ruling: passar MediaBinding das views aos componentes puros, sem segundo contexto de sessão — evita acoplamento de Avatar/BookPhoto a providers; custo: prop adicional. Bindings ausentes/sujeito desconhecido exibem fallback seguro. Vitest resolve o adapter Web; teste nativo importa index explicitamente. Custo: manter essa configuração de testes ao mudar resolução de plataforma.
- Ruling: Chat não renderiza Avatar nesta base e ProfileEditForm pertence ao menu ainda local — não criar superfícies fictícias nem incorporar WIP; custo: integração com menu deverá adaptar seu AvatarPicker depois.
- Ruling: testes antigos esperavam trocar a URI na mesma versão — agora verificam conservação do frame e troca com versão incrementada. Erros de imagem de teste são assíncronos como a fronteira real; custo: fixtures precisam modelar decode/load, não só RN Image. URL vencida não dispara novo GET e pede renovação; decode pendente não é tratado como pixels prontos.

- Ruling: usar hook interno useMediaDisplay nos dois adapters — coordenação de actor/identidade/retry única; custo: um arquivo adicional. Expo CLI instalou57.0.5 mas não escreveu config dinâmica; plugin registrado em app.json após check RED, confirmado GREEN. Sem upgrade geral;30 alertas npm preexistentes mantidos.

- Ruling: executar sobre a main limpa na worktree existente, não sobre o WIP do menu — evita publicar alterações alheias; custo: testar integração com menu separadamente depois. ProfileEditForm só será adaptado se existir nesta base; AvatarPicker e onboarding existentes serão cobertos.
- Pre-flight1→2→3: MediaDescriptor/MediaScope e identidade lógica são compartilhados; adaptar SessionScope com userId indefinido para null, sem modificar seu contrato.
- Pre-flight1→4: antecipação usa a URI completa com política memory; não usar cacheKey divergente da URI.
- Pre-flight2→3: retry explícito muda tentativa, assinatura renovada não muda identidade; manter gates/keys legítimas.
- Pre-flight3→4→5: descarte por scope/foco e validações de sessão são obrigatórios; aceite físico não pode ser simulado por export.

## Validação

Baseline: app48/246 aprovados; API43/267 aprovados,4 suites/12 condicionais pulados. Tarefa1 RED observado (módulo de identidade ausente e cinco falhas no DTO); GREEN focado5/5 identidade e10/10 likes. Suítes finais da etapa: app49/251 e API43/268 aprovados,12 condicionais pulados; tipos e lint aprovados. Hardware/Safari/PWA instalada são aceites separados.

Tarefa2: RED de módulos ausentes; adicional RED real de callback da ponte duplicado (2 em vez de1), corrigido com settle por tentativa. Renderer Web real usa nós HTML decodificados, preparações adiadas e actor trocado; teste nativo simula somente a ponte externa. Tipos e21 testes focados do módulo aprovados; exportsWeb/iOS concluídos. Sem execução física nem resultado de rede R2 real.

Tarefa3: quatro RED em consumidores reais (Biblioteca, Curtidas, galeria e avatar), depois GREEN. Descobrir: controle negativo recolocou somente key antiga e falhou ao trocar o nó/signature1→21; removida, GREEN com mesmo nó e URI através das20 renovações. Provider real rejeita decode concluído na conta seguinte. Ampliação mantém um único rótulo de imagem; callout é opt-in. Suíte antes do último ajuste de pixels:54 arquivos/274 testes e tipos aprovados; repetir para fechar.

Fechamento tarefa3:54 arquivos/275 testes e tipos aprovados. Tarefa4: RED de fila ausente/cache de A preservado em B; falhas adicionais de label/fit, fade em retry, epoch e background reproduzidas, corrigidas com GREEN. Suíte final57 arquivos/291 testes; tipos aprovados. Fonte instalada do SDK confirma onDisplay após atribuir/configurar a imagem no iOS/Android, sem condição de alpha do wrapper; isso não equivale a teste físico.

## Revisão independente e rodada de correção

Ptolemy revisou bbca847…39556c5 somente leitura, sem subagentes próprios ou operações externas. Nenhum Critical comprovado; três Important: refresh antigo substituindo/limpando sessão nova; capa sem callback de renovação; atualização explícita sem retry da mesmaURI. Um Minor foi regraduado para Important pelo efeito real: foto1→foto2 pendente→foto1 podia ficar sem pixels nem fallback.

Todos entraram na única rodada de fix: provider e transportes descartam refresh supersedido; writes nativos são serializados; erro/expiração da capa chegam à query proprietária; retry explícito percorre Avatar/Picker/modal e cards/views; prontidão é invalidada na troca de identidade. Oito RED de sessão/transporte e três RED de consumidores foram observados, depois GREEN; timer duplicado também RED→GREEN. Suíte completa final58 arquivos/303 testes, tipos aprovados. Não houve segunda revisão; a correção é comprovada por regressões e suite verde, não por um novo parecer do reviewer.

## Ensaio de navegador

Edge headless,375×812 e812×375, perfil descartável, servidor127.0.0.1 e SVGs sintéticos de300 bytes, Cache-Control:no-store. Componentes reais Avatar/RemoteMediaImage. Para cada latência50/250/1000ms,20 renovações em duas imagens:

| Configuração | Downloads adicionais | Bytes adicionais | Nós preservados | Amostras de slot vazio (16ms) |
| --- | --- | --- | --- | --- |
| Controle negativo key=URL,50ms |40|12000|não|69|
| Continuidade,50ms |0|0|sim|0|
| Controle negativo key=URL,250ms |40|12000|não|117|
| Continuidade,250ms |0|0|sim|0|
| Controle negativo key=URL,1000ms |40|12000|não|448|
| Continuidade,1000ms |0|0|sim|0|

Na versão final repetida: zero pageerrors, sem overflow horizontal em landscape, somente imagens de B após troca de actor. As amostras são observações DOM, não contagem de frames GPU/FPS. O controle negativo reproduz a key antiga, não é o app antigo completo. Esses números medem renovações das fixtures, não ganho percentual, RAM, payload frio de fotos reais ou p50/p95 em aparelhos. Nenhuma foto pessoal, conta, R2/API Railway foi usada.

Builds Web/worker/smoke e exportsHermes iOS/Android foram repetidos após os fixes e concluíram com êxito. API43 arquivos/268 testes aprovados,4 suites/12 condicionais pulados e lint aprovado. Smoke executa o worker: API/R2 bypass, ativo público correto, resposta assinada network-only e zero escrita de runtime no cache.

## Limites julgados e aceite externo

- Hardware iOS/Android, Safari/PWA instalada, câmera/galeria, háptico, VoiceOver/TalkBack e Dynamic Type: pendentes; custo se houver diferença de plataforma: ajustar antes da liberação efetiva.
- RAM/benefício de prefetch e p50/p95 de payload real: não medidos; teste sintético não substitui dispositivos/fotos grandes. Derivados continuam outra tarefa; custo: não prometer teto/ganho de memória.
- Headers/cache HTTP do SO/browser, apagamento seguro e bucket real: não operados; custo: manter a limitação de cache global declarada.
- API/R2/DB/Railway, contas, secrets, seed, TTL/CORS, schema, infraestrutura e upgrades gerais: sem operações; custo: API com coverImageId deve ser publicada antes do cliente quando autorizado, sem migração nova.
- Menu/WIP principal, ProfileEditForm e Chat sem Avatar nesta base: não incorporados; custo: integração posterior deve adaptar o formulário/tema sem perder WIP.
- Documentação/builds finais não foram congelados pelo reviewer: conferidos pelo implementador; custo: não atribuir a ele testes/revisão que não fez.
- O arquivo de revisão se chama review-bbca847..39556c5.diff, não literalmente review-package; o reviewer usou diff Git e ledger; custo: nenhum parecer de pacote inexistente é alegado.
- Não há Minors adiados do parecer: o único foi regraduado e corrigido. Alertas npm30 e warnings de estilo herdados não foram tratados como regressão desta tarefa.

## Entrega

Implementação permanece na branch isolada. Main/origin, Metro do checkout principal e PWA pública não foram atualizados por esta execução. A integração/push/deploy requerem escolha do usuário; nenhum APK/IPA/EAS update foi enviado. Preservar a worktree para essa decisão; remover somente helpers/logs/exports de teste criados por esta tarefa, depois de registrar evidências e commits.

## Continuação — 13/10/2026

Branch candidata `codex/media-profile-integration`, combinando a entrega011 (`0dc8c2f`) e os commits registrados do menu (`8762fa9`). O checkout principal permanece em `codex/profile-settings`, com seu WIP de segurança/realtime e arquivos pessoais intactos; eles não foram absorvidos silenciosamente. Main/origin, Metro e Railway não foram alterados.

- Conflitos resolvidos combinando estilos reativos com o renderer estável; menu/tema, atores de sessão e descarte por geração preservados. SecureStore mantém serialização; erros transitórios continuam distintos de401. Documentação dos dois planos preservada.
- Formulário de edição agora recebe `MediaBinding`, ID do usuário, retry explícito e callback proprietário de renovação via AvatarPicker. Dois testes novos falharam antes da correção (sem imagem e sem renovação no editor), depois passaram com componentes/hooks reais. Vinte assinaturas e mudança de tema mantêm o mesmo nó/URI e o texto não salvo.
- Validação da candidata: app75 arquivos/349 testes e typecheck aprovados; API47 arquivos/285 testes,6 suites/24 testes condicionais pulados, lint e Prisma generate aprovados. Aumento dos skips decorre das integrações PostgreSQL do menu; nenhum PostgreSQL ou R2 real foi operado nesta continuação. Não confundir skips com aprovação de migração.
- Export Web/worker e smoke PWA aprovados, incluindo bypass de mídia privada. Exports nativos, ensaio browser e revisão de integração estão registrados no fechamento abaixo.
- Ruling: complementar a entrega em branch candidata separada — conserva as branches originais e o WIP; custo: entrega ao checkout Expo/main ainda exige escolha de integração e validação desse WIP.
- Ruling: o plano original passa a apontar o estado real no registro de execução, sem marcar aceites físicos não realizados — custo: as caixas do roteiro não constituem uma segunda fonte de status.

Pendências externas continuam explícitas: iPhone/Android/Safari/PWA instalada, sensores/assistivas, fotos reais/RAM/p50/p95 e publicação. Integrar o menu na principal também inclui sua migração aditiva de preferências, cuja aplicação no banco alvo exige autorização específica; plano011 sozinho não cria migração.

### Fechamento da integração

Pauli revisou em modo somente leitura o remerge de `3fd98a1`, comparando os pais e o formulário/tema/actor. Nenhum Critical ou Minor novo comprovado; um Important: a renovação nativa construía o snapshot diretamente e perdia a validação de refreshToken do pai do menu. Quatro testes novos reproduziram respostas sem token, null, vazio e número; antes do fix todos falharam. A validação agora é compartilhada por accept/refresh antes de qualquer gravação. GREEN preserva as credenciais existentes e comprova recuperação numa tentativa posterior. Guardas de geração e gravação serializada permanecem. Não se chamou accept em refresh, pois incrementar sua geração ali descartaria operações legítimas.

O revisor também considerou, sem reabrir, o callback de erro ausente no onboarding. Ruling: regraduar como Important para o aceite de todas as superfícies do plano011 — um usuário deve conseguir renovar sua foto ali sem perder o draft; custo: encaminhar um callback adicional, sem novo timer/endpoint. Um teste real do onboarding falhou com zero renovações e passou após encaminhar refreshAvatar via AvatarPicker, preservando o nome não salvo. Esses dois itens foram corrigidos na única rodada de fix da integração, sem nova revisão.

- Resultado final: app75 arquivos/354 testes aprovados; typecheck aprovado. API47 arquivos/285 testes aprovados e6 suites/24 testes condicionais pulados; lint e geração Prisma aprovados. Os skips PostgreSQL permanecem skips.
- Builds finais Web/worker/smoke e export conjunto Web/Hermes iOS/Android aprovados após os fixes. Um typecheck paralelo ao export falhou porque o export substituiu arquivos dist enquanto eram enumerados; repetição sequencial após os builds passou. Ruling: ordenar essa verificação após exports, sem mascarar a corrida alterando o tsconfig; custo: menos paralelismo nessa etapa.
- Edge headless375×812/812×375 repetido na candidata:20 renovações em50/250/1000ms, duas imagens sintéticas, zero novos GETs/bytes/amostras DOM vazias e nós preservados; controle negativo40 GETs/12000 bytes em cada latência. Sem pageerrors, overflow horizontal ou imagens de A depois de mudar para B. Isso não é aceite de Safari, hardware, memória ou payload real.
- A checklist UI/UX orientou a manutenção dos slots, gestos, tokens e estilos reativos existentes; não houve redesign, mudança de paleta ou redução global do zoom. A busca focada confirmou a orientação de reservar o espaço da mídia, sem justificar novas cópias/formatos R2 nesta tarefa.

Limites considerados pelo revisor e decisões do executor:

1. Módulos imutáveis dos pais: não repetir a auditoria integral já realizada; custo: este parecer aprova apenas a junção inspecionada, não cada módulo histórico.
2. Onboarding sem callback próprio: regraduado e corrigido com RED→GREEN conforme acima; não foi silenciosamente adiado.
3. Novo login real seguido das20 renovações no formulário: cobertura de conta/epoch e continuidade inspecionada separadamente, sem alegar cenário real composto; custo: incluir a combinação no aceite físico/operacional.
4. WIP de segurança/realtime principal e fixes futuros: preservados e excluídos da candidata; custo: resolver e verificar a entrega ao checkout sem substituir esse WIP, antes de publicar seu conjunto.
5. Publicação, migração, DB/R2/Railway, hardware/Safari, RAM/p50/p95/cache do SO: não aprovados por testes locais; custo: autorização de liberação e aceite reais separados. Alertas/minors preexistentes do menu seguem no registro010, não foram tratados como regressões novas da integração.

Não há Minors novos adiados deste parecer. Relatórios anteriores e decisões acima são conservados no Git; apenas helpers/logs da workspace deste plano são descartados no fechamento. A candidata está pronta para escolha de integração, não equivale à main ou à PWA já publicada.

## Entrega à main autorizada — 13/10/2026

O usuário autorizou enviar todas as atualizações à branch principal. A entrega combina a integração de imagens/menu (`fd1a296`) com o ajuste de recuperação de chat de duas abas antes pendente no checkout principal (`0418f86`). O único conflito adicional foi no transporte nativo: rebind foi adaptado ao refreshRun por geração/token, preservando clear serializado e validação compartilhada do snapshot. O teste HTTP+socket agora usa rebind de verdade; falhou com a referência antiga refreshPromise e passou após a adaptação.

Validação do conjunto: app76 arquivos/356 testes, typecheck, Web/worker/smoke e Hermes iOS/Android aprovados; API47 arquivos/285 testes e lint aprovados,6 suites/26 testes condicionais pulados. Uma execução concorrente da API excedeu5s no teste de subprocessos dos validators; a repetição completa isolada passou sem modificar teste, timeout ou segurança. O checkout principal também foi validado antes de registrar seu ajuste: app292 e API284 aprovados,26 condicionais pulados; AUTH_MODE=native foi definido somente no processo de teste porque seu .env local ainda contém o modo antigo. Nenhum .env foi alterado.

O rascunho inicial não rastreado do plano011 foi movido de forma recuperável para `plans/plan-011-carregamento-imagens-sem-piscadas.local-before-main.md`, evitando sobrescrevê-lo pelo plano atualizado. Esse arquivo, o rascunho local do plano008 e `API/prisma/seed-book-photos.sql` permanecem fora do commit; nenhum arquivo pessoal, Yamaha, foto ou helper de teste novo é enviado. Secrets e configurações locais não são versionados.

Este registro acompanha a preparação do envio Git; a confirmação de SHA remoto é feita depois do push. Push não constitui aceite físico ou confirmação de deploy da API/PWA. A migração UserPreferences do menu está no código, mas não foi aplicada no Railway nesta etapa; o Dockerfile da API não executa migrate deploy automaticamente.

Anscombe revisou a última junção antes do envio. Sua leitura por terminal foi bloqueada pelo ambiente; o mesmo revisor recebeu o diff completo e contexto de código conferidos pelo executor e fez revisão textual, sem abrir outra rodada/revisor. Nenhum defeito Critical/Important/Minor comprovado na junção; parecer favorável ao push no escopo delimitado. Declined to judge: módulos inalterados e helpers completos de emissão/Origin/HTTPS permanecem cobertos pelos pareceres anteriores; suites são evidência do executor; deploy, migração e hardware continuam separados. Custo desse limite: não atribuir execução, auditoria integral ou liberação operacional ao parecer textual.
