import { Text, View } from 'react-native';
import { AppButton } from '../AppButton';
import { TextField } from '../TextField';
import type { useDeleteAccount } from '../../features/auth/useDeleteAccount';
import { useAppTheme } from '../../providers/ThemeProvider';

type Props = { deletion: ReturnType<typeof useDeleteAccount>; onCancel(): void };
export function DeleteAccountForm({ deletion, onCancel }: Props) {
  const { theme } = useAppTheme();
  return <View style={{ gap: theme.spacing.md }}>
    <Text style={{ color: theme.colors.danger, fontFamily: theme.typography.medium, fontSize: 16 }}>Esta ação é permanente.</Text>
    <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.typography.regular, lineHeight: 22 }}>Seus livros, curtidas, matches, conversas e mensagens serão apagados. As conversas desaparecerão também para as outras pessoas. Você será desconectado de todos os dispositivos.</Text>
    <TextField label="Senha atual" value={deletion.password} onChangeText={deletion.setPassword} error={deletion.passwordError} secureTextEntry editable={!deletion.busy} autoComplete="current-password" textContentType="password" autoCorrect={false} autoCapitalize="none" />
    <TextField label="Digite EXCLUIR para confirmar" value={deletion.confirmation} onChangeText={deletion.setConfirmation} editable={!deletion.busy} autoCapitalize="characters" autoCorrect={false} />
    {deletion.error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{deletion.error}</Text> : null}
    <AppButton label="Excluir minha conta permanentemente" variant="outline" labelStyle={{ color: theme.colors.danger }} loading={deletion.busy} disabled={!deletion.password || deletion.confirmation !== 'EXCLUIR'} onPress={() => { void deletion.submit(); }} />
    <AppButton label="Cancelar" variant="ghost" disabled={deletion.busy} onPress={onCancel} />
  </View>;
}
