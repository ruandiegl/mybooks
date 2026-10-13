# Execução do plano010 — menu e configurações

Data: 08/10/2026. Branch: `codex/profile-settings`, base `0c93552`. Implementação local; nenhuma integração/push/deploy ou migração Railway autorizada nesta execução.

## Entregue no código

- Hambúrguer no perfil, menu full-screen único e edição incorporada, descarte interno, bloqueio de saída durante gravação e exclusividade com o avatar. Aparência, conta, senha, notificações, ajuda, versão e confirmações ficam no mesmo host.
- Tema claro/escuro/dispositivo reativo em telas, chat, modais, navegação e shell PWA. Aparência pública por dispositivo (`trocalivros.appearance.v1`), separada de sessão e preferências privadas. Instalação SDK57: AsyncStorage2.2.0 e SystemUI57.0.4; fotos/recorte não são reprocessados pelo tema.
- Preferência de badge no servidor, migração aditiva UserPreferences, defaulttrue sem escrita no GET, PATCH estrito, confirmação/retry, chave de query por usuário e fallback404. Não controla contagem, quota ou acesso Premium; não envia push.
- Senha atual obrigatória, validação vigente sem trim, erro403 específico, limites independentes5/conta e20/IP por60s. Sucesso revoga sessões/invalida reset codes e exige novo login. Logout atual encerra a família, global encerra todas.
- User lock antes de sessão/código; rechecagem de hash e sucessor de refresh, correlação de owner/sid/família/cookie. Verificação e renovação de cadastro pendente não podem substituir uma conta que já foi verificada.
- Revogação em sockets por sid e checagem viva nos eventos; rotação/expiração do access token permitem reconexão limitada, não falso logout. Garantia imediata local pressupõe uma instância; replicação exige adapter compartilhado.
- Actor `{userId,epoch,sessionId}`, proteção de respostas antigas, storage nativo serializado e credenciais preservadas em falha transitória. Web Locks cobre login/verificação/refresh/terminais; terminal não chama o interceptor de refresh enquanto segura o lock.
- Premium adiado por `profile-overlay`, sem consumo por bloqueio; respostas e cache pertencem ao actor que iniciou a operação.
- FAQ local e versão de app.json. Sem links jurídicos/suporte inventados, exclusão, troca de e-mail/CPF, MFA ou checkout.

## Evidências

As validações finais, números e revisão independente serão registrados aqui após execução. Evidências já obtidas: migrações11/11 no PostgreSQL16 descartável; testes de FK/upsert/conexão nova; concorrência change×change, change×reset, refresh×change, refresh×logout, prova de hash antigo e cadastro×verificação; cookies409 sem Set-Cookie e senha403/200 com revogação; sockets reais em loopback. Testes de UI/transportes reproduziram as corridas antes dos fixes.

- API:52 arquivos aprovados/1 suite opt-in ignorada;304 testes aprovados/2 ignorados (suite que exige servidor externo). Lint, Prisma validate/generate aprovados; avatar e quota/Premium também rodaram no PostgreSQL descartável.
- App: última suíte completa265/265 e types aprovados;20 cenários de coordenação do perfil/modal e o teste visual real validaram o último ajuste de header. Executar suite final ao encerrar a revisão.
- Web/PWA e exports Hermes Android/iOS aprovados. Export não valida módulos/chrome/teclado em hardware.
- Edge headless em API sintética loopback: menu/seções, foco/trap/restauração, uma superfície, discard/cancel, fechamento bloqueado durante PATCH, senha403 com draft mantido, preferência confirmada, tema/draft/recorte preservado, reload/system,375×812 e812×375 com texto3x. Zero pageerrors; nenhum upload R2. Fonte ampliada revelou header que empurrava X: corrigido por minWidth0/flexShrink e controle48 não encolhível.
- Browser encontrou também metadata duplicado do Expo (todos acompanham cor), glyphs em nomes acessíveis (ícones decorativos isolados/rótulos explícitos) e callback de save ocupado (transição só após settle/owner válido). Todos receberam reprovação anterior ao fix e aprovação posterior.
- Expo Doctor20/21: versões já presentes na base: expo57.0.22 vs esperado57.0.27; camera57.0.5 vs57.0.6; image-manipulator57.0.20 vs57.0.21; image-picker57.0.17 vs57.0.20. Não foram atualizadas fora do escopo nem excluídas dos checks.

### Triagem de dependências (08/10)

