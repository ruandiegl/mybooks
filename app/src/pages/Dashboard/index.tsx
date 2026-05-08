import { View, Text, FlatList, Dimensions } from "react-native"
import { styles } from "./styles"


export const videos = [
  { id: '1', title: 'Vídeo 1', color: '#FF4500' },
  { id: '2', title: 'Vídeo 2', color: '#FFA500' },
  { id: '3', title: 'Vídeo 3', color: '#4DA6FF' },
]

export function DashBoard() {
    return (
      <View style={styles.container}>
        <FlatList 
        data={videos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        horizontal={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={Dimensions.get('window').height}      
        decelerationRate={'fast'}
        renderItem={({ item }) => (
          <View style={[styles.item, {backgroundColor: item.color}]}>
            <Text style={styles.text}>{item.title}</Text>
          </View>
        )}
        />
      </View>  
    )
}