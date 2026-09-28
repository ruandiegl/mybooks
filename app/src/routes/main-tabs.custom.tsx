import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { Discover } from '../pages/Discover';
import { Library } from '../pages/Library';
import { Likes } from '../pages/Likes';
import { Messages } from '../pages/Messages';
import { Profile } from '../pages/profile';
import { likesApi } from '../features/likes/likesApi';
import { theme } from '../styles/theme';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, keyof typeof MaterialIcons.glyphMap> = {
  Discover: 'style',
  Likes: 'favorite',
  Library: 'auto-stories',
  Messages: 'chat-bubble-outline',
  Profile: 'person-outline'
};

export function MainTabs() {
  const { data } = useQuery({
    queryKey: ['likes', 'received', 'count'],
    queryFn: () => likesApi.fetchReceivedLikesCount(),
    refetchInterval: 30_000
  });

  const likesCount = data?.count || 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          borderTopColor: theme.colors.outline,
          backgroundColor: theme.colors.surface
        },
        tabBarLabelStyle: {
          fontFamily: theme.typography.medium,
          fontSize: 11
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={tabIcons[route.name]} color={color} size={size} />
        )
      })}
    >
      <Tab.Screen name="Discover" component={Discover} options={{ title: 'Descobrir' }} />
      <Tab.Screen name="Likes" component={Likes} options={{ title: 'Curtidas', tabBarBadge: likesCount > 0 ? likesCount : undefined }} />
      <Tab.Screen name="Library" component={Library} options={{ title: 'Biblioteca' }} />
      <Tab.Screen name="Messages" component={Messages} options={{ title: 'Mensagens' }} />
      <Tab.Screen name="Profile" component={Profile} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
