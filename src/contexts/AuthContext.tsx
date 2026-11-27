import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onFirebaseAuthChanged,
  signInWithGoogle,
  signOutFirebase,
} from '../lib/firebase';
import { apiFetch, setAuthToken } from '../services/api';
import { ensureFirebaseUserDocuments } from '../services/firestoreSync';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  firebaseUser: FirebaseUser | null;
  firebaseAuthReady: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  loginHiddenAdmin: (password: string) => Promise<AuthUser>;
  connectGoogle: () => Promise<FirebaseUser>;
  disconnectGoogle: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onFirebaseAuthChanged((fbUser) => {
      setFirebaseUser(fbUser);
      setFirebaseAuthReady(true);
      if (fbUser) {
        void ensureFirebaseUserDocuments(fbUser).catch(() => {
          // Non-fatal during initial auth sync; permission errors are logged cleanly
        });
      }
    });
    return () => unsub();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginHiddenAdmin = useCallback(async (password: string) => {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/admin-access', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const connectGoogle = useCallback(async () => {
    const fbUser = await signInWithGoogle();
    await ensureFirebaseUserDocuments(fbUser);
    return fbUser;
  }, []);

  const disconnectGoogle = useCallback(async () => {
    await signOutFirebase();
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<{ user: AuthUser }>('/api/auth/me');
    setUser(data.user);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        firebaseUser,
        firebaseAuthReady,
        login,
        loginHiddenAdmin,
        connectGoogle,
        disconnectGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
