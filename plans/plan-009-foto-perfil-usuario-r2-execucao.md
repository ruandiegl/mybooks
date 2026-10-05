# Execução — plano 009: foto de perfil no R2

Data: 05/10/2026. Branch isolada: `codex/foto-perfil-usuario-r2`, base `6eb3300`.
Implementação em revisão; **não publicada** e não incorporada à main nesta tarefa.

## Entrega de código

- Galeria, preparação orientada até 2048 px, prévia circular, pan/pinch nativo, teclado/roda/toque Web, zoom e movimento por botões.
- PNG local 512×512/até 2 MiB; servidor valida bytes/formato/dimensões e produz JPEG 512×512/qualidade 82, sRGB, fundo branco, sem metadados.
- Grant persistente vincula usuário, tamanho, MIME, protocolo, prazo e versão. Claim exclusivo, lock/CAS, confirmação idempotente, remoção que cancela tentativas e limpeza persistente com proteção de referência viva.
- `User.avatarStorageKey`/versão e `AvatarUpload` em migração aditiva; URL legada preservada.
- DTOs allowlisted de sessão/perfil, livros, Curtidas, matches, conversas e mensagens; assinaturas reutilizadas por resposta, sem chave privada nos resumos.
- Renovação por consulta/foreground; fallback de iniciais. Perfil e onboarding usam host único do editor, sem salvar/concluir dados de texto junto da foto.
- Retry conserva PNG/grant e não repete PUT depois de uma confirmação cuja resposta se perdeu. Resultado antigo não atualiza outra sessão.

## Contrato da remoção

DELETE mantém resposta vazia 204 para clientes antigos.
Novo cliente envia `Prefer: return=representation`; recebe 200, `Preference-Applied: return=representation` e `{data: AvatarDescriptor}` com a versão realmente confirmada.
Não é necessário inventar versão no cliente nem disputar uma segunda leitura.

## Evidências locais

| Verificação | Resultado observado |
| --- | --- |
| API lint | passou |
| API Vitest + PostgreSQL de avatar | 254 passaram; 7 testes condicionais preexistentes não executados |
| Migração | nove migrações baseline, depois a aditiva em PostgreSQL 16.14 descartável; User/URL legada preservadas |
| PostgreSQL: claims/CAS/remover/ownership/sweep | cinco testes passaram; grants terminais removidos em lotes de até 20 |
| App Vitest | 126 passaram, incluindo regressões de resize/remoção |
| App typecheck | passou após resize/remoção |
| Export Web e smoke PWA | passaram na revisão de código final |
| Export Android/Hermes | passou na revisão de código final |
| Expo Doctor | 20/21 verificações; patches preexistentes de expo, expo-camera e expo-image-picker desatualizados |
| Docker API com sharp/Linux | não executado: Docker não disponível neste host |

O banco de teste é somente loopback, porta 55439; não é o banco Railway. Fixtures são sintéticas e são removidas por seus IDs; não foi executada seed de produção.
O ensaio no navegador usa o componente Web e os adapters reais, marcadores sintéticos e o normalizador sharp real. Não usa galeria física, API autenticada ou R2 real.

### Ensaio visual do navegador

- Fonte sintética 900×600: recorte central `(150,0,600,600)`, PNG 10.720 bytes e JPEG final real 512×512.
- Zoom 120% e movimento para a direita; resize 375→320 px preservou a área `(166,50,500,500)`. A posição de display passou de 20 para 16,2838 px, mantendo a fração da fonte.
- O ensaio inicialmente revelou callback de geometria antiga/resize. Regressão adicionada; viewport ganhou medidas iniciais corretas e remount do cropper interno sem perder o estado externo.
- Controles visíveis na paleta existente, Save bloqueado durante processamento, foco inicial no cropper.
- Estado de bio preservado no host sintético; isso **não substitui** aceite de edição real do perfil/onboarding ou foco restaurado em aparelho.

## Preflight R2 real — bloqueio de publicação

Consulta somente-leitura do dashboard Cloudflare em 05/10/2026:
bucket `trocalivros` com domínio `media.podepedirppd.com.br` ativo/acesso habilitado e URL pública r2.dev habilitada.
**Não há CORS configurado.** Lifecycle tem apenas a regra padrão de abortar multipart em sete dias, não a expiração de `pending/avatars/`.

Assinatura GET não protege objetos em bucket público. Não foi alterado domínio, CORS, bucket, lifecycle ou credencial; não foi enviada foto real/sintética ao R2.

Antes de liberar cliente:

1. Auditar User/BookImage com `API/prisma/avatar-preflight.sql`, confirmar objetos legados e preparar backup/restore.
2. API privada compatível antes do app, seguida de backfill controlado de referências que pertencem ao bucket; fotos compartilhadas de seed exigem cópia/decisão, não apagar fonte.
3. Validar leituras e só então desativar ambas as exposições públicas; essa mudança exige autorização explícita e janela controlada.
4. Definir CORS para a origem PWA/local de teste com PUT/GET/HEAD e Content-Type; lifecycle de um dia em pending/avatars/ (e regra existente de livros conforme runbook).
5. Ensaiar presign/PUT/HEAD/normalização/GET/expiração/troca/remoção/worker em bucket e conta de teste identificados.
6. Aplicar migração aditiva no alvo com procedimento aprovado; deploy API antes do cliente. Serviços Railway historicamente usam branches específicas, não se deve presumir deploy automático da main.

Rollback conserva migração, chave privada e serializer novo; voltar a código que exige R2_PUBLIC_URL para avatar não é rollback suficiente.

## Pendências de aceite

- Revisão independente da branch e correções importantes.
- R2 privado real, CORS/lifecycle e migração no alvo.
- Docker Linux com sharp.
- iPhone/Android físicos e Safari/PWA instalada: permissões, iCloud/HEIC, EXIF/espelhamento, fonte ampliada, pinch/gestos interrompidos, rede, retry, cancelamento, troca de conta e foco.
- Aceite real de foto independente de nome/bio e foto de segunda conta em feed/Curtidas/chat.
- Atualizações de patch do Expo: avisos anteriores não foram silenciados nem corrigidos por atualização ampla desta tarefa.

## Decisões durante a execução

- Execução inline e uma revisão independente final: mantém uma segunda leitura sem redistribuir cada tarefa.
- Ledger PowerShell em lugar dos scripts POSIX: mesmo registro de limites/evidências; depende de registro manual correto.
- PostgreSQL 16.14 temporário no loopback: testa locks reais sem instalar Docker; não prova o ambiente de produção.
- Teste aceita endpoint S3 virtual-host: não confunde endereço do SDK com CDN pública; R2 real permanece pendente.
- Base R2/grants confirmados no mesmo commit: evita versão intermediária incompatível; o diff de backend é maior.
- DELETE com Prefer opcional: conserva 204 legado e obtém versão atômica; clientes novos exigem API compatível.
- Componentes/adapters/consumidores integrados em commit conjunto: importações permanecem consistentes; revisão deve separar áreas.
- Não alterar bucket público nem atualizar todo SDK automaticamente: protege referências existentes e escopo; publicação permanece bloqueada até o preflight e autorização.

Nenhuma foto pessoal, documento alheio, executável ou export gerado faz parte da entrega versionada.
