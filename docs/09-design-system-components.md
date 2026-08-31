# 9. Design system e componentes

A direção “biblioteca social de bolso” usa papel quente como fundo, capas em destaque, magenta para ações e violeta para conexão. O selo verde de ISBN verificado é a assinatura funcional da experiência.

## Tokens

Tokens estão em `app/src/styles/theme.ts`. Use nomes semânticos (`background`, `surface`, `foreground`, `primary`, `secondary`, `outline`, `danger`, `success`) em vez de cores soltas. Espaçamento, raio, tipografia e sombra também vêm do tema.

## Tipografia

A família oficial é Be Vietnam Pro. Títulos usam peso 700/800; corpo usa 400; rótulos e ações usam 500/600. Não adicione outra família sem decisão de design registrada.

## Componentes base

`AppButton`, `TextField`, `Card`, `Badge`, `Avatar`, `IsbnBadge`, `AppScreen`, `TopBar`, `StateView`, `BookCard`, `SearchField` e `ToggleGroup` são reutilizáveis. O chat possui primitives próprias em `components/chat`. Estenda variantes nesses componentes antes de copiar estilos para páginas.

## Regras shadcn no mobile

O projeto segue princípios de composição, variantes e tokens do shadcn, implementados com primitives React Native. Não há DOM, Tailwind web ou Radix nas telas nativas. Estados de hover não substituem pressed, focus, disabled, loading, erro e acessibilidade mobile.

## Revisão visual

Verifique telas pequenas, teclado aberto, texto longo, capa ausente, safe area, contraste, alvos de toque de pelo menos 44 pt/48 dp e todos os estados assíncronos. O swipe de descoberta sempre mantém botões equivalentes. A tela respeita redução de movimento e adapta o cartão quando recebe dimensões horizontais, embora o binário atual seja distribuído em orientação retrato.
