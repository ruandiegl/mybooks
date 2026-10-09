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
