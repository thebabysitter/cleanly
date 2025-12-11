'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, User, TrendingUp, Calendar, Check, BadgeCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import CleaningDetailsDialog from './cleaning-details-dialog';
import { format } from 'date-fns';

type Cleaner = {
  id: string;
  name: string;
  hourly_rate: number;
};

type Cleaning = {
  id: string;
  scheduled_date: string;
  completed_at: string | null;
  status: string;
  duration_hours: number | null;
  amount: number | null;
  property: { name: string; room_number: string | null };
  cleaner: { id: string; name: string };
};

type CleanerPayment = {
  cleaner: Cleaner;
  pendingAmount: number;
  pendingCount: number;
  pendingCleanings: Cleaning[];
};

type Payout = {
  id: string;
  cleaner_id: string;
  cleaning_id: string;
  amount: number;
  paid_at: string;
};

const CLEANING_RATE = 700; // flat rate per completed cleaning

export default function PaymentsTab() {
  const { user } = useAuth();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);
  const [selectedCleaner, setSelectedCleaner] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadCleaners(), loadCleanings(), loadPayouts()]);
    setLoading(false);
  };

  const loadCleaners = async () => {
    const { data } = await supabase
      .from('cleaners')
      .select('*')
      .eq('host_id', user?.id)
      .order('name');
    setCleaners(data || []);
  };

  const loadCleanings = async () => {
    const { data } = await supabase
      .from('cleanings')
      .select(`
        *,
        property:properties(name, room_number),
        cleaner:cleaners(id, name)
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    setCleanings(data || []);
  };

  const loadPayouts = async () => {
    const { data } = await supabase
      .from('cleaner_payouts')
      .select('*')
      .eq('host_id', user?.id)
      .order('paid_at', { ascending: false });
    setPayouts(data || []);
  };

  const getCleanerPayments = (): CleanerPayment[] => {
    return cleaners.map((cleaner) => {
      const cleanerCleanings = cleanings.filter((c) => c.cleaner.id === cleaner.id);
      const paidCleaningIds = new Set(
        payouts.filter((p) => p.cleaner_id === cleaner.id).map((p) => p.cleaning_id)
      );
      const pendingCleanings = cleanerCleanings.filter((c) => !paidCleaningIds.has(c.id));
      const pendingAmount = pendingCleanings.reduce((sum, c) => sum + (c.amount ?? CLEANING_RATE), 0);

      return {
        cleaner,
        pendingAmount,
        pendingCount: pendingCleanings.length,
        pendingCleanings,
      };
    });
  };

  const cleanerPayments = getCleanerPayments();
  const totalOwedAll = cleanerPayments.reduce((sum, cp) => sum + cp.pendingAmount, 0);

  const updateCleaningAmount = async (cleaningId: string, amount: number) => {
    await supabase.from('cleanings').update({ amount }).eq('id', cleaningId);
    setCleanings((prev) => prev.map((c) => (c.id === cleaningId ? { ...c, amount } : c)));
  };

  const filteredPayments = selectedCleaner === 'all'
    ? cleanerPayments
    : cleanerPayments.filter(cp => cp.cleaner.id === selectedCleaner);

  if (loading) {
    return <div className="text-center py-8">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
        <p className="text-slate-500">Track payments owed to your cleaners</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ฿{totalOwedAll.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across all cleaners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cleaners</CardTitle>
            <User className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cleaners.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Active cleaners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cleanings.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Total cleanings
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Breakdown</CardTitle>
              <CardDescription>View payments by cleaner</CardDescription>
            </div>
            <Select value={selectedCleaner} onValueChange={setSelectedCleaner}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by cleaner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cleaners</SelectItem>
                {cleaners.map((cleaner) => (
                  <SelectItem key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No completed cleanings yet
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPayments.map((payment) => (
                <div key={payment.cleaner.id} className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 text-slate-600 w-10 h-10 rounded-full flex items-center justify-center font-medium">
                        {payment.cleaner.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {payment.cleaner.name}
                        </h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ฿{payment.pendingAmount.toLocaleString()}
                      </div>
                      <p className="text-xs text-slate-500">{payment.pendingCount} pending</p>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          disabled={payment.pendingCount === 0}
                          onClick={async () => {
                            if (payment.pendingCount === 0) return;
                            const rows = payment.pendingCleanings.map((c) => ({
                              host_id: user?.id as string,
                              cleaner_id: payment.cleaner.id,
                              cleaning_id: c.id,
                              amount: (c.amount ?? CLEANING_RATE),
                            }));
                            await supabase.from('cleaner_payouts').insert(rows);
                            await loadPayouts();
                          }}
                        >
                          Mark paid
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Per-cleaner dropdown of unpaid cleanings only */}
                  <Accordion type="single" collapsible className="bg-white border rounded-md">
                    <AccordionItem value="cleanings">
                      <AccordionTrigger className="px-3">Completed cleanings</AccordionTrigger>
                      <AccordionContent className="px-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                            {payment.pendingCleanings.map((c) => {
                                const amount = c.amount ?? CLEANING_RATE;
                                return (
                                  <TableRow
                                    key={c.id}
                                    className="cursor-pointer"
                                    onClick={() => {
                                      setSelectedCleaning(c as any);
                                      setDetailsOpen(true);
                                    }}
                                  >
                                    <TableCell className="font-medium">
                                      <div>{c.property.name}</div>
                                      {c.property.room_number && (
                                        <div className="text-xs text-slate-500">
                                          Room {c.property.room_number}
                                        </div>
                                      )}
                                    </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                        {c.completed_at
                                          ? format(new Date(c.completed_at), 'MMM d, yyyy')
                                          : format(new Date(c.scheduled_date), 'MMM d, yyyy')}
                              </div>
                            </TableCell>
                                    <TableCell className="text-right">
                                        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                          <span className="text-slate-500">฿</span>
                                          <Input
                                            className="h-8 w-24 text-right"
                                            type="number"
                                            min={0}
                                            step={50}
                                            defaultValue={amount}
                                            onClick={(e) => e.stopPropagation()}
                                            onFocus={(e) => e.stopPropagation()}
                                            onBlur={async (e) => {
                                              const val = Number(e.currentTarget.value || amount);
                                              if (!Number.isFinite(val)) return;
                                              await updateCleaningAmount(c.id, Math.max(0, Math.round(val)));
                                            }}
                                          />
                                        </div>
                            </TableCell>
                          </TableRow>
                                );
                              })}
                      </TableBody>
                    </Table>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Pending list removed as requested */}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History - grouped by overall payment (batch) */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Overall payments with per-apartment breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No payouts yet</div>
          ) : (
            (() => {
              // Build groups by (cleaner_id, paid_at)
              const cleaningById = new Map(cleanings.map((c) => [c.id, c]));
              const groupsMap = new Map<string, {
                key: string;
                cleanerId: string;
                paidAt: string;
                total: number;
                items: { payout: Payout; cleaning?: Cleaning }[];
              }>();
              payouts.forEach((p) => {
                const key = `${p.cleaner_id}|${p.paid_at}`;
                const g = groupsMap.get(key) || {
                  key,
                  cleanerId: p.cleaner_id,
                  paidAt: p.paid_at,
                  total: 0,
                  items: [],
                };
                g.total += p.amount;
                g.items.push({ payout: p, cleaning: cleaningById.get(p.cleaning_id) });
                groupsMap.set(key, g);
              });
              const groups = Array.from(groupsMap.values()).sort(
                (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
              );

              return (
                <Accordion type="multiple" className="border rounded-md divide-y">
                  {groups.map((g) => {
                    const cl = cleaners.find((c) => c.id === g.cleanerId);
                    return (
                      <AccordionItem key={g.key} value={g.key} className="px-3">
                        <AccordionTrigger className="py-3">
                          <div className="w-full grid grid-cols-1 md:grid-cols-4 items-center gap-3 text-left">
                            <div className="font-medium">{cl?.name || 'Cleaner'}</div>
                            <div className="text-slate-600">{format(new Date(g.paidAt), 'MMM d, yyyy • h:mm a')}</div>
                            <div className="text-slate-500">{g.items.length} apartments</div>
                            <div className="md:text-right font-semibold text-green-600">฿{g.total.toLocaleString()}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Apartment</TableHead>
                                <TableHead>Cleaning Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {g.items.map(({ payout, cleaning }) => (
                                <TableRow
                                  key={payout.id}
                                  className={cleaning ? 'cursor-pointer hover:bg-slate-50' : undefined}
                                  onClick={() => {
                                    if (cleaning) {
                                      setSelectedCleaning(cleaning as any);
                                      setDetailsOpen(true);
                                    }
                                  }}
                                >
                                  <TableCell className="font-medium">
                                    <div>{cleaning?.property?.name || '—'}</div>
                                    {cleaning?.property?.room_number && (
                                      <div className="text-xs text-slate-500">
                                        Room {cleaning.property.room_number}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {cleaning?.completed_at
                                      ? format(new Date(cleaning.completed_at), 'MMM d, yyyy')
                                      : cleaning?.scheduled_date
                                      ? format(new Date(cleaning.scheduled_date), 'MMM d, yyyy')
                                      : '—'}
                                  </TableCell>
                                  <TableCell className="text-right">฿{payout.amount.toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              );
            })()
          )}
        </CardContent>
      </Card>

      {selectedCleaning && (
        <CleaningDetailsDialog
          cleaning={selectedCleaning as any}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onUpdate={async () => {
            await Promise.all([loadCleanings(), loadPayouts()]);
          }}
        />
      )}
    </div>
  );
}
