# 15. Matriz de validação do MVP

Revisão documental: 05/10/2026. Integração em curso na branch `codex/main-pwa-integration`, entre main `249751e8d135a1380e7cd4fc4891dcfc1abaa975` e PWA `89733efb662985a73c492efe85afb7cab4a7df30`.

A conciliação documental inicial não executou testes. A validação local posterior da integração está registrada abaixo; os registros históricos seguintes não se somam. Migração no banco alvo, alteração de deploy e aceite físico não foram executados nesta integração.

## Validação local da integração — 05/10/2026

| Verificação | Resultado |
| --- | --- |
| `app: npm test` | 26 arquivos e 91 testes aprovados |
| `API: npm test` | 34 arquivos e 228 testes aprovados; 3 arquivos/7 testes condicionais ignorados |
| TypeScript e lint API | `npm run typecheck` e `npm run lint` aprovados |
| Export Web/PWA | export Expo e geração do worker concluídos; smoke de manifesto/ícones/cache aprovado |
| Export Android | bundle Hermes gerado; não equivale a execução física |
| Caddy 2.10.2 | smoke HTTP/WebSocket/cache e regressão HTTPS com 3 cenários aprovados |
| Regressões do merge | HTTPS nas duas rotas de cookie, revogação confirmada/retry, prefixo native, refresh HTTP/socket único, Curtidas por deep link, escolhas web e resolução Metro de JPEG cobertos |

As funcionalidades e migrações de fotos, Curtidas e Premium da main foram preservadas. O checkout principal com alterações locais não foi alterado. A API Railway permanece na branch `codex/railway-mvp-api` e o Web na `codex/plan-007-pwa`; integrar a main não troca essas fontes de deploy automaticamente. Credenciais/login real, duas contas em produção, banco/R2 real e Safari/iPhone continuam como aceite externo.

## Evidências históricas

As linhas de scanner/auth são anteriores à PWA; as de fotos vêm do registro da main de 30/09, as de Premium da revisão registrada na main e as explicitamente PWA da branch de 28/09. Limitações de ferramenta/credencial descrevem os ambientes daquelas execuções, não uma nova inspeção do ambiente atual.

| Área | Verificação/contexto | Resultado histórico ou aceite pendente |
| --- | --- | --- |
| API | recorte Vitest de ISBN/books | 25 aprovados |
| API | suíte Vitest completa após o scanner | 23 arquivos e 161 testes aprovados; 1 arquivo e 1 teste ignorados |
| API | fotos: limite, ownership, retry, ordem e URLs privadas | incluídos nos testes; suíte final 27 arquivos/177 testes aprovados, 1 ignorado |
| API | integração nativa com PostgreSQL | 1/1 aprovado com `RUN_AUTH_INTEGRATION=true` |
| API | ESLint | aprovado sem erros |
| App | suíte Vitest da galeria/main | 9 arquivos e 39 testes aprovados |
| App | TypeScript estrito da galeria/main | aprovado |
| Prisma | validate/generate após o scanner | schema válido e Prisma Client 6.19.3 gerado |
| Compose | migração + seed | 6 migrações aplicadas; 4 usuários, 12 livros, 2 matches e 2 conversas |
| HTTP real | cadastro/login/me/refresh/replay/logout | `201/200`, rotação válida e revogações `401` |
| Auth | cadastro, códigos, login, reset, rotação/replay e falha de e-mail | cobertos por testes unitários/mockados |
| HTTP | bearer ausente/inválido, sessão revogada e rate limit | cobertos por testes de rota/middleware |
| Socket.IO | token ausente/inválido e sessão revogada | cobertos por teste do autenticador |
| Mobile | senha, sessão, onboarding e regras do scanner | incluídos nos 32 testes aprovados |
| Perfil/avatar | campos permitidos, URL arbitrária e ownership da chave | cobertos por testes de service |
| Expo | Doctor | 21/21 verificações aprovadas |
| Android | export Hermes anterior/main | 1.063 módulos; diretório temporário removido |
| Expo | export Web + Android da galeria/main | bundles gerados com sucesso |
| PostgreSQL | migração de ordem e limite de fotos | não aplicada: banco alvo indisponível; consulta de preflight adicionada |
| Cloudflare R2 | PUT/HEAD/copy/GET assinado/DELETE e lifecycle | não testado: credenciais e bucket ausentes no `.env` local |
| Dependências | `npm audit --omit=dev` | API: 4 altas no grafo Prisma sem fix compatível; app: 36 moderadas transitivas sem correção disponível |
| API | Vitest completo após Premium e revisão final | 30 arquivos aprovados; 198 testes aprovados e 2 ignorados (31 arquivos/200 testes no total) |
| API | integração PostgreSQL Premium | cota 15/16, PASS/retry, expiração após trial e corrida no último slot aprovados no PostgreSQL 16 descartável |
| API | ESLint após Premium | aprovado sem erros |
| App | Vitest após bottom sheet Premium e gestos | 17 arquivos; 57 testes aprovados |
| App | TypeScript estrito | `npm run typecheck` aprovado |
| Prisma | `validate`/`generate` após Premium | schema válido e Prisma Client 6.19.3 gerado |
| Prisma | `migrate status` no banco descartável | 8 migrações encontradas; schema atualizado |
| PWA | `npx expo export --platform web` | export estático aprovado; dois bundles Web (1,3 MB e 45 KB) |
| Android | `npx expo export --platform android` após o bottom sheet | bundle Hermes aprovado; 1.085 módulos, sem gerar APK |
| APK | ambiente de build | não gerado: Java/JDK e Android SDK não estão instalados/disponíveis neste checkout |
| Dispositivos | APK Android e Safari/PWA iOS | aceite físico e leitor de tela pendentes |

