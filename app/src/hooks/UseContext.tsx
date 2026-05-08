import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext} from 'react'
import { jwtDecode } from 'jwt-decode';

type User = {
    id: string;
    iat: string;
    exp: string;
}

type AuthContextType = {
  user: User | null
  signIn: (token: string) => Promise<void>
  signOut: () => Promise<void>
}

type ContextProps = {
    children: React.ReactNode
}

const UserContext = createContext<AuthContextType | null>(null)

export const UserProvider = ({ children }: ContextProps) => {
    const [user, setUser] = React.useState<User | null>(null)

    const signIn = async (token: string) => {
        await AsyncStorage.setItem('token', token)

        const decoded = jwtDecode<any>(token)

        console.log("DECODED:", decoded)

        setUser({
            id: decoded.id,
            iat: decoded.iat,
            exp: decoded.exp
        })
    }

    async function signOut() {
        await AsyncStorage.removeItem("token")
        setUser(null)
    }


    return (
        <UserContext.Provider value={{ user, signIn, signOut}}>
            {children}
        </UserContext.Provider>
    )    
}


export const useUser = () => {
    const context = React.useContext(UserContext)

    if(!context){
        throw new Error('useUser must be used within a UserProvider')
    }

    return context
}