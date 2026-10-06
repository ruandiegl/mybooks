# Publicação do plano 009 — 06/10/2026

## Autorização e recuperação

O usuário autorizou integração/publicação, auditoria de fotos legadas, ensaio R2 e fechamento das exposições públicas depois da validação. Em06/10 dispensou expressamente backup/restore por estar em desenvolvimento. Não foi criado novo snapshot; aceita-se a ausência dessa recuperação adicional. Isso não autoriza apagar fotos válidas, expor PostgreSQL, aceitar host SSH não verificado ou comprar planoPro.

A chave SSH temporária autorizada foi revogada. Seus três arquivos locais foram removidos e a ausência conferida; demais chaves foram preservadas. Nenhuma conexão SSH com host não verificado foi aceita.

## Executado e verificado

- Código do avatar e recorte integrado à main (9ce174c; registro anterior314b801).
- App: typecheck e141 testes passaram. API final: lint e265 testes passaram,12 condicionais pulados, com AUTH_MODE=native isolado no processo e maxWorkers=2. A tentativa com paralelismo livre teve3 timeouts ISBN; o run limitado eliminou os timeouts sem alteração desses testes. Evidência PostgreSQL descartável anterior consta no relatório de execução.
- API Railway mudou para ruandiegl/mybooks@main. Deploy6e666640-3dcb-4998-bcce-4d57e6749935 SUCCESS, commit314b801; Docker Linux construiu sharp corretamente.
- PostgreSQL real versão18: preflight de imagens aceito; migrations20260930120000_book_image_order_cleanup e20261005120000_private_user_avatar aplicadas. Nenhum reset ou migração destrutiva foi feito.
- CORS do trocalivros confirmado com origem PWA exata, GET/HEAD/PUT e Content-Type; OPTIONS204 e PUT real passaram.
- Ensaio de armazenamento: PNG PUT/HEAD/GET, JPEG512, link expirado403 e remoção dos objetos sintéticos passaram.
- Ensaio API na conta seed Ana Martins: protocolo2, JPEG512 semEXIF, complete idempotente, substituição incrementa versão, complete antigo409, remoção e preservação dos campos textuais passaram. Sessão encerrada. Nenhuma foto de usuário real foi substituída.
- Auditoria agregada real:7 usuários,14 fotos de livros;1 avatar legadoR2 e1 foto de livro URL-onlyR2;12 capas externas. Nenhuma referência definitiva a pending/. URLs, chaves e credenciais não foram registradas nos logs.
- Rascunhos originais plan009/spec continuam recuperáveis no diretório temporário trocalivros-plan009-backup-25325ad586364fa699cbdd7cb1824be8. SQL seed e plano008 local foram preservados.

## Migração das referências antigas

Script operacional: API/src/scripts/backfill-private-media.js. Por padrão somente verifica; --apply modifica referências através de compare-and-set. Guard exige conta/bucket/STORAGE_MODE identificados; lote limitado a100 registros.

Somente duas origens R2 conhecidas são reconhecidas. Não busca URLs arbitrárias. Verifica objeto, proprietário e MIME/tamanho. Avatar próprio é vinculado à chave privada. Foto compartilhada de livro é copiada para chave nova pertencente ao livro, com verificação, sem sobrescrever destino e sem apagar objeto original. Imagens externas não são modificadas. Concorrência não sobrescreve edição do usuário.

Antes de copiar, registra intenção com lastError=LEGACY_BACKFILL_RECONCILE_REQUIRED e nextAttemptAt em9999: nunca entra na limpeza automática até reconciliação. Resposta COPY ou transação DB incerta não permite delete. Somente cópia confirmada e CAS confirmado sem alteração ativa a limpeza; referência confirmada remove a intenção. Para reconciliar resultado desconhecido: verificar referência atual e objeto da chave retida; não habilitar cleanup enquanto um commit puder estar pendente.

