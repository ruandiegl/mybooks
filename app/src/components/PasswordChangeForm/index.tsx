import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { AppButton } from '../AppButton';
import { TextField } from '../TextField';
import { PasswordRequirements } from '../PasswordRequirements';
import type { useAccountSecurity, PasswordDraft } from '../../features/auth/useAccountSecurity';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';
type Props = { security: ReturnType<typeof useAccountSecurity>; enabled: boolean; logoutAllEnabled?: boolean; onSignOutAll?: () => void };
function PasswordField({ label, value, error, busy, onChange, inputRef, autoComplete }: { label: string; value: string; error?: string; busy: boolean; onChange(value: string): void; inputRef: React.RefObject<TextInput | null>; autoComplete: TextInputProps['autoComplete'] }) {
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false), [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    <TextField label={label} value={value} error={error} onChangeText={onChange} secureTextEntry={!visible} editable={!busy} autoComplete={autoComplete} textContentType={autoComplete === 'current-password' ? 'password' : 'newPassword'} autoCorrect={false} autoCapitalize="none" inputRef={inputRef} />
    <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} disabled={busy} onPress={() => setVisible(old => !old)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [styles.toggle, focused && styles.focused, pressed && styles.pressed]}><Text style={styles.toggleLabel}>{visible ? 'Ocultar senha' : 'Mostrar senha'}</Text></Pressable>
  </View>;
}
export function PasswordChangeForm({ security, enabled, logoutAllEnabled, onSignOutAll }: Props) {
  const styles = useThemedStyles(createStyles);
  const current = useRef<TextInput>(null), next = useRef<TextInput>(null), confirm = useRef<TextInput>(null);
  useEffect(() => { const field = (Object.keys(security.errors) as (keyof PasswordDraft)[]).find(key => security.errors[key]); if (field) ({ currentPassword: current, newPassword: next, confirmation: confirm })[field].current?.focus(); }, [security.errors]);
  if (!enabled) return <Text style={styles.copy}>A troca de senha ainda não está disponível nesta versão da API.</Text>;
  return <View style={styles.body}>
    <Text style={styles.copy}>Ao atualizar a senha, todos os dispositivos serão desconectados. Você precisará entrar novamente.</Text>
    <PasswordField label="Senha atual" value={security.draft.currentPassword} error={security.errors.currentPassword} busy={security.busy} onChange={value => security.setField('currentPassword', value)} inputRef={current} autoComplete="current-password" />
    <PasswordField label="Nova senha" value={security.draft.newPassword} error={security.errors.newPassword} busy={security.busy} onChange={value => security.setField('newPassword', value)} inputRef={next} autoComplete="new-password" />
    <PasswordRequirements password={security.draft.newPassword} />
    <PasswordField label="Confirmar nova senha" value={security.draft.confirmation} error={security.errors.confirmation} busy={security.busy} onChange={value => security.setField('confirmation', value)} inputRef={confirm} autoComplete="new-password" />
    {security.error ? <Text accessibilityRole="alert" style={[styles.copy, styles.error]}>{security.error}</Text> : null}
    <AppButton label="Atualizar senha" icon="lock-outline" loading={security.busy} onPress={security.submitPassword} />
    {logoutAllEnabled && onSignOutAll ? <AppButton label="Sair de todos os dispositivos" variant="outline" disabled={security.busy} onPress={onSignOutAll} /> : null}
    <Text style={styles.copy}>Esqueceu sua senha? A recuperação por e-mail está disponível na tela de entrada.</Text>
  </View>;
}
