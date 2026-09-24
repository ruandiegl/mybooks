# Plano 005 — Leitura de código de barras e autocadastro por ISBN

- Status: IMPLEMENTADO — ACEITE FÍSICO PENDENTE
- Tipo: MOBILE / API / TESTES / DOCUMENTAÇÃO
- Prioridade: MÉDIA
- Data de criação: 11/09/2026
- Escopo: permitir que o usuário leia o código de barras de um livro, extraia o ISBN e use o lookup existente para preencher o cadastro automaticamente

> **Para agentes de implementação:** usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Marque cada etapa com checkbox (`- [ ]`) e faça uma verificação independente ao final de cada tarefa.

## Resultado da execução em 11/09/2026

- [x] Tarefas 1–7 implementadas, testadas e revisadas.
- [x] Tarefa 8 — verificações automatizadas da API, app, Prisma, Expo Doctor e export Android concluídas.
- [ ] Tarefa 8 — aceite com câmera em Android e iOS físicos permanece externo; esta máquina não possui ADB/dispositivo Android e não executa iOS.
- Registro detalhado: `plans/plan-005-execution-log.md`.

**Objetivo:** adicionar leitura de código de barras EAN-13 na tela de cadastro de livros, transformar leituras de livros em ISBN-13 válidos e preencher os dados pelo endpoint existente da BrasilAPI, mantendo o cadastro manual como alternativa.

**Arquitetura:** o mobile abrirá um componente nativo de câmera em um modal dentro de `BookCreate`, limitará a leitura a EAN-13, aceitará somente códigos com prefixo ISBN `978` ou `979` e enviará o ISBN normalizado ao endpoint privado existente `/api/v1/isbn/:isbn`. A API continuará sendo a autoridade: valida o dígito verificador, consulta a BrasilAPI com timeout/cache e retorna apenas o contrato `IsbnLookup`; nenhum frame da câmera será enviado ou armazenado.

**Stack:** Expo 57, React Native 0.86, TypeScript, `expo-camera` alinhado ao SDK 57, React Navigation, TanStack Query, Axios, Express 5, Zod, Prisma 6, `express-rate-limit` e BrasilAPI.

**Especificação:** regras existentes em `docs/README.md`, `docs/01-visao-geral.md`, `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/04-backend-api.md`, `docs/05-contrato-api.md`, `docs/06-banco-de-dados.md`, `docs/07-autenticacao-seguranca.md`, `docs/08-tempo-real-chat.md`, `docs/09-design-system-components.md`, `docs/10-docker-ambientes.md`, `docs/11-qualidade-testes.md`, `docs/12-contribuicao.md`, `docs/13-pendencias-conhecidas.md`, `docs/14-execucao-do-mvp.md`, `docs/15-matriz-validacao-mvp.md`, `docs/16-historico-de-alteracoes.md` e `docs/seguranca-auth-runbook.md`.

## Decisões de produto e escopo

- O botão “Ler código de barras” ficará em `BookCreate`; isso cobre automaticamente o cadastro iniciado pela Biblioteca, pelo Perfil e pelo onboarding de livros, porque todos navegam para a mesma tela.
- A primeira versão aceitará EAN-13 de livros (`ean13`) com prefixo `978` ou `979`. Um ISBN-10 físico normalmente aparece no varejo como EAN-13 convertido; ISBN-10 digitado manualmente continuará aceito pelo fluxo existente.
- O scanner preencherá o ISBN e iniciará o lookup automaticamente. O usuário poderá revisar e editar título, autores, editora, ano, páginas, temas e sinopse antes de publicar.
- A capa retornada pela BrasilAPI será tratada apenas como metadado de sugestão. A capa persistida continuará seguindo o upload existente para o Cloudflare R2; não será criada uma URL externa arbitrária no mobile.
- Um código inválido, produto que não seja livro ou ISBN não encontrado não fecha o fluxo manual: o scanner informa o problema, e o usuário pode tentar novamente ou digitar o ISBN.
- A câmera será usada somente enquanto o modal estiver visível. O resultado do código será mantido em memória, sem upload de imagem, log de frame ou armazenamento local.

## Restrições globais

