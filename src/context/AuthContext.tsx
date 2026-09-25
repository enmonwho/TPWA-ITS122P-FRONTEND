/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../services/api';
import { STORAGE_KEYS } from '../lib/constants';
import type { User, LoginPayload, RegisterPayload, AuthResponse } from '../types';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const enrichUserWithPreferences = (baseUser: User): User => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES(baseUser.id));
    if (raw) {
      const prefs = JSON.parse(raw);
      return {
        ...baseUser,
        username: baseUser.username || prefs.username,
        bio: baseUser.bio || prefs.bio,
        preferences: baseUser.preferences || prefs,
      };
    }
  } catch {
    // ignore parse error
  }
  return baseUser;
};

const getStoredUser = (): User | null => {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return null;
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (raw) {
      const parsed = JSON.parse(raw);
      return enrichUserWithPreferences(parsed);
    }
  } catch {
    // ignore parse error
  }
  return null;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If no token exists, the user is unauthenticated: do not block UI with a skeleton
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return false;

    // If a token exists and we already have cached user data, render immediately
    const cachedUser = localStorage.getItem(STORAGE_KEYS.USER);
    return !cachedUser;
  });

  // Keep STORAGE_KEYS.USER in sync whenever user state changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } catch {
        // ignore storage errors
      }
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

      // If no token in localStorage, skip network call to prevent blocking UI or 401 errors
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // Add a 5-second timeout so a slow or sleeping backend never causes the UI to hang
      const timeoutPromise = new Promise<{ user: null }>((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 5000),
      );

      try {
        const response = await Promise.race([authApi.getMe(), timeoutPromise]);
        if (isMounted && response?.user) {
          const enriched = enrichUserWithPreferences(response.user);
          setUser(enriched);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(enriched));
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        // Explicit 401 / 403 means token is genuinely expired or invalid
        if (status === 401 || status === 403) {
          if (isMounted) {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            setUser(null);
          }
        }
        // If it was just a network timeout or temporary error, preserve existing cached user
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (payload: LoginPayload): Promise<AuthResponse> => {
    const data = await authApi.login(payload);
    if (data.token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    }
    const enriched = enrichUserWithPreferences(data.user);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(enriched));
    setUser(enriched);
    return data;
  };

  const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
    const data = await authApi.register(payload);
    if (data.token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    }
    const enriched = enrichUserWithPreferences(data.user);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(enriched));
    setUser(enriched);
    return data;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
