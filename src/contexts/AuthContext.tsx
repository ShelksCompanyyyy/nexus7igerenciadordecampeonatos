import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  unique_id: string;
  username: string;
  email: string;
  game_nick: string;
  whatsapp: string;
  avatar: string | null;
  gold: number;
  free_spins: number;
  clan_id: string | null;
  team_id: string | null;
  badges: string[];
  colored_nick: boolean;
  nick_color_id: string | null;
  frame_id: string | null;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  matches_played: number;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'user' | 'admin' | 'superadmin';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  role: UserRole;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    gameNick: string;
    whatsapp: string;
    clanId?: string;
    role?: UserRole;
  }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
  isAdminUser: boolean;
  isSuperAdminUser: boolean;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileData) {
      setProfile({
        ...profileData,
        gold: profileData.gold ?? 0,
        free_spins: profileData.free_spins ?? 0,
        badges: profileData.badges ?? [],
        colored_nick: profileData.colored_nick ?? false,
        kills: profileData.kills ?? 0,
        deaths: profileData.deaths ?? 0,
        assists: profileData.assists ?? 0,
        mvps: profileData.mvps ?? 0,
        matches_played: profileData.matches_played ?? 0,
        whatsapp: profileData.whatsapp ?? '',
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (roleData && roleData.length > 0) {
      // Pick highest role
      if (roleData.some(r => r.role === 'superadmin')) setRole('superadmin');
      else if (roleData.some(r => r.role === 'admin')) setRole('admin');
      else setRole('user');
    } else {
      setRole('user');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to avoid potential Supabase deadlock
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setRole('user');
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const register = useCallback(async (data: {
    username: string;
    email: string;
    password: string;
    gameNick: string;
    whatsapp: string;
    clanId?: string;
    role?: UserRole;
  }) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          game_nick: data.gameNick,
          whatsapp: data.whatsapp,
          clan_id: data.clanId || null,
          role: data.role || 'user',
        },
      },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('user');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      session,
      login,
      register,
      logout,
      isLoggedIn: !!user,
      isAdminUser: role === 'admin' || role === 'superadmin',
      isSuperAdminUser: role === 'superadmin',
      refreshProfile,
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
