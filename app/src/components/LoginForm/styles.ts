import { StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '10%', 
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.dark[100]  
    },
    input: {
        backgroundColor: 'lightgray',
        width: '80%',
        height: 50,
        borderRadius: 16,
        marginTop: 16,
        padding: 16,
    },
     Text: {
            color: colors.orange[300],
            fontSize: 48,
            fontWeight: "bold"
    },
    button: {
        marginTop: 16,
        backgroundColor: colors.orange[300],
        width: 300,
        height: 50,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold'
    },
    SignUp: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 24
    },
    noAccount: {
        color: colors.white.normal,
        fontSize: 16
    },
    Register: {
        color: colors.orange[300],
        fontSize: 24
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)", 
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    }

})