'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';

type CleanerRow = { id: string; host_id: string };
type CleaningRow = {
  id: string;
  completed_at: string | null;
  scheduled_date: string;
  amount: number | null;
  transport_cost: number | null;
  property: { name: string };
  status: string;
};

export default function CleanerSalaryPage() {
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
        .select('id, host_id')
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
        .select('id, scheduled_date, completed_at, amount, transport_cost, status, property:properties(name)')
        .eq('cleaner_id', c.id)
        .order('completed_at', { ascending: false });
      const rows = (data || []).map((r: any) => ({
        ...r,
        property: Array.isArray(r.property) ? r.property[0] : r.property,
      })) as CleaningRow[];
      setCleanings(rows);
      setPageLoading(false);
    })();
  }, [user]);

  const totals = useMemo(() => {
    const completed = cleanings.filter((x) => x.status === 'completed');
    const total = completed.reduce((s, x) => s + (x.amount || 0), 0);
    const transport = completed.reduce((s, x) => s + (x.transport_cost || 0), 0);
    return { total, transport, count: completed.length };
  }, [cleanings]);

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
          <CardTitle className="text-lg">Salary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <DollarSign className="w-5 h-5" />
              <span className="text-lg">฿{Math.round(totals.total).toLocaleString()}</span>
            </div>
            {totals.transport > 0 && (
              <p className="text-xs text-green-700 mt-1">
                Transport total: ฿{Math.round(totals.transport).toLocaleString()}
              </p>
            )}
            <p className="text-xs text-slate-600 mt-1">{totals.count} completed cleanings</p>
          </div>

          {cleanings.length === 0 ? (
            <div className="text-center text-slate-500 py-6">No cleanings yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cleanings.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.property?.name || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {format(new Date(c.completed_at || c.scheduled_date), 'MMM d, h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof c.amount === 'number' ? `฿${Math.round(c.amount).toLocaleString()}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


