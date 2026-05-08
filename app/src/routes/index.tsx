import { NavigationContainer, DarkTheme }
  from "@react-navigation/native";

import { AppRoutes } from "./app.routes";
import Header from "../components/Header";
import AuthRoutes from "./authRoutes";
import { useState } from "react";
import { View } from "react-native";
import { styles } from "../styles/GlobalStyles";
import { useUser } from "../hooks/UseContext";
import { colors } from "../styles/colors";

const MyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.dark[100],
  },
};

export function Routes() {
  const { user, signOut } = useUser();

  console.log("User no Routes:", user)

  return (
    <View style={styles.container}>


      {user && <Header onLogOut={signOut}/>}


    <NavigationContainer theme={MyTheme}>
        {user ? <AppRoutes /> : <AuthRoutes />}
      </NavigationContainer>
  </View>
    
  )
}