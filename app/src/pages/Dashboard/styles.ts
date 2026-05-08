import { StyleSheet, Dimensions } from "react-native";


export const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: '#1d2a38',
    },
    item: {
        height: Dimensions.get('window').height,          // ocupa tela inteira
        width: Dimensions.get('window').width,    
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1e1e1e', // cor de fundo escura
    },
    text: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
    },
    })