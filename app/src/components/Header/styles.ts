import { StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

export const styles = StyleSheet.create({
    container: {
        width: '100%',
        display: 'flex',
        marginTop: 40,
        padding: 16,
        backgroundColor: colors.dark[100]
    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    Text: {
        color: colors.orange[300],
        fontSize: 24,
        fontWeight: "bold"
    }

})