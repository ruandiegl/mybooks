import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { tokenCache } from '@clerk/expo/token-cache';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appEnv } from '../config/env';
import { configureApiSession } from '../services/api';

type AuthAction = 'sign-in' | 'sign-up';

type SessionContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  mode: 'clerk' | 'development';
  devUserId?: string;
  getToken: () => Promise<string | null>;
  startAuth: (mode: AuthAction) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const DEV_SESSION_KEY = 'mybooks.dev.session';

function ClerkSessionBridge({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const { startHostedAuth } = useHostedAuth();

  const startAuth = useCallback(async (mode: AuthAction) => {
    await startHostedAuth({ mode });
  }, [startHostedAuth]);

  const signOut = useCallback(async () => {
    queryClient.clear();
    await clerk.signOut();
  }, [clerk, queryClient]);

  useEffect(() => {
    configureApiSession({ getToken, onUnauthorized: signOut });
  }, [getToken, signOut]);

  const value = useMemo<SessionContextValue>(() => ({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    mode: 'clerk',
    getToken,
    startAuth,
    signOut
  }), [getToken, isLoaded, isSignedIn, signOut, startAuth]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function DevelopmentSessionBridge({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(DEV_SESSION_KEY)
      .then((value) => setIsSignedIn(value === 'active'))
      .finally(() => setIsLoaded(true));
  }, []);

  const getToken = useCallback(async () => null, []);

  const startAuth = useCallback(async () => {
    await SecureStore.setItemAsync(DEV_SESSION_KEY, 'active');
    setIsSignedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    queryClient.clear();
    await SecureStore.deleteItemAsync(DEV_SESSION_KEY);
    setIsSignedIn(false);
  }, [queryClient]);

  useEffect(() => {
    configureApiSession({
      getToken,
      devUserId: appEnv.devUserId,
      onUnauthorized: signOut
    });
  }, [getToken, signOut]);

  const value = useMemo<SessionContextValue>(() => ({
    isLoaded,
    isSignedIn,
    mode: 'development',
    devUserId: appEnv.devUserId,
    getToken,
    startAuth,
    signOut
  }), [getToken, isLoaded, isSignedIn, signOut, startAuth]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function SessionProvider({ children }: React.PropsWithChildren) {
  if (appEnv.authMode === 'clerk' && appEnv.clerkPublishableKey) {
    return (
      <ClerkProvider publishableKey={appEnv.clerkPublishableKey} tokenCache={tokenCache}>
        <ClerkSessionBridge>{children}</ClerkSessionBridge>
      </ClerkProvider>
    );
  }

  return <DevelopmentSessionBridge>{children}</DevelopmentSessionBridge>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession deve ser usado dentro de SessionProvider.');
  }
  return context;
}
