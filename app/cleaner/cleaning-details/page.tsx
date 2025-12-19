'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Save, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

type CleaningDetail = {
  id: string;
  amount: number;
  transport_cost: number;
  scheduled_date: string;
  completed_at: string;
  property: {
    name: string;
    address: string;
  };
};

function CleaningDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const { user, loading: authLoading } = useAuth();
  const [cleaning, setCleaning] = useState<CleaningDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [transportCost1, setTransportCost1] = useState('');
  const [transportCost2, setTransportCost2] = useState('');
  const [receiptPhoto1, setReceiptPhoto1] = useState<File | null>(null);
  const [receiptPhoto2, setReceiptPhoto2] = useState<File | null>(null);
  const [existingReceipts, setExistingReceipts] = useState<{url: string, category: string}[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/cleaner-login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !id) return;
    loadCleaning();
  }, [user, id]);

  const loadCleaning = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cleanings')
        .select(`
          id, amount, transport_cost, scheduled_date, completed_at,
          property:properties(name, address)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      const c = {
        ...data,
        property: Array.isArray(data.property) ? data.property[0] : data.property
      } as CleaningDetail;
      
      setCleaning(c);
      
      if (c.transport_cost > 0) {
        setTransportCost1(c.transport_cost.toString());
      } else {
        setTransportCost1('');
      }
      setTransportCost2('');

      const { data: media } = await supabase
        .from('cleaning_media')
        .select('media_url, category')
        .eq('cleaning_id', id)
        .in('category', ['receipt_main', 'receipt_extra']);
        
      if (media) {
        setExistingReceipts(media.map(m => ({ url: m.media_url, category: m.category })));
      }

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = async (file: File): Promise<Blob> => {
    const bitmap = await createImageBitmap(file);
    const MAX_DIM = 960;
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

    let blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.6);
    });

    if (!blob || !blob.type || blob.type === 'image/png') {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.6)
      );
    }

    if (!blob) throw new Error('Image compression failed');
    return blob;
  };

  const uploadOne = async (
    cleaningId: string,
    file: File,
    category: 'receipt_main' | 'receipt_extra'
  ) => {
    const bucket = 'cleaning-media';
    const blob = await compressImage(file);
    let ext = 'webp';
    if (blob.type === 'image/jpeg') ext = 'jpg';
    else if (blob.type === 'image/png') ext = 'png';

    const fileName = `${category}-${Date.now()}.${ext}`;
    const path = `${cleaningId}/${fileName}`;
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
    if (!publicUrl) throw new Error('Unable to generate image URL');
    
    const { error: mediaErr } = await supabase.from('cleaning_media').insert({
      cleaning_id: cleaningId,
      media_url: publicUrl,
      media_type: 'image',
      category,
      captured_at: new Date().toISOString(),
    });
    if (mediaErr) throw mediaErr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleaning) return;
    
    setSubmitting(true);
    try {
      const t1 = parseFloat(transportCost1 || '0') || 0;
      const t2 = parseFloat(transportCost2 || '0') || 0;
      const newTransport = t1 + t2;
      
      const oldTransport = cleaning.transport_cost || 0;
      const baseAmount = cleaning.amount - oldTransport;
      const newAmount = baseAmount + newTransport;

      const { error: updateErr } = await supabase
        .from('cleanings')
        .update({
          transport_cost: newTransport,
          amount: newAmount
        })
        .eq('id', cleaning.id);
        
      if (updateErr) throw updateErr;

      if (receiptPhoto1) {
        await uploadOne(cleaning.id, receiptPhoto1, 'receipt_main');
      }
      if (receiptPhoto2) {
        await uploadOne(cleaning.id, receiptPhoto2, 'receipt_extra');
      }

      toast.success('Transport updated');
      
      // Clear file inputs
      setReceiptPhoto1(null);
      setReceiptPhoto2(null);
      
      // Reload
      await loadCleaning();
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  if (!cleaning) {
    return <div className="p-4 text-center">Cleaning not found</div>;
  }

  const numericTransport1 = parseFloat(transportCost1 || '0') || 0;
  const numericTransport2 = parseFloat(transportCost2 || '0') || 0;
  const transportTotal = numericTransport1 + numericTransport2;
  const currentBase = cleaning.amount - cleaning.transport_cost;
  const projectedTotal = currentBase + transportTotal;

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
      <Button variant="outline" className="mb-3 gap-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Cleaning Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Property</div>
            <div className="font-medium text-lg">{cleaning.property.name}</div>
            <div className="text-sm text-slate-500">{cleaning.property.address}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Date</div>
              <div>{format(new Date(cleaning.scheduled_date), 'MMM d, yyyy')}</div>
            </div>
            <div>
               <div className="text-xs text-slate-500 uppercase tracking-wide">Status</div>
               <div className="capitalize">{cleaning.transport_cost ? 'Completed' : 'Completed (No Transport)'}</div> 
            </div>
          </div>

          <div className="bg-slate-100 p-3 rounded-lg space-y-2">
             <div className="flex justify-between text-sm">
               <span>Base Rate</span>
               <span>฿{currentBase.toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-sm font-medium text-slate-900">
               <span>Current Transport</span>
               <span>+ ฿{cleaning.transport_cost.toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
               <span>Total</span>
               <span>฿{cleaning.amount.toLocaleString()}</span>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-md flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Update Transport
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-500">
              Add or update transport costs and receipts here.
            </p>

            {existingReceipts.length > 0 && (
              <div className="mb-4">
                <Label className="text-xs mb-2 block">Existing Receipts</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {existingReceipts.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="relative group block w-16 h-16 rounded overflow-hidden border border-slate-200">
                      <img src={r.url} alt="Receipt" className="object-cover w-full h-full" />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                      <ExternalLink className="absolute top-1 right-1 w-3 h-3 text-white drop-shadow-md" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
                <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-700">
                      Transport 1
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
                      Transport 2
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
              <span className="font-medium text-slate-700">New Total</span>
              <span className="font-semibold text-slate-900">฿{projectedTotal.toLocaleString()}</span>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Update Transport
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CleaningDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>}>
      <CleaningDetailsContent />
    </Suspense>
  );
}









