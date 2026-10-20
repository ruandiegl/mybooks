# 15. Matriz de validação do MVP

Data da execução de referência: 28/09/2026.

## Evidências executadas

| Área | Verificação | Resultado atual |
| --- | --- | --- |
| API | recorte Vitest de ISBN/books | 25 aprovados |
| API | suíte Vitest completa | 24 arquivos; 172 testes aprovados e 1 ignorado |
| API | integração nativa com PostgreSQL | 1/1 aprovado com `RUN_AUTH_INTEGRATION=true` |
| API | ESLint | aprovado sem erros |
| App | suíte Vitest | 12 arquivos e 47 testes aprovados |
| App | TypeScript estrito | aprovado nesta execução |
| Prisma | validate/generate após o scanner | schema válido e Prisma Client 6.19.3 gerado |
| Compose | migração + seed | 6 migrações aplicadas; 4 usuários, 12 livros, 2 matches e 2 conversas |
| HTTP real | cadastro/login/me/refresh/replay/logout | `201/200`, rotação válida e revogações `401` |
| Auth | cadastro, códigos, login, reset, rotação/replay e falha de e-mail | cobertos por testes unitários/mockados |
| HTTP | bearer ausente/inválido, sessão revogada e rate limit | cobertos por testes de rota/middleware |
| Socket.IO | token ausente/inválido e sessão revogada | cobertos por teste do autenticador |
| Mobile | senha, sessão, onboarding e regras do scanner | incluídos nos 32 testes aprovados |
| Perfil/avatar | campos permitidos, URL arbitrária e ownership da chave | cobertos por testes de service |
| Expo | Doctor | 21/21 verificações aprovadas |
| Android | export Hermes | 1.067 módulos; export temporário removido após validar o resultado |
| PWA | `npm run build:web` + `npm run test:pwa` | build de 821 módulos; 32 assets com hash; manifesto, ícones, escopo do service worker e ausência de URL local aprovados |
| Sessão web | testes das rotas de auth/API e adaptador web | cookie HttpOnly/Secure, expiração de cookie inválido/malformado, retenção de cookie e sessão em falha transitória, rotação cross-tab com Web Locks, logout offline entre abas e access token em memória cobertos pela suíte |
| Socket.IO web | teste de credencial por handshake | access token atualizado por conexão e tentativa única de refresh cobertos por teste |
| API | ESLint | aprovado sem erros nesta execução |
| Proxy Caddy | `node web/tests/proxy-smoke.mjs` | não executado: Caddy ausente no PATH e daemon Docker inacessível |
| API Railway | endpoints browser e allowlist PWA | branch `codex/plan-007-pwa`; deploy `SUCCESS`; `PORT=3001`; domínio público `/health` `200`; migrações sem pendências; `PWA_CLIENT_ORIGIN` configurada preservando `CLIENT_ORIGINS` |
| Railway Web | serviço, domínio, `/health` via proxy e endpoints protegidos | deploy `SUCCESS`; `GET /` `200`; `/health` via API privada `200`; `/api/v1/auth/me` retorna `401` JSON sem cair no HTML SPA |
| iPhone | Safari, instalação PWA, câmera, mídia e chat | pendente de dispositivo físico; domínio web HTTPS já disponível |
| Dependências | `npm audit --omit=dev` | API: 4 altas no grafo Prisma sem fix compatível; app: 36 moderadas transitivas sem correção disponível |

Testes de Resend/R2 e validações de sessão/WebSocket em serviços e dispositivos reais permanecem pendentes; a cobertura automatizada de sessão, reconexão e cache desta funcionalidade está descrita na seção de 20/10. Os GETs de produção acima comprovam a publicação e o proxy HTTP básico, não substituem esses testes. O Premium de teste de 30 dias e limite de 15 curtidas não existe neste checkout e não foi validado como parte da PWA. Se a PWA for aberta sem rede/API disponível, o refresh inicial preserva o cookie HttpOnly, mas a tela de autenticação só tenta restaurar novamente após recarregar ou entrar de novo.