### Branch PWA: build, sessão e publicação anteriores

| Área | Verificação/contexto | Resultado histórico ou aceite pendente |
| --- | --- | --- |
| API PWA | suíte Vitest e lint | registro de 28/09 em docs/11 e docs/16: 23 arquivos/170 testes aprovados, 1 ignorado; resumo da matriz PWA: 24 arquivos/172 aprovados, 1 ignorado; lint aprovado |
| App PWA | Vitest e TypeScript | 12 arquivos/47 testes aprovados; typecheck aprovado |
| Android PWA | export Hermes | 1.067 módulos; export temporário removido após validar o resultado |
| PWA | `npm run build:web` + `npm run test:pwa` | build de 821 módulos; 32 assets com hash; manifesto, ícones, escopo do service worker e ausência de URL local aprovados |
| Sessão web PWA | rotas de auth/API e adaptador web | cookie HttpOnly/Secure, expiração de cookie inválido/malformado, preservação no refresh transitório, Web Locks e access token em memória cobertos na branch; testes de logout offline/local não aprovam a regra de revogação confirmada da main |
| Socket.IO web PWA | credencial por handshake | access token atualizado por conexão e tentativa única de refresh cobertos por teste |
| Proxy Caddy PWA | `node web/tests/proxy-smoke.mjs` | não executado no registro local: Caddy ausente no PATH e daemon Docker inacessível |
| API Railway PWA | endpoints browser e allowlist | matriz da branch registra deploy `SUCCESS`, `PORT=3001`, `/health` `200`, migrações sem pendências naquele banco e `PWA_CLIENT_ORIGIN` configurada preservando `CLIENT_ORIGINS`; não comprova a configuração/deploy da integração |
| Railway Web PWA | serviço, domínio e proxy básico | matriz da branch registra deploy `SUCCESS`, GET `/` `200`, `/health` via API privada `200` e `/api/v1/auth/me` `401` JSON sem fallback SPA; sem aceite de login/cookie |
| iPhone PWA | Safari, instalação, câmera, mídia e chat | pendente de dispositivo físico; domínio HTTPS anterior não constitui aceite |

Os resumos de 170 e 172 testes da API PWA divergem e são mantidos com sua origem; não há nova execução nesta conciliação que os reconcilie. A publicação anterior não comprova deploy do merge atual. GETs básicos também não comprovam HTTPS/Origin nas duas rotas de cookie, rotação em navegador real, logout, WebSocket, cache ou instalação.

Premium de 30 dias e cota de 15 curtidas estão implementados na main e são preservados na integração; a ausência desses recursos no checkout PWA original é apenas contexto histórico. Resend/R2 reais e aceites em dispositivo permanecem externos. Builds confirmam empacotamento, sem validar galeria, conectividade com bucket privado ou renovação de GET assinado.

