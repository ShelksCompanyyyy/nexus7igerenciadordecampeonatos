import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByUserId, type Profile } from '@/lib/supabaseStore';

interface AuthContextType {
  user: Profile | null;
  login: (email: string, password: string) => Promise<Profile | null>;
  register: (data: { username: string; email: string; password: string; gameNick: string; whatsapp: string; clanId?: string; role?: string }) => Promise<Profile>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
  isAdminUser: boolean;
  isSuperAdminUser: boolean;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const profile = await fetchProfileByUserId(userId);
    setUser(profile);
    return profile;
  }, []);

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(() => loadProfile(session.user.id).finally(() => setLoading(false)), 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string): Promise<Profile | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data.user) {
      const profile = await loadProfile(data.user.id);
      return profile;
    }
    return null;
  }, [loadProfile]);

  const register = useCallback(async (regData: { username: string; email: string; password: string; gameNick: string; whatsapp: string; clanId?: string; role?: string }): Promise<Profile> => {
    const { data, error } = await supabase.auth.signUp({
      email: regData.email,
      password: regData.password,
      options: {
        data: {
          username: regData.username,
          game_nick: regData.gameNick,
          whatsapp: regData.whatsapp,
          clan_id: regData.clanId || null,
          role: regData.role || 'user',
        },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Erro ao criar conta');
    
    // Wait a bit for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const profile = await loadProfile(data.user.id);
    if (!profile) throw new Error('Perfil não foi criado. Tente fazer login.');
    return profile;
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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
      loading,
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
