import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const api = axios.create({
    baseURL: 'http://192.168.70.190:3001'
})

    api.interceptors.request.use(
        async (config) => {
            const token = await AsyncStorage.getItem('token')

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            return config
    },
        (error) => {
            return Promise.reject(error)
        }
    )