- A API continua sendo a autoridade do ISBN; o cliente não pode marcar `hasIsbnBadge`, `isbnProvider`, `isbnStatus` ou `coverExternalUrl`.
- O mobile envia apenas o ISBN normalizado; nunca envia frames, fotos da câmera, credenciais ou chaves da BrasilAPI.
- O scanner aceita somente `ean13`; QR Code, EAN-8, UPC e códigos de produtos comuns devem permanecer fora do fluxo de ISBN.
- ISBN-13 precisa ter 13 dígitos, prefixo `978`/`979` e dígito verificador válido antes de disparar a consulta.
- O endpoint privado mantém bearer nativo, envelope `{ data }`/`{ error }`, timeout externo e rate limit; respostas de erro não expõem stack, URL interna ou payload bruto do provedor.
- A permissão de câmera precisa ter texto explícito em português no `app.json`; negar a permissão deve produzir uma alternativa de uso manual.
- O projeto continua usando TypeScript no app, JavaScript ESM na API, tokens do tema, componentes nativos e arquivos `index.tsx` + `styles.ts` quando a tela/componente possuir estilos próprios.
- A dependência deve ser instalada com `npx expo install expo-camera` para respeitar a versão do Expo 57 e atualizar `package-lock.json` de forma reproduzível.
- Teste de câmera exige dispositivo físico; testes unitários e `expo export` não substituem validação Android/iOS real.

## Segurança e confiabilidade

1. Permissão solicitada somente quando o usuário inicia a leitura, com estado de carregamento, negada e bloqueada permanentemente.
2. Apenas a câmera traseira será usada e apenas EAN-13 ficará habilitado no scanner.
3. `onBarcodeScanned` será removido (`undefined`) ou a câmera será desativada assim que uma leitura válida for aceita, evitando callbacks duplicados e consultas repetidas.
4. O cliente ignorará leituras repetidas do mesmo valor enquanto a consulta estiver pendente; o servidor manterá o cache curto por ISBN existente.
5. A API normalizará e validará novamente o ISBN, mesmo que o cliente já tenha validado o dígito.
6. O endpoint de ISBN terá limite específico configurável além do limite geral da API, protegendo a cota da BrasilAPI contra repetição e abuso.
7. Timeout, resposta `404`, `429` e indisponibilidade do provedor continuarão mapeados para erros de domínio em português.
8. Códigos não ISBN e conteúdo que pareça URL ou texto livre nunca serão enviados ao provedor.
9. O modal respeitará safe area, teclado não ficará sobre a câmera, ações terão `accessibilityLabel` e alvos de toque de pelo menos 44 pt/48 dp.
10. A câmera será desmontada ou ficará inativa ao fechar o modal, ao sair da tela ou ao receber um ISBN válido.

## Mapa de arquivos

### Criar

- `app/src/features/books/barcode.ts`: normalização e validação local de resultados EAN-13, sem dependência de React Native ou câmera.
- `app/src/features/books/__tests__/barcode.test.ts`: testes puros de prefixo, dígito verificador, tipo de código, caracteres e leituras inválidas.
- `app/src/components/BarcodeScannerModal/index.tsx`: permissão, preview, configuração EAN-13, lock de leitura, estados de erro e retorno do ISBN.
- `app/src/components/BarcodeScannerModal/styles.ts`: overlay, moldura de leitura, textos, ações e estados de permissão conforme tokens do tema.
- `API/src/modules/isbn/isbn.schemas.js`: schema Zod dos parâmetros de lookup, com limite explícito de tamanho.
- `API/tests/isbn.service.test.js`: contrato de normalização/validação e mapeamento de dados retornados pela BrasilAPI.
- `API/tests/isbn.routes.test.js`: status, envelope, validação dos parâmetros e rate limit específico do endpoint.

### Modificar

