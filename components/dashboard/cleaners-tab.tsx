'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserCheck, Plus, Mail, Phone, Pencil, Trash2, Lock } from 'lucide-react';

type Cleaner = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export default function CleanersTab() {
  const { user } = useAuth();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingCleaner, setEditingCleaner] = useState<Cleaner | null>(null);

  useEffect(() => {
    loadCleaners();
  }, [user]);

  const loadCleaners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cleaners')
      .select('*')
      .eq('host_id', user?.id)
      .order('name', { ascending: true });

    if (error) {
      toast.error('Failed to load cleaners');
    } else {
      const sorted = (data || []).slice().sort((a: any, b: any) =>
        String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
      ) as Cleaner[];
      setCleaners(sorted);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get('name') as string;
    const email = ((formData.get('email') as string) || '').trim().toLowerCase();
    const phone = (formData.get('phone') as string) || '';
    const password = (formData.get('password') as string) || '';

    try {
      if (editingCleaner) {
        const cleanerData = {
          name,
          email: email || null,
          phone: phone || null,
          host_id: user?.id,
        };
        const { error } = await supabase
          .from('cleaners')
          .update(cleanerData)
          .eq('id', editingCleaner.id);

        if (error) throw error;
        toast.success('Cleaner updated successfully');
      } else {
        if (!email || !password) {
          toast.error('Email and password are required for new cleaners');
          return;
        }
        // basic email format guard to avoid \"invalid email\" from auth
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          toast.error('Please enter a valid email address');
          return;
        }
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }
        // 1) Insert cleaner row as HOST session (passes RLS)
        const insertRes = await supabase
          .from('cleaners')
          .insert({
            host_id: user?.id,
            cleaner_profile_id: null,
            name,
            email,
            phone: phone || null,
          })
          .select('id')
          .single();
        if (insertRes.error) throw insertRes.error;
        const cleanerRowId = insertRes.data.id as string;

        // 2) Create auth user using a separate client so we don't switch the host session
        const pubKey =
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const isolated = createClient(url, pubKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const { data: signUpData, error: signUpErr } = await isolated.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role: 'cleaner' } },
        });
        if (signUpErr) {
          // keep the cleaner row as pending without profile link
          throw signUpErr;
        }
        const newUserId = signUpData.user?.id || null;
        if (newUserId) {
          // 3) Link the cleaner_profile_id using HOST session (still intact)
          const { error: linkErr } = await supabase
            .from('cleaners')
            .update({ cleaner_profile_id: newUserId })
            .eq('id', cleanerRowId);
          if (linkErr) throw linkErr;
        }
        toast.success('Cleaner added successfully');
      }

      setOpen(false);
      setEditingCleaner(null);
      loadCleaners();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cleaner?')) return;

    const { error } = await supabase
      .from('cleaners')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete cleaner');
    } else {
      toast.success('Cleaner deleted successfully');
      loadCleaners();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading cleaners...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cleaners</h2>
          <p className="text-slate-500">Manage your cleaning staff</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditingCleaner(null);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Cleaner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCleaner ? 'Edit Cleaner' : 'Add New Cleaner'}</DialogTitle>
              <DialogDescription>
                {editingCleaner ? 'Update cleaner details' : 'Add a new cleaner to your team'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Jane Smith"
                  defaultValue={editingCleaner?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane@example.com"
                  defaultValue={editingCleaner?.email || ''}
                  required={!editingCleaner}
                />
              </div>
              {!editingCleaner && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Set a password"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  defaultValue={editingCleaner?.phone || ''}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCleaner ? 'Update' : 'Add'} Cleaner
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cleaners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-center">No cleaners yet. Add your first cleaner to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cleaners.map((cleaner) => (
            <Card key={cleaner.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{cleaner.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {cleaner.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      {cleaner.email}
                    </div>
                  )}
                  {cleaner.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      {cleaner.phone}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingCleaner(cleaner);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(cleaner.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
