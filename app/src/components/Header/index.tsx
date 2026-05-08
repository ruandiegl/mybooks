import { Alert, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../../styles/colors";

export type headerProps = {
  onLogOut: () => void
}

export default function Header({onLogOut}: headerProps) {

    async function handleLogout() {
         Alert.alert(
            "Sair da conta",
            "Tem certeza que deseja fazer logout?",
            [
                {
                text: "Sim",
                style: "destructive",
                onPress: () => onLogOut(),
                },
            {
                text: "Não",
                style: "cancel",
            },
            ])
    }
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: colors.white.normal}}>My</Text>
                    <Text style={styles.Text}>Books</Text>     
                </View>
                <View style={({ flexDirection: 'row', gap: 20})}>
                    <TouchableOpacity>
                        <MaterialIcons name="search" size={32} color={colors.white.normal}/>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <MaterialIcons name="logout" size={32} color={colors.red.danger} onPress={handleLogout}/>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}