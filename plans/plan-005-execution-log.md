# Registro de execução — Plano 005

- Plano: `plans/plan-005-leitura-codigo-barras-isbn.md`
- Início: 11/09/2026
- Workspace: diretório atual, sem metadados Git

## Estado inicial

- API: 120 testes aprovados e 1 ignorado.
- App: 15 testes aprovados.
- Worktree: indisponível porque esta cópia não é um repositório Git.

## Decisões durante a execução

- Ruling: executar no diretório atual — a cópia fornecida não possui `.git`, então uma worktree e commits de revisão não podem ser criados — custo se a decisão estiver errada: as mudanças precisam ser comparadas por arquivos, sem histórico Git local.
- Ruling: manter o rate limit ISBN em memória no MVP — o projeto não possui Redis e o ambiente documentado é de instância única; adicionar store distribuído ampliaria infraestrutura e escopo — custo se a decisão estiver errada: múltiplas réplicas multiplicariam a cota e exigiriam Redis antes de escalar horizontalmente.
- Ruling: não aplicar `npm audit fix --force` — as vulnerabilidades moderadas encontradas são transitivas do Expo/React Navigation e não têm correção disponível na árvore compatível com o SDK 57 — custo se a decisão estiver errada: o risco transitivo permanece até atualização oficial das dependências.

## Evidências intermediárias

- Parser de EAN-13/ISBN: teste vermelho por módulo ausente; depois 5 testes aprovados.
- Seleção/deduplicação do lookup: teste vermelho por função ausente; depois 3 testes aprovados.
- App: 32 testes aprovados em 7 arquivos, TypeScript aprovado, Expo Doctor 21/21 e export Android aprovado.
- Configuração Expo: somente `android.permission.CAMERA`; microfone desabilitado no plugin.
- API após a rodada de revisão: lint aprovado, 161 testes aprovados e 1 ignorado; resposta externa validada, cache limitado a 500 entradas, logs ISBN sanitizados, schema Prisma válido e Prisma Client 6.19.3 gerado.
- Artefato temporário `app/.validation-export` removido após a verificação do bundle.

## Verificação final automatizada

- API: ESLint aprovado; 23 arquivos e 161 testes aprovados, 1 arquivo e 1 teste ignorados; `prisma validate` e `prisma generate` aprovados.
- App: 7 arquivos e 32 testes aprovados; TypeScript aprovado; Expo Doctor 21/21; export Android Hermes com 1.063 módulos aprovado.
- Artefato temporário `app/.validation-final` removido após a conferência.
- Revalidação de encerramento: as mesmas suítes, Expo Doctor e export Android foram repetidos com sucesso; o artefato temporário `app/.validation-final2` também foi removido.
- Dependências: auditorias mantêm 4 ocorrências altas transitivas no grafo Prisma e 36 moderadas transitivas no grafo Expo/React Navigation, ambas sem correção disponível na árvore compatível atual.

## Pendências

- Aceite físico em Android e iOS, que depende de dispositivos reais.

## Revisões independentes

- API: revisão inicial encontrou validação externa, cache, cobertura e logging; rodada de correção executada e re-revisão confirmou todos os achados endereçados.
- App: revisão inicial encontrou permissão inicial/retorno de Configurações, re-scan, teclado/layout e acessibilidade; rodada de correção executada e re-revisão confirmou 5/5 achados endereçados.
- Conjunto final: revisão cruzada local confirmou contrato, segurança, documentação e ausência de artefatos temporários. A tentativa de uma terceira revisão ampla independente não pôde ser concluída por limite de uso do agente; as duas revisões especializadas anteriores permanecem concluídas e aprovadas.
