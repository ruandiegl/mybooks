const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

export const appEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  authMode: publishableKey ? 'clerk' as const : 'development' as const,
  clerkPublishableKey: publishableKey,
  devUserId: process.env.EXPO_PUBLIC_DEV_USER_ID || 'dev-mybooks-user'
};
