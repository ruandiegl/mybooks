# 15. Matriz de validação do MVP

Data da execução atual: 11/09/2026.

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

## Bloqueios externos para aceite de produção

| Item | Necessário |
| --- | --- |
| PostgreSQL limpo | aplicar todas as migrações, seed e validar integridade/restore |
| Resend | chave, domínio remetente e caixa postal real |
| Cloudflare R2 | bucket privado, CORS, domínio e credenciais mínimas |
| HTTPS/proxy | domínio TLS e confirmação da cadeia real usada por `trust proxy` |
| Android/iOS | dispositivos físicos, câmera, cenários de falha, fallback manual e revisão de teclado/acessibilidade |
| LGPD | aprovação de finalidade, base legal e retenção de CPF/celular |

Não declarar produção pronta enquanto esses itens estiverem pendentes.
