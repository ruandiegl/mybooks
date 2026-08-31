# 12. Contribuição e fluxo de trabalho

## Antes de começar

1. Leia [Visão geral](./01-visao-geral.md) e o documento da área alterada.
2. Confira se há uma pendência relacionada em [Pendências conhecidas](./13-pendencias-conhecidas.md).
3. Defina o impacto em app, API, banco, socket e documentação.
4. Separe correção de débito técnico não relacionado, salvo quando ele bloquear a entrega.

## Branches

Use branches curtas e descritivas. O prefixo padrão do ambiente é `codex/` quando a branch for criada pelo agente. Exemplos:

```text
codex/corrige-login
codex/livros-paginacao
codex/chat-mensagens
```

Não faça alterações diretamente na branch principal sem o fluxo de revisão adotado pelo time.

## Commits

Prefira commits pequenos, focados e escritos no imperativo. Um formato recomendado é Conventional Commits:

```text
feat(app): adiciona lista de livros
fix(api): valida ownership do livro
docs: documenta eventos do chat
refactor(api): extrai caso de uso de login
```

O corpo do commit deve explicar o motivo quando a mudança não for óbvia. Não inclua arquivos gerados, segredos ou alterações de formatação não relacionadas.

## Pull requests

Uma pull request deve informar:

- problema ou objetivo;
- solução adotada;
- pacotes e áreas afetados;
- migrações ou variáveis de ambiente necessárias;
- como validar;
- limitações e pendências conhecidas;
- screenshots ou gravação quando houver mudança visual relevante.

## Revisão por área

| Alteração | Revisar especialmente |
| --- | --- |
| App mobile | Navegação, teclado, safe area, acessibilidade e estados de erro |
| API | Status HTTP, validação, autorização, DTO e logs |
| Banco | Migração, constraints, índices, rollback e dados existentes |
| Upload | MIME, tamanho, ownership, storage e limpeza |
| Socket/chat | Handshake, salas, idempotência, reconexão e privacidade |
| Design system | Tokens, consistência, contraste e compatibilidade mobile |

## Mudanças incompatíveis

Se uma rota, campo, evento ou modelo precisar quebrar compatibilidade:

1. Identifique consumidores atuais.
2. Prefira período de convivência ou versionamento.
3. Atualize contrato e exemplos.
4. Planeje migração de dados, app e API.
5. Remova o legado somente após confirmar que não há consumidores.

## Documentação viva

Atualize os documentos quando alterar:

- stack ou scripts;
- organização de pastas;
- endpoints ou payloads;
- modelo Prisma ou migrações;
- eventos Socket.IO;
- tokens visuais ou componentes reutilizáveis;
- processo de ambiente e deploy.

Documentação não deve descrever uma intenção que o código não consegue cumprir sem marcar o item como planejado ou pendente.
