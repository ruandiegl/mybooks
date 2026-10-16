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
import { useEffect, type PropsWithChildren } from 'react';
import { AppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from './src/providers/SessionProvider';
import { Routes } from './src/routes';
import { ThemeProvider, useAppTheme } from './src/providers/ThemeProvider';
import { PwaInstallProvider } from './src/features/pwa/PwaInstallProvider';
import { WebExperience } from './src/components/WebExperience';
import { BootSplash } from './src/components/BootSplash';
import { BootErrorBoundary } from './src/components/BootErrorBoundary';
import { useBootResources } from './src/features/boot/useBootResources';
import { useLaunchPresentation } from './src/features/boot/useLaunchPresentation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1
    }
  }
});

export default function App() {
  return <SafeAreaProvider><BootErrorBoundary><ThemeProvider><PwaInstallProvider><AppContent /></PwaInstallProvider></ThemeProvider></BootErrorBoundary></SafeAreaProvider>;
}

// Mounts once when local resources settle; resizing and session changes never key this host.
function ReadyHost({ children }: PropsWithChildren) {
  const onLayout = useLaunchPresentation(true);
  return <View style={{ flex: 1 }} onLayout={onLayout}>{children}</View>;
}

function AppContent() {
  const { mode, hydrated } = useAppTheme();
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold
  });
  const resources = useBootResources({ themeHydrated: hydrated, fontsLoaded, fontError: fontError ?? null });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {!resources.ready ? <BootSplash phase="resources" fontsReady={fontsLoaded} issue={resources.issue} /> : <ReadyHost>
      <WebExperience>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <Routes />
        </SessionProvider>
      </QueryClientProvider>
      </WebExperience>
      </ReadyHost>}
    </>
  );
}