Na branch PWA original, abrir sem rede/API preservava o cookie HttpOnly, mas a restauração inicial só era tentada novamente ao recarregar ou entrar. A recuperação depois de falha transitória e o logout conciliado precisam de validação na versão integrada; não declarar login offline ou sincronização offline implementados.

Os exports Android e web confirmam empacotamento, não comportamento em dispositivo ou disponibilidade pública. O aceite externo precisa ser repetido em Android e iOS físicos e cobrir permissão negada/bloqueada, baixa luz, código danificado, offline, `404`, `503` e `429`, sempre verificando o fallback manual. Não há aceite do scanner na Web nem leitura física direta de ISBN-10.

## Validação da versão integrada — pendente

| Área | Verificação necessária | Estado nesta conciliação |
| --- | --- | --- |
| API/App | lint, suítes completas, typecheck, Prisma e exports Android/Web após resolver código | não executados |
| Sessão | `X-Session-Transport: cookie` e `/auth/browser/*`: HTTPS real, Origin/CSRF, cookie seguro sem refresh no JSON, revogação/replay e erro transitório | testes de regressão e navegador real pendentes |
| Logout | falha de revogação preserva cookie/estado; retry confirmado encerra sessão; corrida com refresh entre abas | pendente nos dois contratos; aprovação antiga de logout offline não se aplica |
| Proxy | smoke HTTP/WebSocket/cache e `proxy-https-smoke.mjs`, incluindo HTTPS, HTTP e cabeçalho de protocolo ausente | não executados nesta conciliação; cadeia publicada pendente |
| Navegação | cinco tabs incluindo Curtidas; deep links de livro/chat/onboarding com guards, reload, back e fallback SPA | mapeamento de Curtidas e aceite no navegador/iPhone pendentes |
| Fotos/R2 | três fotos, ordem/capa, conversão web, retry, renovação de URL privada e exclusão | regressões da integração, migração no banco alvo e bucket real pendentes |
| Premium/Curtidas | trial único de 30 × 24 h, prompt/bottom sheet, expiração de identidades, contagem, cota 15 por São Paulo e alternância APK/PWA | regressões e aceite físico pendentes; preservar cobertura histórica da main |
| PWA instalada | manifesto/ícones, Safari standalone, atualização do worker, página offline sem dados privados e câmera/mídia | build/smoke integrados e iPhone pendentes |
| Publicação | deploy da versão integrada, configuração de allowlist e login com credenciais no domínio HTTPS | não realizados/aprovados por esta conciliação |
| Consistência documental | atualizar afirmações antigas de Premium ausente em docs/13 e docs/14 e contextualizar resultados/deploys anteriores | conciliação efetuada; validação local da integração descrita separadamente dos aceites de produção |

## Roteiro funcional manual

1. cadastrar e-mail, senha forte, CPF válido e celular;
2. confirmar que não há acesso privado antes do código;
3. verificar e-mail e passar por perfil e livros, testando salvar e pular;
4. reiniciar o app e confirmar restauração/refresh da sessão;
5. sair, entrar novamente e executar recuperação de senha;
6. testar avatar válido, tipo/tamanho inválido e tentativa de chave de outro usuário;
7. ler um EAN-13 `978`/`979` válido, revisar os dados preenchidos e concluir o cadastro manualmente;
8. confirmar que QR, URL, texto, EAN de produto e checksum inválido não chamam a API;
9. repetir com dois usuários para match, conversa e sessão Socket.IO;
10. em bucket de teste, enviar três fotos, trocar a capa, fechar/reabrir o app, reordenar/excluir e validar URL GET expirada em Android/iOS/Web;
11. na Web, testar HEIC decodificável e não decodificável, JPEG grande, cancelamento e retry preservando ordem e fotos confirmadas;
12. abrir deep links de livro/chat, recarregar e usar voltar; conferir guards e as cinco tabs, incluindo Curtidas;
13. testar os dois contratos de cookie sob HTTPS, origem ausente/indevida, HTTP, refresh entre abas, sessão revogada e logout com rede/API indisponível;
14. instalar a PWA no iPhone, conferir manifesto/ícones, standalone, atualização e página offline sem dados privados; confirmar que a ausência de rede não é apresentada como login/chat offline funcional.

## Cenários Premium cobertos e aceite externo