- `app/package.json`, `app/package-lock.json`: adicionar `expo-camera` na versão compatível com Expo 57.
- `app/app.json`: registrar o plugin `expo-camera` e a mensagem de permissão da câmera.
- `app/src/pages/BookCreate/index.tsx`: adicionar ação de scanner, abrir/fechar o modal, aceitar ISBN e reutilizar o lookup atual sem corrida de estado.
- `app/src/pages/BookCreate/styles.ts`: layout do botão de scanner e eventual agrupamento das ações do campo ISBN.
- `app/src/features/books/isbnForm.ts`: compartilhar normalização/checksum do ISBN com o parser do scanner, sem substituir a validação da API.
- `API/src/config/env.js`, `API/.env.example`: adicionar limite configurável de consultas ISBN.
- `API/src/modules/isbn/isbn.controller.js`: validar `req.params` com Zod antes de chamar o service.
- `API/src/modules/isbn/isbn.routes.js`: aplicar rate limit específico para lookup autenticado.
- `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/04-backend-api.md`, `docs/05-contrato-api.md`, `docs/07-autenticacao-seguranca.md`, `docs/09-design-system-components.md`, `docs/10-docker-ambientes.md`, `docs/11-qualidade-testes.md`, `docs/13-pendencias-conhecidas.md`, `docs/14-execucao-do-mvp.md`, `docs/15-matriz-validacao-mvp.md`, `docs/16-historico-de-alteracoes.md`: documentar scanner, permissão, contrato, rate limit, limitações de dispositivo e evidências.

**Skills/agentes locais:** nenhum `.agents/skills` é específico para Expo Camera ou ISBN; o diretório local contém skills de Clerk, que não devem ser usadas nesta implementação. O plano usa `superpowers:writing-plans` para decomposição, `superpowers:test-driven-development` na execução e documentação oficial Expo consultada pelo Context7.

## Tarefas de implementação

### Tarefa 1: fechar contrato de leitura e limites do fluxo

**Agente/skill local:** nenhum `.agents` aplicável; usar as regras de `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/04-backend-api.md` e `docs/05-contrato-api.md`.

**Arquivos:**
- Ler: `app/src/pages/BookCreate/index.tsx`, `app/src/features/books/isbnForm.ts`, `API/src/modules/isbn/isbn.utils.js`, `API/src/modules/isbn/isbn.service.js`.
- Documentar depois: `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/05-contrato-api.md`.

**Interfaces produzidas:**

```ts
type BarcodePayload = { data: string; type?: string };

function extractIsbnFromBarcode(payload: BarcodePayload): string | null;

type BarcodeScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onIsbnScanned: (isbn: string) => void;
};
```

- [ ] **Passo 1: registrar a decisão de que `BookCreate` é o único ponto de integração.** Não criar uma segunda tela de cadastro para `OnboardingBooks`; confirmar no código que onboarding, Perfil e Biblioteca navegam para `BookCreate`.
- [ ] **Passo 2: registrar o contrato de sucesso.** O scanner entrega somente `978...`/`979...` normalizado; `BookCreate` preenche o ISBN e chama `GET /api/v1/isbn/:isbn`; o restante continua sendo preenchido por `mergeIsbnLookup`.
- [ ] **Passo 3: registrar o contrato de falha.** Permissão negada, EAN não ISBN, ISBN inválido, `404`, `429`, timeout e erro de rede deixam o campo manual utilizável e mostram uma mensagem acionável em português.
- [ ] **Passo 4: confirmar o não escopo.** Não adicionar Google Books, OCR, leitura de ISBN-10 direto, upload automático de capa, alteração do schema Prisma ou armazenamento de imagens da câmera.

**Critério de aceite:** um implementador consegue apontar exatamente onde o scanner entra, qual dado sai dele, qual endpoint já existe e quais dados continuam sendo responsabilidade do usuário/API.

### Tarefa 2: implementar parser puro de EAN-13 para ISBN

**Arquivos:**
- Criar: `app/src/features/books/barcode.ts`, `app/src/features/books/__tests__/barcode.test.ts`.
- Modificar: `app/src/features/books/isbnForm.ts` somente se a função de normalização compartilhada for extraída sem alterar o contrato atual.

**Interface:**

```ts
export type BarcodePayload = { data: string; type?: string };

export function extractIsbnFromBarcode(payload: BarcodePayload): string | null;
```

- [ ] **Passo 1: escrever os testes que devem falhar.** Cobrir pelo menos:

```ts
expect(extractIsbnFromBarcode({ type: 'ean13', data: '978-85-457-0287-0' })).toBe('9788545702870');
expect(extractIsbnFromBarcode({ type: 'ean13', data: '9791234567896' })).toBe('9791234567896');
expect(extractIsbnFromBarcode({ type: 'ean13', data: '7891234567895' })).toBeNull();
expect(extractIsbnFromBarcode({ type: 'qr', data: '9788545702870' })).toBeNull();
expect(extractIsbnFromBarcode({ type: 'ean13', data: '9788545702871' })).toBeNull();
expect(extractIsbnFromBarcode({ type: 'ean13', data: 'https://example.com/9788545702870' })).toBeNull();
```

- [ ] **Passo 2: executar o teste isolado.** Rodar `cd app; npm test -- --run src/features/books/__tests__/barcode.test.ts`; confirmar falha por módulo/função ausente.
- [ ] **Passo 3: implementar a função mínima.** Exigir `payload.type === 'ean13'`, aceitar somente uma sequência de 13 dígitos com separadores de impressão opcionais, exigir prefixo `978` ou `979`, calcular o dígito verificador ISBN-13 e retornar os 13 dígitos; qualquer outra entrada retorna `null` sem lançar exceção.
- [ ] **Passo 4: rodar o teste novamente.** Confirmar que os casos válidos passam e que EAN de produto, QR, URL, ISBN inválido e texto livre são rejeitados.
- [ ] **Passo 5: garantir isolamento.** A função não importará `CameraView`, `Alert`, `fetch`, Axios ou estado React; isso permite testar o parser em Vitest sem ambiente nativo.

**Critério de aceite:** o parser não aceita um código comercial qualquer como ISBN e nunca substitui a validação server-side.

### Tarefa 3: adicionar `expo-camera` e permissão nativa

**Arquivos:**
- Modificar: `app/package.json`, `app/package-lock.json`, `app/app.json`.

- [ ] **Passo 1: instalar a dependência alinhada ao SDK.** Executar `cd app; npx expo install expo-camera`; não escolher manualmente uma versão incompatível com `expo@~57.0.22`.
- [ ] **Passo 2: registrar o plugin.** Adicionar ao `expo.plugins`:

```json
[
  "expo-camera",
  {
    "cameraPermission": "Permita que o TrocaLivros use a câmera para ler o ISBN dos livros."
  }
]
```

- [ ] **Passo 3: conferir a configuração gerada.** Executar `cd app; npx expo config --type public` e confirmar que o plugin `expo-camera` está presente, sem adicionar permissão de microfone para este recurso.
- [ ] **Passo 4: validar a instalação.** Executar `cd app; npm run typecheck; npx expo-doctor`; registrar qualquer bloqueio de SDK antes de avançar para a tela.
- [ ] **Passo 5: registrar a restrição de execução.** A documentação deve informar que a câmera funciona em dispositivo Android/iOS; o app completo já depende de módulos nativos e deve ser validado em development build/distribuição apropriada, não apenas no Web.

**Critério de aceite:** o pacote está no lockfile, a permissão tem texto de produto e o projeto consegue resolver a configuração Expo sem dependência manual de Android/iOS.

### Tarefa 4: criar o modal de scanner com estados de permissão e leitura

**Arquivos:**
- Criar: `app/src/components/BarcodeScannerModal/index.tsx`, `app/src/components/BarcodeScannerModal/styles.ts`.
- Usar: `app/src/features/books/barcode.ts`, `app/src/styles/theme.ts`, `app/src/components/AppButton`.

**Interface:**

```tsx
<BarcodeScannerModal
  visible={scannerVisible}
  onClose={() => setScannerVisible(false)}
  onIsbnScanned={(isbn) => handleScannedIsbn(isbn)}
/>;
```

- [ ] **Passo 1: escrever a matriz de estados do componente.** Implementar estados `permission-loading`, `permission-denied`, `permission-blocked`, `ready`, `invalid-barcode`, `reading` e `closed`; cada estado deve ter texto, ação e acessibilidade definidos.
- [ ] **Passo 2: solicitar permissão somente ao abrir.** Usar `useCameraPermissions`; quando `visible` ficar verdadeiro e a permissão ainda não existir, chamar `requestPermission`. Não solicitar câmera no boot do app.
- [ ] **Passo 3: configurar a câmera.** Renderizar `CameraView` traseira com:

