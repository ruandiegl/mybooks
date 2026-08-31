# 1. Visão geral

O MyBooks conecta leitores interessados em colocar livros em circulação. Cada pessoa mantém sua biblioteca, descobre livros de outras pessoas, registra interesse, recebe um match quando o interesse é mútuo e combina a troca por chat.

## Escopo do MVP

- entrada, cadastro e recuperação de acesso pelo Clerk;
- perfil público básico;
- cadastro manual de livros ou preenchimento assistido por ISBN;
- capa externa da BrasilAPI ou imagem própria no Cloudflare R2;
- biblioteca em grid e detalhe do livro;
- descoberta com ações gostar/passar;
- match mútuo, lista de conversas e mensagens em tempo real;
- e-mail transacional de boas-vindas pelo Resend;
- PostgreSQL e API preparados para Docker.

Ficam fora do MVP: pagamento, logística, moderação avançada, recomendação algorítmica, notificações push e painel administrativo.

## Stack

| Área | Tecnologia |
| --- | --- |
| Mobile | Expo 54, React Native 0.81, React 19, TypeScript |
| Navegação/estado servidor | React Navigation 7, TanStack Query |
| UI | componentes nativos inspirados em shadcn, Be Vietnam Pro, Material Icons |
| API | Node.js, Express 5, JavaScript ESM, Zod |
| Dados | PostgreSQL 16 e Prisma 6 |
| Identidade | Clerk Expo e Clerk Express |
| Imagens | Cloudflare R2 via API compatível com S3 |
| E-mail | Resend |
| ISBN | BrasilAPI |
| Tempo real | Socket.IO 4 |
| Infraestrutura | Docker Compose |

## Mapa do repositório

- `app/`: aplicativo mobile.
- `API/`: servidor HTTP, Socket.IO e Prisma.
- `docs/`: documentação viva.
- `plans/`: planejamento e rastreabilidade da execução.
- `compose.yaml`: PostgreSQL e API para desenvolvimento.

O Node recomendado está em `.nvmrc`. O gerenciador oficial deste checkout é npm; não recrie `yarn.lock`.
