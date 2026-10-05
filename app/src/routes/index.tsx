import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { linking } from './linking';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../providers/SessionProvider';
import { theme } from '../styles/theme';
import { PremiumOfferProvider } from '../features/premium/PremiumOfferProvider';
import { AppRoutes } from './app.routes';
import AuthRoutes from './authRoutes';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.foreground,
    border: theme.colors.outline,
    notification: theme.colors.primary
  }
};

export function Routes() {
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
