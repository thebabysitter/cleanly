'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

type CleanerRow = {
  id: string;
  name: string;
  payment_details_image: string | null;
};

export default function CleanerProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cleaner, setCleaner] = useState<CleanerRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/cleaner-login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setPageLoading(true);
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).maybeSingle();
    if (profile?.role !== 'cleaner') {
      router.replace('/cleaner-login');
      return;
    }
    const { data: cleaners } = await supabase
      .from('cleaners')
      .select('id, name, payment_details_image')
      .eq('cleaner_profile_id', user?.id)
      .limit(1);
    
    if (cleaners && cleaners[0]) {
      setCleaner(cleaners[0] as CleanerRow);
    } else {
      toast.error('Cleaner profile not found');
    }
    setPageLoading(false);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const MAX_DIM = 720; // Reduced max dimension for smaller file size
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Force WebP
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Image compression failed'));
          }
        }, 'image/webp', 0.5);
      };
      img.onerror = (e) => reject(new Error('Failed to load image for compression'));
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !cleaner) return;
    
    setUploading(true);
    const file = e.target.files[0];
    
    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      
      const bucket = 'cleaner-documents';
      // Determine extension based on blob type
      let ext = 'webp';
      if (compressedBlob.type === 'image/jpeg') ext = 'jpg';
      else if (compressedBlob.type === 'image/png') ext = 'png';

      const fileName = `payment-details-${Date.now()}.${ext}`;
      const path = `payment-details/${user?.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, compressedBlob, {
        upsert: true,
        contentType: compressedBlob.type
      });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

      const { error: updateErr } = await supabase
        .from('cleaners')
        .update({ payment_details_image: publicUrl })
        .eq('id', cleaner.id);

      if (updateErr) throw updateErr;

      setCleaner(prev => prev ? { ...prev, payment_details_image: publicUrl } : null);
      toast.success('Payment details updated');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  if (pageLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Button variant="ghost" size="icon" onClick={() => router.push('/cleaner')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle className="text-lg">Profile & Payments</CardTitle>
            <CardDescription>{cleaner?.name}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-medium text-slate-900">Payment Details (QR Code / Bank Book)</h3>
            <p className="text-sm text-slate-500">
              Upload a photo of your QR code or bank account details so the host can pay you.
            </p>
            
            <div className="mt-4">
              {cleaner?.payment_details_image ? (
                <div className="relative rounded-lg overflow-hidden border bg-slate-100 mb-4">
                  <img 
                    src={cleaner.payment_details_image} 
                    alt="Payment Details" 
                    className="w-full object-contain max-h-[400px]"
                  />
                </div>
              ) : (
                <div className="h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400 mb-4 bg-slate-50">
                  <ImageIcon className="h-10 w-10 mb-2" />
                  <span className="text-sm">No image uploaded</span>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button disabled={uploading} className="relative cursor-pointer">
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {cleaner?.payment_details_image ? 'Change Photo' : 'Upload Photo'}
                    </>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
