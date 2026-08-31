# 13. Pendências conhecidas

## Bloqueios de ambiente

- Docker Desktop foi configurado e validado em 31/08/2026; PostgreSQL ficou saudável em `5433` e as 5 migrações foram aplicadas. O stack pode ser parado com `docker compose down` e o volume deve ser preservado para manter os dados locais.
- Não foram fornecidas credenciais Clerk, R2 ou Resend; as integrações foram implementadas e validadas estaticamente, mas precisam de teste ponta a ponta em um ambiente configurado.
- `R2_PUBLIC_URL` deve apontar para domínio público/customizado válido para exibir capas; o endpoint S3 do bucket não deve ser assumido como público.

## Cobertura ainda necessária

- testes de integração com banco para ownership, match e paginação;
- testes Socket.IO com dois usuários reais;
- teste em dispositivo Android e iOS, incluindo deep link do Clerk;
- validação com maior tamanho de fonte do sistema e leitor de tela em dispositivo;
- política lifecycle no bucket R2 para apagar uploads enviados, mas nunca confirmados;
- política de moderação, bloqueio e denúncia antes de piloto público.

## Dependências

Em 31/08/2026, `npm audit --omit=dev` reportou 4 ocorrências altas na API, ligadas ao grafo Prisma/deepmerge, e 52 ocorrências no app, concentradas no grafo Expo/React Native e ferramentas relacionadas. O npm não ofereceu correção compatível para esses grafos. Isso não equivale automaticamente a uma vulnerabilidade explorável pelo MyBooks, mas exige triagem por advisory e atualização planejada da stack. Não use `npm audit fix --force` sem avaliar compatibilidade e repetir todo o aceite.
