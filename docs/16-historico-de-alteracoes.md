# 16. Histórico de alterações

Os resultados abaixo pertencem às execuções e branches indicadas em cada registro; não comprovam testes, deploy ou aceite da integração em curso.

## 09/10/2026 — Retorno de livros após remover curtidas

- Correção isolada a partir de `0c93552` na branch `codex/discover-unlike-pwa`, sem incluir o menu de perfil, conforme escolha explícita do usuário. Os arquivos locais e a branch de configurações foram preservados.
- A API reapresenta `PASS` quando os inéditos acabam também em produção. Livros com `LIKE` ativo, próprios ou indisponíveis continuam excluídos. Remover curtida mantém o upsert existente e não devolve cota diária. Sem novo schema, migração, variável ou alteração R2.
- Curtidas invalida Descobrir após confirmação da API; Descobrir invalida Curtidas após interação. Falhas de remoção preservam a lista anterior. Testes cobrem a fila montada e o retorno à aba com cache vazio.
- Regressões observadas em RED e corrigidas em GREEN. Revisão independente encontrou corrida entre refetch e curtida pendente: reproduzida removendo o card errado; agora a mutação captura ação/ID e filtra o ID enviado, não o card atual. A regressão com respostas adiadas passou. O mock também valida endpoint/alvo/ação. Suítes completas repetidas na árvore final: app47 arquivos/226 testes; API43 arquivos/267 testes, com12 testes condicionais pulados. TypeScript, lint API, Prisma validate com URL sintética, export Web, smoke PWA e ensaio Edge repetidos/aprovados. Docker desligado: as integrações PostgreSQL condicionais não foram executadas nesta entrega.
- Edge headless375×812 com o bundle exportado, sessão e livros fictícios somente em loopback: remover → Descobrir → curtir → Curtidas, sem reload e com zero erros de página. Não foram modificadas contas/curtidas reais nem objetos R2. Safari/PWA instalado e aparelho físico dependem de aceite do usuário. As vulnerabilidades preexistentes dos lockfiles não foram atualizadas fora deste escopo.
- Publicação da correção na API/PWA autorizada neste chat; confirmar o SHA e os deploys Railway antes de declarar a versão pública atualizada.
- Limites da revisão mantidos: paginação PostgreSQL real sem aceite nesta rodada; unlike em reservados/trocados e encerramento de matches/conversas permanecem nas regras anteriores; Safari/aparelho físico requer teste do usuário. Menu e atualizações de dependências excluídos por escopo. A verificação pública de deploy/cache é responsabilidade desta entrega após o push, não da revisão somente leitura.

## 08/10/2026 — Publicação da animação da foto na main/PWA

- Após autorização explícita, push da main confirmou `417d363` em origin/main, incluindo `ebb5172` (animação/feedback háptico/layout adaptativo). Seed SQL e rascunho local do plano008 permaneceram fora do envio.
- Verificação pré-push: 46 arquivos/221 testes, TypeScript e smoke PWA aprovados. O runtime é o mesmo dos exports Web/Android e da revisão independente registrados na implementação. Nenhuma mudança de API, variáveis, infraestrutura, migrações novas ou conteúdo R2; nenhum APK/IPA ou atualização EAS enviado.
- Deploys automáticos Railway da PWA `7d4739b4-8701-48c1-9376-4cba1b9ee10e` e API `92e64f1f-4aab-4cd5-9b39-0bf6d265fc4b` concluíram em SUCCESS para `417d363`.
- HTTPS público: `/auth` com Accept text/html e bundle HTTP200; `index-b0ca361a614503a01dfdeb84098de42e.js` coincide com o build Railway e contém tempos250/180, escala0.82, pulso12ms, opções adaptativas e proteção de callout Safari. Viewport-fit=cover preservado, `/health`200, `/api/v1/auth/me` anônimo401 e `/sw.js`200 com cache `trocalivros-static-72e6c5e9486c`.
- As consultas anônimas não validam login, upload ou háptico físico. Atualizar e fechar/reabrir a PWA instalada; reiniciar Metro no checkout main com `npx expo start --clear` em app/ para Expo Go. Safari/PWA do iPhone permanece sem Vibration API; captura, haptics nativo e acessibilidade física ainda exigem aceite em aparelho real.

## 08/10/2026 — Integração local da animação na main

