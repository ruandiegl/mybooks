# Especificação 007 — TrocaLivros Web/PWA para iPhone

## Objetivo

Entregar uma URL HTTPS instalável na Tela de Início do iPhone que use a mesma conta, API e dados do APK Android e apresente as mesmas telas, textos, identidade visual e regras de negócio. A banca deve conseguir percorrer os fluxos tanto no Safari quanto no ícone instalado.

## Decisões de produto

- Criar `web/` como área exclusiva de build, publicação e infraestrutura da PWA. Reutilizar o projeto Expo/React Native Web em `app/` como fonte das telas, componentes, textos e tokens visuais; adaptações de navegador ficam em arquivos `.web.ts(x)` bem delimitados. Não criar uma segunda cópia das telas em `web/`.
- Publicar `web/` como serviço separado no mesmo projeto/ambiente Railway da API. O serviço web serve os arquivos estáticos e encaminha `/api/v1`, `/health`, `/socket.io` e `/covers` à API pela rede privada do Railway; para o Safari, tudo aparece no mesmo endereço HTTPS da PWA.
- O PWA consome a API e o PostgreSQL já hospedados no Railway. O navegador nunca se conecta diretamente ao banco ou usa credenciais R2.
- A entrega iOS é uma web app instalada pelo Safari, sem binário iOS ou submissão à App Store para a banca.
- Todos os fluxos atuais do APK devem funcionar no PWA: cadastro e confirmação de e-mail, login/recuperação/sessão, onboarding, perfil/avatar, biblioteca e livros, descoberta/interações, matches, mensagens/chat, busca por ISBN, leitura de código quando a câmera do Safari permitir, upload de capa, estados de erro e logout.
- O recurso Premium vigente no momento da implementação deve ter a mesma interface e regras em ambos os clientes. A decisão desta conversa para o MVP é teste grátis de **30 dias exatos**, sem cobrança real, e limite gratuito de **15 curtidas de livros por dia**. O PWA não deve introduzir checkout nem simular pagamento.
- Em telas de iPhone, comparar aparência e comportamento com o APK nos mesmos estados de dados. Diferenças impostas pelo navegador, como barra do sistema e permissões, podem ter apresentação própria sem retirar funcionalidades.
- Exigir HTTPS, sessão persistente segura, acesso somente aos dados autorizados, instalação confiável, atualização da versão publicada e comportamento claro quando a rede cair. O MVP não precisa oferecer uso completo offline nem push.

## Estado do repositório em 28/09/2026

O checkout atual contém Expo 57, React Native Web, React Navigation e uma exportação web que conclui. Porém, `app/.env` ainda aponta para IP local, `expo-secure-store` é usado sem implementação web, não há área `web/`, manifesto ou service worker, e a navegação não configura URLs web. As telas usam vários `Alert.alert`, câmera e seletor de imagens que precisam de verificação em Safari real. Não foi encontrado código Premium/ensaio grátis neste checkout, apesar das decisões posteriores ao plano 006; sua integração é uma dependência explícita, não algo a presumir como concluído. Documentos antigos ainda citam Clerk ou Stripe e devem ser atualizados conforme o código real.

## Critérios de aceite

1. URL HTTPS abre no Safari do iPhone, pode ser adicionada à Tela de Início e abre em modo standalone com ícone/nome TrocaLivros.
2. O usuário percorre cada fluxo da matriz funcional com a mesma conta e dados do APK; não há botões sem ação nem alertas invisíveis na web.
3. Fechar e reabrir o PWA restaura a sessão válida; logout, revogação e refresh inválido removem acesso. Tokens de refresh não aparecem em `localStorage`, `sessionStorage`, URL ou logs.
4. API HTTP, Socket.IO e mídias carregam via HTTPS no iPhone fora da rede local, pelo origin da PWA e proxy privado Railway; o servidor restringe origens e valida autorização em todas as rotas e eventos.
5. Câmera, foto de avatar e capa são aceitas em iPhone físico; permissão negada/indisponível mantém o preenchimento manual do ISBN e um caminho claro de recuperação. Se o scanner existente falhar em Safari, implementar um adaptador web antes de declarar paridade.
6. Premium de teste, caso implementado na base correta, mostra o mesmo bottom sheet e estados no PWA, inclusive abrir no login, fechar tocando fora/arrastando para baixo, ativar 30 dias e aplicar a cota gratuita no servidor.
7. Publicar nova versão não deixa o PWA preso em assets antigos; sem rede, há mensagem recuperável sem expor dados privados em cache.

## Fora do escopo desta entrega

Cobrança real, lojas Apple/Google, push, experiência completa offline e reconstrução em um frontend web separado.

## Fontes internas

`docs/README.md`, `docs/01` a `docs/16`, `docs/seguranca-auth-runbook.md`, código de `app/` e `API/`, decisões posteriores da conversa e [levantamento de fontes](./plan-007-versao-web-pwa-ios-fontes.md). Documentos históricos que divergem do runtime são usados como contexto, não como autorização para reintroduzir Clerk ou cobrança real.
