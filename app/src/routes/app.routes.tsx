import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { NavigationState } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { BookCreate } from '../pages/BookCreate';
import { BookDetails } from '../pages/BookDetails';
import { BookEdit } from '../pages/BookEdit';
import { Chat } from '../pages/Chat';
import { Matches } from '../pages/Matches';
import { StreakLeaderboard } from '../pages/StreakLeaderboard';
import { OnboardingBooks } from '../pages/OnboardingBooks';
import { OnboardingProfile } from '../pages/OnboardingProfile';
import { deriveOnboardingState } from '../features/onboarding/onboarding';
import { shouldNavigateForRemovedMatch } from '../features/chat/navigation';
import { useChatRealtime } from '../providers/ChatRealtimeProvider';
import { useSession } from '../providers/SessionProvider';
import type { RootStackParamList } from '../types/navigation';
import { MainTabs } from './main-tabs';

const Stack = createNativeStackNavigator<RootStackParamList>();
type Props = { navigationRef: NavigationContainerRefWithCurrent<RootStackParamList> };

function MatchRemovalNavigationBridge({ navigationRef }: Props) {
  const { pendingMatchRemovals } = useChatRealtime();
  const [state, setState] = useState<NavigationState | undefined>(() => navigationRef.getRootState());
  const handledMatchIds = useRef(new Set<string>());

  useEffect(() => {
    const updateState = () => setState(navigationRef.getRootState());
    const subscription = navigationRef.addListener('state', updateState);
    updateState();
    return subscription;
  }, [navigationRef]);

  useEffect(() => {
    if (!state || !navigationRef.isReady()) return;
    for (const event of pendingMatchRemovals) {
      if (!shouldNavigateForRemovedMatch(state, event, handledMatchIds.current)) continue;
      handledMatchIds.current.add(event.matchId);
      navigationRef.resetRoot({ index: 0, routes: [{ name: 'Main', params: { screen: 'Messages' } }] });
      break;
    }
  }, [navigationRef, pendingMatchRemovals, state]);

  return null;
}

export function AppRoutes({ navigationRef }: Props) {
  const { user } = useSession();
  const { nextStep } = deriveOnboardingState(user);

  return <>
    <MatchRemovalNavigationBridge navigationRef={navigationRef} />
    <Stack.Navigator key={nextStep}>
      {nextStep === 'profile' ? <Stack.Screen name="OnboardingProfile" component={OnboardingProfile} options={{ headerShown: false }} /> : null}
      {nextStep === 'books' ? <Stack.Screen name="OnboardingBooks" component={OnboardingBooks} options={{ headerShown: false }} /> : null}
      {nextStep === 'app' ? <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} /> : null}
      <Stack.Screen
        name="BookCreate"
        component={BookCreate}
        options={{ title: 'Novo livro', presentation: 'modal' }}
      />
      <Stack.Screen
        name="BookDetails"
        component={BookDetails}
        options={{ title: 'Detalhes do livro' }}
      />
      <Stack.Screen
        name="ExchangeBookDetails"
        component={BookDetails}
        options={{ title: 'Detalhes do livro da troca' }}
      />
      <Stack.Screen
        name="BookEdit"
        component={BookEdit}
        options={{ title: 'Editar livro', presentation: 'modal' }}
      />
      <Stack.Screen
        name="Matches"
        component={Matches}
        options={{ title: 'Seus matches' }}
      />
      <Stack.Screen
        name="StreakLeaderboard"
        component={StreakLeaderboard}
        options={{ title: 'Ranking da sequência' }}
      />
      <Stack.Screen
        name="Chat"
        component={Chat}
        options={{ title: 'Conversa' }}
      />
    </Stack.Navigator>
  </>;
}
