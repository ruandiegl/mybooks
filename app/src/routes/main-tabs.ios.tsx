import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { useQuery } from '@tanstack/react-query';
import { UIManager } from 'react-native';
import { Discover } from '../pages/Discover';
import { Library } from '../pages/Library';
import { Likes } from '../pages/Likes';
import { Messages } from '../pages/Messages';
import { Profile } from '../pages/profile';
import { likesApi } from '../features/likes/likesApi';
import { theme } from '../styles/theme';
import type { MainTabParamList } from '../types/navigation';
import { MainTabs as CustomMainTabs } from './main-tabs.custom';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();
const hasNativeTabView = Boolean(UIManager.getViewManagerConfig?.('RNCTabView'));

export function MainTabs() {
  const { data } = useQuery({
    queryKey: ['likes', 'received', 'count'],
    queryFn: () => likesApi.fetchReceivedLikesCount(),
    refetchInterval: 30_000
  });

  const likesCount = data?.count || 0;

  // Expo Go does not include react-native-bottom-tabs. Use the JS fallback there;
  // development builds with the native module keep the UIKit tab bar.
  if (!hasNativeTabView) {
    return <CustomMainTabs />;
  }

  return (
    <Tab.Navigator
      tabBarActiveTintColor={theme.colors.primary}
      tabBarInactiveTintColor={theme.colors.mutedForeground}
      tabLabelStyle={{ fontFamily: theme.typography.medium, fontSize: 11 }}
      scrollEdgeAppearance="transparent"
      translucent
      hapticFeedbackEnabled
      minimizeBehavior="onScrollDown"
    >
      <Tab.Screen
        name="Discover"
        component={Discover}
        options={{
          title: 'Descobrir',
          tabBarIcon: () => ({ sfSymbol: 'sparkles' })
        }}
      />
      <Tab.Screen
        name="Likes"
        component={Likes}
        options={{
          title: 'Curtidas',
          tabBarIcon: () => ({ sfSymbol: 'heart.fill' }),
          tabBarBadge: likesCount > 0 ? likesCount.toString() : undefined
        }}
      />
      <Tab.Screen
        name="Library"
        component={Library}
        options={{
          title: 'Biblioteca',
          tabBarIcon: () => ({ sfSymbol: 'books.vertical' })
        }}
      />
      <Tab.Screen
        name="Messages"
        component={Messages}
        options={{
          title: 'Mensagens',
          tabBarIcon: () => ({ sfSymbol: 'bubble.left.and.bubble.right' })
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'Perfil',
          tabBarIcon: () => ({ sfSymbol: 'person.crop.circle' })
        }}
      />
    </Tab.Navigator>
  );
}
