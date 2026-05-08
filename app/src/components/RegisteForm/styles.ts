import { StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import { fontFamily } from "../../styles/fontfamily";

export const styles = StyleSheet.create({
     container: {
            flex: 1,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.dark[100],  
        },
        Header: {
            backgroundColor: colors.orange[300],
            width: '100%',
            justifyContent: 'flex-start',
            alignContent: 'flex-start'

        },
        arrowBack: {
             position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            height: 80, 
            paddingTop: 40, 
            paddingHorizontal: 20, 
            flexDirection: 'row', 
            alignItems: 'center', 
            zIndex: 1 
        },
        content: {
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        input: {
            backgroundColor: 'lightgray',
            width: '80%',
            flex: 1,
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
            fontFamily: fontFamily.Poppins_400Regular,
            fontSize: 24,
            fontWeight: 'bold'
        }
})