# 13. Pendências conhecidas

## Produção

- validar finalidade, base legal, retenção, exportação e exclusão de CPF/celular com o responsável jurídico/LGPD;
- validar login/cookie, Socket.IO, câmera, mídia e instalação da PWA em Safari/iPhone físico; o domínio HTTPS, o proxy privado `/health` e `PWA_CLIENT_ORIGIN` já estão publicados;
- repetir o aceite do proxy no domínio público e em Safari/iPhone; os smoke tests locais HTTP/WebSocket/HTTPS foram executados com Caddy 2.10.2 temporário na integração;
- melhorar a recuperação da sessão ao abrir a PWA offline: o access token só existe em memória; se o primeiro refresh falhar por rede/5xx, o cookie é preservado, mas a pessoa precisa recarregar quando o serviço voltar ou autenticar novamente;
- confirmar a cadeia real `cliente → edge Railway → Caddy → API`, incluindo `X-Forwarded-For`/`X-Forwarded-Proto`, e testar limites por IP antes de alterar `trust proxy`;
- provisionar PostgreSQL gerenciado, backup automático, teste de restore e monitoração;
- configurar Resend com domínio verificado e monitorar bounces/entrega;
- executar `API/prisma/book-image-preflight.sql` no banco alvo e aplicar a migração só depois de resolver explicitamente livros com mais de três fotos ou capas conflitantes;
- configurar R2 privado, CORS limitado às origens Web, credenciais mínimas, `R2_GET_URL_EXPIRES_IN` e lifecycle de 1 dia para `pending/books/`;
- validar PUT, HEAD, copy, GET assinado, expiração e DELETE em bucket de teste; esta execução não tinha credenciais R2;
- reconciliar objetos finais órfãos em `books/` quando a cópia do R2 tiver sucesso e o commit do banco falhar sem conseguir registrar a fila de limpeza;
- criar processo de migração/recuperação para contas legadas antes de remover fisicamente `clerkUserId`;
- realizar testes com dois usuários reais e em Android/iOS físico, incluindo acessibilidade;
- concluir o aceite físico do Premium de teste de 30 dias e do limite gratuito de 15 curtidas/dia, já presentes na integração; cobrança real continua fora do MVP;
- aceitar câmera/scanner, seleção e envio de JPEG/PNG/WebP/HEIC, rotas diretas, sessão renovada e chat em Android/iOS físicos, incluindo permissão negada/bloqueada e fallback manual. O cadastro manual, inclusive de ISBN-10, deve permanecer funcional.
- antes de escalar a API para múltiplas réplicas, mover os rate limits geral, de autenticação e de ISBN do armazenamento em memória para um store compartilhado, como Redis; em memória, cada processo mantém sua própria cota e reinícios zeram a janela.

O scanner não oferece leitura física direta de ISBN-10. Expo Camera tem adaptador web, mas a compatibilidade final em Safari/iPhone ainda aguarda teste físico.


## Premium do MVP de TCC — aceite externo

O acesso gratuito, os limites, a tela de oferta e a sessão segura da PWA estão implementados no plano 007. Para apresentação/produção ainda é necessário:

- publicar a PWA e API sob a mesma origem HTTPS por proxy `/api`; adicionar a origem pública exata a `CLIENT_ORIGINS` e validar a cadeia do proxy;
- rodar os fluxos da mesma conta em APK Android e Safari/PWA iOS físicos, incluindo retorno após expiração, acessibilidade e navegação por leitor de tela;
- revalidar políticas Apple e Google Play antes de habilitar qualquer preço. Cobrança futura de recurso digital exige plano, integração compatível com a loja, verificação de entitlement no servidor e aceite de escopo separados.

## Segurança/dependências

Em 11/09/2026, `npm audit --omit=dev` reportou 4 ocorrências altas no grafo Prisma (`deepmerge-ts`, sem correção compatível) e 36 vulnerabilidades moderadas transitivas no grafo Expo/React Navigation, sem correção disponível. Os relatórios precisam de triagem por advisory e alcance no runtime. Não executar `npm audit fix --force`; uma atualização incompatível exige avaliação separada e repetição do aceite. MFA, bloqueio adaptativo, moderação e painel de revogação administrativa ficam para evolução posterior.

## Foto de perfil — plano 009 (implementação não publicada)

Plano 009: publicação bloqueada por R2 atualmente público/sem CORS, lifecycle de pending/avatars ausente, migração/deploy de alvo não executados, Docker Linux e aceites físicos pendentes. Expo Doctor local: 20/21, com patches preexistentes de expo/camera/image-picker atrasados.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).
