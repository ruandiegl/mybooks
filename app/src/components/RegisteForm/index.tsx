import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "./styles";
import { colors } from "../../styles/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppRoutes } from "../../routes/app.routes";
import { formatPhone } from "../../utils/formatPhone";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { api } from "../../services/api";


type registerData = {
    email: string;
    password: string;
    phone : string;
    name: string;
}   
type RegisterScreenNavigator = NativeStackNavigationProp<AppRoutes , 'Login'>

export function RegisterForm() {
    const schema = yup.object().shape({
            email: yup.string().email('Email inválido').required('Email obrigatório'),
            password: yup.string().min(6, 'A senha deve ter no mínimo 6 caracteres').required('Senha obrigatória'),
            phone: yup.string().min(14, 'Telefone inválido').required('Telefone obrigatório'),
            name: yup.string().min(3, 'O nome de usuário deve ter no mínimo 3 caracteres').required('Nome de usuário obrigatório'),
        })

    const navigation = useNavigation<RegisterScreenNavigator>()

    const {
            register,
            handleSubmit,
            setValue,
            trigger,
            formState: { errors },
        } = useForm<registerData>({
            resolver: yupResolver(schema),
    
        });
        register("email");
        register("password");
        register("phone");
        register("name");


    const formated = (text: string) => {
        const masked = formatPhone(text)
        return masked;
    }

    const handleRegister = async (data: registerData) => {
            try{
               const reponse = await api.post('/login/register' ,{
                email: data.email,
                password: data.password,
                phone: data.phone,
                name: data.name
               })

               console.log(reponse.data.message)
                
                navigation.navigate('Login')

    
               
            } catch(error: boolean | any){ 
                console.log('erro no servidor', error.response.data)
            }
            
        }
    return (
    <KeyboardAwareScrollView
    style={{ flex: 1}}
    contentContainerStyle={{ flexGrow: 1}}
    enableOnAndroid
    extraScrollHeight={10}
    bounces={false}
    overScrollMode="never"
    >

        <View style={styles.container}>
            <View style={styles.arrowBack}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back-ios-new" size={28} color={colors.white.normal} />
                </TouchableOpacity>
            </View>
            <View style={styles.content}>
                
                        <View>
                            <View>
                                <Text style={{fontSize: 32, fontWeight: 'bold', color: colors.white.normal}}>My</Text>
                                <Text style={styles.Text}>Books</Text>     
                            </View>
                        </View>

                        <TextInput
                        style={styles.input} 
                        placeholder="Usuario"
                        onChangeText={(text) => {
                            setValue("name", text);
                            trigger("name");
                        }}
                        />

                        <TextInput
                        style={styles.input} 
                        placeholder="Email"
                        onChangeText={(text) => {
                            setValue("email", text);
                            trigger("email");
                        }}
                        />
            
                        <TextInput
                        style={styles.input} 
                        placeholder="Senha"
                        onChangeText={(text) => {
                            setValue("password", text);
                            trigger("password");
                        }}
                        />

                       <TextInput
                        style={styles.input} 
                        placeholder="phone"
                        onChangeText={(text) => {
                            setValue("phone", formatPhone(text));
                            trigger("phone");
                        }}
                        />
                        <View >
                            <TouchableOpacity onPress={handleSubmit(handleRegister)}>
                            <View style={styles.button}>
                                    <Text style={styles.buttonText}>Registrar</Text>
                                </View> 
                            </TouchableOpacity>
                        </View>
                </View>
                    
            </View>
        </KeyboardAwareScrollView>
     

    )
}