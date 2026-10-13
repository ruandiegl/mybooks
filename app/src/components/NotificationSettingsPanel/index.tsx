import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AppButton } from '../AppButton';
import { useAccountPreferences } from '../../features/settings/useAccountPreferences';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../styles/useThemedStyles';
import { createStyles } from './styles';
export function NotificationSettingsPanel({ preferences }: { preferences: ReturnType<typeof useAccountPreferences> }) {
  const { theme } = useAppTheme(), styles = useThemedStyles(createStyles);
  return <View style={styles.group}>
    <Text style={styles.detail}>Esta opção controla apenas o indicador da aba Curtidas. Não envia notificações com o aplicativo fechado.</Text>
    {preferences.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : preferences.unavailable ? <Text style={styles.detail}>Esta configuração ainda não está disponível nesta versão da API.</Text> : preferences.isError ? <><Text style={[styles.detail, styles.danger]}>Não foi possível carregar suas preferências.</Text><AppButton label="Tentar novamente" variant="outline" onPress={preferences.retry} /></> : preferences.data ?
      <Pressable accessibilityRole="switch" accessibilityLabel="Mostrar indicador de novas curtidas" aria-checked={preferences.showLikesBadge} accessibilityState={{ checked: preferences.showLikesBadge, disabled: preferences.saving, busy: preferences.saving }} disabled={preferences.saving} onPress={() => preferences.save(!preferences.showLikesBadge)} style={({ pressed }) => [styles.row, pressed && styles.pressed, preferences.saving && styles.disabled]}>
        <Text style={[styles.label, styles.rowCopy]}>Mostrar indicador de novas curtidas</Text>
        <MaterialIcons accessible={false} name={preferences.showLikesBadge ? 'toggle-on' : 'toggle-off'} color={preferences.showLikesBadge ? theme.colors.primary : theme.colors.mutedForeground} size={40} />
      </Pressable> : null}
    {preferences.saving ? <Text accessibilityLiveRegion="polite" style={styles.detail}>Salvando preferência…</Text> : null}
    {preferences.errorMessage ? <><Text accessibilityLiveRegion="polite" style={[styles.detail, styles.danger]}>{preferences.errorMessage}</Text><AppButton label="Tentar novamente" variant="outline" onPress={preferences.retry} /></> : null}
    {preferences.saved ? <Text accessibilityLiveRegion="polite" style={styles.detail}>Preferência salva</Text> : null}
    <Text style={styles.detail}>Avisos de segurança, confirmações e erros continuam ativos. Notificações push serão oferecidas em uma etapa futura.</Text>
  </View>;
}
