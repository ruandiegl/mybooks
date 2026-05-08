import { StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

export const style = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor:'#fff',
        width: '100%'
    },
    profileHeader: {
        width: '100%',
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 12,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    profileContainer: {
        marginTop: 30,
        justifyContent: 'center',
        alignItems: 'center'

    },
    picProfile: {
        backgroundColor: colors.orange[300],
        height: 150,
        width: 150,
        borderRadius: 75,
    },
    addContainer: {
        marginTop: 60,
        alignItems: 'center'
    },
    text: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8
    },
    button: {
        marginTop: 16,
        backgroundColor: colors.orange[300],
        width: 100,
        height: 50,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        
    }
})