- Após escolha do usuário, a main local avançou de `5b32ff4` para `ebb5172` por fast-forward, sem conflitos. Origin/main permaneceu em `5b32ff4`; push, PR e deploy não foram executados neste registro. Os dois arquivos locais não rastreados do usuário (seed SQL e rascunho do plano008) foram preservados e não incluídos.
- Na main integrada: 46 arquivos/221 testes, TypeScript, export Web e smoke PWA aprovados. O código de runtime é o mesmo já revisado e validado no export Android da implementação; haptics, Safari/PWA e acessibilidade física ainda dependem de aceite em aparelho.
- Nenhuma mudança de API, variáveis, infraestrutura ou conteúdo R2; nenhum APK/IPA ou atualização EAS gerado. A nova foto animada ainda não está no PWA público neste registro. Para testar o checkout no Expo Go, reiniciar o Metro em app/ com `npx expo start --clear`.

## 08/10/2026 — Animação da foto ampliada e feedback de pressão longa (local)

- Desenho aprovado em chat e implementação em `codex/avatar-photo-motion`, no checkout atual conforme escolha do usuário. Expansão/fade de 250 ms e saída inversa de 180 ms; opções atuais, safe area, paleta e fluxo privado R2 preservados. Driver nativo anima somente transform/opacity.
- Pressão longa de 500 ms dispara no máximo um feedback: impacto leve no iOS, efeito Long_Press do Android, pulso de 12 ms apenas nos navegadores que oferecem Vibration API. Toque simples não vibra; Safari/PWA do iPhone mantém só a animação. Expo Haptics 57.0.3 instalado pela versão indicada pelo SDK57, sem novas dependências transitivas. Falhas do motor háptico não bloqueiam a foto.
- “Reduzir movimento” e preferência desconhecida não expandem a imagem. Transições pendentes são canceladas em recorte, carregamento, fechamento externo, desmontagem e troca de conta; o X mantém foco nomeado e a proteção de callout Safari continua opt-in. Revisão identificou a possível piscada anterior a onShow nativo; reproduzida em RED e corrigida com preparação prévia, sem tornar retorno do recorte/carregamento invisível.
- Validação final: 46 arquivos/221 testes, TypeScript, export Web, smoke PWA e export Android aprovados. Testes de movimento usam o Animated real CommonJS do RNWeb (o ambiente test exporta AnimatedMock); apenas relógio e preferências/ponte do dispositivo são simulados. Cobertura inclui alpha de fundo/opções/foto, entrada atrasada, interrupções, troca de conta real no componente Profile e medição/reabertura do layout adaptativo. Revisão independente final sem Critical/Important.
- Preview loopback com conta fictícia e ícone local, sem encaminhar chamadas a Railway/R2. Edge headless: 375×812 e812×375, escala0.82→1, opções sem salto de posição, pressão longa sem fechamento fantasma ao soltar, retorno de foco ao avatar, contextmenu cancelado e redução de movimento. Texto CSS3× revelou sobreposição nos rótulos; reproduzida em RED e corrigida com lista adaptativa por fontScale/largura/medição, preservando três colunas em tamanho normal. O teste final confirma rótulos dentro das próprias ações e ausência de overflow horizontal. Texto ampliado por CSS não comprova Dynamic Type físico. Nenhuma imagem pessoal foi usada/enviada; helpers, screenshots fictícios e export temporário desta validação foram removidos ao terminar.
- Auditoria somente leitura do npm reportou 30 alertas (11 moderados,18 altos,1 crítico). Expo Haptics não consta entre os pacotes afetados; o crítico `shell-quote`1.10.0 já está no lockfile da main e não foi alterado por esta tarefa. Não foi aplicado npm audit fix nem atualização fora do escopo; a correção dos alertas requer tarefa separada.
- A ferramenta de navegador integrada falhou ao iniciar por credenciais do volume Windows Z:; a verificação foi feita num navegador de testes separado já instalado, sem corrigir/configurar o Windows nem baixar navegador. Haptics, VoiceOver/TalkBack, Safari/PWA e safe areas físicas ainda exigem aceite em iPhone/Android. Main, push, Railway e R2 não foram alterados/publicados nesta execução.

## 07/10/2026 — Publicação do editor por gestos e proteção de imagem no Safari

