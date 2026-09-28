# 1. Visão geral

O TrocaLivros conecta leitores interessados em colocar livros em circulação. Cada pessoa cria uma conta própria, confirma o e-mail, pode completar o perfil e cadastrar livros, descobre obras de outras pessoas, recebe match por interesse mútuo e combina a troca por chat.

## Escopo do MVP

- autenticação nativa persistida no PostgreSQL, com recuperação de senha e sessões revogáveis;
- interface PWA que reutiliza as telas e os contratos do app Expo, com diferenças concentradas em adaptadores web;
- cadastro obrigatório com e-mail, senha, CPF e celular;
- onboarding opcional e retomável de perfil e livros;
- perfil, biblioteca, descoberta, matches e chat em tempo real;
- ISBN pela BrasilAPI, imagens e avatares no Cloudflare R2 e e-mails pelo Resend;
- API e PostgreSQL preparados para Docker.

Cobrança real está fora do MVP. O produto planeja simular o Premium com 30 dias de teste e 15 curtidas grátis por dia, mas essa funcionalidade ainda não está implementada neste checkout. Logística, moderação avançada, recomendação algorítmica, push e painel administrativo também continuam fora do escopo. CPF e telefone são coletados para proteção da conta e futura assinatura; a finalidade e retenção precisam de validação jurídica antes da produção.

## Stack

| Área | Tecnologia |
| --- | --- |
| App Android/iOS e Web | Expo 57, React Native 0.86, React Native Web, React 19 e TypeScript |
| Sessão nativa | access JWT curto, refresh opaco rotativo e Expo SecureStore |
| Sessão PWA | access token curto em memória e refresh rotativo em cookie HttpOnly first-party |
| API | Node.js, Express 5, JavaScript ESM, Zod |
| Dados | PostgreSQL 16 e Prisma 6 |
| Segurança | bcryptjs, jose, HMAC/AES-256-GCM e express-rate-limit |
| Serviços | Cloudflare R2, Resend, BrasilAPI e Socket.IO 4 |

Pastas principais: `app/` (telas compartilhadas), `API/`, `web/` (build/proxy PWA), `docs/` e `plans/`. O gerenciador oficial é npm.