```tsx
barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
onBarcodeScanned={locked ? undefined : handleBarcodeScanned}
active={visible && permission.granted}
```

Desmontar o modal ou desativar `active` ao fechar.
- [ ] **Passo 4: tratar callback duplicado.** Usar `locked`/`lastData` em memória; ao receber resultado, chamar `extractIsbnFromBarcode`, bloquear leitura válida antes de `onIsbnScanned` e fechar o modal. Leituras inválidas continuam no scanner com uma mensagem curta, sem disparar API.
- [ ] **Passo 5: tratar permissão negada.** Mostrar “Permissão de câmera necessária para ler o ISBN”, botão “Tentar novamente” e, quando o sistema indicar bloqueio permanente, ação para abrir configurações usando `Linking.openSettings`; manter botão “Digitar ISBN”.
- [ ] **Passo 6: construir a UI com tokens.** Usar safe area, overlay escuro, moldura central, instrução “Aponte para o código de barras do livro”, botão de fechar com `accessibilityLabel="Fechar leitor de código de barras"` e alvo mínimo de 44 pt.
- [ ] **Passo 7: validar o componente sem câmera real.** Mockar `expo-camera` somente para verificar estados de permissão/lock em teste de componente se o runner comportar o mock; não declarar o teste unitário como substituto do teste físico.

**Critério de aceite:** nenhum callback válido gera duas consultas, fechar o modal interrompe a câmera e toda permissão/erro possui caminho manual.

### Tarefa 5: integrar leitura ao cadastro de livro

**Arquivos:**
- Modificar: `app/src/pages/BookCreate/index.tsx`, `app/src/pages/BookCreate/styles.ts`.
- Reutilizar: `app/src/features/books/isbnForm.ts`, `BarcodeScannerModal`, `mergeIsbnLookup`.

- [ ] **Passo 1: escrever teste de integração da função de lookup.** Extrair o valor de consulta para uma função que receba o ISBN explicitamente e cobrir que o resultado do scanner não depende de um `setState` assíncrono:

```ts
lookupIsbn(isbn: string): void;
// deve normalizar, preencher o campo, bloquear duplicata da mesma busca e chamar GET uma vez
```

- [ ] **Passo 2: refatorar `lookupIsbn`.** Mudar de leitura implícita apenas de `form.isbn` para `lookupIsbn(value = form.isbn)`, normalizar `value`, atualizar `pendingIsbn`, preservar `lastConfirmedIsbn` e disparar a mutation existente.
- [ ] **Passo 3: adicionar a ação visual.** Dentro do `isbnCard`, manter `TextField` e “Buscar” manual e adicionar `AppButton` secundário/outline com ícone de scanner e label “Ler código”. Em largura pequena, empilhar as ações sem reduzir o campo a uma área não utilizável.
- [ ] **Passo 4: ligar o callback.** Implementar `handleScannedIsbn(isbn)` para fechar o modal, chamar `set('isbn', isbn)` e imediatamente chamar `lookupIsbn(isbn)` com o argumento recém-lido.
- [ ] **Passo 5: preservar revisão manual.** `mergeIsbnLookup` deve continuar preenchendo somente campos que o usuário ainda não editou; dados já digitados nunca são substituídos silenciosamente. O ISBN deve permanecer no campo mesmo quando a BrasilAPI retornar `404`/`503`.
- [ ] **Passo 6: manter a capa fora do escopo automático.** Não converter `lookup.book.coverUrl` em imagem R2 nesta tarefa; a seleção/upload manual existente continua disponível e o backend segue sendo responsável pelo selo ISBN.
- [ ] **Passo 7: verificar os três pontos de entrada.** Abrir `BookCreate` a partir de `OnboardingBooks`, `Profile` e `Library`; confirmar que o mesmo botão e o mesmo fluxo são apresentados.

**Critério de aceite:** um ISBN lido preenche a tela, consulta o backend uma única vez, permite revisão e publicação; o fluxo manual continua funcionando quando a câmera, a permissão, a rede ou o provedor falham.

### Tarefa 6: endurecer o endpoint de ISBN para o novo padrão de uso