- Após autorização do usuário, main avançou de `09cf04f` para `4d298e5` por fast-forward, incluindo `60fd811` (callout Safari). Push confirmado com o mesmo SHA em origin/main. Seed SQL e rascunho local do plano 008 foram preservados, sem envio.
- Árvore integrada: 45 arquivos/200 testes, TypeScript, export Web, smoke PWA e export Android aprovados. Nenhum APK/IPA ou atualização EAS foi gerado. O export Android temporário criado nesta validação foi removido; arquivos do usuário não foram apagados.
- Railway: PWA `3faf79fe-f23f-4be4-a1bb-e0bc0a595868` e API `32e179eb-2f0c-4b6b-8c22-77e7fb0b5cb1` em SUCCESS para `4d298e5`. Sem alterações de variáveis, infraestrutura, migrações novas ou conteúdo no R2.
- Navegação `/auth` com Accept text/html e bundle retornaram 200. Bundle público `index-8aa69ae2dfd642e9ecfdab39ad5d039f.js` coincide com o build Railway e contém a instrução de arraste/pinça e a proteção do Safari; HTML mantém viewport-fit=cover. `/health` 200, `/api/v1/auth/me` sem sessão 401, `/sw.js` 200 com cache `trocalivros-static-a1a5577b62fd`. O fallback SPA exige Accept text/html; uma consulta genérica sem esse cabeçalho não valida navegação do navegador.
- Na PWA, atualizar a página e fechar/reabrir o app instalado para carregar a nova versão. Expo Go usa a main local com Metro reiniciado por `npx expo start --clear` em app/. As requisições anônimas não aprovam login, upload, callout/pinch físico, câmera, safe area ou VoiceOver/TalkBack: o aceite em dispositivos continua pendente.

## 07/10/2026 — Editor de foto por gestos (implementação local)

- Após aprovação do desenho em chat, removidos zoom +/−, setas, percentual, Centralizar e Outra foto. Cancelar/Salvar ficam no cabeçalho; foto circular e instrução curta ocupam o corpo. Paleta, tipografia, limites e envio privado ao R2 permanecem iguais. Para trocar a imagem, cancelar e voltar à seleção.
- PanResponder nativo e react-easy-crop Web mantêm arraste/pinça 1×–3×. Alternativas não visuais: ações de acessibilidade nativas e setas/+/- no teclado web. Ctrl/Cmd/Alt +/− não são interceptados. No crop Web, imagem não recebe hit-test/arraste nativo e o container mantém os gestos.
- Cabeçalho responsivo para fontes grandes e telas estreitas, com rótulos que podem quebrar; título excessivamente alto reorganiza o layout uma única vez, evitando loop. AppButton ganhou apenas labelStyle opcional, sem alterar o padrão das demais telas.
- TDD com componentes reais/bridge de dispositivo: salvar o retângulo visível após pinch/pan, resize durante gesto, teclado, leitor de tela, cancelamento, carregamento/erro/retry e atalhos do navegador. Revisão independente encontrou e confirmou correções de Dynamic Type e Ctrl/Cmd +/−.
- Validação final: 45 arquivos/200 testes, TypeScript, export Web, smoke PWA e export Android aprovados. Preview loopback com conta fictícia e ícone local: editor sem controles de ajuste, zoom por teclado, Cancelar retorna à foto ampliada, 375×812 e 812×375 sem overflow horizontal. Rótulos/título em 45/51 px foram testados por CSS, não por emulação de Dynamic Type físico. Nenhuma imagem pessoal foi enviada nem operação feita no R2/Railway.
- A implementação e o fix de callout `60fd811` estão apenas na branch local `codex/pwa-avatar-touch-callout`. Main/push/deploy permanecem pendentes de autorização. Pinch, safe area, VoiceOver/TalkBack e captura no iPhone/Android reais ainda precisam de aceite.

## 07/10/2026 — Pressão longa na foto na PWA (correção local)

- O print do iPhone mostrou a prévia/menu contextual de imagem do Safari, sobreposto ao modal do app. A correção em `codex/pwa-avatar-touch-callout` adiciona opt-in ao Avatar para suprimir callout/seleção/menu somente na web, com `-webkit-touch-callout: none`, user-select e cancelamento de contextmenu.
- Aplicada ao avatar do próprio perfil, à foto ampliada e ao AvatarPicker de edição/onboarding. Os pixels da Image deixam de receber hit-test, mas o controle pai permanece interativo. Não há bloqueio de touch/pinch, zoom do viewport ou crop, alteração de imagens, R2/API, paleta ou dependências. Avatares comuns e app nativo não recebem a proteção.
- Regressões em RED/GREEN com componentes RN Web reais e CSS exportado por SSR; jsdom não interpreta a extensão WebKit, por isso não serve de prova de callout físico. Revisão independente sem Critical/Important; removido um onDragStart ineficaz que o View instalado não encaminha.
- Validação final: 44 arquivos/191 testes, TypeScript, export Web, smoke PWA e export Android aprovados. Preview de loopback com dados/imagem fictícios: menus contextuais cancelados no avatar pequeno e ampliado, hit-test não atinge o img, toque abre o modal e tocar na foto não fecha; Escape devolve foco ao avatar. 375×812 e 812×375 sem overflow horizontal e viewport acessível preservado.
- A correção ainda não foi enviada à main/Railway neste registro. Segurar ambas as fotos em Safari/PWA no iPhone, pinch real e leitores de tela exigem revalidação física depois da publicação.

