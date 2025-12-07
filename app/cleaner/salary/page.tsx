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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type CleanerRow = { id: string; host_id: string };
type CleaningRow = {
  id: string;
  completed_at: string | null;
  scheduled_date: string;
  amount: number | null;
  transport_cost: number | null;
  property: { name: string; room_number: string | null };
  status: string;
  payouts: { amount: number; paid_at: string }[];
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
        .select('id, scheduled_date, completed_at, amount, transport_cost, status, property:properties(name, room_number), payouts:cleaner_payouts(amount, paid_at)')
        .eq('cleaner_id', c.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });
        
      const rows = (data || []).map((r: any) => ({
        ...r,
        property: Array.isArray(r.property) ? r.property[0] : r.property,
        payouts: r.payouts || []
      })) as CleaningRow[];
      
      setCleanings(rows);
      setPageLoading(false);
    })();
  }, [user]);

  const { nextPayout, payoutGroups } = useMemo(() => {
    const unpaid = cleanings.filter(c => c.payouts.length === 0);
    const paid = cleanings.filter(c => c.payouts.length > 0);
    
    const nextTotal = unpaid.reduce((s, x) => s + (x.amount || 0), 0);
    
    // Group paid cleanings by paid_at timestamp
    const groupsMap = new Map<string, {
      paidAt: string;
      total: number;
      items: { amount: number; property: string; room_number: string | null; completed_at: string }[];
    }>();

    paid.forEach(c => {
      c.payouts.forEach(p => {
        // Create a key based on paid_at
        const key = p.paid_at;
        const g = groupsMap.get(key) || {
          paidAt: p.paid_at,
          total: 0,
          items: []
        };
        g.total += p.amount;
        g.items.push({
          amount: p.amount,
          property: c.property.name,
          room_number: c.property.room_number,
          completed_at: c.completed_at || c.scheduled_date
        });
        groupsMap.set(key, g);
      });
    });

    const groups = Array.from(groupsMap.values()).sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );

    return { 
      nextPayout: nextTotal, 
      payoutGroups: groups
    };
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

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <DollarSign className="w-5 h-5" />
                <span className="text-2xl font-bold">฿{Math.round(nextPayout).toLocaleString()}</span>
              </div>
              <p className="text-xs text-emerald-600 mt-2">
                Estimated amount for completed cleanings not yet paid.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {payoutGroups.length === 0 ? (
              <div className="text-center text-slate-500 py-6">No payouts yet.</div>
            ) : (
              <Accordion type="multiple" className="border rounded-md divide-y">
                {payoutGroups.map((g, i) => (
                  <AccordionItem key={i} value={`group-${i}`} className="px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="text-left">
                          <div className="font-medium text-slate-900">
                             {format(new Date(g.paidAt), 'MMM d, yyyy • h:mm a')}
                          </div>
                          <div className="text-xs text-slate-500">
                            {g.items.length} cleaning{g.items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="font-semibold text-emerald-600 text-lg">
                          + ฿{Math.round(g.total).toLocaleString()}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 pt-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50%]">Property</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="font-medium">{item.property}</div>
                                {item.room_number && (
                                  <div className="text-xs text-slate-500">
                                    Room {item.room_number}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {format(new Date(item.completed_at), 'MMM d')}
                              </TableCell>
                              <TableCell className="text-right">
                                ฿{Math.round(item.amount).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