**Arquivos:**
- Criar: `API/src/modules/isbn/isbn.schemas.js`, `API/tests/isbn.service.test.js`, `API/tests/isbn.routes.test.js`.
- Modificar: `API/src/modules/isbn/isbn.controller.js`, `API/src/modules/isbn/isbn.routes.js`, `API/src/config/env.js`, `API/.env.example`.

**Interfaces produzidas:**

```js
export const isbnParamsSchema = z.object({
  isbn: z.string()
    .trim()
    .min(10)
    .max(32)
    .regex(/^[0-9Xx-]+$/, 'ISBN deve conter somente dígitos, hífens ou X')
}).strict();

// variáveis novas
ISBN_RATE_LIMIT_WINDOW_MS=60000
ISBN_LOOKUP_LIMIT=30
```

- [ ] **Passo 1: escrever teste de parâmetros.** Garantir que o controller rejeita parâmetros vazios, maiores que 32 caracteres ou com formato incompatível antes de consultar a BrasilAPI, retornando `422` no envelope de erro do projeto.
- [ ] **Passo 2: escrever teste de resposta.** Stubar `fetch` com um payload BrasilAPI válido e confirmar `200`, `{ data }`, ISBN normalizado e o mapeamento atual de `title`, `authors`, `publisher`, `synopsis`, `year`, `pageCount`, `subjects` e `coverUrl`.
- [ ] **Passo 3: escrever teste de falha.** Cobrir `404 → ISBN_NOT_FOUND`, `429 → ISBN_PROVIDER_RATE_LIMITED`, timeout/erro de rede → `ISBN_PROVIDER_UNAVAILABLE` e checksum inválido → `ISBN_INVALID`; confirmar que nenhum payload bruto do provedor chega à resposta.
- [ ] **Passo 4: escrever teste do limite.** Com limite de teste `2` em uma janela curta, confirmar duas respostas normais e a terceira como `429`/`RATE_LIMITED`, sem headers legados; a chave deve priorizar usuário autenticado e usar IP como fallback.
- [ ] **Passo 5: implementar schema e controller.** Fazer `isbnParamsSchema.parse(req.params)` antes de `isbnService.lookup`; o service continua normalizando, validando checksum e usando o cache de 10 minutos já existente.
- [ ] **Passo 6: implementar rate limit configurável.** Aplicar limiter somente à rota autenticada de ISBN, usando `standardHeaders`, `legacyHeaders: false`, `ISBN_RATE_LIMIT_WINDOW_MS` e `ISBN_LOOKUP_LIMIT`; não remover o limite geral da API.
- [ ] **Passo 7: validar código existente de livros.** Executar os testes de `books.service` para confirmar que o cadastro manual com ISBN válido continua salvando `isbnStatus=VALID`, `isbnProvider` e `coverExternalUrl` derivados pelo servidor.

**Critério de aceite:** o scanner não abre uma nova superfície sem controle; o lookup suporta o volume esperado, protege o provedor e mantém compatibilidade com `BookCreate`, `BookEdit` e o contrato atual.

### Tarefa 7: atualizar documentação e matriz de validação

**Arquivos:**
- Modificar: `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/04-backend-api.md`, `docs/05-contrato-api.md`, `docs/07-autenticacao-seguranca.md`, `docs/09-design-system-components.md`, `docs/10-docker-ambientes.md`, `docs/11-qualidade-testes.md`, `docs/13-pendencias-conhecidas.md`, `docs/14-execucao-do-mvp.md`, `docs/15-matriz-validacao-mvp.md`, `docs/16-historico-de-alteracoes.md`.

- [ ] **Passo 1: documentar o fluxo mobile.** Registrar que `BookCreate` oferece leitura EAN-13 com fallback manual, que somente `978/979` é aceito e que a câmera exige dispositivo físico/permissão.
- [ ] **Passo 2: documentar o contrato API.** Registrar que `/api/v1/isbn/:isbn` permanece privado, valida checksum, aplica timeout/cache/rate limit e retorna o envelope `IsbnLookup`; não criar endpoint separado para “barcode”.
- [ ] **Passo 3: documentar ambiente.** Incluir `expo-camera`, plugin/permissão, `ISBN_RATE_LIMIT_WINDOW_MS`, `ISBN_LOOKUP_LIMIT` e o comando `npx expo install expo-camera` sem credenciais.
- [ ] **Passo 4: atualizar pendências.** Manter como aceite externo o teste em Android/iOS físico, permissão negada, câmera em baixa luz, códigos danificados, BrasilAPI indisponível e eventual política futura de capa automática.
- [ ] **Passo 5: registrar histórico e evidência.** Adicionar a mudança ao histórico somente depois dos testes passarem; na matriz, separar testes unitários, export do bundle e validação real em dispositivo.