## 07/10/2026 — Publicação da foto ampliada e safe area na main

- Após autorização do usuário, `main` avançou de `355232c` para `fe07f80` por fast-forward, incluindo `3d5160d` (safe area) e a foto ampliada/câmera. Push confirmado com o mesmo SHA em `origin/main`. Os dois arquivos locais não rastreados (seed SQL e rascunho do plano 008) foram preservados e não enviados.
- Na árvore integrada: 42 arquivos/185 testes, TypeScript, export Web e smoke PWA aprovados. Dependências não mudaram; o export Android da mesma árvore já havia passado antes da integração. Não foi gerado APK/IPA nem enviada atualização EAS.
- Deploy automático Railway da PWA `c73de6c2-1c69-4788-8a15-ec01905fa5df` e da API `817760a6-94ba-42cf-bbb8-7663583058e9` concluíram em SUCCESS para `fe07f80`. Não houve mudança de variáveis, fonte, infraestrutura, migração nova ou conteúdo no R2 nesta publicação.
- Domínio público verificado: HTML e bundle HTTP 200, bundle `index-8b516fe398d6f5f749b9298c16570410.js` correspondente ao build, ações Editar/Tirar/Remover foto presentes e viewport-fit=cover. `/health` respondeu 200, `/api/v1/auth/me` sem sessão respondeu 401 e `/sw.js` respondeu 200 com cache `trocalivros-static-9ee65d25c07c`.
- Login, captura/envio de foto e safe areas físicas não foram aprovados por essas requisições anônimas; continuam dependentes de teste do usuário em iPhone/Android e Safari/PWA instalada. Expo Go consome a main local pelo Metro reiniciado (`npx expo start --clear` em `app/`); a alteração da descrição nativa de permissão requer novo binário próprio.

## 07/10/2026 — Foto de perfil ampliada e captura pela câmera

- Implementação local em `codex/profile-photo-preview`, baseada em `3d5160d` (safe area ainda não publicada). Toque ou pressão longa no avatar abre uma foto circular ampliada com somente Editar foto, Tirar foto e Remover foto; paleta e componentes existentes preservados.
- Galeria e câmera compartilham preparação, recorte e envio privado ao R2. Permissão nativa só na captura; seletor web aberto diretamente pelo clique. Não há vídeo, áudio ou upload automático. Cancelar não substitui a foto e remover mantém confirmação.
- Foto/crop permanecem no mesmo modal; nova URI reinicia o recorte. Bloqueio durante operações, descarte de respostas de outra conta, renovação de URL e liberação de Blob preservados. A câmera também está disponível em Editar perfil e onboarding.
- Revisão independente identificou reabertura indevida da edição textual, estado de crop reutilizado e foco/tabulação decorativos. Regressões reproduzidas em RED e corrigidas; o ajuste final de foco inicial no X foi validado pelo implementador com RN Web real e navegador.
- Validação final nesta branch: 42 arquivos/185 testes, TypeScript, export Web/PWA com smoke e export Android aprovados. O primeiro export desta retomada foi bloqueado pelo sandbox ao escrever o log; a repetição com aprovação concluiu normalmente.
- Preview loopback com sessão/imagem fictícias: 375×812 e 812×375 sem overflow horizontal; toque na foto não fecha, área externa fecha; foco inicial no X, Tab pelas três ações e Escape devolvendo foco ao avatar. Em paisagem, o conteúdo rola para mostrar os rótulos completos. Nenhuma imagem pessoal ou operação de Railway/R2 foi usada nesta conferência.
- Captura real, permissões e leitores de tela em iOS/Android e Safari/PWA instalada em iPhone continuam pendentes. A descrição de câmera atualizada requer novo binário nativo. Main, push e deploy não foram executados neste registro.

## 06/10/2026 — Safe area e viewport da PWA

