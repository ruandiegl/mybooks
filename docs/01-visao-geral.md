# 1. Visão geral

O TrocaLivros conecta leitores interessados em colocar livros em circulação. Cada pessoa cria uma conta própria, confirma o e-mail, pode completar o perfil e cadastrar livros, descobre obras de outras pessoas, recebe match por interesse mútuo e combina a troca por chat.

## Escopo do MVP

- autenticação nativa persistida no PostgreSQL, com recuperação de senha e sessões revogáveis;
- cadastro obrigatório com e-mail, senha, CPF e celular;
- onboarding opcional e retomável de perfil e livros;
- perfil, biblioteca, descoberta, matches e chat em tempo real;
- ISBN pela BrasilAPI, imagens e avatares no Cloudflare R2 e e-mails pelo Resend;
- API e PostgreSQL preparados para Docker.

Pagamento/assinatura, logística, moderação avançada, recomendação algorítmica, push e painel administrativo continuam fora do MVP. CPF e telefone são coletados para proteção da conta e futura assinatura; a finalidade e retenção precisam de validação jurídica antes da produção.

## Stack

| Área | Tecnologia |
| --- | --- |
| Mobile | Expo 57, React Native 0.86, React 19, TypeScript |
| Sessão | access JWT curto, refresh opaco rotativo e Expo SecureStore |
| API | Node.js, Express 5, JavaScript ESM, Zod |
| Dados | PostgreSQL 16 e Prisma 6 |
| Segurança | bcryptjs, jose, HMAC/AES-256-GCM e express-rate-limit |
| Serviços | Cloudflare R2, Resend, BrasilAPI e Socket.IO 4 |

Pastas principais: `app/`, `API/`, `docs/` e `plans/`. O gerenciador oficial é npm.
