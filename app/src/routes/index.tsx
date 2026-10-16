import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { linking } from './linking';
import { useSession } from '../providers/SessionProvider';
import { useAppTheme } from '../providers/ThemeProvider';
import { PremiumOfferProvider } from '../features/premium/PremiumOfferProvider';
import { AppRoutes } from './app.routes';
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

  if (!isLoaded) {
    return <BootSplash phase="session" fontsReady issue={bootIssue} />;
  }

  return (
    <PremiumOfferProvider>
      <NavigationContainer theme={navigationTheme} linking={linking} fallback={<BootSplash phase="navigation" fontsReady />}>
        {isSignedIn ? <AppRoutes /> : <AuthRoutes />}
      </NavigationContainer>
    </PremiumOfferProvider>
  );
}