- Correção na branch codex/pwa-safe-area: viewport-fit=cover expõe os insets do sistema; altura dinâmica100dvh acompanha barras do navegador, com fallback100%. Não há padding de env() no body/root nem bloqueio de zoom.
- Abas: AppScreen reserva topo/laterais, tab bar reserva o inset inferior. Stack: header continua dono do topo; corpos de Chat/livros/Matches recebem laterais, excluindo Main/onboarding para não dobrar os insets. Composer web reserva o home indicator.
- Campos web de formulário/busca/chat usam16px; paleta e medidas nativas preservadas. Não altera API, dados ou R2.
- Validação local final: typecheck;40 arquivos/161 testes; export Web e smoke PWA aprovados. O smoke confirma cover e zoom permitido no HTML efetivamente exportado. Bundle Android também exportado.
- Chrome local:375×812 e812×375, root acompanha viewport, sem overflow horizontal; fontes calculadas dos campos de login16px. Insets físicos59/34 e21 são fixtures de contrato, não emulação de Dynamic Island.
- Safari/PWA instalada em iPhone físico ainda requer aceite. Teclado virtual web preexistente não foi redesenhado:100dvh não garante resize por teclado. Publicação na main/Railway depende de autorização do usuário, ainda não realizada neste registro.

## 05/10/2026 — Integração da PWA com a main

- Conciliados os documentos 01, 02, 03, 04, 11, 15, 16 e README entre a main `249751e` e a branch PWA `89733ef`, preservando Curtidas, Premium implementado, até três fotos ordenadas e GET privado renovável do R2.
- Incorporados manifesto/ícones, service worker restrito, proxy Caddy, deep links e variantes web de sessão, avisos e mídia. Uso autenticado offline, push e cobrança real continuam fora do que foi implementado.
- Registrada a coexistência dos contratos `X-Session-Transport: cookie` e `/auth/browser/*` com cookie `__Host-`, com HTTPS/Origin nas duas entradas e preservação da regra da main de revogar antes de encerrar o logout local. A conciliação de código e seus testes estão a cargo da integração, ainda sem aceite neste registro.
- Mantidos os resultados anteriores como históricos, incluindo publicação e GETs básicos registrados na branch PWA. Login/cookies, WebSocket, R2 real, migração no banco alvo e Safari/iPhone não foram aprovados por esta revisão documental.
- Nenhum teste npm, deploy, staging, commit ou push foi executado nesta conciliação documental.

Após a conciliação documental, a integração de código preservou as funcionalidades da main e foi validada localmente: app 26 arquivos/91 testes; API 34 arquivos/228 testes com 3 arquivos/7 testes condicionais ignorados; typecheck, lint, exports Web/Android e smoke PWA/Caddy aprovados. A revisão independente identificou e confirmou correções do prefixo native, refresh compartilhado HTTP/socket e escolhas do adapter web. Também foram preservados HTTPS/Origin e logout após revogação confirmada, acrescentado `/likes`, evitada recursão Metro na preparação JPEG e mantidos os blobs de drafts para retry. Serviços Railway e aceite físico não foram alterados/realizados; o checkout principal permaneceu intacto.

## 30/09/2026 — Até três fotos por livro no R2

- `BookImage` passou a ter ordem estável, capa única e migração com backfill determinístico e pré-condição que aborta sem excluir fotos quando encontra dados fora da regra.
- A API assina PUT temporário no prefixo `pending/books/`, valida o objeto por HEAD, copia para `books/`, impõe o limite sob lock, reordena a lista completa e assina GET privado com expiração explícita.
- Exclusões de fotos, livros e contas pendentes criam jobs persistentes para retry de limpeza R2. `R2_PUBLIC_URL` deixou de ser requisito para fotos de livros; GET usa `R2_GET_URL_EXPIRES_IN`.
- O app aceita JPEG/PNG/WebP de até 8 MiB, com até três imagens, seleção sequencial, retry em `BookEdit`, capa na posição 0 e galeria em `BookDetails`.
- Validação local: API 27 arquivos/177 testes aprovados, 1 ignorado; lint e Prisma validate/generate passaram. App 9 arquivos/39 testes, typecheck e export Web/Android passaram.
- Migração, inventário do banco, R2 real, CORS/lifecycle no bucket e teste em dispositivos permanecem pendentes; não havia DATABASE_URL, Docker disponível ou credenciais R2 configuradas no checkout isolado.

## 28/09/2026 — Base Web/PWA compartilhada (branch PWA)

