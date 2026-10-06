# Publicação do plano 009 — 06/10/2026

## Autorização e alcance

O usuário autorizou executar integração/publicação, migração com backup, auditoria de fotos legadas, lifecycle temporário, ensaio R2 e fechamento do acesso público depois da validação.
O acesso necessário para backup/auditoria continua pendente; não foi tratado como autorização para expor o banco ou comprar outro plano.

## Executado

- CORS do bucket trocalivros verificado em painel e OPTIONS real:204, origem PWA exata, GET/HEAD/PUT e Content-Type.
- Branch revisada codex/foto-perfil-usuario-r2 integrada por fast-forward na main, commit9ce174c.
- Push main concluído; referência remota conferida9ce174c antes deste registro.
- npmci sincronizou app/API no checkout principal; app tipos e141 testes passaram.
- API lint passou. O primeiro teste da API falhou por AUTH_MODE=clerk no arquivo local antigo; a execução isolada com AUTH_MODE=native passou253 testes,12 condicionais pulados. Não foi alterado o arquivo de credenciais. A evidência anterior dos cinco testes PostgreSQL descartáveis permanece no relatório de execução.
- Rascunhos originais do plano009/spec preservados em backup recuperável fora do repositório: C:/Users/ESTUDIO-TREINAMENTO/AppData/Local/Temp/trocalivros-plan009-backup-25325ad586364fa699cbdd7cb1824be8. SQL seed e plano008 local não alterados.

## Ainda não executado — gate de backup

- PostgreSQL de produção:18, serviçoPostgres, volume postgres-volume. API/Web/Postgres têm réplicas online.
- Backup nativo do painel requer planoPro. Não houve upgrade/compra/agenda recorrente.
- Console do painel não disponibilizou instância; explorador SQL ficou sem conexão e registrou erro de WebSocket emCONNECTING.
- Conector OAuth fornece apenas nomes de variáveis; credenciais não foram expostas nem contornadas.
- Nenhuma CLI Railway autenticada está disponível. API.env local aponta para loopback/development, com bucketR2 vazio.
- Banco não possui proxyTCP público. Não foi criada exposição de rede para contornar o acesso.
- Solicitado ao usuário autenticar a CLI oficial (`npx @railway/cli login`) para SSH/backup manual privado, ou configurar acesso em arquivo local protegido; não enviar senhas/tokens pelo chat.

Nenhum deploy/API migration/backfill/upload de teste/lifecycle/desativação de domínio foi realizado nesta etapa. Antes de qualquer migração, é obrigatório obter backup verificável e executar preflight dos dados.

## Estado da produção

API segue codex/railway-mvp-api, commit8be4680; Web segue codex/plan-007-pwa, commit89733ef.
Push da main não atualiza esses serviços automaticamente.
R2 segue público via domínio e r2.dev; lifecycle permanece apenas multipart padrão7dias. A regra de pending e o fechamento aguardam auditoria/ensaio, para não apagar ou tornar inacessíveis fotos válidas.

## Triagem de dependências

A instalação atual reportou6 advisories de produção (1critical/4high/1moderate). O crítico proxy-addr<2.0.8 é [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), ligado a subnetIPv4-mapped IPv6 malformada; o app usa trust proxy numérico1, não essa configuração. Atualização pontual é recomendada antes do deploy; nenhum audit fix force ou upgrade amplo foi aplicado.

## Próxima sequência

1. CLI/acesso privado autorizado → backup manual verificável doPG18 e ensaio de restore descartável.
2. Preflight de constraints/imagens e inventário legado somente-leitura.
3. API compatível publicada, migração aditiva validada; não publicar cliente novo contraAPI antiga.
4. Backfill controlado com verificação de objetos, sem apagar fotos compartilhadas.
5. Teste com conta/bucket identificados; lifecycle limitado a pending.
6. Desativar ambas as exposições públicas somente após comprovar as leituras privadas; liberar clienteWeb e aceite físico separado.

Decisão: não aplicar migração/publicação sem backup. Custo: liberação pendente até acesso do usuário; evita colocar dados existentes em risco.
