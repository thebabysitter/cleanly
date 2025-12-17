'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Images, Plus, Save } from 'lucide-react';
import { format } from 'date-fns';

type CleanerRow = {
  id: string;
  host_id: string;
  name: string;
};

type Property = {
  id: string;
  name: string;
  address: string;
};

type Media = {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
};

export default function CleanerLogPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cleaner, setCleaner] = useState<CleanerRow | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createdCleaningId, setCreatedCleaningId] = useState<string | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      (async () => {
        // ensure only cleaners can access this page
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.role !== 'cleaner') {
          router.replace('/cleaner-login');
          return;
        }
        // find the cleaner row for this profile
        const { data: cleaners } = await supabase
          .from('cleaners')
          .select('id, host_id, name')
          .eq('cleaner_profile_id', user.id)
          .limit(1);
        const cleanerRow = cleaners && cleaners[0];
        if (!cleanerRow) return;
        setCleaner(cleanerRow as any);
        const { data: props } = await supabase
          .from('properties')
          .select('id, name, address')
          .eq('host_id', cleanerRow.host_id)
          .order('name');
        setProperties(props || []);
      })();
    }
  }, [user]);

  const nowLabel = useMemo(() => format(new Date(), 'EEE, MMM d, yyyy • HH:mm'), []);

  const goToLog = () => {
    router.push('/cleaner/log');
  };

  const openMedia = async () => {
    if (!createdCleaningId) {
      toast.message('Create the log first');
      return;
    }
    const { data } = await supabase
      .from('cleaning_media')
      .select('id, media_url, media_type')
      .eq('cleaning_id', createdCleaningId)
      .order('uploaded_at', { ascending: false });
    setMedia(data || []);
    setMediaOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!createdCleaningId) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, 3 - media.length);
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      toast.error('Maximum 3 photos per cleaning');
      return;
    }
    setUploading(true);
    try {
      for (const file of toUpload) {
        const ext = file.name.split('.').pop();
        const name = `${Math.random().toString(36).slice(2)}.${ext}`;
        // NOTE: placeholder URL - swap with real storage later
        const mediaUrl = `https://example.com/placeholder/${name}`;
        const mediaType: 'image' | 'video' = 'image';
        const { error } = await supabase
          .from('cleaning_media')
          .insert({ cleaning_id: createdCleaningId, media_url: mediaUrl, media_type: mediaType });
        if (error) throw error;
      }
      toast.success('Photos added');
      openMedia();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      (e.target as any).value = '';
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cleaner Portal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Button className="w-full h-12 text-base" onClick={() => router.push('/cleaner/log')}>
              Log Cleaning
            </Button>
            <Button className="w-full h-12 text-base" variant="outline" onClick={() => router.push('/cleaner/cleanings')}>
              Cleanings
            </Button>
            <Button className="w-full h-12 text-base" variant="outline" onClick={() => router.push('/cleaner/salary')}>
              Salary
            </Button>
            <Button className="w-full h-12 text-base" variant="outline" onClick={() => router.push('/cleaner/profile')}>
              Profile & Payments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
