import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, LoginPayload, RegisterPayload } from '../types/auth';
import { authApi } from '../api/auth';
import { api } from '../api/client';
import { tokenStorage } from '../storage/token';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      await tokenStorage.clear();
      api.setToken(null);
      setUser(null);
      setToken(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
    } catch {
      await logout();
    }
  }, [logout]);

  useEffect(() => {
    const unsubscribe = api.onUnauthorized(() => {
      logout();
    });

    const initializeAuth = async () => {
      try {
        const storedToken = await tokenStorage.get();
        if (storedToken) {
          api.setToken(storedToken);
          setToken(storedToken);
          const currentUser = await authApi.getMe();
          setUser(currentUser);
        }
      } catch {
        api.setToken(null);
        await tokenStorage.clear();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      unsubscribe();
    };
  }, [logout]);

  const login = async (payload: LoginPayload) => {
    const data = await authApi.login(payload);
    await tokenStorage.set(data.token);
    api.setToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (payload: RegisterPayload) => {
    const data = await authApi.register(payload);
    await tokenStorage.set(data.token);
    api.setToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
