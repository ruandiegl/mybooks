import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup"
import { View, TextInput, TouchableOpacity, Button, Text, TouchableHighlight, Alert, ActivityIndicator }  from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { styles } from "./styles";
import { colors } from "../../styles/colors";
import { useNavigation } from "@react-navigation/native";
import { AppRoutes } from "../../routes/app.routes";
import { api } from "../../services/api";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { yupResolver } from "@hookform/resolvers/yup";
import { useUser } from "../../hooks/UseContext";



type LoginData = {
  email: string;
  password: string;
  
};

type RegisterScreenNavigator = NativeStackNavigationProp<AppRoutes, 'Register'>



export function LoginForm(){
    const schema = yup.object().shape({
        email: yup.string().email('Email inválido').required('Email obrigatório'),
        password: yup.string().min(6, 'A senha deve ter no mínimo 6 caracteres').required('Senha obrigatória')
    })
    const [loading, setLoading] = useState(false);
    const { user, signIn } = useUser();

    

    const {
        register,
        handleSubmit,
        setValue,
        trigger,
        formState: { errors },
    } = useForm<LoginData>({
        resolver: yupResolver(schema),

    });

    register("email");
    register("password");
    const navigation = useNavigation<RegisterScreenNavigator>()    

    const handleLogin = async (data: LoginData) => {
        try{

            setLoading(true);
           const reponse = await api.post('/login' ,{
            email: data.email,
            password: data.password
           })

           
           console.log("USER NO LOGIN:", user);

           console.log("TOKEN:", reponse.data.token)

            signIn(reponse.data.token)

            setLoading(false);

        } catch(error: any | boolean){ 
            console.log('erro no servidor', error.response.data)
            Alert.alert('Erro', 'Não foi possível fazer o login. Verifique suas credenciais.')
        }
        
    }
    return (
        <KeyboardAwareScrollView
        style={{ flex: 1}}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="interactive"
        enableOnAndroid
        extraScrollHeight={150}
        enableAutomaticScroll={false}
        >

            <View style={styles.container}>

                <View>
                    <View>
                        <Text style={{fontSize: 32, fontWeight: 'bold', color: colors.white.normal}}>My</Text>
                        <Text style={styles.Text}>Books</Text>     
                    </View>
                </View>
                <TextInput
                style={[
                    styles.input,
                    errors.email && { borderColor: "red", borderWidth: 2 }
                ]}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(text) => {
                    setValue("email", text);
                    trigger("email");
                }}
                />
                {errors.email && <Text style={{ color: "red" }}>{errors.email.message}</Text>}


                <TextInput
                style={[
                    styles.input,
                    errors.password && { borderColor: "red", borderWidth: 2 }
                ]}
                placeholder="Senha"
                secureTextEntry
                onChangeText={(text) => {
                    setValue("password", text);
                    trigger("password");
                }}
                />
                {errors.password && <Text style={{ color: "red" }}>{errors.password.message}</Text>}
                
                <View >
                    <TouchableOpacity 
                    disabled={loading}
                    onPress={handleSubmit(handleLogin)}>
                    <View style={styles.button}>                      
                            <Text style={styles.buttonText}>Entrar</Text>
                        </View>
                    </TouchableOpacity>
                        <View style={styles.SignUp}>
                            <Text style={styles.noAccount}>Não tem uma conta?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.Register}>Cadastre-se</Text>
                    </TouchableOpacity>
                        </View> 
                </View>

                
            </View>
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.orange[300]} />
                </View>
                )}

        </KeyboardAwareScrollView>
    )
}