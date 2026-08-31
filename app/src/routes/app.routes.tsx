import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookCreate } from '../pages/BookCreate';
import { BookDetails } from '../pages/BookDetails';
import { BookEdit } from '../pages/BookEdit';
import { Chat } from '../pages/Chat';
import { Discover } from '../pages/Discover';
import { Library } from '../pages/Library';
import { Messages } from '../pages/Messages';
import { Matches } from '../pages/Matches';
import { Profile } from '../pages/profile';
import { theme } from '../styles/theme';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const tabIcons: Record<keyof MainTabParamList, keyof typeof MaterialIcons.glyphMap> = {
  Discover: 'style',
  Library: 'auto-stories',
  Messages: 'chat-bubble-outline',
  Profile: 'person-outline'
};

function MainTabs() {
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
      <Tab.Screen name="Library" component={Library} options={{ title: 'Biblioteca' }} />
      <Tab.Screen name="Messages" component={Messages} options={{ title: 'Mensagens' }} />
      <Tab.Screen name="Profile" component={Profile} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export function AppRoutes() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
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
        name="Chat"
        component={Chat}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
