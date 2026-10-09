# Execução do plano011 — continuidade de imagens

Data: 09/10/2026. Branch: `codex/media-image-continuity`, base `bbca847`. Worktree existente reutilizada; checkout Expo e WIP do menu preservados. Sem merge/push/deploy ou operação R2 autorizados.

## Progresso

- Tarefa1: concluída — identidade por foto/versão/sujeito/epoch, DTO coverImageId compatível.
- Tarefa2: pendente — apresentação contínua.
- Tarefa3: pendente — consumidores.
- Tarefa4: pendente — antecipação.
- Tarefa5: pendente — regressões/revisão/evidências.

## Decisões de execução

- Ruling: executar sobre a main limpa na worktree existente, não sobre o WIP do menu — evita publicar alterações alheias; custo: testar integração com menu separadamente depois. ProfileEditForm só será adaptado se existir nesta base; AvatarPicker e onboarding existentes serão cobertos.
- Pre-flight1→2→3: MediaDescriptor/MediaScope e identidade lógica são compartilhados; adaptar SessionScope com userId indefinido para null, sem modificar seu contrato.
- Pre-flight1→4: antecipação usa a URI completa com política memory; não usar cacheKey divergente da URI.
- Pre-flight2→3: retry explícito muda tentativa, assinatura renovada não muda identidade; manter gates/keys legítimas.
- Pre-flight3→4→5: descarte por scope/foco e validações de sessão são obrigatórios; aceite físico não pode ser simulado por export.

## Validação

Baseline: app48/246 aprovados; API43/267 aprovados,4 suites/12 condicionais pulados. Tarefa1 RED observado (módulo de identidade ausente e cinco falhas no DTO); GREEN focado5/5 identidade e10/10 likes. Suítes finais da etapa: app49/251 e API43/268 aprovados,12 condicionais pulados; tipos e lint aprovados. Hardware/Safari/PWA instalada são aceites separados.
