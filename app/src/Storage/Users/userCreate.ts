import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserDTO } from "./userStorageDTO";
import { GetALL } from "./userGetAll";
import { USER_COLLECTION } from "../storageConfig";

export async function Create(newUSER: UserDTO) {
    try{
        const storageUSER = await GetALL()
        const storage = [...storageUSER, newUSER]
        await AsyncStorage.setItem(USER_COLLECTION, JSON.stringify(storage))

    }catch (error) {
        throw error
    }
    
}