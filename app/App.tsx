import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  useFonts
} from '@expo-google-fonts/be-vietnam-pro';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from './src/providers/SessionProvider';
import { Routes } from './src/routes';
import { ThemeProvider, useAppTheme } from './src/providers/ThemeProvider';
import { PwaInstallProvider } from './src/features/pwa/PwaInstallProvider';
import { WebExperience } from './src/components/WebExperience';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1
    }
  }
});

export default function App() {
  return <ThemeProvider><PwaInstallProvider><AppContent /></PwaInstallProvider></ThemeProvider>;
}

function AppContent() {
  const { theme, mode, hydrated } = useAppTheme();
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  if (!hydrated) return null;
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <WebExperience>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <Routes />
        </SessionProvider>
      </QueryClientProvider>
      </WebExperience>
    </SafeAreaProvider>
  );
}
