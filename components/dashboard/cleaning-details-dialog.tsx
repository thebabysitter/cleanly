'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, User, MapPin, Clock, DollarSign, Image as ImageIcon, Video } from 'lucide-react';
import { format } from 'date-fns';

type Cleaning = {
  id: string;
  scheduled_date: string;
  status: string;
  duration_hours: number | null;
  amount: number | null;
  transport_cost: number | null;
  notes: string | null;
  property: { name: string; address: string; room_number: string | null };
  cleaner: { name: string };
};

type Media = {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  category?: string | null;
  captured_at?: string | null;
  uploaded_at: string;
};

type CleaningDetailsDialogProps = {
  cleaning: Cleaning;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
};

export default function CleaningDetailsDialog({
  cleaning,
  open,
  onOpenChange,
  onUpdate,
}: CleaningDetailsDialogProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<Media | null>(null);

  useEffect(() => {
    if (open && cleaning) {
      loadMedia();
    }
  }, [open, cleaning]);

  const loadMedia = async () => {
    const { data, error } = await supabase
      .from('cleaning_media')
      .select('id, media_url, media_type, category, captured_at, uploaded_at')
      .eq('cleaning_id', cleaning.id);

    if (!error) {
      const order: Record<string, number> = { start: 0, after: 1, receipt: 2 };
      const sorted = (data || []).slice().sort((a: any, b: any) => {
        const pa = order[a.category || ''] ?? 99;
        const pb = order[b.category || ''] ?? 99;
        if (pa !== pb) return pa - pb;
        const da = new Date(a.captured_at || a.uploaded_at).getTime();
        const db = new Date(b.captured_at || b.uploaded_at).getTime();
        return da - db;
      });
      setMedia(sorted as any);
    }
  };

  // View-only in this dialog: no upload or delete here

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{cleaning.property.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {cleaning.property.room_number ? (
              <span className="font-medium text-slate-700">Room {cleaning.property.room_number}</span>
            ) : (
              cleaning.property.address
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs">Status</Label>
              <Badge variant="default" className="text-sm">
                {cleaning.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs">Cleaner</Label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{cleaning.cleaner.name}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs">Scheduled</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm">
                  {format(new Date(cleaning.scheduled_date), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </div>
            {cleaning.duration_hours && (
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs">Duration</Label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{cleaning.duration_hours} hours</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <DollarSign className="w-5 h-5" />
              {!editingAmount ? (
                <span className="text-lg">฿{(cleaning.amount ?? 0).toFixed(0)}</span>
              ) : (
                <input
                  className="h-8 w-28 rounded border border-green-300 bg-white px-2 text-green-700"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={Math.round(cleaning.amount ?? 0)}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              )}
              {!editingAmount ? (
                <button
                  className="ml-2 text-xs underline"
                  onClick={() => {
                    setEditingAmount(true);
                    setAmountInput(String(Math.round(cleaning.amount ?? 0)));
                  }}
                >
                  Edit
                </button>
              ) : (
                <button
                  className="ml-2 text-xs underline"
                  onClick={async () => {
                    const val = Math.max(0, Math.round(Number(amountInput || '0')));
                    const { error } = await supabase
                      .from('cleanings')
                      .update({ amount: val })
                      .eq('id', cleaning.id);
                    if (!error) {
                      setEditingAmount(false);
                      onUpdate();
                    }
                  }}
                >
                  Save
                </button>
              )}
            </div>
            {typeof cleaning.transport_cost === 'number' && cleaning.transport_cost > 0 && (
              <p className="text-xs text-green-700 mt-1">
                Includes transport: ฿{Math.round(cleaning.transport_cost).toLocaleString()}
              </p>
            )}
          </div>

          {cleaning.notes && (
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs">Notes</Label>
              <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">
                {cleaning.notes}
              </p>
            </div>
          )}

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Photos & Videos</Label>
            </div>

            {media.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No media uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {media.map((item) => (
                  <div key={item.id} className="rounded-lg overflow-hidden border border-slate-200">
                    <div
                      className="aspect-video bg-slate-100 flex items-center justify-center cursor-zoom-in"
                      onClick={() => {
                        setPreviewItem(item);
                        setPreviewOpen(true);
                      }}
                      title="Click to preview"
                    >
                      {item.media_type === 'image' ? (
                        <img src={item.media_url} alt="Cleaning media" className="w-full h-full object-cover" />
                      ) : (
                        <video className="w-full h-full" controls src={item.media_url}></video>
                      )}
                    </div>
                    <div className="p-2 bg-white">
                      <div className="text-xs text-slate-700 font-medium capitalize">
                        {item.category || 'photo'}
                      </div>
                      <p className="text-xs text-slate-500">
                        {format(new Date(item.captured_at || item.uploaded_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    { /* Image/video preview dialog */ }
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-4xl">
        {previewItem?.media_type === 'image' ? (
          <img src={previewItem.media_url} alt="Preview" className="w-full h-auto rounded-lg" />
        ) : previewItem ? (
          <video src={previewItem.media_url} className="w-full h-auto rounded-lg" controls autoPlay />
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}
