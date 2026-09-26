import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest, configureApiSession } from './api';
import { getDeviceId } from './device';
import type { LoginResponse, SessionUser } from './types';

const SESSION_KEY = 'ndtech.session';

type StoredSession = { token: string; expiresAt: string; user: SessionUser };

type AuthContextValue = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: SessionUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);

  const clearSession = useCallback(async () => {
    configureApiSession({ token: null });
    await SecureStore.deleteItemAsync(SESSION_KEY);
    queryClient.clear();
    setUser(null);
    setStatus('signedOut');
  }, [queryClient]);

  useEffect(() => {
    configureApiSession({ onUnauthorized: () => void clearSession() });
  }, [clearSession]);

  // Restore a saved session on launch.
  useEffect(() => {
    (async () => {
      configureApiSession({ deviceId: await getDeviceId() });

      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      const saved = raw ? (JSON.parse(raw) as StoredSession) : null;

      if (!saved || new Date(saved.expiresAt) <= new Date()) {
        await clearSession();
        return;
      }

      configureApiSession({ token: saved.token });
      setUser(saved.user);
      setStatus('signedIn');
    })();
  }, [clearSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      anonymous: true,
      body: {
        email: email.trim(),
        password,
        deviceId: await getDeviceId(),
        deviceName: Constants.deviceName ?? undefined,
      },
    });

    const saved: StoredSession = { token: result.token, expiresAt: result.expiresAt, user: result.user };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(saved));
    configureApiSession({ token: result.token });
    setUser(result.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Sign out locally even if the server can't be reached.
    }
    await clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