App mantém30 alertas (11moderados/18altos/1crítico), API13 (2moderados/10altos/1crítico). Baseline `0c93552` contém as mesmas versões críticas: shell-quote1.10.0 e proxy-addr2.0.7. Não usar audit-fix--force.

shell-quote entra por react-devtools-core/React Native/CLI; não se encontrou uso direto de quote/exec no código do app. O [advisory do mantenedor](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) descreve a combinação de token de comentário e string não confiável com quebra de linha; remediação publicada1.11.0. Isto não é prova de ausência de alcance em tooling.

proxy-addr é runtime via Express. O [advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) envolve configuração de sub-rede IPv6 de trust que casa IPv4 indevidamente; a API usa trust proxy numérico1, não essa sub-rede. Não se demonstrou esse vetor na configuração local, mas proxy-addr2.0.8 e a cadeia real de proxies devem ser validados em trabalho de segurança/atualização antes de expansão operacional. Limite por conta não depende de IP. Nenhum teste usa IP como identidade.

Banco: container de teste com label `trocalivros.task=plan010`, tmpfs e bind exclusivo `127.0.0.1:55432`; banco `plan010_test`. Sem seed de produção, R2 real, e-mails, SSH/túnel ou backup. Fixtures sintéticas removidas pelos testes; demais containers não foram alterados.

## Liberação e aceites pendentes

1. Após aprovação de integração/publicação, aplicar a migração aditiva no alvo confirmado e publicar API antes do cliente. Não copiar URLs/credenciais de testes para produção.
2. Reiniciar o Metro para testar a branch atual. Appearance no chrome nativo/config requer novo development build; export JS não é APK/IPA.
3. iPhone/Android/Safari/PWA instalada: teclado/notch/home indicator, VoiceOver/TalkBack, tema do SO/chrome/splash, câmera/galeria, gestos e vibração. Browser headless não valida esses itens.
4. Push, exclusão/e-mail/CPF/MFA e cobrança permanecem fora do escopo. Alertas de dependências serão triados sem upgrades forçados.

## Decisões de execução

- Appearance nativa usa `unspecified`, não null, para remover override: contrato efetivo do React Native0.86 instalado. Custo se mudar de RN: adaptar o valor.
- UI de Ajuda/Sobre integra o mesmo commit de conta para não deixar imports sem implementação num host compartilhado; documentação/evidências têm commit próprio. Custo: granularidade do histórico, não comportamento.

## Revisão independente e fix

Epicurus revisou a branch inteira até b4cf79a somente leitura. Nenhum Critical comprovado; Important: sockets de duas abas podiam alternar refresh do cookie. Reproduzido novamente com transportes/lifecycle reais e I/O controlado, antes do fix. Solução: POST `/auth/browser/rebind` privado/Origin/HTTPS/owner+sid/família retorna acesso ao sid já vivo, sem novo sid, Set-Cookie, refresh no DTO ou extensão de TTL. Recuperação do chat web usa esse caminho, evitando outra rotação; nativo aguarda a rotação já em andamento ou renova uma credencial expirada. API antiga só usa fallback de refresh depois de liberar o lock e fora de um aviso rotated.

Decisão adicional: este endpoint interno é necessário para manter ambas as abas conectadas, não apenas limitar/desligar uma. Custo se incorreto: recuperação realtime; autoridade continua no cookie/sessão viva e teste de outra família409. Suítes finais serão repetidas após o fix.

Minors adiados: borda de foco de Salvar foto no escuro (white vs pastel,2.13:1) e horário de bolha própria com opacidade0.7 (contraste composto abaixo4.5). Não são corrigidos nesta passada de Important; precisam de tarefa de contraste/aceite.

Limites considerados pelo revisor e mantidos conforme desenho: não publicar/migrar/alterar infra/TLS/proxy/SSH/backup; não operar R2/contas/e-mails reais; hardware/Safari/PWA instalada/assistivas/splash/chrome precisam de aceite; revogação multi-réplica exige adapter; push/inbox/categorias, exclusão/e-mail/CPF/MFA/sessões/moderação/export e cobrança ficam futuros; URLs jurídicas/suporte não inventadas; patches/audit preexistentes requerem trabalho próprio; arquivos alheios e planos históricos não são removidos/revisados integralmente. O custo desses limites é não afirmar liberação/aceite operacional, recursos futuros ou remediação fora da entrega.

Os dois arquivos locais alheios a esta tarefa (`seed-book-photos.sql` e rascunho local do plano008) são preservados e excluídos dos commits.
