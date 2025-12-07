'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Not signed in → go to cleaner login
    if (!user) {
      router.replace('/cleaner-login');
      return;
    }

    // Signed in → look up role once and route directly to the correct app
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.role === 'host') {
        router.replace('/dashboard');
      } else {
        // default to cleaner experience
        router.replace('/cleaner');
      }
    })();
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
