# Ranking de sequência diária — design

**Status:** proposta para aprovação; nenhuma implementação foi iniciada.

## Objetivo

Adicionar uma gamificação pequena que incentive as pessoas a voltar ao TrocaLivros diariamente, mostrando a sequência atual e a posição no ranking dentro do Perfil. O recurso será compartilhado pelo app Android/iOS e pela PWA.

## Comportamento acordado

- O placar ordena a sequência **atual** de dias consecutivos, não o recorde histórico nem a soma de acessos.
- Uma presença é registrada quando a pessoa abre ou retorna ao app em primeiro plano com uma sessão válida. A restauração automática da sessão conta; renovação de token, navegação entre telas e novas aberturas no mesmo dia não somam dias.
- O servidor define o dia pelo fuso `America/Sao_Paulo` e aceita no máximo um registro por usuário/dia. Repetições e solicitações simultâneas não incrementam duas vezes. Um dia civil inteiro sem presença encerra a sequência; a próxima presença inicia outra com um dia. No placar, uma sequência armazenada cuja última presença seja anterior a ontem é tratada como zero imediatamente, sem esperar novo acesso. A sequência de ontem continua ativa até o fim do dia atual.
- O Perfil recebe um cartão com a sequência e a colocação da pessoa. O cartão abre uma tela de ranking completa em uma rota empilhada, sem adicionar uma quinta aba. Só pessoas com uma sequência ativa positiva entram no ranking. A lista mostra as 20 primeiras posições e inclui todos os participantes empatados na última posição exibida, podendo ter mais de 20 linhas. A posição da própria pessoa aparece separadamente mesmo fora da lista.
- Participantes empatados em dias compartilham a posição no padrão competitivo (por exemplo, 1º, 1º, 3º). A lista usa apenas nome público e avatar; não expõe e-mail, telefone ou datas de atividade de outras pessoas.

## Abordagens consideradas

1. **Guardar somente a última data ativa e a sequência atual** — escolhida. É suficiente para o placar atual, reduz retenção de histórico de comportamento e mantém a consulta simples. A API calcula o novo valor por compare-and-set/transação para evitar incrementos concorrentes.
2. **Guardar uma linha de atividade por dia** — permite histórico e recordes futuros, mas retém mais dados e exige calcular sequências a partir de eventos. Não foi escolhida porque o ranking solicitado mede somente a sequência atual.

O cálculo fica no backend. Contar apenas o POST de login perderia dias porque as sessões são restauradas silenciosamente. Calcular no cliente permitiria adulterar a sequência.

## Arquitetura e escopo

Adicionar campos opcionais `lastActiveDay` e `currentActiveStreak` ao usuário por migração Prisma; manter esses campos fora dos DTOs públicos e de autenticação. Um endpoint privado `POST /gamification/check-in` registra a presença. `GET /gamification/leaderboard` retorna a sequência/posição da pessoa e as 20 primeiras posições, com nomes e avatares públicos. A identidade deriva exclusivamente de `req.currentUser.id`.

Um coordenador no app chama o check-in após restauração/estabelecimento da sessão e ao retornar ao primeiro plano, no máximo uma vez por dia no cliente; a API continua idempotente como autoridade final. O cartão e a tela de ranking usam os tokens e estados de carregamento, erro/retry e acessibilidade já adotados. A navegação abre a lista a partir do Perfil.

## Fora do escopo

Recorde histórico, pontos, níveis, medalhas, recompensas, notificações/push, check-in manual, ranking semanal/mensal, seleção de fuso horário e mudanças de assinatura/Premium. Sem dependências externas.

## Aceite

- Primeiro acesso do dia cria sequência 1; repetição no mesmo dia mantém o valor; dia consecutivo incrementa; dia perdido reinicia em 1 e o ranking já oculta sequências vencidas antes do próximo check-in.
- Datas perto da meia-noite em `America/Sao_Paulo`, sessão restaurada, concorrência entre dispositivos, empate na 20ª posição e pessoa fora do top 20 têm testes.
- O ranking não revela dados privados e conta somente usuários autenticados pelo backend.
- O cartão e a lista funcionam em Android/iOS e PWA; typecheck, testes API/app, build web e smoke PWA passam.

## Decisões deixadas ao implementador

Escolher os detalhes Prisma/SQL do compare-and-set e a forma de calcular posições sem expor campos novos em `User`; manter a API e o schema como fontes de verdade e não adicionar retenção de eventos diários.
