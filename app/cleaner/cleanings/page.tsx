'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

type CleanerRow = { id: string };
type CleaningRow = {
  id: string;
  status: string;
  scheduled_date: string;
  completed_at: string | null;
  amount: number | null;
  transport_cost: number | null;
  property: { name: string; address: string };
};

export default function CleanerMyCleaningsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cleaner, setCleaner] = useState<CleanerRow | null>(null);
  const [cleanings, setCleanings] = useState<CleaningRow[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/cleaner-login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setPageLoading(true);
      const { data: cleaners } = await supabase
        .from('cleaners')
        .select('id')
        .eq('cleaner_profile_id', user.id)
        .limit(1);
      const c = cleaners && cleaners[0];
      if (!c) {
        setPageLoading(false);
        return;
      }
      setCleaner(c as CleanerRow);
      const { data } = await supabase
        .from('cleanings')
        .select('id, status, scheduled_date, completed_at, amount, transport_cost, property:properties(name, address)')
        .eq('cleaner_id', c.id)
        .order('scheduled_date', { ascending: false });
      const rows = (data || []).map((r: any) => ({
        ...r,
        property: Array.isArray(r.property) ? r.property[0] : r.property,
      })) as CleaningRow[];
      setCleanings(rows);
      setPageLoading(false);
    })();
  }, [user]);

  if (pageLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Cleanings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cleanings.length === 0 ? (
            <div className="text-center text-slate-500 py-6">No cleanings yet.</div>
          ) : (
            cleanings.map((c) => (
              <Link key={c.id} href={`/cleaner/cleaning-details?id=${c.id}`} className="block rounded-lg border border-slate-200 p-3 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.property.name}</div>
                  <div className="text-xs">{c.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-slate-400" />}</div>
                </div>
                <div className="text-xs text-slate-500">{c.property.address}</div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {format(new Date(c.completed_at || c.scheduled_date), 'MMM d, h:mm a')}
                </div>
                <div className="text-sm mt-1">
                  {typeof c.amount === 'number' ? `Amount: ฿${Math.round(c.amount).toLocaleString()}` : 'Amount: —'}
                  {c.transport_cost ? ` • Transport: ฿${Math.round(c.transport_cost).toLocaleString()}` : ''}
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}


