# 13. Pendências conhecidas

## Produção

- validar finalidade, base legal, retenção, exportação e exclusão de CPF/celular com o responsável jurídico/LGPD;
- configurar HTTPS, domínio, CORS e cadeia real de proxies antes de confiar em `trust proxy=1`;
- provisionar PostgreSQL gerenciado, backup automático, teste de restore e monitoração;
- configurar Resend com domínio verificado e monitorar bounces/entrega;
- configurar R2 privado, CORS, credenciais mínimas e lifecycle de uploads abandonados;
- criar processo de migração/recuperação para contas legadas antes de remover fisicamente `clerkUserId`;
- realizar testes com dois usuários reais e em Android/iOS físico, incluindo acessibilidade;
- aceitar o scanner em Android e iOS físicos com permissão negada/bloqueada, baixa luz, código danificado, offline, ISBN não encontrado (`404`), provedor indisponível (`503`) e limite excedido (`429`). O cadastro manual, inclusive de ISBN-10, deve permanecer funcional em todos esses casos.
- antes de escalar a API para múltiplas réplicas, mover os rate limits geral, de autenticação e de ISBN do armazenamento em memória para um store compartilhado, como Redis; em memória, cada processo mantém sua própria cota e reinícios zeram a janela.

O scanner não oferece leitura física direta de ISBN-10 e não deve ser anunciado como recurso Web. Esses limites são decisões do escopo atual, não defeitos a mascarar no aceite.


## Premium do MVP de TCC — aceite externo

O acesso gratuito, os limites, a tela de oferta e a sessão segura da PWA estão implementados no plano 007. Para apresentação/produção ainda é necessário:

- publicar a PWA e API sob a mesma origem HTTPS por proxy `/api`; adicionar a origem pública exata a `CLIENT_ORIGINS` e validar a cadeia do proxy;
- rodar os fluxos da mesma conta em APK Android e Safari/PWA iOS físicos, incluindo retorno após expiração, acessibilidade e navegação por leitor de tela;
- revalidar políticas Apple e Google Play antes de habilitar qualquer preço. Cobrança futura de recurso digital exige plano, integração compatível com a loja, verificação de entitlement no servidor e aceite de escopo separados.

## Segurança/dependências

Em 11/09/2026, `npm audit --omit=dev` reportou 4 ocorrências altas no grafo Prisma (`deepmerge-ts`, sem correção compatível) e 36 vulnerabilidades moderadas transitivas no grafo Expo/React Navigation, sem correção disponível. Os relatórios precisam de triagem por advisory e alcance no runtime. Não executar `npm audit fix --force`; uma atualização incompatível exige avaliação separada e repetição do aceite. MFA, bloqueio adaptativo, moderação e painel de revogação administrativa ficam para evolução posterior.
