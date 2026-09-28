# 15. Matriz de validação do MVP

Data da execução atual: 24/09/2026.

## Evidências executadas

| Área | Verificação | Resultado atual |
| --- | --- | --- |
| API | recorte Vitest de ISBN/books | 25 aprovados |
| API | suíte Vitest completa após o scanner | 23 arquivos e 161 testes aprovados; 1 arquivo e 1 teste ignorados |
| API | integração nativa com PostgreSQL | 1/1 aprovado com `RUN_AUTH_INTEGRATION=true` |
| API | ESLint | aprovado sem erros |
| App | suíte Vitest | 7 arquivos e 32 testes aprovados |
| App | TypeScript estrito | aprovado |
| Prisma | validate/generate após o scanner | schema válido e Prisma Client 6.19.3 gerado |
| Compose | migração + seed | 6 migrações aplicadas; 4 usuários, 12 livros, 2 matches e 2 conversas |
| HTTP real | cadastro/login/me/refresh/replay/logout | `201/200`, rotação válida e revogações `401` |
| Auth | cadastro, códigos, login, reset, rotação/replay e falha de e-mail | cobertos por testes unitários/mockados |
| HTTP | bearer ausente/inválido, sessão revogada e rate limit | cobertos por testes de rota/middleware |
| Socket.IO | token ausente/inválido e sessão revogada | cobertos por teste do autenticador |
| Mobile | senha, sessão, onboarding e regras do scanner | incluídos nos 32 testes aprovados |
| Perfil/avatar | campos permitidos, URL arbitrária e ownership da chave | cobertos por testes de service |
| Expo | Doctor | 21/21 verificações aprovadas |
| Android | export Hermes | 1.063 módulos; diretório temporário removido |
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

Os testes Resend/R2 e em dispositivo permanecem externos; a evidência acima não os substitui.

O export Android confirma empacotamento, não o comportamento da câmera. O aceite externo precisa ser repetido em Android e iOS físicos e cobrir permissão negada/bloqueada, baixa luz, código danificado, offline, `404`, `503` e `429`, sempre verificando o fallback manual. Não há aceite de scanner na Web nem de leitura física direta de ISBN-10.

## Roteiro funcional manual

1. cadastrar e-mail, senha forte, CPF válido e celular;
2. confirmar que não há acesso privado antes do código;
3. verificar e-mail e passar por perfil e livros, testando salvar e pular;
4. reiniciar o app e confirmar restauração/refresh da sessão;
5. sair, entrar novamente e executar recuperação de senha;
6. testar avatar válido, tipo/tamanho inválido e tentativa de chave de outro usuário;
7. ler um EAN-13 `978`/`979` válido, revisar os dados preenchidos e concluir o cadastro manualmente;
8. confirmar que QR, URL, texto, EAN de produto e checksum inválido não chamam a API;
9. repetir com dois usuários para match, conversa e sessão Socket.IO.

## Cenários Premium cobertos e aceite externo

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

1. conferir modal novo, aceite/recusa, toast de conta existente, convite no Perfil e cards sem preço/ação;
2. usar a mesma conta no APK e PWA e conferir Premium e cota iguais;
3. servir PWA e API em uma origem HTTPS com proxy `/api`, testar refresh em abas e logout; confirmar bloqueio de HTTP de LAN.

## Bloqueios externos para aceite de produção

| Item | Necessário |
| --- | --- |
| PostgreSQL limpo | aplicar todas as migrações, seed e validar integridade/restore |
| Resend | chave, domínio remetente e caixa postal real |
| Cloudflare R2 | bucket privado, CORS, domínio e credenciais mínimas |
| HTTPS/proxy | domínio TLS e confirmação da cadeia real usada por `trust proxy` |
| Android/iOS | gerar/instalar APK, validar Safari/PWA, dispositivos físicos, câmera, cenários de falha, fallback manual e leitor de tela |
| LGPD | aprovação de finalidade, base legal e retenção de CPF/celular |

Não declarar produção pronta enquanto esses itens estiverem pendentes.
