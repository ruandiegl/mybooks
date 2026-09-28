# 1. Visão geral

O TrocaLivros conecta leitores interessados em colocar livros em circulação. Cada pessoa cria uma conta própria, confirma o e-mail, pode completar o perfil e cadastrar livros, descobre obras de outras pessoas, recebe match por interesse mútuo e combina a troca por chat.

## Escopo do MVP

- autenticação própria compartilhada entre APK Android e PWA, com recuperação de senha e sessões revogáveis; no nativo usa SecureStore, e na Web usa access token em memória e refresh cookie protegido;
- cadastro obrigatório com e-mail, senha, CPF e celular;
- onboarding opcional e retomável de perfil e livros;
- perfil, biblioteca, descoberta, matches e chat em tempo real;
- ISBN pela BrasilAPI, imagens e avatares no Cloudflare R2 e e-mails pelo Resend;
- API e PostgreSQL preparados para Docker.

Pagamento real, gateway e cobrança recorrente ficam fora do MVP. O acesso Premium de demonstração dura 30 dias exatos, começa somente após aceite explícito e termina sem cobrança; pode ser ativado uma vez por conta verificada. Os cards semanal, mensal e anual aparecem como “Em breve”, sem preço ou ação de compra. Na Web, credenciais exigem HTTPS com API publicada na mesma origem por proxy `/api`; HTTP é aceito somente em loopback para desenvolvimento e mantém a sessão apenas em memória. Logística, moderação avançada, recomendação algorítmica, push e painel administrativo também ficam fora do MVP. CPF e telefone são coletados para proteção da conta; finalidade e retenção precisam de validação jurídica antes da produção.

## Stack

| Área | Tecnologia |
| --- | --- |
| Mobile | Expo 57, React Native 0.86, React 19, TypeScript |
| Sessão | access JWT curto e refresh opaco rotativo; SecureStore no nativo, cookie HttpOnly na PWA |
| API | Node.js, Express 5, JavaScript ESM, Zod |
| Dados | PostgreSQL 16 e Prisma 6 |
| Segurança | bcryptjs, jose, HMAC/AES-256-GCM e express-rate-limit |
| Serviços | Cloudflare R2, Resend, BrasilAPI e Socket.IO 4 |

Pastas principais: `app/`, `API/`, `docs/` e `plans/`. O gerenciador oficial é npm.
