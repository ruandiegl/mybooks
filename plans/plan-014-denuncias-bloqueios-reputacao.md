# Plano 014 — Denúncias, bloqueios e reputação

**Estado:** implementação e validação local concluídas na branch `codex/moderacao-reputacao`; sem publicação. **Data:** 29/10/2026.

**Objetivo:** permitir denunciar ou bloquear uma pessoa e mostrar sua reputação de cinco estrelas no perfil público aberto pelos detalhes do livro. Bloqueio oculta relações nos dois lados sem apagar mensagens; desbloqueio restaura a conversa.

**Base:** `docs/01-visao-geral.md`, `02-arquitetura.md`, `03-frontend-mobile.md`, `04-backend-api.md`, `05-contrato-api.md`, `06-banco-de-dados.md`, `07-autenticacao-seguranca.md`, `08-tempo-real-chat.md`, `09-design-system-components.md`, `11-qualidade-testes.md`, `13-pendencias-conhecidas.md`, `15-matriz-validacao-mvp.md`, além dos planos 008, 009 e 013. A documentação Prisma 6 consultada via Context7 recomenda transações `Serializable` e repetição de conflitos `P2034` para escrita concorrente.

## Decisões de produto

- Todo perfil começa com **5,0/5**. Cada denúncia de uma conta distinta reduz **0,5 estrela**; cada bloqueio ativo de uma conta distinta reduz **0,25 estrela**. Mínimo **1,0**. O valor público é arredondado para uma casa decimal, calculado no servidor. Remover um bloqueio devolve sua parcela; denúncias não são removidas pelo denunciante. A fórmula fica isolada para futura revisão, sem alterar dados.
- Apenas uma denúncia por denunciante e denunciado; tentativas repetidas não reduzem mais a nota. Motivo obrigatório dentre categorias controladas, descrição opcional limitada. Identidade do denunciante, motivo e contagens não são públicos. Denúncias reduzem a nota imediatamente no MVP; revisão humana e contestação são pendências antes de produção ampla. Não existe banimento automático.
- Bloquear a pessoa impede likes, novos matches e acesso aos livros dela em descoberta/detalhes. Matches e conversas existentes somem de ambos os lados; envio, leitura e entrada em sala são negados no servidor. Dados ficam preservados e voltam após desbloqueio. A lista de bloqueados fica no próprio perfil para que seja possível desfazer a ação.
- Não é possível denunciar/bloquear a si mesmo. O bloqueio e a denúncia exigem sessão. Respostas de perfil não expõem email, telefone, CPF nem contagens da reputação.
- O app Expo e a PWA usam as mesmas telas. O perfil público é alcançado no dono do livro e no cabeçalho do chat. Mostrar cinco estrelas com nota numérica e rótulo acessível. Confirmar bloqueio e denúncia antes do envio.

## Contrato e dados

- Prisma: `UserReport(reporterId, reportedId, reason, description, createdAt)`, par único; `UserBlock(blockerId, blockedId, createdAt)`, par único e índices reversos. Exclusão de usuário em cascata. A reputação é derivada, sem coluna sujeita a dessincronização.
- `GET /api/v1/users/:userId/public`: identidade pública, avatar assinado, bio/cidade, reputação e relação do visitante (`blockedByMe`, `reportedByMe`). Responder 404 quando a outra pessoa bloqueou o visitante.
- `POST /api/v1/users/:userId/reports`: criar denúncia. `409` para duplicata.
- `PUT /api/v1/users/:userId/block`: bloquear idempotentemente; `DELETE` desfaz idempotentemente. `GET /api/v1/me/blocks`: lista para desbloquear.
- Filtro de bloqueio no servidor em descoberta, detalhe, curtidas, matches e chat. A escrita de interação/mensagem revalida o bloqueio na transação. A UI invalida caches locais após mutação; respostas 404/403 tardias removem dados obsoletos.

## Execução

### 1. Domínio e persistência

- [x] Testes da fórmula, piso, denúncias únicas e bloqueio reversível.
- [x] Modelos Prisma e migração aditiva; gerar cliente.
- [x] Módulo de reputação/relação com validação, API e autorização.

### 2. Bloqueio transversal

- [x] Testes de integração: livro/curtida/match/chat inacessíveis após bloqueio, histórico preservado e restaurado após desbloqueio; concorrência de mensagem/interação com bloqueio.
- [x] Aplicar filtros e verificações no servidor, inclusive Socket.IO.
- [x] Atualizar consultas de contagem/estatísticas que mostrariam relações ocultas.

### 3. Interfaces compartilhadas

- [x] Perfil público e componente de cinco estrelas; navegação por livro e chat.
- [x] Fluxos de denúncia e bloqueio com confirmação, motivos, estados de carregamento/erro e acessibilidade.
- [x] Lista de bloqueados no perfil próprio, desbloqueio e invalidação de dados.

### 4. Conclusão

- [x] Testes API/app relevantes, migração em PostgreSQL descartável, tipagem e export PWA.
- [x] Atualizar contrato, banco, segurança, chat, telas e pendências em `docs/`.
- [x] Registrar limites: moderação humana/contestação e teste em aparelho não substituídos por build. Sem push ou deploy nesta tarefa.

## Critérios de aceite

Uma pessoa abre o perfil do dono a partir de um livro, vê nota inicial 5/5, denuncia uma vez ou bloqueia. O bloqueio esconde livros, curtidas, match e conversa dos dois participantes e impede mensagens mesmo com URL/sala antiga; desbloquear restaura o histórico. Uma denúncia repetida não reduz a nota. Nenhuma resposta pública revela denúncias privadas.

## Resultado da execução local

- API: Prisma validate/generate, lint e suíte completa com **368 testes aprovados**, 33 condicionais ignorados.
- PostgreSQL 18 local descartável: 14 migrações aplicadas, incluindo `20261029140000_user_moderation`; suíte de integração completa com **23 testes aprovados**, cinco deles do novo domínio. Foram verificados bloqueio simultâneo e corrida com mensagem/curtida.
- App/PWA: TypeScript, **536 testes aprovados**, export web e smoke PWA aprovados; worker com 32 assets versionados e bypass de dados privados.
- Não houve alteração no Railway, push, migração de produção nem teste físico Android/iPhone. Esses aceites permanecem antes da publicação. Revisão humana e contestação da nota continuam pendentes.
