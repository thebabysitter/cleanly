'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, User, TrendingUp, Calendar, Check, BadgeCheck, Loader2, Upload, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import CleaningDetailsDialog from './cleaning-details-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Cleaner = {
  id: string;
  name: string;
  hourly_rate: number;
  payment_details_image: string | null;
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
  proof_of_payment_url?: string | null;
};

const CLEANING_RATE = 700; // flat rate per completed cleaning

type PaymentsTabProps = {
  mode?: 'payments' | 'history';
};

export default function PaymentsTab({ mode = 'payments' }: PaymentsTabProps) {
  const { user } = useAuth();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);
  const [selectedCleaner, setSelectedCleaner] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Payment Dialog State
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<CleanerPayment | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isPaying, setIsPaying] = useState(false);

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
      const pendingCleanings = cleanerCleanings
        .filter((c) => !paidCleaningIds.has(c.id))
        .sort((a, b) => {
          const dateA = new Date(a.completed_at || a.scheduled_date).getTime();
          const dateB = new Date(b.completed_at || b.scheduled_date).getTime();
          return dateB - dateA;
        });
      const pendingAmount = pendingCleanings.reduce((sum, c) => sum + (c.amount ?? CLEANING_RATE), 0);

      return {
        cleaner,
        pendingAmount,
        pendingCount: pendingCleanings.length,
        pendingCleanings,
      };
    });
  };

  const cleanerPayments =
    mode === 'payments'
      ? // Only show cleaners where the host actually owes money (pending payouts)
        getCleanerPayments().filter((cp) => cp.pendingCount > 0)
      : [];
  const totalOwedAll =
    mode === 'payments'
      ? cleanerPayments.reduce((sum, cp) => sum + cp.pendingAmount, 0)
      : 0;

  const updateCleaningAmount = async (cleaningId: string, amount: number) => {
    await supabase.from('cleanings').update({ amount }).eq('id', cleaningId);
    setCleanings((prev) => prev.map((c) => (c.id === cleaningId ? { ...c, amount } : c)));
  };

  const handleOpenPaymentDialog = (payment: CleanerPayment) => {
    setActivePayment(payment);
    setPaymentProofFile(null);
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!activePayment || !user) return;
    
    setIsPaying(true);
    try {
      let proofUrl: string | null = null;

      // Upload proof if exists
      if (paymentProofFile) {
        const bucket = 'cleaner-documents';
        const ext = paymentProofFile.name.split('.').pop();
        const fileName = `payment-proofs/${Date.now()}.${ext}`;
        const path = `payment-proofs/${user.id}/${fileName}`;
        
        const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, paymentProofFile, {
          upsert: true,
          contentType: paymentProofFile.type
        });
        
        if (uploadErr) throw uploadErr;
        
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        proofUrl = data.publicUrl;
      }

      const rows = activePayment.pendingCleanings.map((c) => ({
        host_id: user.id,
        cleaner_id: activePayment.cleaner.id,
        cleaning_id: c.id,
        amount: (c.amount ?? CLEANING_RATE),
        proof_of_payment_url: proofUrl
      }));

      const { error } = await supabase.from('cleaner_payouts').insert(rows);
      if (error) throw error;

      await loadPayouts();
      setPaymentDialogOpen(false);
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to record payment: ' + err.message);
    } finally {
      setIsPaying(false);
    }
  };

  const filteredPayments =
    mode !== 'payments'
      ? []
      : selectedCleaner === 'all'
      ? cleanerPayments
      : cleanerPayments.filter((cp) => cp.cleaner.id === selectedCleaner);

  if (loading) {
    return <div className="text-center py-8">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'history' ? 'Payment history' : 'Payments'}
          </h2>
          <p className="text-slate-500">
            {mode === 'history'
              ? 'Overall payouts with per-apartment breakdown'
              : 'Track payments owed to your cleaners'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'history' ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/payments">Back</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/payments/payment-history">Payment history</Link>
            </Button>
          )}
        </div>
      </div>

      {mode === 'payments' && (
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
      )}

      {mode === 'payments' && (
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
                {cleanerPayments.map((cp) => (
                  <SelectItem key={cp.cleaner.id} value={cp.cleaner.id}>
                    {cp.cleaner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </CardHeader>
          <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No pending payments
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
                          onClick={() => handleOpenPaymentDialog(payment)}
                        >
                          Pay
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
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>
      )}

      {mode === 'history' && (
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
                proofUrl?: string | null;
                items: { payout: Payout; cleaning?: Cleaning }[];
              }>();
              payouts.forEach((p) => {
                const key = `${p.cleaner_id}|${p.paid_at}`;
                const g = groupsMap.get(key) || {
                  key,
                  cleanerId: p.cleaner_id,
                  paidAt: p.paid_at,
                  total: 0,
                  proofUrl: p.proof_of_payment_url, // Assume same per batch
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
                          {g.proofUrl && (
                            <div className="mb-4 p-3 bg-slate-50 rounded border flex items-center gap-3">
                              <BadgeCheck className="h-5 w-5 text-green-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">Proof of Payment</p>
                                <a href={g.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                  View Receipt
                                </a>
                              </div>
                            </div>
                          )}
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
      )}

      {mode === 'payments' && (
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay {activePayment?.cleaner.name}</DialogTitle>
            <DialogDescription>
              Total to pay: <span className="font-bold text-green-600">฿{activePayment?.pendingAmount.toLocaleString()}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Cleaner's Payment Details */}
            <div className="space-y-2">
              <Label>Payment Details</Label>
              {activePayment?.cleaner.payment_details_image ? (
                <div className="relative rounded-lg overflow-hidden border bg-slate-100">
                  <img 
                    src={activePayment.cleaner.payment_details_image} 
                    alt="Payment Details" 
                    className="w-full max-h-[300px] object-contain"
                  />
                </div>
              ) : (
                <div className="p-4 border border-dashed rounded-lg bg-slate-50 text-center text-slate-500 text-sm">
                  Cleaner hasn't uploaded payment details yet.
                </div>
              )}
            </div>

            {/* Upload Proof */}
            <div className="space-y-2">
              <Label>Proof of Payment (Optional)</Label>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="relative cursor-pointer w-full" disabled={isPaying}>
                  {paymentProofFile ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      {paymentProofFile.name}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Receipt/Slip
                    </>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        setPaymentProofFile(e.target.files[0]);
                      }
                    }}
                    disabled={isPaying}
                  />
                </Button>
                {paymentProofFile && (
                  <Button variant="ghost" size="icon" onClick={() => setPaymentProofFile(null)}>
                    <span className="sr-only">Remove</span>
                    <span className="text-xl">×</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={isPaying}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isPaying}>
              {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

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
