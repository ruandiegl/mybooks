# Runbook de segurança da autenticação

## Token ou aparelho comprometido

Revogue todas as `AuthSession` ativas do usuário, force novo login, preserve request IDs relevantes e investigue IP hash/user-agent sem expor tokens. Se houver replay, a aplicação revoga automaticamente a família.

## Segredo JWT/pepper comprometido

Interrompa emissões, gere novos segredos aleatórios base64 de 32 bytes no cofre, revogue todas as sessões, publique a API e force login. Trocar pepper invalida refresh/códigos existentes. Registre horário e escopo; nunca copie o segredo para ticket/log.

## Chave de CPF comprometida

Restrinja acesso ao banco/backup, preserve evidência e acione o responsável por privacidade. Rotação da chave AES/HMAC exige migração controlada: descriptografar com chave antiga em processo isolado, recriptografar/recalcular HMAC com novas chaves, validar unicidade e destruir material temporário. Avalie notificação legal.

## Brute force ou enumeração

Confirme picos de `RATE_LIMITED` por rota/request ID, reduza temporariamente limites ou bloqueie origem no edge sem mudar mensagens públicas. Não informe se e-mail/CPF existe. Considere ampliar cooldown e adicionar desafio/MFA em evolução futura.

## Vazamento ou falha de e-mail

Revogue códigos pendentes afetados e gere novos. Códigos são de uso único e expiram em 15 minutos. Falha do provedor não muda a resposta pública; monitore `VERIFICATION_EMAIL_FAILED`/`PASSWORD_RESET_EMAIL_FAILED` sem destinatário.

## Banco ou backup

Antes de migração, produza backup e execute restore em ambiente isolado. Restrinja acesso às colunas `passwordHash`, `cpfHash`, `cpfEncrypted`, códigos e sessões. Logs e exports de suporte devem excluir esses campos.

## LGPD e encerramento

Atenda acesso/exportação usando campos públicos e dados estritamente necessários. A remoção deve incluir usuário, sessões, códigos e objetos R2 conforme retenção aprovada. CPF/telefone não podem ser reutilizados para assinatura sem transparência e base legal definidas.
