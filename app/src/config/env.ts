export const appEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001'
};