- Adicionada a área `web/` com Dockerfile multi-stage, Caddy, roteiro Railway e smoke de proxy HTTP/WebSocket/cache. Na validação local registrada, o proxy não foi executado por ausência de Caddy e daemon Docker acessível.
- O Expo Web recebeu manifesto instalável, ícones 192/512/180, metadados iOS, build `single` e service worker limitado a assets com hash e página offline sem dados privados.
- A configuração web usa a origem da página para API e Socket.IO; o smoke de build registrado confirmou ausência do IP local/fallback nativo no bundle.
- A branch PWA introduziu access token em memória, refresh rotativo no cookie `__Host-trocalivros_refresh`, allowlist de Origin e omissão do refresh no JSON web. Refresh/logout usam Web Locks; falha transitória de refresh preserva cookie e memória e cookie inválido/malformado é expirado. O logout offline com marcador não secreto era comportamento dessa branch; a integração deve preservar a regra mais forte da main de confirmar revogação antes de encerrar a sessão local.
- Adicionados linking React Navigation, avisos com callbacks, preparação HEIC/JPEG grande e token atual no handshake Socket.IO.
- Validação histórica: app 12 arquivos/47 testes e typecheck; API lint e 23 arquivos/170 testes, 1 ignorado; export web 821 módulos com smoke PWA; Android Hermes 1.067 módulos. O resumo da matriz informa API 24 arquivos/172 testes, 1 ignorado; a divergência entre registros fica explícita e nenhum total aprova o merge atual.
- A matriz da branch registra deploys `SUCCESS`, GET `/` e `/health` `200`, e `/api/v1/auth/me` `401` JSON via proxy. Esse histórico comprova publicação/HTTP básico daquela versão, sem aceite de login/cookie, Socket.IO, cache ou Safari/iPhone e sem comprovar deploy da integração.
- O Premium e a galeria privada ainda não estavam presentes naquele checkout PWA; ambos já existem na main e são preservados na integração. Os aceites de serviços reais e dispositivos continuam pendentes.

## 24/09/2026 — Implementação do Premium gratuito de demonstração

- Implementados os campos/tabela de trial e uso diário, status/ativação API, prompts de onboarding e conta existente, status no Perfil e gate da lista de curtidas recebidas.
- Trial começa após aceite, dura 30 × 24 horas, é ativado uma vez por conta verificada e não cobra nem renova. Conta gratuita tem 15 likes distintos por dia de São Paulo; PASS não consome vaga.
- PWA usa access token em memória e refresh cookie seguro na mesma origem HTTPS via proxy `/api`; HTTP de LAN é bloqueado, refresh entre abas usa Web Locks e logout só limpa local após revogar no servidor.
- Ajustes de revisão: data da quota é lida depois do lock transacional; `serverNow` e timer do cliente escondem identidades exatamente no fim e limpam o cache; a contagem é rotulada como curtidas pendentes.
- Revisão final: timeout de 30 dias dividido em blocos inferiores ao limite do navegador; logout preserva cookie quando revogação falha; Curtidas enviadas tem erro/retry e ações por ícone recebem rótulos para leitor de tela.
- Ajuste solicitado: a oferta passou de toast a bottom sheet ancorado no rodapé, com entrada animada de baixo para cima; contas existentes elegíveis veem o painel logo após login, uma vez por sessão.
- O bottom sheet Premium também fecha ao tocar na área externa ou ao arrastar a alça/cabeçalho para baixo; gestos curtos só fecham quando são rápidos o suficiente.
- Validação do gesto: app 57/57, typecheck e exports Web/Android aprovados; arraste e toque fora ainda precisam de conferência em aparelhos físicos.
- Validação: API 198 aprovados/2 ignorados, app 57 aprovados, typecheck/lint/Prisma aprovados e exports PWA/Android concluídos. Build APK e aceite físico/leitor de tela permanecem pendentes por falta de Android SDK/JDK e dispositivos.
- Atualizados docs/01, 02, 03, 04, 05, 06, 07, 13, 14, 15, README e plano 007. A cobrança real continua fora do escopo.

## 24/09/2026 — Planejamento do Premium gratuito para o MVP

- Criado o plano 007 para um acesso Premium de 30 dias exatos, iniciado somente após escolha explícita; contas novas e existentes podem ativar uma vez.
- No MVP de TCC não haverá pagamento real, cartão, transação, renovação ou gateway. Os cards semanal, mensal e anual ficam como “Em breve”, sem preço ou botão de compra.
- Durante o período: lista/identidade de curtidas recebidas e likes ilimitados. Sem Premium: contador agregado permanece, curtidas enviadas continuam acessíveis e o limite é 15 livros curtidos por dia em America/Sao_Paulo.
- Registrados no plano a expiração sem cobrança, os prompts distintos para contas novas/existentes, o estado no servidor e a dependência de autenticação PWA segura.
- A revisão das políticas Apple, Google Play e Expo foi feita via Context7 e documentação oficial. A cobrança futura de recursos digitais fica para outra fase e exige novo aceite das regras por loja/região.
- Atualizados os documentos 01, 02, 03, 04, 05, 06, 07, README, 13, 14 e 15 para distinguir decisões aprovadas, itens planejados e funcionalidades implementadas.

