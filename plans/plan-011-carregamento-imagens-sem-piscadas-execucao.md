# Execução do plano011 — continuidade de imagens

Data: 09/10/2026. Branch: `codex/media-image-continuity`, base `bbca847`. Worktree existente reutilizada; checkout Expo e WIP do menu preservados. Sem merge/push/deploy ou operação R2 autorizados.

## Progresso

- Tarefa1: concluída — identidade por foto/versão/sujeito/epoch, DTO coverImageId compatível.
- Tarefa2: concluída — reducer e adapters Web/nativo; cache memory e retry com retenção do frame.
- Tarefa3: concluída — consumidores e gestos integrados, testes reais de continuidade e provider cobertos.
- Tarefa4: concluída — próximos2 livros, até4 recursos/2 simultâneos/24 metadados; foco/background/epoch e validade rechecados.
- Tarefa5: pendente — regressões/revisão/evidências.

## Decisões de execução

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
