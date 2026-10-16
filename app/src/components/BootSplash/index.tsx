import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../providers/ThemeProvider';
import type { BootPhase, BootIssue } from '../../features/boot/bootPolicy';
import { useLaunchPresentation } from '../../features/boot/useLaunchPresentation';
import { BootMark } from './BootMark';
import { createStyles } from './styles';

export type BootSplashProps = { phase: BootPhase; fontsReady: boolean; issue?: BootIssue; onPresented?: () => void };
export function BootSplash({ phase, fontsReady, issue, onPresented }: BootSplashProps) {
  const { theme, mode } = useAppTheme();
  const styles = createStyles(theme);
  const [imageSettled, setImageSettled] = useState(false);
  const settle = useCallback(() => setImageSettled(true), []);
  const onLayout = useLaunchPresentation(imageSettled || Boolean(issue), onPresented);
  const error = issue === 'resource-error' || issue === 'resource-timeout';
  const font = fontsReady ? { fontFamily: theme.typography.regular } : undefined;
  return <SafeAreaView style={styles.safe} onLayout={onLayout}>
    <ScrollView contentContainerStyle={styles.scroll}><View style={styles.content}>
      <BootMark dark={mode === 'dark'} onSettled={settle} />
      <Text style={[styles.brand, fontsReady ? { fontFamily: theme.typography.bold } : undefined]}>TrocaLivros</Text>
      {error ? <Text accessibilityRole="header" style={[styles.heading, font]}>{issue === 'resource-error' ? 'Não foi possível carregar os recursos do aplicativo.' : 'O aplicativo demorou para iniciar.'}</Text> : null}
      <Text role={Platform.OS === 'web' ? 'status' : undefined} accessibilityLiveRegion="polite" style={[styles.status, font]}>
        {error ? 'Confira sua conexão e tente novamente.' : phase === 'session' ? 'Preparando sua conta…' : 'Abrindo o TrocaLivros…'}
      </Text>
      {issue === 'session-slow' ? <Text style={[styles.status, font]}>A conexão está demorando. Confira sua internet.</Text> : null}
      {issue ? Platform.OS === 'web' ? <Pressable accessibilityRole="button" onPress={() => window.location.reload()} style={({ pressed }) => [styles.reload, { opacity: pressed ? .8 : 1 }]}><Text style={[styles.reloadText, font]}>Recarregar aplicativo</Text></Pressable> : <Text style={[styles.status, font]}>Feche e abra o aplicativo para tentar novamente.</Text> : null}
    </View></ScrollView>
  </SafeAreaView>;
}