As coberturas abaixo são evidências históricas da main; reexecutar as regressões na versão integrada e concluir os aceites indicados.

| Cenário | Evidência/status |
| --- | --- |
| Usuário novo aceita/recusa após onboarding; conta existente recebe bottom sheet no login | Regras de prompt cobertas por Vitest; confirmar abertura imediata, animação, toque fora e arraste para fechar, aceite e recusa em Android/iOS físicos e PWA iOS |
| Trial único, elegibilidade e repetição/concorrência | Testes de service/rotas da API aprovados; compare-and-set mantém uma única janela |
| Expiração em 30 × 24 h | API e helper do app cobrem limite exclusivo; identidades escondidas no instante final; aceite em dispositivo pendente |
| Trial maior que limite de timer do navegador | Vitest verifica que 30 dias são agendados em blocos seguros e só expiram ao fim do prazo |
| Fechamento por arraste | Vitest cobre arraste descendente, flick rápido e permanência em gestos curtos/ascendentes |
| Conta gratuita tenta 15 livros distintos e depois o 16º | Integração PostgreSQL aprovada; o 16º falha com `DAILY_LIKE_LIMIT_REACHED` |
| PASS, unlike, retry, virada local e concorrência | Testes de service e integração PostgreSQL aprovados; lock amostra relógio depois da aquisição |
| Trial ativo consulta curtidas anteriores | Testes da API confirmam o gate e acesso Premium; fluxo visual precisa de aceite manual |
| Trial expirado consulta likes recebidos | API nega identidades, mantém contagem agregada; app esconde e remove cache de identidades no fim |
| A mesma conta alterna entre APK e PWA | Ambos usam o mesmo estado/cota no servidor; alternância real aguarda APK e PWA em dispositivos |
| Sessão PWA é restabelecida | Testes da API/app cobrem cookie, CSRF, origem, memória, refresh coordenado e logout; navegador real pendente |
| Logout com falha na revogação | Teste da API confirma que o cookie é preservado no erro e removido após retry bem-sucedido |
| Falha nas listas e leitores de tela | Vitest cobre estado com retry em curtidas enviadas e labels/roles dos botões por ícone; aceite físico de leitor de tela pendente |
| Planos semanal, mensal e anual | Export Web aprovado; aceite visual ainda deve confirmar “Em breve”, sem preço ou ação |

## Roteiro de aceite Premium

1. conferir bottom sheet em conta nova após onboarding e em conta existente logo após login, aceite/recusa, toque fora/arraste, convite no Perfil e cards sem preço/ação;
2. usar a mesma conta no APK e PWA e conferir Premium e cota iguais;
3. servir PWA e API em uma origem HTTPS com proxy `/api`, testar refresh em abas e logout; confirmar bloqueio de HTTP de LAN.

## Bloqueios externos para aceite de produção

| Item | Necessário |
| --- | --- |
| PostgreSQL limpo e banco alvo | aplicar todas as migrações, seed, preflight de fotos, validar integridade/restore; banco descartável do Premium e migrações antigas da PWA não validam o banco alvo integrado |
| Resend | chave, domínio remetente e caixa postal real |
| Cloudflare R2 | bucket privado, CORS, domínio e credenciais mínimas |
| Railway Web | publicar/conferir a versão integrada, preservar allowlist existente e validar login, headers/cookies, Socket.IO/WebSocket e instalação Safari/iPhone; GETs históricos da branch PWA não aprovam estes fluxos |
| HTTPS/proxy | domínio TLS, protocolo HTTPS da borda preservado e confirmação da cadeia real usada por `trust proxy`; conferir as duas entradas de sessão por cookie |
| Android/iOS | gerar/instalar APK, validar Safari/PWA, dispositivos físicos, câmera, cenários de falha, fallback manual e leitor de tela |
| LGPD | aprovação de finalidade, base legal e retenção de CPF/celular |

Não declarar produção pronta enquanto esses itens estiverem pendentes.

## Foto de perfil — plano 009 (implementação não publicada)

Execução local do plano 009: API lint e 254 testes passaram (7 condicionais pulados); PostgreSQL real descartável confirmou migração/5 casos; app/typecheck e exports Web/Android tiveram êxito, com verificação final registrada no relatório. R2 público/sem CORS e aparelhos físicos NÃO foram aprovados.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).
