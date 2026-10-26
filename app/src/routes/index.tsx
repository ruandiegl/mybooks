import { DefaultTheme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { ChatRealtimeProvider } from '../providers/ChatRealtimeProvider';
import { DailyCheckInCoordinator } from '../features/gamification/DailyCheckInCoordinator';
import { useSession } from '../providers/SessionProvider';
import { theme } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';
import { AppRoutes } from './app.routes';
import { linking } from './linking';
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
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
      {isSignedIn ? <ChatRealtimeProvider><DailyCheckInCoordinator /><AppRoutes navigationRef={navigationRef} /></ChatRealtimeProvider> : <AuthRoutes />}
    </NavigationContainer>
  );
}
