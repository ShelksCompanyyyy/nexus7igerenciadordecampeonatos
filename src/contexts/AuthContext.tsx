import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  unique_id: string;
  username: string;
  email: string;
  game_nick: string;
  whatsapp: string | null;
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

export type AppRole = 'user' | 'admin' | 'superadmin';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  role: AppRole;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    gameNick: string;
    whatsapp: string;
    clanId?: string;
    role?: AppRole;
  }) => Promise<{ error: string | null; userId?: string }>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
  isAdminUser: boolean;
  isSuperAdminUser: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>('user');
  const [loading, setLoading] = useState(true);

  // No hardcoded UID - role is determined by user_roles table

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData && !error) {
        setProfile(profileData as Profile);
      } else {
        // Profile table may not exist or user_id column missing — create a minimal profile object
        console.warn('Profile fetch failed, using fallback:', error?.message);
        setProfile({
          id: userId,
          user_id: userId,
          unique_id: '',
          username: '',
          email: '',
          game_nick: '',
          whatsapp: null,
          avatar: null,
          gold: 0,
          free_spins: 0,
          clan_id: null,
          team_id: null,
          badges: [],
          colored_nick: false,
          nick_color_id: null,
          frame_id: null,
          kills: 0,
          deaths: 0,
          assists: 0,
          mvps: 0,
          matches_played: 0,
          created_at: '',
          updated_at: '',
        } as Profile);
      }
    } catch (e) {
      console.warn('Profile fetch exception:', e);
    }

    // Fetch role from user_roles table
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleData) {
        setRole(roleData.role as AppRole);
      }
    } catch (e) {
      console.warn('Role fetch failed:', e);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Use setTimeout to avoid Supabase client deadlock
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setUser(null);
          setProfile(null);
          setRole('user');
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const register = useCallback(async (data: {
    username: string;
    email: string;
    password: string;
    gameNick: string;
    whatsapp: string;
    clanId?: string;
    role?: AppRole;
  }) => {
    const { data: authData, error } = await supabase.auth.signUp({
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
    return { error: null, userId: authData.user?.id };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole('user');
  }, []);

  const isAdminUser = role === 'admin' || role === 'superadmin';
  const isSuperAdminUser = role === 'superadmin';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      loading,
      login,
      register,
      logout,
      isLoggedIn: !!user && !!profile,
      isAdminUser,
      isSuperAdminUser,
      refreshProfile,
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