## 24/09/2026 — Correções técnicas da tela de Curtidas

- O app agora adapta nextCursor/hasMore da resposta de Curtidas ao contrato interno pageInfo, reativando a paginação infinita.
- Curtir de volta e dispensar passaram a usar um livro disponível pertencente a quem curtiu. Quando não há livro disponível, a resposta da API é actorBook: null e o card informa por que as ações não aparecem.
- Adicionados testes de regressão para o mapeamento da paginação e a serialização do livro de resposta.

## 24/09/2026 — Tela de Curtidas

- Criado módulo `likes` na API com 4 endpoints privados: `GET /likes/received` (curtidas recebidas com paginação), `GET /likes/sent` (curtidas enviadas), `GET /likes/received/count` (contagem de pendentes para badge) e `GET /likes/received/books` (livros com curtidas para filtro).
- A contagem de pendentes usa query raw `NOT EXISTS` para identificar curtidas recebidas onde o usuário ainda não interagiu com nenhum livro do ator.
- Ações de curtir de volta, dispensar e remover curtida reutilizam `POST /interactions` existente com upsert (`LIKE` ou `PASS`).
- Criado componente `LikeCard` com `ImageBackground` (capa do livro), `Avatar` (28px) e gradiente inferior, suportando variantes `received` (botões de curtir/dispensar) e `sent` (botão de remover curtida).
- Criada tela `Likes` com `ToggleGroup` (recebidas/enviadas), grid de 2 colunas via `FlatList`, paginação infinita por cursor, pull-to-refresh, filtros de ordenação e por livro, estados vazios via `StateView` e confirmação modal ao remover curtida.
- Navegação atualizada para 5 abas: Descobrir, **Curtidas** (nova, posição central), Biblioteca, Mensagens e Perfil. Badge de contagem na aba com polling a cada 30 segundos.
- iOS: SF Symbol `heart.fill` com badge nativo. Android/Web: MaterialIcons `favorite`.
- Documentação atualizada: `03-frontend-mobile.md` (navegação e tela), `05-contrato-api.md` (endpoints).

## 11/09/2026 — Leitura de ISBN por câmera

- O app Expo 57/React Native 0.86 passou a usar `expo-camera` 57.0.5 em `BarcodeScannerModal`, aberto por `BookCreate`, com câmera traseira, permissão sob demanda e leitura somente de `ean13`.
- O cliente passou a aceitar apenas EAN-13 de livro com prefixo `978`/`979` e checksum válido antes de chamar automaticamente a rota privada `GET /api/v1/isbn/:isbn` e preencher o formulário para revisão.
- QR, URL, texto, EAN de produto e checksum inválido não consultam a API. O cadastro manual permanece disponível, inclusive para ISBN-10; não há promessa de scanner Web nem leitura física direta de ISBN-10.
- Nenhum frame ou foto é enviado ou armazenado, e capas externas retornadas pela consulta não são persistidas automaticamente.
- A API passou a repetir validação Zod/checksum, validar o payload da BrasilAPI, limitar o cache a 500 entradas e mascarar o ISBN nos logs, além de aplicar rate limit dedicado de 30 consultas por janela de 60 segundos, por usuário autenticado e IP como fallback.
- Falhas `404`, `422`, `429` e `503` mantêm envelope seguro e permitem fallback manual.
- O plugin de câmera usa mensagem de permissão em português e desabilita permissão de microfone e gravação de áudio no Android.

### Validação

- App: 7 arquivos e 32 testes, typecheck, Expo Doctor 21/21 e export Android aprovados.
- API: lint sem erros; 23 arquivos e 161 testes aprovados, com 1 arquivo e 1 teste ignorados.
- Prisma: schema válido e Prisma Client 6.19.3 gerado.
- Permanece pendente o aceite em Android/iOS físicos, incluindo permissão negada/bloqueada, baixa luz, código danificado, offline, `404`, `503` e limite excedido.

## 11/09/2026 — Autenticação própria e onboarding

