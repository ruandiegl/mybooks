import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Auth } from '../pages/Auth';
import type { AuthStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthRoutes() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={Auth} />
    </Stack.Navigator>
  );
}
