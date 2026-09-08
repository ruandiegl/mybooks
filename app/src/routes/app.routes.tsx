import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookCreate } from '../pages/BookCreate';
import { BookDetails } from '../pages/BookDetails';
import { BookEdit } from '../pages/BookEdit';
import { Chat } from '../pages/Chat';
import { Matches } from '../pages/Matches';
import type { RootStackParamList } from '../types/navigation';
import { MainTabs } from './main-tabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
