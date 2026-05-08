import  asyncStorage from "@react-native-async-storage/async-storage"

import { UserDTO } from "./userStorageDTO"

import { USER_COLLECTION } from "../storageConfig"

export async function GetALL() {
    try {
        const storage = await asyncStorage.getItem(USER_COLLECTION)
        const spending: UserDTO[] = storage ? JSON.parse(storage) : []
        return spending

    } catch (error) {
        throw error
    }
}