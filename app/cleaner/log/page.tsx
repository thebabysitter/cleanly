'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, Upload, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

type CleanerRow = { id: string; host_id: string };
type Property = {
  id: string;
  name: string;
  cleaner_rate_baht?: number;
  floor?: string | null;
  room_number?: string | null;
};

export default function CleanerLogFormPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cleaner, setCleaner] = useState<CleanerRow | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [transportCost1, setTransportCost1] = useState<string>('');
  const [transportCost2, setTransportCost2] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [startPhoto, setStartPhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [receiptPhoto1, setReceiptPhoto1] = useState<File | null>(null);
  const [receiptPhoto2, setReceiptPhoto2] = useState<File | null>(null);
  const [startCapturedAt, setStartCapturedAt] = useState<string | null>(null);
  const [afterCapturedAt, setAfterCapturedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/cleaner-login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'cleaner') {
        router.replace('/cleaner-login');
        return;
      }
      const { data: cleaners } = await supabase
        .from('cleaners')
        .select('id, host_id')
        .eq('cleaner_profile_id', user.id)
        .limit(1);
      const row = cleaners && cleaners[0];
      if (!row) return toast.error('Cleaner account not linked');
      setCleaner(row as CleanerRow);
      const { data: props } = await supabase
        .from('properties')
        .select('id, name, cleaner_rate_baht, floor, room_number')
        .eq('host_id', row.host_id)
        .order('name');
      setProperties(props || []);
    })();
  }, [user, router]);

  const nowLabel = useMemo(() => format(new Date(), 'EEE, MMM d, yyyy • HH:mm'), []);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertyId),
    [properties, propertyId]
  );

  const baseRate = selectedProperty?.cleaner_rate_baht ?? 700;
  const numericTransport1 = parseFloat(transportCost1 || '0') || 0;
  const numericTransport2 = parseFloat(transportCost2 || '0') || 0;
  const transportTotal = numericTransport1 + numericTransport2;
  const estimatedTotal = baseRate + transportTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleaner) return;
    if (!propertyId) return toast.error('Choose property');
    if (!afterPhoto) return toast.error('After photo is required');
    // Transport is now optional
    setSubmitting(true);
    try {
      const property = properties.find((p) => p.id === propertyId);
      const base = property?.cleaner_rate_baht ?? 700;
      const t1 = parseFloat(transportCost1 || '0') || 0;
      const t2 = parseFloat(transportCost2 || '0') || 0;
      const transport = t1 + t2;
      const amount = base + transport;
      const now = new Date().toISOString();
      const startAtIso = startCapturedAt || now;
      // Duration in hours from start photo capture time to submission time
      const durationMs = new Date(now).getTime() - new Date(startAtIso).getTime();
      const durationHours = Math.max(0, Number((durationMs / (1000 * 60 * 60)).toFixed(2)));

      const { data: cleaning, error: insertErr } = await supabase
        .from('cleanings')
        .insert({
          property_id: propertyId,
          cleaner_id: cleaner.id,
          scheduled_date: now,
          completed_at: now,
          status: 'completed',
          duration_hours: durationHours,
          amount,
          transport_cost: transport,
        })
        .select('*')
        .single();
      if (insertErr) throw insertErr;

      // helper: compress image to a reasonably small WebP (or JPEG fallback) using createImageBitmap
      const compressImage = async (file: File): Promise<Blob> => {
        const bitmap = await createImageBitmap(file);
        // Stronger compression: smaller max dimension + slightly lower quality
        const MAX_DIM = 960; // target max width/height in pixels
        let { width, height } = bitmap;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');
        ctx.drawImage(bitmap, 0, 0, width, height);

        // Try WebP first
        let blob: Blob | null = await new Promise((resolve) => {
          // quality ~0.6 for a good balance between size and clarity
          canvas.toBlob((b) => resolve(b), 'image/webp', 0.6);
        });

        // If WebP unsupported or failed, fall back to JPEG
        if (!blob || !blob.type || blob.type === 'image/png') {
          blob = await new Promise<Blob | null>((resolve) =>
            // use the same quality for JPEG fallback
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.6)
          );
        }

        if (!blob) throw new Error('Image compression failed');
        return blob;
      };

      const bucket = 'cleaning-media';
      const uploadOne = async (
        file: File,
        category: 'start' | 'after' | 'receipt_main' | 'receipt_extra',
        capturedAt: string
      ) => {
        // Compress image (WebP preferred, JPEG fallback)
        const blob = await compressImage(file);

        // Derive extension from actual content type so type and suffix match
        let ext = 'webp';
        if (blob.type === 'image/jpeg') ext = 'jpg';
        else if (blob.type === 'image/png') ext = 'png';

        const fileName = `${category}-${Date.now()}.${ext}`;
        const path = `${cleaning.id}/${fileName}`;
        const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, blob, {
          contentType: blob.type || 'image/jpeg',
          cacheControl: '31536000',
          upsert: true,
        });
        if (uploadErr) throw uploadErr;
        let publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        if (!publicUrl) {
          const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30);
          publicUrl = signed.data?.signedUrl || '';
        }
        // As a final guard, if publicUrl still empty, throw
        if (!publicUrl) throw new Error('Unable to generate image URL');
        const { error: mediaErr } = await supabase.from('cleaning_media').insert({
          cleaning_id: cleaning.id,
          media_url: publicUrl,
          media_type: 'image',
          category,
          captured_at: capturedAt,
        });
        if (mediaErr) throw mediaErr;
      };

      if (startPhoto) {
      await uploadOne(startPhoto, 'start', startCapturedAt || now);
      }
      await uploadOne(afterPhoto, 'after', afterCapturedAt || now);
      if (receiptPhoto1) {
        await uploadOne(receiptPhoto1, 'receipt_main', now);
      }
      if (receiptPhoto2) {
        await uploadOne(receiptPhoto2, 'receipt_extra', now);
      }

      toast.success('Cleaning logged');
      router.replace('/cleaner');
    } catch (err: any) {
      toast.error(err.message || 'Failed to log cleaning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
      <Button variant="outline" className="mb-3 gap-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log Cleaning</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
              <span className="font-medium uppercase tracking-wide text-slate-500">Today</span>
              <span>{nowLabel}</span>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Property
              </Label>
              <Select value={propertyId} onValueChange={setPropertyId} required>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => {
                    const suffix =
                      p.floor || p.room_number
                        ? ` - ${[p.floor, p.room_number].filter(Boolean).join(' • ')}`
                        : '';
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {suffix}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Cleaner rate</span>
                <span className="font-medium text-slate-700">
                  ฿{baseRate.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cleaning photos
                  </p>
                  <p className="text-xs text-slate-500">
                    Capture before and after to confirm the job.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                  <Label className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span>Start of cleaning</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      Camera
                    </span>
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="cursor-pointer border-0 bg-transparent p-0 text-xs file:mr-2 file:rounded-full file:border-0 file:bg-emerald-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-emerald-800"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setStartPhoto(f);
                      if (f) setStartCapturedAt(new Date().toISOString());
                    }}
                  />
                </div>

                <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                  <Label className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span>After cleaning</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      Camera
                    </span>
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="cursor-pointer border-0 bg-transparent p-0 text-xs file:mr-2 file:rounded-full file:border-0 file:bg-emerald-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-emerald-800"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setAfterPhoto(f);
                      if (f) setAfterCapturedAt(new Date().toISOString());
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Transportation
                  </p>
                  <p className="text-xs text-slate-500">
                    Log up to two transport receipts (e.g. going and returning).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-700">
                      Transport 1 (optional)
                    </Label>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      Receipt
                    </span>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer border-0 bg-transparent p-0 text-xs file:mr-2 file:rounded-full file:border-0 file:bg-sky-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-sky-800"
                    onChange={(e) => setReceiptPhoto1(e.target.files?.[0] || null)}
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={transportCost1}
                    className="h-8 text-xs"
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (/^[0-9]*\.?[0-9]*$/.test(v)) setTransportCost1(v);
                    }}
                  />
                </div>

                <div className="space-y-2 rounded-lg border border-dashed border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-700">
                      Transport 2 (optional)
                    </Label>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      Receipt
                    </span>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer border-0 bg-transparent p-0 text-xs file:mr-2 file:rounded-full file:border-0 file:bg-sky-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-sky-800"
                    onChange={(e) => setReceiptPhoto2(e.target.files?.[0] || null)}
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={transportCost2}
                    className="h-8 text-xs"
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (/^[0-9]*\.?[0-9]*$/.test(v)) setTransportCost2(v);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-700">Transport total</p>
                  <p className="text-[11px] text-slate-500">
                    Based on both transport entries.
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  ฿{transportTotal.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-900 px-3 py-3 text-slate-50">
              <div className="flex items-center justify-between text-xs">
                <span>Cleaner rate</span>
                <span>฿{baseRate.toLocaleString('en-US')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Transport total</span>
                <span>{`+ ฿${transportTotal.toLocaleString('en-US')}`}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-700 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Estimated payout
                </span>
                <span className="text-lg font-semibold">
                  ฿{estimatedTotal.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !propertyId}>
              {submitting ? 'Saving...' : 'Save log'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


