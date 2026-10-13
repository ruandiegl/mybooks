import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { linking } from './linking';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../providers/SessionProvider';
import { useAppTheme } from '../providers/ThemeProvider';
import { PremiumOfferProvider } from '../features/premium/PremiumOfferProvider';
import { AppRoutes } from './app.routes';
import AuthRoutes from './authRoutes';

export function Routes() {
  const { theme, mode } = useAppTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = { ...base, colors: { ...base.colors, primary: theme.colors.primary,
    background: theme.colors.background, card: theme.colors.surface, text: theme.colors.foreground,
    border: theme.colors.outline, notification: theme.colors.primary } };

  const { isLoaded, isSignedIn } = useSession();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <PremiumOfferProvider>
      <NavigationContainer theme={navigationTheme} linking={linking}>
        {isSignedIn ? <AppRoutes /> : <AuthRoutes />}
      </NavigationContainer>
    </PremiumOfferProvider>
  );
}
