# 15. Matriz de validação do MVP

Data da execução: 31/08/2026.

Esta matriz separa evidência executada de expectativa arquitetural. Um item bloqueado por ambiente não deve ser apresentado no TCC como teste ponta a ponta concluído.

## Evidências concluídas

| Área | Verificação | Resultado |
| --- | --- | --- |
| API | `npm run lint` | aprovado |
| API | `npm test` | 29 testes, 9 arquivos, todos aprovados |
| Prisma | `prisma validate` com URL PostgreSQL descartável | schema válido |
| Prisma | `prisma generate` | client 6.19.3 gerado |
| Processo HTTP | iniciar API, chamar `/health` e rota privada | `200 ok` e `401` sem identidade |
| Compose | parse estrutural dos serviços e `depends_on` | PostgreSQL e API válidos; API aguarda banco saudável |
| App | `npm run typecheck` | aprovado sem erros |
| Expo | `expo-doctor` | 18/18 verificações aprovadas |
| Android | export com Hermes | bundle de 1.182 módulos gerado |
| Acessibilidade visual | contraste dos pares semânticos principais | entre 5,00:1 e 16,37:1 |
| ISBN externo | consulta pública `9788545702870` | `/api/isbn/v1` respondeu `200` com o livro Akira |
| CRUD real | criação, busca, selo ISBN e exclusão temporária via API containerizada | aprovado; registro removido ao final |
| Segredos | varredura por padrões de chaves privadas/Clerk/R2/Resend | nenhum segredo encontrado |

O export Android foi usado apenas como validação e seu diretório temporário foi removido em seguida.

## Regras automatizadas

Os testes cobrem:

- normalização e dígitos verificadores de ISBN-10/ISBN-13;
- cache, não encontrado e rate limit do provedor ISBN;
- origem ISBN e capa externa definidas pelo backend, sem confiar no payload;
- selo para ISBN válido e fallback manual quando o provedor falha;
- ownership na edição/exclusão de livros;
- remoção de objetos de capa e limpeza após falha de metadados;
- chave R2 exata, impedindo ataques por prefixo parecido;
- interação própria bloqueada e match apenas com LIKE reverso;
- membership, paginação e normalização de mensagens;
- escape de HTML no template de boas-vindas;
- preenchimento ISBN no app sem sobrescrever campo revisado;
- substituição de mensagem otimista e estado de retry sem duplicação.

## Bloqueios externos

| Item | Estado | Necessário para concluir |
| --- | --- | --- |
| PostgreSQL real e migração do zero | aprovado | Compose executado; banco saudável e 5 migrações aplicadas |
| Clerk real | bloqueado | chaves de teste, configuração de redirect/deep link e conta de e-mail |
| Cloudflare R2 | bloqueado | bucket de teste, CORS, domínio público e credenciais limitadas |
| Resend | bloqueado | API key de teste e remetente/domínio permitido |
| Chat com duas pessoas | bloqueado | banco ativo e dois usuários/dispositivos |
| Android/iOS físico | bloqueado | dispositivo ou simulador configurado |

## Dependências e risco residual

`npm audit --omit=dev` encontrou advisories transitivos sem correção oferecida pelo npm na combinação atual: 4 ocorrências altas no grafo Prisma da API e 52 no grafo Expo/React Native do app. Não foi aplicado `--force`, porque isso pode quebrar Prisma, Expo, Clerk e o build nativo. A triagem deve considerar se cada pacote vulnerável participa do runtime ou apenas da ferramenta de build e deve terminar com nova execução desta matriz.

## Próximo aceite reproduzível

1. manter o Compose ativo ou repetir `docker compose up --build -d` quando necessário;
2. configurar Clerk, R2 e Resend em ambiente de teste;
3. executar testes de integração em banco isolado e o roteiro de dois usuários em `docs/14-execucao-do-mvp.md`;
4. instalar/configurar dispositivo ou simulador Android/iOS;
5. registrar capturas, logs sem dados pessoais e resultado observado para o TCC.
