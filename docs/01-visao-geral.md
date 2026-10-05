# 1. Visão geral

O TrocaLivros conecta leitores interessados em colocar livros em circulação. Cada pessoa cria uma conta própria, confirma o e-mail, pode completar o perfil e cadastrar livros, descobre obras de outras pessoas, recebe match por interesse mútuo e combina a troca por chat.

## Escopo do MVP

- autenticação própria compartilhada entre APK Android e PWA, com recuperação de senha e sessões revogáveis; no nativo usa SecureStore, e na Web usa access token em memória e refresh cookie protegido;
- interface PWA que reutiliza as telas e os contratos do app Expo, com diferenças concentradas em adaptadores web;
- cadastro obrigatório com e-mail, senha, CPF e celular;
- onboarding opcional e retomável de perfil e livros;
- perfil, biblioteca, descoberta, Curtidas, matches e chat em tempo real;
- até três fotos ordenadas por livro, com capa na posição 0 e URLs privadas renováveis do Cloudflare R2; avatares mantêm o fluxo próprio;
- ISBN pela BrasilAPI e e-mails pelo Resend;
- API e PostgreSQL preparados para Docker.

Pagamento real, gateway e cobrança recorrente ficam fora do MVP. O acesso Premium de demonstração dura 30 dias exatos, começa somente após aceite explícito e termina sem cobrança; pode ser ativado uma vez por conta verificada. Os cards semanal, mensal e anual aparecem como “Em breve”, sem preço ou ação de compra. Na Web, credenciais exigem HTTPS com API publicada na mesma origem por proxy `/api`; HTTP é aceito somente em loopback para desenvolvimento e mantém a sessão apenas em memória. Logística, moderação avançada, recomendação algorítmica, push e painel administrativo também ficam fora do MVP. CPF e telefone são coletados para proteção da conta; finalidade e retenção precisam de validação jurídica antes da produção.

O Premium libera identidades de curtidas recebidas e likes ilimitados. Sem Premium, permanecem a contagem agregada de curtidas pendentes e a lista de curtidas enviadas, com limite de 15 livros distintos curtidos por dia em `America/Sao_Paulo`. Conta, trial e cota são compartilhados entre APK e PWA e controlados pela API.

A base PWA inclui manifesto, ícones, metadados iOS, deep links e proxy Caddy no mesmo domínio. O service worker guarda somente assets com hash e uma página offline sem dados privados; uso autenticado offline, push e sincronização offline não estão implementados. Aceites de login/cookie no domínio HTTPS, instalação, câmera, mídia e chat em Safari/iPhone continuam pendentes para a versão integrada.

## Stack

| Área | Tecnologia |
| --- | --- |
| App Android/iOS e Web | Expo 57, React Native 0.86, React Native Web, React 19 e TypeScript |
| Sessão nativa | access JWT curto, refresh opaco rotativo e Expo SecureStore |
| Sessão PWA | access token curto em memória e refresh rotativo em cookie HttpOnly first-party |
| Publicação PWA | export Expo, manifesto, service worker restrito e proxy Caddy em `web/` |
| API | Node.js, Express 5, JavaScript ESM, Zod |
| Dados | PostgreSQL 16 e Prisma 6 |
| Segurança | bcryptjs, jose, HMAC/AES-256-GCM e express-rate-limit |
| Serviços | Cloudflare R2, Resend, BrasilAPI e Socket.IO 4 |

Pastas principais: `app/` (telas compartilhadas), `API/`, `web/` (build/proxy PWA), `docs/` e `plans/`. O gerenciador oficial é npm.

## Foto de perfil — plano 009 (implementação não publicada)

Foto de perfil opcional com enquadramento circular pela galeria está implementada na branch do plano 009, ainda sem publicação. Não inclui câmera/selfie, filtros ou rebranding.

Detalhes, contratos, evidências e procedimento de liberação: [execução do plano 009](../plans/plan-009-foto-perfil-usuario-r2-execucao.md).
