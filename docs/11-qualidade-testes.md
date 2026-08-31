# 11. Qualidade e testes

## Verificações atuais

A suíte possui 29 testes Vitest em 9 arquivos. Ela cobre fundação HTTP, ISBN, livros, ownership, matches, chat, chaves R2, template de e-mail e funções puras do fluxo mobile. O app usa TypeScript estrito como primeira barreira. Antes de uma entrega:

```bash
cd API
npm run lint
npm test
npx prisma validate
npx prisma generate

cd ../app
npm run typecheck
npx expo-doctor
npx expo export --platform android --output-dir .validation-export --clear
```

## Casos prioritários

- dígitos verificadores ISBN-10 e ISBN-13;
- rota privada sem identidade;
- usuário não pode alterar livro/imagem de outra pessoa;
- LIKE repetido e mensagem repetida não duplicam dados;
- match só nasce com interesse mútuo;
- membro não autorizado não entra em sala;
- presign rejeita tipo e tamanho inválidos;
- falha de BrasilAPI, R2 ou Resend não expõe segredo.
- consulta ISBN não sobrescreve campo já revisado no app;
- mensagem otimista é substituída sem duplicação e falha permite retry.

## Definition of Done

Código compila, lint e testes passam, migração foi exercitada em PostgreSQL, fluxo foi testado em Android/iOS proporcionalmente ao risco, estados de UI estão completos e documentação/contrato foram atualizados.

Se Docker, credenciais ou dispositivo não estiverem disponíveis, o item correspondente permanece explicitamente pendente; validação estática não deve ser registrada como teste ponta a ponta.