- Clerk e a identidade local fornecida pelo cliente foram removidos do runtime e das dependências.
- A API passou a persistir hashes bcrypt, códigos, sessões rotativas e CPF protegido no PostgreSQL.
- Foram adicionados cadastro obrigatório, verificação de e-mail, login, recuperação, rate limits e logout global.
- O app passou a armazenar tokens no SecureStore, coordenar refresh concorrente e autenticar o Socket.IO com a sessão nativa.
- O onboarding ganhou perfil e livros opcionais, ambos com opção de pular, além de avatar R2 com ownership.

## 09/09/2026 — Rebranding para TrocaLivros

- O nome visual do aplicativo foi alterado de `MyBooks` para `TrocaLivros` nas telas de autenticação, perfil e descoberta.
- O nome exibido do aplicativo Expo foi atualizado para `TrocaLivros`.
- Mensagens da API, fallback de usuário e e-mail de boas-vindas passaram a usar a nova marca.
- Os ícones atuais de livro foram preservados, pois não contêm o texto `MyBooks` e continuam representando a identidade visual do produto.
- Identificadores técnicos legados (`mybooks` em package/bundle IDs, banco, volume Docker, chaves de sessão e nomes internos) não foram renomeados para evitar migrações e quebras de integração.

### Validação

- `npm run typecheck` no app mobile.
- Busca de referências públicas remanescentes a `MyBooks` no código de interface.

## 09/09/2026 — Dados de demonstração para screenshots

- A seed passou a preencher ISBN válido e capa externa nos doze livros de demonstração.
- O perfil local `dev-mybooks-user` mantém três livros na biblioteca para screenshots.
- Foram adicionados dois matches ativos, duas conversas e seis mensagens idempotentes para demonstrar as telas de conexões e chat.
- As rotas de biblioteca, descoberta, matches e conversas foram validadas após a execução da seed.

## 09/09/2026 — Capas locais para screenshots

- Foram adicionadas doze capas raster locais em `API/assets/covers`.
- A API passou a servir essas imagens em `/covers`.
- A seed passou a gerar URLs usando `PUBLIC_API_BASE_URL`, evitando dependência das capas remotas durante os screenshots.
- A capa foi validada por `http://192.168.29.165:3001/covers/a-hora-da-estrela.jpg` com resposta HTTP `200`.

## 09/09/2026 — Capas reais do catálogo público

- As capas demonstrativas foram substituídas por capas reais de edições encontradas no catálogo público Open Library.
- Os arquivos continuam armazenados localmente em `API/assets/covers`, para que os screenshots não dependam de chamadas externas durante o uso do app.
- A API e a biblioteca foram validadas com capas reais, ISBNs e URLs locais retornando HTTP `200`.

## 09/09/2026 — Infográfico do MVP

- Foi criado o infográfico horizontal `output/infografico-mvp-trocalivros.png` para uso em apresentações.
- A composição utiliza os quatro screenshots fornecidos: entrada, descoberta, biblioteca e chat.
- Os prints foram apresentados dentro de mockups alinhados de iPhone, com textos externos curtos e a paleta vinho, rosa, marfim e cinza quente do aplicativo.
- O infográfico de referência foi usado apenas como orientação de hierarquia, cartões e espaçamento.
- Foi criada uma versão em alta definição 4K (`3840 × 2160`) em `output/infografico-mvp-trocalivros-4k.jpg`, otimizada para apresentações e compatibilidade com PowerPoint e Canva.

## 24/09/2026 — Integração do histórico Git

- A cópia local foi comparada com o repositório original e sua base corresponde ao commit `ade4da2` (`feat: uinavigationbar`).
- As alterações locais posteriores foram integradas em `main`, incluindo configuração local, seeds e capas, TrocaLivros, autenticação própria, onboarding, leitura de ISBN e documentação.
- O arquivo `.env` da raiz permanece local e foi incluído no `.gitignore`.
- A integração foi feita localmente; nenhum commit foi enviado ao GitHub.

## Foto de perfil — plano 009 (implementação não publicada)

05/10/2026 — plano 009 implementado em codex/foto-perfil-usuario-r2: galeria/crop circular, PNG local/JPEG final, grants/CAS/cleanup, DTOs privados renováveis e perfil/onboarding. Código em revisão; main, Railway e R2 não modificados/publicados nesta execução.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).

05/10/2026 — revisão independente do plano 009 e fix pass: hooks de Matches, recorte Web atualizado por controles, baseline de pinch/resize, coordenação texto/foto, renovação no perfil/onboarding, liberação de Blob atrasado e proteção de conta/versão/cache. Suítes finais: API 258 passaram (7 condicionais pulados), app 141; lint/tipos/Prisma e exports Web/Android/PWA passaram. Uma melhoria menor de cobertura do relógio ficou documentada; integração e produção não executadas.
