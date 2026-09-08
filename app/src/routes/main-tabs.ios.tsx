import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { UIManager } from 'react-native';
import { Discover } from '../pages/Discover';
import { Library } from '../pages/Library';
import { Messages } from '../pages/Messages';
import { Profile } from '../pages/profile';
import { theme } from '../styles/theme';
import type { MainTabParamList } from '../types/navigation';
import { MainTabs as CustomMainTabs } from './main-tabs.custom';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();
const hasNativeTabView = Boolean(UIManager.getViewManagerConfig?.('RNCTabView'));

export function MainTabs() {
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
