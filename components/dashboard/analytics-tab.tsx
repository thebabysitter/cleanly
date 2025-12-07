 'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';

type Property = { id: string; name: string };
type CleaningRow = {
  id: string;
  property: Property;
  scheduled_date: string;
  completed_at: string | null;
  amount: number | null;
  transport_cost: number | null;
};

const PALETTE = [
  '#2563eb', '#16a34a', '#f59e0b', '#db2777', '#7c3aed',
  '#ea580c', '#059669', '#0ea5e9', '#dc2626', '#4f46e5',
];

export default function AnalyticsTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CleaningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartKey, setChartKey] = useState(0);

  // Time window: last 6 months including current
  const monthStart = useMemo(() => startOfMonth(addMonths(new Date(), -5)), []);
  const monthEnd = useMemo(() => endOfMonth(new Date()), []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cleanings')
        .select(`
          id, scheduled_date, completed_at, amount, transport_cost,
          property:properties(id, name)
        `)
        .eq('status', 'completed')
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString())
        .order('completed_at', { ascending: true });

      if (!error) setRows((data as any) || []);
      setLoading(false);
    })();
  }, [user, monthStart, monthEnd]);

  // Force ResponsiveContainer to recalc width after mount/resize/tab switch
  useEffect(() => {
    const tick = () => setChartKey((k) => k + 1);
    // next tick after paint
    const id = requestAnimationFrame(tick);
    window.addEventListener('resize', tick);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', tick);
    };
  }, [rows.length]);

  // Build months and properties lists
  const months = useMemo(() => {
    const start = monthStart;
    return Array.from({ length: 6 }).map((_, i) => {
      const d = addMonths(start, i);
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') };
    });
  }, [monthStart]);

  const properties = useMemo(() => {
    const map = new Map<string, Property>();
    rows.forEach((r) => map.set(r.property.id, r.property));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  // Colors keyed by property id
  const colorById = useMemo(() => {
    const obj: Record<string, string> = {};
    properties.forEach((p, idx) => { obj[p.id] = PALETTE[idx % PALETTE.length]; });
    return obj;
  }, [properties]);

  // Build chart data with stable keys p_<id> to avoid spaces/special chars
  const chartData = useMemo(() => {
    const initial = months.map(({ key, label }) => {
      const row: any = { month: label };
      properties.forEach((p) => { row[`p_${p.id}`] = 0; });
      return { key, row };
    });
    const byKey: Record<string, any> = Object.fromEntries(initial.map((i) => [i.key, i.row]));

    rows.forEach((r) => {
      const when = new Date(r.completed_at ?? r.scheduled_date);
      const mKey = format(startOfMonth(when), 'yyyy-MM');
      const propKey = `p_${r.property.id}`;
      const cost = (r.amount || 0) + (r.transport_cost || 0);
      if (byKey[mKey] && propKey in byKey[mKey]) {
        byKey[mKey][propKey] += cost;
      }
    });

    return months.map(({ key }) => byKey[key]);
  }, [months, properties, rows]);

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const hasData = chartData.some((d) => properties.some((p) => d[`p_${p.id}`] > 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
          <p className="text-slate-500">Monthly costs per apartment (last 6 months)</p>
        </div>
        <Badge variant="secondary">{properties.length} apartments</Badge>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No completed cleanings in the selected period.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[360px]">
              <ResponsiveContainer key={chartKey} width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `฿${Number(v).toLocaleString()}`} />
                  <Tooltip formatter={(value: any, name: string) => [`฿${Number(value).toLocaleString()}`, name]} />
                  {properties.map((p) => (
                    <Bar key={p.id} dataKey={`p_${p.id}`} name={p.name} fill={colorById[p.id]} stackId="a" />
                  ))}
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


