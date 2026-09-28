# 13. Pendências conhecidas

## Produção

- validar finalidade, base legal, retenção, exportação e exclusão de CPF/celular com o responsável jurídico/LGPD;
- validar login/cookie, Socket.IO, câmera, mídia e instalação da PWA em Safari/iPhone físico; o domínio HTTPS, o proxy privado `/health` e `PWA_CLIENT_ORIGIN` já estão publicados;
- executar `web/tests/proxy-smoke.mjs` em ambiente com Caddy; localmente o binário Caddy não está instalado e o daemon Docker está inacessível;
- melhorar a recuperação da sessão ao abrir a PWA offline: o access token só existe em memória; se o primeiro refresh falhar por rede/5xx, o cookie é preservado, mas a pessoa precisa recarregar quando o serviço voltar ou autenticar novamente;
- confirmar a cadeia real `cliente → edge Railway → Caddy → API`, incluindo `X-Forwarded-For`/`X-Forwarded-Proto`, e testar limites por IP antes de alterar `trust proxy`;
- provisionar PostgreSQL gerenciado, backup automático, teste de restore e monitoração;
- configurar Resend com domínio verificado e monitorar bounces/entrega;
- configurar R2 privado, CORS, credenciais mínimas e lifecycle de uploads abandonados;
- criar processo de migração/recuperação para contas legadas antes de remover fisicamente `clerkUserId`;
- realizar testes com dois usuários reais e em Android/iOS físico, incluindo acessibilidade;
- integrar o Premium de teste de 30 dias e 15 curtidas/dia, que não aparece no código deste checkout; cobrança real continua fora do MVP;
- aceitar câmera/scanner, seleção e envio de JPEG/PNG/WebP/HEIC, rotas diretas, sessão renovada e chat em Android/iOS físicos, incluindo permissão negada/bloqueada e fallback manual. O cadastro manual, inclusive de ISBN-10, deve permanecer funcional.
- antes de escalar a API para múltiplas réplicas, mover os rate limits geral, de autenticação e de ISBN do armazenamento em memória para um store compartilhado, como Redis; em memória, cada processo mantém sua própria cota e reinícios zeram a janela.

O scanner não oferece leitura física direta de ISBN-10. Expo Camera tem adaptador web, mas a compatibilidade final em Safari/iPhone ainda aguarda teste físico.

## Segurança/dependências

Em 11/09/2026, `npm audit --omit=dev` reportou 4 ocorrências altas no grafo Prisma (`deepmerge-ts`, sem correção compatível) e 36 vulnerabilidades moderadas transitivas no grafo Expo/React Navigation, sem correção disponível. Os relatórios precisam de triagem por advisory e alcance no runtime. Não executar `npm audit fix --force`; uma atualização incompatível exige avaliação separada e repetição do aceite. MFA, bloqueio adaptativo, moderação e painel de revogação administrativa ficam para evolução posterior.
