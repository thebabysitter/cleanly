'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building, Plus, MapPin, Pencil, Trash2, ListChecks } from 'lucide-react';
import PropertyTasksDialog from './property-tasks-dialog';

type Property = {
  id: string;
  name: string;
  address: string;
  description: string | null;
  cleaner_rate_baht?: number;
  floor?: string | null;
  room_number?: string | null;
};

export default function PropertiesTab() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [tasksDialogOpen, setTasksDialogOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, [user]);

  const loadProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load properties');
    } else {
      setProperties(data || []);
    }
    setLoading(false);
  };

  const ensureHostProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (!data) {
      // create minimal host profile so FK constraints pass
      await supabase.from('profiles').insert({
        id: user.id,
        email: (user as any)?.email || 'host@example.com',
        full_name: (user as any)?.user_metadata?.full_name || (user as any)?.email?.split('@')[0] || 'Host',
        role: 'host',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const propertyData = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      description: formData.get('description') as string || null,
      cleaner_rate_baht: parseFloat(formData.get('cleaner_rate_baht') as string) || 700,
      floor: ((formData.get('floor') as string) || '').trim() || null,
      room_number: ((formData.get('room_number') as string) || '').trim() || null,
      host_id: user?.id,
    };

    try {
      if (editingProperty) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id);

        if (error) throw error;
        toast.success('Property updated successfully');
      } else {
        await ensureHostProfile();
        const { error } = await supabase
          .from('properties')
          .insert(propertyData);

        if (error) throw error;
        toast.success('Property added successfully');
      }

      setOpen(false);
      setEditingProperty(null);
      loadProperties();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete property');
    } else {
      toast.success('Property deleted successfully');
      loadProperties();
    }
  };

  const openTasksDialog = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setTasksDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading properties...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Properties</h2>
          <p className="text-slate-500">Manage your Airbnb properties</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditingProperty(null);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
              <DialogDescription>
                {editingProperty ? 'Update property details' : 'Add a new property to your portfolio'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Property Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Beach House"
                  defaultValue={editingProperty?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Ocean Drive, Miami, FL"
                  defaultValue={editingProperty?.address}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    name="floor"
                    placeholder="e.g. 12"
                    defaultValue={editingProperty?.floor || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room_number">Room number</Label>
                  <Input
                    id="room_number"
                    name="room_number"
                    placeholder="e.g. 12A"
                    defaultValue={editingProperty?.room_number || ''}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="2 bedroom beachfront property..."
                  defaultValue={editingProperty?.description || ''}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cleaner_rate_baht">Cleaner salary per cleaning (฿)</Label>
                <Input
                  id="cleaner_rate_baht"
                  name="cleaner_rate_baht"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="700"
                  defaultValue={editingProperty?.cleaner_rate_baht ?? 700}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProperty ? 'Update' : 'Add'} Property
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-center">No properties yet. Add your first property to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1">
          {properties.map((property) => (
            <Card
              key={property.id}
              className="hover:shadow-md transition-shadow overflow-hidden"
            >
              <CardHeader className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate">
                      {property.name}
                    </CardTitle>
                    <div className="mt-1 space-y-0.5 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="break-words">{property.address}</span>
                      </div>
                      {(property.floor || property.room_number) && (
                        <div className="pl-4 text-xs text-slate-500">
                          {[property.floor, property.room_number].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pt-0 pb-3">
                <p className="text-sm text-slate-700 mb-1">
                  Cleaner payout:{' '}
                  <span className="font-medium">
                    ฿{(property.cleaner_rate_baht ?? 700).toLocaleString()}
                  </span>
                </p>
                {property.description && (
                  <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                    {property.description}
                  </p>
                )}
                <div className="flex gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => openTasksDialog(property.id)}
                  >
                    <ListChecks className="w-4 h-4" />
                    Tasks
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingProperty(property);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(property.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPropertyId && (
        <PropertyTasksDialog
          propertyId={selectedPropertyId}
          open={tasksDialogOpen}
          onOpenChange={setTasksDialogOpen}
        />
      )}
    </div>
  );
}
