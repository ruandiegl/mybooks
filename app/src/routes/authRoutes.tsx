import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { LoginForm } from "../components/LoginForm"
import { RegisterForm } from "../components/RegisteForm";

const { Navigator, Screen } = createNativeStackNavigator()


export default function AuthRoutes(){
    return (
        <Navigator  screenOptions={{
            headerShown: false
        }}>
            <Screen name='Login' component={LoginForm}/>
            <Screen name='Register' component={RegisterForm}/>
        </Navigator>
    )
}