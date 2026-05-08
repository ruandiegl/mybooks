import {
    createBottomTabNavigator,
    BottomTabNavigationProp
} from "@react-navigation/bottom-tabs"

import  MaterialIcons from '@expo/vector-icons/MaterialIcons'

import { DashBoard } from '../pages/Dashboard'
import { Search } from "../pages/search"
import { Profile } from "../pages/profile"
export type AppRoutes = {
    dashboard: undefined;
    Login: undefined;
    Register: undefined;
    Search: undefined;
    profile: undefined;
}




export type AppNavigatorRoutesProps =
  BottomTabNavigationProp<AppRoutes>

  const { Navigator, Screen } = 
  createBottomTabNavigator<AppRoutes>();

export function AppRoutes() {

    return (
     <Navigator screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarLabelPosition: 'beside-icon',
      tabBarActiveTintColor: '#FFB84D',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        height: 100,
        backgroundColor: '#1d2a38',
        borderColor: 'none'
      }
    }}>
      
      <Screen
        name='dashboard'
        component={DashBoard}
        options={{
          tabBarLabel: 'Incluir',
          tabBarIcon: (({ size, color }) =>
            <MaterialIcons
              name='home'
              size={26}
              color={color}
            />
          )
        }}
      />
       <Screen
        name='Search'
        component={Search}
        options={{
          tabBarLabel: 'Pesquisar',
          tabBarIcon: (({ size, color }) =>
            <MaterialIcons
              name='search'
              size={26}
              color={color}
            />
          )
        }}
      />

       <Screen
        name='profile'
        component={Profile}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: (({ size, color }) =>
            <MaterialIcons
              name='person'
              size={26}
              color={color}
            />
          )
        }}
      />
    </Navigator>
)
}