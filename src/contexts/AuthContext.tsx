import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, getCurrentUser, setCurrentUser, loginUser, registerUser, isAdmin, isSuperAdmin, getUserById } from '@/lib/store';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => User | null;
  register: (data: { username: string; email: string; password: string; gameNick: string; whatsapp: string }) => User;
  logout: () => void;
  isLoggedIn: boolean;
  isAdminUser: boolean;
  isSuperAdminUser: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getCurrentUser());

  const refreshUser = useCallback(() => {
    const cur = getCurrentUser();
    if (cur) {
      const fresh = getUserById(cur.id);
      if (fresh) {
        setCurrentUser(fresh);
        setUser(fresh);
        return;
      }
    }
    setUser(cur);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const u = loginUser(email, password);
    if (u) { setCurrentUser(u); setUser(u); }
    return u;
  }, []);

  const register = useCallback((data: { username: string; email: string; password: string; gameNick: string; whatsapp: string }) => {
    const u = registerUser(data);
    setCurrentUser(u);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      isLoggedIn: !!user,
      isAdminUser: user?.role === 'admin' || user?.role === 'superadmin',
      isSuperAdminUser: user?.role === 'superadmin',
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
