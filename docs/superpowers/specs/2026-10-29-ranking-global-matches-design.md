# Filtro Global / Matches ativos no ranking — design

**Estado:** aprovado e implementado. **Data:** 29/10/2026.

## Intenção

Permitir que a pessoa compare sua sequência de dias consecutivos com toda a comunidade ou com quem mantém um match ativo. O ranking continua acessível pelo Perfil e usa a regra existente de atividade de hoje/ontem no fuso `America/Sao_Paulo`.

## Comportamento proposto

- A tela de ranking terá dois filtros: **Global** (padrão) e **Matches ativos**. O cartão do Perfil continuará mostrando a posição global.
- **Matches ativos** compara a pessoa logada com os participantes de matches `ACTIVE` visíveis a ela. Matches removidos/arquivados e relações bloqueadas não entram. Participantes sem sequência ativa não aparecem na lista.
- A posição pessoal é calculada dentro do filtro escolhido. Se não houver matches ativos visíveis, a tela explica a ausência de comparações e mantém a sequência pessoal à vista, sem posição nesse filtro.
- Permanecem as posições competitivas (`1, 1, 3`), as 20 primeiras posições com empates no corte, os avatares e somente dados públicos na resposta.

## Abordagens

1. **Filtrar e ordenar no servidor (escolha proposta):** o endpoint recebe `scope=global|matches`; o servidor deriva a pessoa da sessão, seleciona os matches ativos visíveis e calcula posições no grupo. Preserva o corte correto e não transmite IDs de terceiros no ranking.
2. **Filtrar a lista global no app:** reaproveita a resposta atual, mas ela contém apenas o top 20. Pessoas com match fora desse top desapareceriam e suas posições ficariam erradas. Não atende ao pedido.

## Implementação e limites

- Estender `GET /api/v1/gamification/leaderboard` com filtro opcional, validado. Ausência do parâmetro mantém a resposta global atual. Nenhuma migração de banco.
- Usar chaves de cache separadas por filtro. Invalidar o ranking de matches quando match ou bloqueio mudar. A API continua sendo a autoridade; o app não calcula posições.
- Mostrar seleção acessível de filtros, carregamento, erro e estado vazio contextual na mesma tela Android/PWA.
- Não alterar check-in, pontuação de reputação, regras de Premium, navegação nem visibilidade de perfis.

## Aceite

- Global retorna as posições atuais; Matches ativos retorna apenas a própria pessoa e seus matches visíveis com sequência ativa.
- Match removido, arquivado ou bloqueado desaparece do filtro; empates e posição pessoal são recalculados.
- O filtro troca de dados sem misturar caches; a API rejeita valores inválidos e não expõe IDs, e-mail, telefone nem data de atividade.
- Testes de API, app, tipagem e build PWA passam antes da publicação.
