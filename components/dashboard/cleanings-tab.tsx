'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, MapPin, User, Clock, DollarSign, CheckCircle2, XCircle } from 'lucide-react';
import CleaningDetailsDialog from './cleaning-details-dialog';
import { format } from 'date-fns';
import GanttCleanings from './gantt-cleanings';

type Property = {
  id: string;
  name: string;
  address: string;
  cleaner_rate_baht?: number;
  floor?: string | null;
  room_number?: string | null;
};

type Cleaner = {
  id: string;
  name: string;
};

type Cleaning = {
  id: string;
  scheduled_date: string;
  completed_at?: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  duration_hours: number | null;
  amount: number | null;
  transport_cost: number | null;
  notes: string | null;
  property: Property;
  cleaner: Cleaner;
};

export default function CleaningsTab() {
  const { user } = useAuth();
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('completed');
  const [selectedCleanerId, setSelectedCleanerId] = useState<string | 'all'>('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadCleanings(),
      loadProperties(),
      loadCleaners(),
    ]);
    setLoading(false);
  };

  const loadCleanings = async () => {
    const { data, error } = await supabase
      .from('cleanings')
      .select(`
        *,
        property:properties(id, name, address, cleaner_rate_baht, floor, room_number),
        cleaner:cleaners(id, name)
      `)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false });

    if (error) {
      toast.error('Failed to load cleanings');
    } else {
      setCleanings(data || []);
    }
  };

  const loadProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, name, address, cleaner_rate_baht, floor, room_number')
      .eq('host_id', user?.id);
    setProperties(data || []);
  };

  const loadCleaners = async () => {
    const { data } = await supabase
      .from('cleaners')
      .select('id, name')
      .eq('host_id', user?.id);
    setCleaners(data || []);
  };

  // Scheduling and status-change flows removed; cleaners log completed only.

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      scheduled: { variant: 'default', icon: CalendarIcon },
      in_progress: { variant: 'secondary', icon: Clock },
      completed: { variant: 'default', icon: CheckCircle2 },
      cancelled: { variant: 'destructive', icon: XCircle },
    };

    const { variant, icon: Icon } = variants[status] || variants.scheduled;

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredCleanings = cleanings.filter((c) => {
    const when = new Date(c.completed_at ?? c.scheduled_date);
    const isPastOrToday = when.getTime() <= Date.now();
    const byStatus = filterStatus === 'all' ? true : c.status === filterStatus;
    return isPastOrToday && byStatus;
  });

  if (loading) {
    return <div className="text-center py-8">Loading cleanings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cleanings</h2>
          <p className="text-slate-500">History of completed cleanings</p>
        </div>
      </div>

      {properties.length === 0 || cleaners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarIcon className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-center">
              {properties.length === 0 ? 'Add properties first to schedule cleanings.' : 'Add cleaners first to schedule cleanings.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gantt overview */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Timeline</h3>
            <GanttCleanings
              properties={properties}
              cleanings={cleanings}
              cleaners={cleaners}
              selectedCleanerId={selectedCleanerId}
              onSelectCleaner={setSelectedCleanerId}
              onUpdateCleanings={loadCleanings}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('completed')}
            >
              Completed
            </Button>
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All (past)
            </Button>
          </div>

          {filteredCleanings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 text-center">No cleanings found. Schedule your first cleaning.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1">
              {filteredCleanings.map((cleaning) => (
                <Card
                  key={cleaning.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedCleaning(cleaning);
                    setDetailsOpen(true);
                  }}
                >
                  <CardContent className="py-3">
                    <div className="grid items-center gap-3 md:grid-cols-6 lg:grid-cols-6">
                      <div className="md:col-span-2 flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="text-slate-900 font-medium truncate">{cleaning.property.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">
                              {cleaning.property.floor || cleaning.property.room_number
                                ? [cleaning.property.floor, cleaning.property.room_number]
                                    .filter(Boolean)
                                    .join(' • ')
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{cleaning.cleaner.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">
                          {format(new Date(cleaning.completed_at ?? cleaning.scheduled_date), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className="hidden md:flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">
                          {cleaning.duration_hours ? `${cleaning.duration_hours} hours` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {typeof cleaning.amount === 'number' && (
                          <>
                            <div className="flex items-center gap-2 font-medium">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">฿{Math.round(cleaning.amount).toLocaleString()}</span>
                            </div>
                            {typeof cleaning.transport_cost === 'number' && cleaning.transport_cost > 0 && (
                              <div className="text-xs text-slate-500">
                                Transport: ฿{Math.round(cleaning.transport_cost).toLocaleString()}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {selectedCleaning && (
        <CleaningDetailsDialog
          cleaning={selectedCleaning}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onUpdate={loadCleanings}
        />
      )}
    </div>
  );
}