**Critério de aceite:** a documentação não promete leitura de ISBN-10 direto nem execução de câmera no Web, e uma pessoa nova consegue configurar a permissão e executar o fluxo sem inventar endpoint ou pacote.

### Tarefa 8: executar aceite automatizado e manual

**Arquivos:**
- Modificar: `docs/15-matriz-validacao-mvp.md` com os resultados reais.
- Testar: `app/src/features/books/__tests__/barcode.test.ts`, `API/tests/isbn.utils.test.js`, `API/tests/isbn.provider.test.js`, `API/tests/isbn.service.test.js`, `API/tests/isbn.routes.test.js`, `API/tests/books.service.test.js`.

- [ ] **Passo 1: executar API.** Rodar:

```bash
cd API
npm run lint
npm test
npx prisma validate
npx prisma generate
```

- [ ] **Passo 2: executar app.** Rodar:

```bash
cd ../app
npm test
npm run typecheck
npx expo-doctor
npx expo export --platform android --output-dir .validation-export --clear
```

Remover `.validation-export` após conferir o bundle, sem apagar qualquer diretório do usuário.
- [ ] **Passo 3: validar Android físico.** Com câmera permitida, escanear um livro EAN-13 `978` e um `979`, confirmar preenchimento, revisão, publicação e selo ISBN. Escanear um EAN de produto e confirmar mensagem sem request de lookup.
- [ ] **Passo 4: validar estados negativos.** Repetir com permissão negada, bloqueada, câmera sem foco, código danificado, BrasilAPI retornando `404`, rede offline e limite excedido; confirmar fallback manual em todos.
- [ ] **Passo 5: validar iOS físico.** Confirmar texto de permissão, fechamento por gesto/botão, `active=false`/desmontagem, safe area, redução de movimento e nenhum preview concorrente.
- [ ] **Passo 6: validar regressão do cadastro manual.** Digitar ISBN-10 e ISBN-13 com hífens, buscar, editar campos sugeridos e publicar com/sem capa; confirmar que `BookEdit` e Biblioteca continuam intactos.
- [ ] **Passo 7: atualizar a matriz.** Registrar comandos, versões, dispositivo, resultado e limitações externas; não marcar produção pronta sem domínio/HTTPS, BrasilAPI monitorada e testes reais em dispositivos.

**Critério de aceite:** o fluxo automatizado passa, o bundle é exportado e o roteiro físico comprova leitura única, preenchimento correto, fallback manual e desligamento seguro da câmera.

## Ordem e dependências

1. Tarefa 1 — contrato, escopo e pontos de integração.
2. Tarefa 2 — parser EAN-13/ISBN puro.
3. Tarefa 3 — dependência Expo e permissões.
4. Tarefa 4 — modal nativo de scanner.
5. Tarefa 5 — integração com `BookCreate` e três entradas existentes.
6. Tarefa 6 — schema, rate limit e testes do endpoint ISBN.
7. Tarefa 7 — documentação viva.
8. Tarefa 8 — validação automatizada e física.

As tarefas 2 e 6 podem ser desenvolvidas em paralelo depois da Tarefa 1. A Tarefa 5 depende das Tarefas 2–4. A Tarefa 8 só pode ser concluída após a Tarefa 7 e exige dispositivo físico para a parte de câmera.

## Definition of Done específica