O header assinado cf-copy-destination-if-none-match:* protege o destino no momento do commit do R2, além do ETag da fonte. Referência: [extensões S3 do R2](https://developers.cloudflare.com/r2/api/s3/extensions/). O recurso é beta; foi ensaiado no bucket real em06/10: primeira cópia passou, segunda com fonte alterada retornou412, bytes originais do destino preservados, dois objetos sintéticos removidos e HEAD404 confirmado. Contrato HTTP real do SDK coberto em teste.

Operação no container API, pela rede privada existente:

~~~sh
node src/scripts/backfill-private-media.js
node src/scripts/backfill-private-media.js --apply
~~~

Antes de --apply: dry-run sem bloqueios, testes e revisão focada. Antes de fechar R2: auditoria com zero referências URL-onlyR2 e leitura assinada das fotos verificadas.

## Liberação confirmada

- Main publicada:9b8ea50e117a9520d2b9490dc4a6e4f8993ccd8e. Testes/lint repetidos na main integrada:265pass/12skip.
- Deploy API eeaf1091-eaf2-4c36-932a-9e969ea10afb SUCCESS: dry-run planned2, blocked0; apply avatars1/books1/copies1, skipped12, blocked0. Fonte compartilhada preservada.
- Auditoria posterior:7users/14BookImages;1avatar privado/2fotos de livros privadas; zero URLs R2 legadas/zero referências definitivas pending/. Três GETs assinados validados, cleanupJobs0.
- Domínio media.podepedirppd.com.br: Access Disabled; domínio/DNS não removidos. r2.dev: Public Development URL disabled. CORS preservado.
- Teste pelo proxy Web após fechar bucket: login/logout seed válidos;3GETs assinados200 e3CORS exatos; os mesmos3objetos recusados em cada um dos dois hosts públicos. Nenhuma exposição pública é necessária para novas fotos.
- Ensaio API inteiro repetido com bucket privado passou: PUTPNG, JPEG512 semEXIF, idempotência, substituição, conflito409 antigo, remoção e campos textuais preservados. Sessão seed encerrada.
- Inspeção somente-leitura do R2 após os ensaios confirmou zero objetos finais e zero pending da conta seed usada no teste. Nenhuma foto real foi removida.
- preDeploy padrão npx prisma migrate deploy restaurado; deploy51e1aff5-2da6-4c5a-baea-5d0123cfc0d2 SUCCESS com comando padrão, sem repetir backfill.
- Web mudou de codex/plan-007-pwa para main, preservando Docker/Caddy/variáveis. Deploy a6446dee-c53b-4cd2-8028-55122bc02d63 SUCCESS na mesma revisão9b8ea50. Página carregou sessão existente; Perfil e capa do livro presentes.

## Aceites ainda pendentes

- Lifecycle exclusivo pending/avatars/ em1dia foi preparado e cancelado, NÃO salvo. Aguarda autorização específica para exclusão permanente dos temporários; nenhuma mudança nos objetos finais ou nos livros foi proposta.
- Teste visual do recorte com arquivo sintético não concluiu: extensão Chrome recusou setFiles por não possuir acesso a file URLs. A permissão não foi ampliada. Foto/dados do perfil existente não foram salvos/substituídos; fluxo local foi encerrado.
- Aceite em dispositivos físicos iOS/Android e Safari/PWA instalada permanece separado: galeria limitada/negada, HEIC/iCloud, pan/pinch, rede instável e acessibilidade. Não declarar esses cenários verificados pelos testes unitários/API.

Rollback deve manter a migração aditiva e os serializers privados; retornar a API antiga que depende de URL pública quebraria essas fotos. Não reativar acesso público como rollback automático.

## Nota operacional

Redeploy na Railway reutilizou snapshot de configuração, incluindo preDeploy antigo. Foi necessário deploy novo de fonte para aplicar o comando atualizado. Comandos encadeados são envolvidos explicitamente em sh -c; logs agregados comprovaram a execução. Não presumir que a alteração de setting aplicou-se ao container antigo.

## Dependências

A triagem anterior encontrou6 advisories de produção (1critical/4high/1moderate). O crítico proxy-addr<2.0.8 é GHSA-jqcg-44mw-7w3h, ligado a subnet IPv4-mapped IPv6 malformada; o app usa trust proxy numérico1. Atualização pontual permanece recomendada; nenhum audit fix force ou upgrade amplo foi aplicado.