## Evidências da conversa, livros da troca e remoção (20/10/2026)

| Área | Verificação | Resultado |
| --- | --- | --- |
| API | Suíte unitária/rota após os contratos de conversas | 29 arquivos passaram, 1 ignorado; 231 testes passaram, 1 ignorado. Lint passou. |
| PostgreSQL local descartável | Migração, recibos, cascatas, autorização, replay e concorrência | PostgreSQL 16 em loopback, `trocalivros_test`, sem volume persistente; 2 arquivos e 11 testes passaram. Nenhum banco Railway/produção foi usado. |
| App | Suíte da funcionalidade antes do ajuste pós-revisão | 16 arquivos e 80 testes passaram. Após o ajuste dos alvos de toque e tipos, typecheck passou e 7 testes focados passaram; a suíte integrada final será repetida na Tarefa 7. |
| PWA | Export web e smoke de manifesto, service worker e deep link | Exportou e smoke passou na validação da Tarefa 5; a repetição após o ajuste pós-revisão permanece na Tarefa 7. |
| Dispositivo | Inspeção de chat em Android/iOS | Sem dispositivo local; a validação remota está autorizada, mas aguarda autenticação do MobileNext. Nenhum dispositivo remoto foi alocado. |

Os testes de rota cobrem o vínculo contextual e o `404` sanitizado com fronteira do Prisma simulada; não foi executado teste PostgreSQL específico para o endpoint de detalhes contextuais. Os 11 testes de integração PostgreSQL cobrem migração/backfill/FKs e o ciclo transacional de match, replay, cascatas e concorrência.

Os exports Android e web confirmam empacotamento, não comportamento em dispositivo ou disponibilidade pública. O aceite externo precisa ser repetido em Android e iOS físicos e cobrir permissão negada/bloqueada, baixa luz, código danificado, offline, `404`, `503` e `429`, sempre verificando o fallback manual. Não há aceite do scanner na Web nem leitura física direta de ISBN-10.

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
10. conferir o avatar/nome no header e abrir o bottom sheet; testar capa ausente, livro removido, disponibilidade e os gestos/botões de fechamento;
11. abrir os detalhes dos dois livros e recarregar diretamente `/conversations/:conversationId/books/:bookId` na PWA; validar `RESERVED`/`EXCHANGED` e `404` quando livro, conversa ou membership não correspondem;
12. cancelar a remoção e confirmar que não houve chamada; depois remover e conferir a exclusão do match, conversa e histórico para os dois participantes;
13. repetir a remoção com outro usuário conectado e verificar o aviso único em Mensagens, a saída da conversa ativa e a rejeição de nova mensagem; repetir com socket offline para validar o caminho HTTP e reconciliação;
14. após a remoção, enviar novas curtidas de ambos usando novos identificadores e confirmar que IDs antigos não restauram interação ou match.

## Bloqueios externos para aceite de produção

| Item | Necessário |
| --- | --- |
| PostgreSQL limpo | aplicar todas as migrações, seed e validar integridade/restore |
| Resend | chave, domínio remetente e caixa postal real |
| Cloudflare R2 | bucket privado, CORS, domínio e credenciais mínimas |
| Railway Web | validar login, headers/cookie, Socket.IO/WebSocket e instalação em Safari/iPhone; domínio HTTPS, upstream privado, `/health` e `PWA_CLIENT_ORIGIN` já estão validados em produção |
| HTTPS/proxy | domínio TLS e confirmação da cadeia real usada por `trust proxy` |
| Android/iOS | dispositivos físicos, câmera, cenários de falha, fallback manual e revisão de teclado/acessibilidade |
| LGPD | aprovação de finalidade, base legal e retenção de CPF/celular |

Não declarar produção pronta enquanto esses itens estiverem pendentes.
