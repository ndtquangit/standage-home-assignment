import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../api/client';
import { AuthContext } from './contexts';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ReturnType<typeof authApi.getMe> extends Promise<infer T> ? T | null : never>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  );
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch {
        // Token is invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  const login = useCallback(async (nickname: string) => {
    const response = await authApi.login(nickname);
    localStorage.setItem('token', response.accessToken);
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
