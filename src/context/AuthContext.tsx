import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
// scopedStorage replaced with localStorage for browser compatibility
import { authApi, setupApi } from '@/lib/api';
import type { IUser } from '@/data/blog';

interface AuthContextType {
  user: IUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  needsSetup: boolean;
  login: (token: string, user: IUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const checkSetup = useCallback(async () => {
    try {
      const res = await setupApi.status();
      if (res.success && res.data && !res.data.initialized) {
        setNeedsSetup(true);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    // 先检查是否需要初始化
    const ready = await checkSetup();
    if (!ready) {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.me();
      if (res.success && res.data) {
        setUser(res.data as IUser);
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [checkSetup]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback((token: string, userData: IUser) => {
    localStorage.setItem('auth_token', token);
    setUser(userData);
    setNeedsSetup(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        isAdmin: user?.role === 'admin',
        needsSetup,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
