import { DarkTheme, DefaultTheme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useSession } from '../providers/SessionProvider';
import { useAppTheme } from '../providers/ThemeProvider';
import { PremiumOfferProvider } from '../features/premium/PremiumOfferProvider';
import { ChatRealtimeProvider } from '../providers/ChatRealtimeProvider';
import { DailyCheckInCoordinator } from '../features/gamification/DailyCheckInCoordinator';
import type { RootStackParamList } from '../types/navigation';
import { AppRoutes } from './app.routes';
import { linking } from './linking';
import AuthRoutes from './authRoutes';
import { BootSplash } from '../components/BootSplash';
import { useSessionBootIssue } from '../features/boot/useSessionBootIssue';

export function Routes() {
  const { theme, mode } = useAppTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = { ...base, colors: { ...base.colors, primary: theme.colors.primary,
    background: theme.colors.background, card: theme.colors.surface, text: theme.colors.foreground,
    border: theme.colors.outline, notification: theme.colors.primary } };

  const { isLoaded, isSignedIn } = useSession();
  const bootIssue = useSessionBootIssue(!isLoaded);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  if (!isLoaded) {
    return <BootSplash phase="session" fontsReady issue={bootIssue} />;
  }

  return (
    <PremiumOfferProvider>
      <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking} fallback={<BootSplash phase="navigation" fontsReady />}>
        {isSignedIn ? <ChatRealtimeProvider><DailyCheckInCoordinator /><AppRoutes navigationRef={navigationRef} /></ChatRealtimeProvider> : <AuthRoutes />}
      </NavigationContainer>
    </PremiumOfferProvider>
  );
}
