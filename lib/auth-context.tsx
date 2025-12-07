'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        // Ensure a profile exists for this user (works with publishable key due to RLS check)
        if (session?.user) {
          const u = session.user;
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', u.id)
            .maybeSingle();
          if (!data) {
            const fullName =
              (u.user_metadata as any)?.full_name ||
              (u.email?.split('@')[0] ?? 'User');
            const role = (u.user_metadata as any)?.role || 'host';
            await supabase.from('profiles').insert({
              id: u.id,
              email: u.email as string,
              full_name: fullName,
              role,
            });
          }
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
