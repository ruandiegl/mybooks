import { View } from 'react-native';
import { Routes } from './src/routes';


import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from '@expo-google-fonts/poppins';

import { styles } from './src/styles/GlobalStyles';
import { UserProvider } from './src/hooks/UseContext';
import { colors } from './src/styles/colors';

const Stack = createNativeStackNavigator()

export default function App() {
  

  const [fonstLoad] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold
  })

 

  return (
    <View style={styles.container}>
      <UserProvider>
        <Routes />
      </UserProvider>
    </View>
  );
}

