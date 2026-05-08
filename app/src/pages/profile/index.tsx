import { View, Text, TouchableOpacity } from "react-native";
import { style } from "./styles";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../../styles/colors";

export function Profile() {
    return (
        <View style={style.container}>
            <View style={style.profileHeader}>
                <MaterialIcons name="person" size={32} />
                <MaterialIcons name="menu" size={32} />
            </View>

            <View style={style.profileContainer}>
                <View style={style.picProfile}>
            </View>

            <View style={style.addContainer}>
                <MaterialIcons name="ios-share" size={40} color={colors.orange[200]}/>

                <View style={style.text}>
                    <Text>Compartilhe</Text>   
                    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Seus livros</Text>
                </View>

                <View style={style.button}>
                    <TouchableOpacity>
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fff'}}>Enviar</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            </View>
        </View>
    )
}