- `expo-camera` está alinhado ao Expo 57, no lockfile e no plugin com mensagem de permissão em português.
- O scanner usa `CameraView`, câmera traseira, `useCameraPermissions`, `barcodeScannerSettings.barcodeTypes=['ean13']` e desativa callbacks após uma leitura válida.
- Somente EAN-13 ISBN `978/979` com dígito válido chega ao lookup; ISBN-10 continua disponível por entrada manual.
- `BookCreate` inicia o lookup com o ISBN escaneado sem race de estado e preserva os campos editados pelo usuário.
- A câmera não envia nem armazena frames, não registra dados sensíveis e fecha/desmonta corretamente.
- `/api/v1/isbn/:isbn` mantém validação server-side, timeout, cache, envelopes, erros sanitizados e rate limit específico.
- BrasilAPI não é chamada para QR, EAN de produto, URL ou ISBN inválido.
- Permissão negada, leitor indisponível, ISBN não encontrado, rate limit e erro de rede sempre possuem fallback manual.
- Testes unitários, lint, typecheck, Prisma, Expo Doctor e export passam conforme a matriz; testes Android/iOS reais são registrados separadamente.
- Documentação, histórico e pendências conhecidas descrevem exatamente o comportamento entregue.

## Auto-revisão do plano

- Cobertura: o plano atribui dependências, parser, permissão, scanner, integração com `BookCreate`, contrato ISBN, rate limit, segurança, testes, documentação e aceite físico a tarefas específicas.
- Placeholders proibidos: não há `TBD`, `TODO` ou instrução genérica sem arquivo, interface, comando ou critério.
- Consistência: `extractIsbnFromBarcode`, `BarcodeScannerModal`, `GET /api/v1/isbn/:isbn`, `IsbnLookup`, `ean13`, `978/979`, `ISBN_RATE_LIMIT_WINDOW_MS` e `ISBN_LOOKUP_LIMIT` mantêm os mesmos nomes em todas as tarefas.
- Escopo: não há mudança de banco, novo provedor bibliográfico, OCR, upload de frame ou capa automática; o plano reaproveita o endpoint e o modelo de livros existentes.
- Risco explícito: `expo-camera` é documentado como disponível no Expo Go e em dispositivos Android/iOS, mas o app completo deve respeitar os módulos nativos/development build já exigidos pelo projeto.

## Referências técnicas consultadas

- Context7 `/expo/expo`: `CameraView`, desativação de `onBarcodeScanned` ao remover o callback e propriedade `active` para interromper a sessão no iOS; fontes oficiais Expo/GitHub consultadas via Context7.
- Context7 `/websites/expo_dev_versions`: documentação oficial de `expo-camera`, `useCameraPermissions`, `CameraView`, `barcodeScannerSettings`, `onBarcodeScanned`, `barcodeTypes`, suporte Android/iOS/Web e observação de execução em dispositivo.
- [Expo Camera — documentação oficial](https://docs.expo.dev/versions/latest/sdk/camera): API de câmera, permissões, `CameraView` e leitura de códigos.
- [Expo config plugins — documentação oficial](https://github.com/expo/expo/blob/main/docs/pages/config-plugins/plugins.mdx): configuração da mensagem de permissão do plugin `expo-camera`.
- [Expo CameraView — fonte oficial](https://github.com/expo/expo/blob/main/packages/expo-camera/src/CameraView.tsx): desativação do scanner quando `onBarcodeScanned` deixa de ser fornecido.
- `API/src/modules/isbn/isbn.utils.js`, `isbn.provider.js`, `isbn.service.js` e `API/tests/isbn.*.test.js`: checksum ISBN-10/13, cache/timeout, BrasilAPI e mapeamento vigente do projeto.
- `docs/01-visao-geral.md`, `docs/02-arquitetura.md`, `docs/03-frontend-mobile.md`, `docs/04-backend-api.md`, `docs/05-contrato-api.md`, `docs/06-banco-de-dados.md`, `docs/07-autenticacao-seguranca.md`, `docs/08-tempo-real-chat.md`, `docs/09-design-system-components.md`, `docs/10-docker-ambientes.md`, `docs/11-qualidade-testes.md`, `docs/12-contribuicao.md`, `docs/13-pendencias-conhecidas.md`, `docs/14-execucao-do-mvp.md`, `docs/15-matriz-validacao-mvp.md`, `docs/16-historico-de-alteracoes.md`, `docs/README.md` e `docs/seguranca-auth-runbook.md`.
