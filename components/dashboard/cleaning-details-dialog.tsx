'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Calendar, User, MapPin, DollarSign, Image as ImageIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

type Cleaning = {
  id: string;
  property_id: string;
  cleaner_id: string;
  scheduled_date: string;
  completed_at?: string | null;
  status: string;
  duration_hours: number | null;
  amount: number | null;
  transport_cost: number | null;
  notes: string | null;
  property: { id?: string; name: string; address: string; room_number: string | null };
  cleaner: { id?: string; name: string };
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
  properties?: { id: string; name: string; room_number?: string | null }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
};

export default function CleaningDetailsDialog({
  cleaning,
  properties = [],
  open,
  onOpenChange,
  onUpdate,
}: CleaningDetailsDialogProps) {
  const propertyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; room_number?: string | null }>();
    for (const p of properties) map.set(p.id, p);
    return Array.from(map.values());
  }, [properties]);

  const [media, setMedia] = useState<Media[]>([]);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [draft, setDraft] = useState<{
    property_id: string;
    amount: string;
  }>({
    property_id: '',
    amount: '',
  });

  useEffect(() => {
    if (open && cleaning) {
      loadMedia();
      hydrateDraftFromCleaning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cleaning]);

  const hydrateDraftFromCleaning = () => {
    const propertyId = cleaning.property_id || cleaning.property.id || '';
    setDraft({
      property_id: propertyId,
      amount: cleaning.amount == null ? '' : String(Math.round(cleaning.amount)),
    });
    setEditingAmount(false);
    setAmountInput('');
    setEditMode(false);
  };

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

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      const amount = draft.amount.trim() === '' ? null : Math.max(0, Math.round(Number(draft.amount)));

      if (amount != null && Number.isNaN(amount)) {
        toast.error('Amount must be a number');
        return;
      }

      const payload: any = {
        amount,
        property_id: draft.property_id,
      };

      const { error } = await supabase.from('cleanings').update(payload).eq('id', cleaning.id);
      if (error) throw error;

      // Keep dialog UI in sync immediately
      setDraft((prev) => ({
        ...prev,
        amount: amount == null ? '' : String(amount),
      }));
      setEditMode(false);
      setEditingAmount(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update cleaning');
    } finally {
      setSaving(false);
    }
  };

  // View-only in this dialog: no upload or delete here
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('cleanings').delete().eq('id', cleaning.id);
      if (error) throw error;
      toast.success('Cleaning deleted');
      onOpenChange(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete cleaning');
    } finally {
      setDeleting(false);
    }
  };

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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditMode((v) => !v)}
                disabled={deleting || saving}
              >
                {editMode ? 'Cancel edits' : 'Edit cleaning'}
              </Button>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deleting}
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">{deleting ? 'Deleting cleaning' : 'Delete cleaning'}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this cleaning?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the cleaning and any linked media and payout records.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {editMode && (
            <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (฿)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={draft.amount}
                    onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g. 700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Property</Label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
                    value={draft.property_id}
                    onChange={(e) => {
                      const nextPropertyId = e.target.value;
                      const prop = propertyOptions.find((x) => x.id === nextPropertyId);
                      setDraft((p) => ({
                        ...p,
                        property_id: nextPropertyId,
                        // room is stored on the property record; label will show it
                      }));
                    }}
                  >
                    {propertyOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.room_number ? ` (Room ${p.room_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={hydrateDraftFromCleaning}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button type="button" onClick={handleSaveEdits} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs">Cleaning Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm">
                  {format(new Date(cleaning.completed_at || cleaning.scheduled_date), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs">Cleaner</Label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{cleaning.cleaner.name}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <DollarSign className="w-5 h-5" />
              {!editingAmount ? (
                <span className="text-lg">฿{(Number(draft.amount || cleaning.amount || 0) ?? 0).toFixed(0)}</span>
              ) : (
                <input
                  className="h-8 w-28 rounded border border-green-300 bg-white px-2 text-green-700"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={Math.round(Number(draft.amount || cleaning.amount || 0))}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              )}
              {!editingAmount ? (
                <button
                  className="ml-2 text-xs underline"
                  onClick={() => {
                    setEditingAmount(true);
                    setAmountInput(String(Math.round(Number(draft.amount || cleaning.amount || 0))));
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
                      setDraft((p) => ({ ...p, amount: String(val) }));
                      setEditingAmount(false);
                      setAmountInput('');
                      onUpdate();
                    }
                  }}
                >
                  Save
                </button>
              )}
            </div>
            {typeof (cleaning.transport_cost ?? null) === 'number' && (cleaning.transport_cost ?? 0) > 0 && (
              <p className="text-xs text-green-700 mt-1">
                Includes transport: ฿{Math.round(cleaning.transport_cost ?? 0).toLocaleString()}
              </p>
            )}
          </div>

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
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-700 font-medium capitalize">
                          {item.category || 'photo'}
                        </div>
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto p-3 sm:p-4">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Media preview</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        {previewItem?.media_type === 'image' ? (
          <img
            src={previewItem.media_url}
            alt="Preview"
            className="w-full max-h-[85vh] object-contain rounded-lg bg-black/5"
          />
        ) : previewItem ? (
          <video
            src={previewItem.media_url}
            className="w-full max-h-[85vh] rounded-lg bg-black/5"
            controls
            autoPlay
          />
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}
