# 15. Matriz de validação do MVP

Data da execução atual: 28/09/2026.

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
| API Railway | endpoints browser e allowlist PWA | branch publicada; atualização da API e `PWA_CLIENT_ORIGIN` ainda pendentes |
| Railway Web | serviço, domínio, `/health` via proxy e `PWA_CLIENT_ORIGIN` | branch/domínio configurados; primeiro deploy bem-sucedido e validação pública pendentes |
| iPhone | Safari, instalação PWA, câmera, mídia e chat | pendente de dispositivo físico e serviço web HTTPS |
| Dependências | `npm audit --omit=dev` | API: 4 altas no grafo Prisma sem fix compatível; app: 36 moderadas transitivas sem correção disponível |

Os testes Resend/R2, proxy e dispositivos permanecem externos; a evidência acima não os substitui. O Premium de teste de 30 dias e limite de 15 curtidas não existe neste checkout e não foi validado como parte da PWA. Se a PWA for aberta sem rede/API disponível, o refresh inicial preserva o cookie HttpOnly, mas a tela de autenticação só tenta restaurar novamente após recarregar ou entrar de novo.

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

## Bloqueios externos para aceite de produção

| Item | Necessário |
| --- | --- |
| PostgreSQL limpo | aplicar todas as migrações, seed e validar integridade/restore |
| Resend | chave, domínio remetente e caixa postal real |
| Cloudflare R2 | bucket privado, CORS, domínio e credenciais mínimas |
| Railway Web | validar upstream privado, `/health`, headers/cookie/WebSocket, domínio HTTPS e `PWA_CLIENT_ORIGIN` |
| HTTPS/proxy | domínio TLS e confirmação da cadeia real usada por `trust proxy` |
| Android/iOS | dispositivos físicos, câmera, cenários de falha, fallback manual e revisão de teclado/acessibilidade |
| LGPD | aprovação de finalidade, base legal e retenção de CPF/celular |

Não declarar produção pronta enquanto esses itens estiverem pendentes.
