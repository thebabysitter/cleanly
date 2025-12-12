'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, startOfDay, endOfDay, startOfYear, subYears } from 'date-fns';
import { ChevronsUpDown, Check, CalendarIcon } from 'lucide-react';
import CleaningDetailsDialog from './cleaning-details-dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type Property = {
  id: string;
  name: string;
  address: string;
  floor?: string | null;
  room_number?: string | null;
};

type PropertyRow = Property & { isTotal?: boolean };

type Cleaner = {
  id: string;
  name: string;
  hourly_rate?: number;
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

type GanttCleaningsProps = {
  properties: Property[];
  cleanings: Cleaning[];
  cleaners: Cleaner[];
  selectedCleanerId?: string | 'all';
  onSelectCleaner?: (cleanerId: string | 'all') => void;
  onUpdateCleanings?: () => void;
};

const COLOR_PALETTE = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#f59e0b', // amber-500
  '#db2777', // pink-600
  '#7c3aed', // violet-600
  '#ea580c', // orange-600
  '#059669', // emerald-600
  '#0ea5e9', // sky-500
  '#dc2626', // red-600
  '#4f46e5', // indigo-600
];

function getColorForCleaner(cleanerId: string) {
  let hash = 0;
  for (let i = 0; i < cleanerId.length; i++) {
    hash = (hash << 5) - hash + cleanerId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

export default function GanttCleanings({
  properties,
  cleanings,
  cleaners,
  selectedCleanerId = 'all',
  onSelectCleaner,
  onUpdateCleanings,
}: GanttCleaningsProps) {
  const today = useMemo(() => new Date(), []);
  
  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(today, 30),
    to: today,
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange>({
    from: startOfMonth(today),
    to: today,
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Sync tempDateRange when popover opens
  useEffect(() => {
    if (datePickerOpen) {
      setTempDateRange(dateRange);
    }
  }, [datePickerOpen, dateRange]);
  
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [buildingMenuOpen, setBuildingMenuOpen] = useState(false);
  const [cleanerMenuOpen, setCleanerMenuOpen] = useState(false);

  const days = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    return eachDayOfInterval({ start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
  }, [dateRange]);

  const filteredCleanings = useMemo(() => {
    return cleanings.filter((c) => {
      if (c.status !== 'completed') return false;
      
      const matchesCleaner = selectedCleanerId === 'all' || c.cleaner.id === selectedCleanerId;
      const matchesBuilding = selectedBuildings.length === 0 || selectedBuildings.includes(c.property.name);
      
      // Filter by date range
      if (dateRange.from && dateRange.to) {
        const cleaningDate = new Date(c.completed_at ?? c.scheduled_date);
        const isInRange = cleaningDate >= startOfDay(dateRange.from) && cleaningDate <= endOfDay(dateRange.to);
        if (!isInRange) return false;
      }
      
      return matchesCleaner && matchesBuilding;
    });
  }, [cleanings, selectedCleanerId, selectedBuildings, dateRange]);

  const gridTemplate = useMemo(
    () => `repeat(${days.length}, 110px)`,
    [days.length]
  );

  const countsByProperty = useMemo(() => {
    const map = new Map<string, number>();
    filteredCleanings.forEach((c) => {
      const current = map.get(c.property.id) || 0;
      map.set(c.property.id, current + 1);
    });
    return map;
  }, [filteredCleanings]);

  const totalsByProperty = useMemo(() => {
    const map = new Map<string, { cleaning: number; transport: number; other: number }>();
    filteredCleanings.forEach((c) => {
      const current = map.get(c.property.id) || { cleaning: 0, transport: 0, other: 0 };
      const amount = c.amount ?? 0;
      const transport = c.transport_cost ?? 0;
      // C = cleaning fee only (exclude transport), T = transport_cost
      const cleaningOnly = Math.max(0, amount - transport);
      current.cleaning += cleaningOnly;
      current.transport += transport;
      map.set(c.property.id, current);
    });
    return map;
  }, [filteredCleanings]);

  const overallTotals = useMemo(() => {
    let cleaning = 0;
    let transport = 0;
    let other = 0;
    let count = 0;
    totalsByProperty.forEach((totals) => {
      cleaning += totals.cleaning;
      transport += totals.transport;
      other += totals.other;
    });
    countsByProperty.forEach((c) => {
      count += c;
    });
    return { cleaning, transport, other, count, total: cleaning + transport + other };
  }, [totalsByProperty, countsByProperty]);

  const dayTotals = useMemo(() => {
    const map = new Map<string, { amount: number; transport: number }>();
    filteredCleanings.forEach((c) => {
      const key = format(new Date(c.completed_at ?? c.scheduled_date), 'yyyy-MM-dd');
      const entry = map.get(key) || { amount: 0, transport: 0 };
      entry.amount += c.amount ?? 0;
      entry.transport += c.transport_cost ?? 0;
      map.set(key, entry);
    });
    return map;
  }, [filteredCleanings]);

  const uniqueProperties = useMemo(() => {
    const map = new Map<string, Property>();
    if (properties && properties.length > 0) {
      properties.forEach((prop) => {
        if (!map.has(prop.name)) map.set(prop.name, prop);
      });
    } else {
      cleanings.forEach((c) => {
        if (!map.has(c.property.name)) map.set(c.property.name, c.property);
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [properties, cleanings]);

  const propertiesList = useMemo(() => {
    const merged = properties?.length ? properties : cleanings.map((c) => c.property);
    if (!merged || merged.length === 0) return [];
    // Sort alphabetically by name
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [properties, cleanings]);

  const filteredPropertiesList = useMemo(() => {
    if (selectedBuildings.length === 0) return propertiesList;
    return propertiesList.filter((p) => selectedBuildings.includes(p.name));
  }, [propertiesList, selectedBuildings]);

  const displayProperties: PropertyRow[] = useMemo(() => {
    return [
      { id: '__total__', name: 'Total', address: '', floor: 'All properties', room_number: null, isTotal: true },
      ...filteredPropertiesList,
    ];
  }, [filteredPropertiesList]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Sync header scroll with body scroll
    const body = scrollRef.current;
    const header = headerRef.current;
    
    if (!body || !header) return;

    const handleScroll = () => {
      header.scrollLeft = body.scrollLeft;
    };

    body.addEventListener('scroll', handleScroll);
    
    // Also scroll to far right initially
    requestAnimationFrame(() => {
      if (body) body.scrollLeft = body.scrollWidth;
    });

    return () => {
      body.removeEventListener('scroll', handleScroll);
    };
  }, [days.length]);

  const datePresets = [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: subDays(today, 1), to: subDays(today, 1) },
    { label: 'Last 7 days', from: subDays(today, 6), to: today },
    { label: 'Last 30 days', from: subDays(today, 29), to: today },
    { label: 'Last 90 days', from: subDays(today, 89), to: today },
    { label: 'This month', from: startOfMonth(today), to: today },
    { label: 'Last month', from: startOfMonth(addMonths(today, -1)), to: endOfMonth(addMonths(today, -1)) },
    { label: 'YTD (Year to date)', from: startOfYear(today), to: today },
    { label: 'This month last year', from: startOfMonth(subYears(today, 1)), to: endOfMonth(subYears(today, 1)) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Date range picker */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal min-w-[280px]',
                !dateRange.from && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to ? (
                <>
                  {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                </>
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 max-w-[95vw]" align="start">
            <div className="flex flex-col">
              <div className="flex flex-col sm:flex-row">
                {/* Presets sidebar */}
                <div className="border-b sm:border-b-0 sm:border-r border-slate-200 p-2 space-y-0.5 sm:min-w-[140px]">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Presets</div>
                  <div className="flex flex-wrap gap-1 sm:flex-col sm:gap-0">
                    {datePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setTempDateRange({ from: preset.from, to: preset.to });
                        }}
                        className="px-2 py-1 text-xs sm:text-sm rounded hover:bg-slate-100 text-slate-700 text-left whitespace-nowrap sm:w-full"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Calendar */}
                <div className="p-2">
                  <Calendar
                    mode="single"
                    selected={tempDateRange.from}
                    onSelect={(date) => {
                      if (!date) return;
                      
                      // If both dates are already set, reset with new start date
                      if (tempDateRange.from && tempDateRange.to) {
                        setTempDateRange({ from: date, to: undefined });
                      } 
                      // If only start date is set, set end date
                      else if (tempDateRange.from && !tempDateRange.to) {
                        if (date >= tempDateRange.from) {
                          // Normal case: end date after start date
                          setTempDateRange({ from: tempDateRange.from, to: date });
                        } else {
                          // User clicked earlier date, make it new start
                          setTempDateRange({ from: date, to: undefined });
                        }
                      } 
                      // No dates set, set start date
                      else {
                        setTempDateRange({ from: date, to: undefined });
                      }
                    }}
                    numberOfMonths={1}
                    disabled={(date) => date > today}
                    modifiers={{
                      range_start: tempDateRange.from ? [tempDateRange.from] : [],
                      range_end: tempDateRange.to ? [tempDateRange.to] : [],
                      range_middle: tempDateRange.from && tempDateRange.to
                        ? eachDayOfInterval({ start: tempDateRange.from, end: tempDateRange.to }).slice(1, -1)
                        : [],
                    }}
                    modifiersClassNames={{
                      range_start: 'bg-primary text-primary-foreground rounded-l-md',
                      range_end: 'bg-primary text-primary-foreground rounded-r-md',
                      range_middle: 'bg-primary/20',
                    }}
                  />
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempDateRange(dateRange);
                    setDatePickerOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (tempDateRange.from && tempDateRange.to) {
                      setDateRange(tempDateRange);
                      setDatePickerOpen(false);
                    }
                  }}
                  disabled={!tempDateRange.from || !tempDateRange.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {onSelectCleaner && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Cleaner</label>
              <Popover open={cleanerMenuOpen} onOpenChange={setCleanerMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 min-w-[180px]"
                  >
                    <span className="truncate">
                      {selectedCleanerId === 'all'
                        ? 'All cleaners'
                        : cleaners.find((c) => c.id === selectedCleanerId)?.name || 'All cleaners'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-56" align="end">
                  <Command>
                    <CommandInput placeholder="Search cleaners..." />
                    <CommandList>
                      <CommandEmpty>No cleaner found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            onSelectCleaner('all');
                            setCleanerMenuOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedCleanerId === 'all' ? 'opacity-100 text-slate-900' : 'opacity-0'
                            )}
                          />
                          All cleaners
                        </CommandItem>
                        {cleaners.map((cleaner) => (
                          <CommandItem
                            key={cleaner.id}
                            onSelect={() => {
                              onSelectCleaner(cleaner.id);
                              setCleanerMenuOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedCleanerId === cleaner.id ? 'opacity-100 text-slate-900' : 'opacity-0'
                              )}
                            />
                            {cleaner.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">Property building(s)</label>
            <Popover open={buildingMenuOpen} onOpenChange={setBuildingMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 min-w-[240px]"
                >
                  <span className="truncate">
                    {selectedBuildings.length === 0
                      ? 'All properties'
                      : `${selectedBuildings.length} selected`}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-64" align="end">
                <Command>
                  <CommandInput placeholder="Search properties..." />
                  <CommandList>
                    <CommandEmpty>No property found.</CommandEmpty>
                    <CommandGroup>
                      {uniqueProperties.map((prop) => {
                        const selected = selectedBuildings.includes(prop.name);
                        return (
                          <CommandItem
                            key={prop.id}
                            onSelect={() => {
                              setSelectedBuildings((prev) =>
                                selected ? prev.filter((name) => name !== prop.name) : [...prev, prop.name]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selected ? 'opacity-100 text-slate-900' : 'opacity-0'
                              )}
                            />
                            {prop.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left column: properties (fixed, not horizontally scrollable) */}
        <div className="w-[240px] shrink-0">
          <div className="bg-white border-y border-slate-200 px-3 h-12 flex items-center font-semibold text-slate-700 tracking-wide sticky top-16 z-30">
            Properties
          </div>
          {displayProperties.map((prop) => (
            <div
              key={prop.id}
              className={`border-t border-slate-200 px-3 h-28 flex flex-col justify-center ${
                prop.isTotal ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'
              }`}
            >
              <div className={`truncate ${prop.isTotal ? 'font-semibold text-base' : 'font-medium'}`} title={prop.name}>
                {prop.name}
              </div>
              <div className={`text-xs truncate ${prop.isTotal ? 'text-slate-200/80' : 'text-slate-500'}`}>
                {prop.isTotal ? 'All properties' : prop.floor || prop.room_number ? [prop.floor, prop.room_number].filter(Boolean).join(' • ') : '-'}
              </div>
            </div>
          ))}
        </div>

        {/* Middle column: costs per property (fixed) */}
        <div className="w-[200px] shrink-0 border-l border-slate-200">
          <div className="bg-white border-y border-slate-200 px-3 h-12 flex items-center text-xs font-semibold text-slate-700 tracking-wide sticky top-16 z-30">
            Costs
          </div>
          {displayProperties.map((prop) => {
            const totals = prop.isTotal
              ? { cleaning: overallTotals.cleaning, transport: overallTotals.transport, other: overallTotals.other }
              : totalsByProperty.get(prop.id) || {
                  cleaning: 0,
                  transport: 0,
                  other: 0,
                };
            const count = prop.isTotal ? overallTotals.count : (countsByProperty.get(prop.id) || 0);
            const totalAll = totals.cleaning + totals.transport + totals.other;
            return (
              <div
                key={prop.id}
                className={`border-t border-slate-200 px-3 text-xs space-y-1 h-28 flex flex-col justify-center rounded-r ${
                  prop.isTotal ? 'bg-slate-100 font-semibold text-slate-900' : 'bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">#</span>
                  <span className="text-slate-900">
                    {count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">C</span>
                  <span className="text-slate-900">
                    ฿{Math.round(totals.cleaning).toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">T</span>
                  <span className="text-slate-900">
                    ฿{Math.round(totals.transport).toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">O</span>
                  <span className="text-slate-900">
                    ฿{Math.round(totals.other).toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-900">
                  <span className="font-bold tracking-wide uppercase text-[11px]">TOTAL</span>
                  <span className="font-semibold text-base">฿{Math.round(totalAll).toLocaleString('en-US')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right side: horizontally scrollable days & cleanings */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header row (sticky independently) */}
          <div 
            ref={headerRef}
            className="sticky top-16 z-20 overflow-hidden bg-white border-y border-slate-200"
          >
            <div className="min-w-[900px]">
              <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="bg-white border-l border-slate-200 px-3 h-12 flex flex-col justify-center"
                  >
                    <div className="text-xs text-slate-500">{format(day, 'EEE')}</div>
                    <div className="font-medium text-slate-800">{format(day, 'MMM d')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body rows (scrollable) */}
          <div className="overflow-x-auto" ref={scrollRef}>
            <div className="min-w-[900px]">
              {/* Body rows: one grid row per property */}
              {displayProperties.map((prop) => (
                <div
                  key={prop.id}
                  className={`grid ${prop.isTotal ? 'bg-slate-50/80' : ''}`}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  {days.map((day) => {
                    if (prop.isTotal) {
                      const key = format(day, 'yyyy-MM-dd');
                      const aggregate = dayTotals.get(key);
                      return (
                        <div
                          key={`${prop.id}-${day.toISOString()}`}
                          className="relative border-t border-l border-slate-200 bg-white h-28"
                        >
                          {aggregate && aggregate.amount > 0 ? (
                            <div
                              className="absolute left-1 right-1 rounded-full text-white text-[11px] leading-4 shadow-sm px-2 py-1 bg-slate-900"
                              style={{ top: 14 }}
                              title={`Total • Cleaning ฿${Math.round(aggregate.amount).toLocaleString()} • Transport ฿${Math.round(
                                aggregate.transport
                              ).toLocaleString()}`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="truncate">
                                  ฿{Math.round(aggregate.amount).toLocaleString()} : ฿{Math.round(aggregate.transport).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    } else {
                      const items = filteredCleanings
                        .filter((c) => {
                          const when = new Date(c.completed_at ?? c.scheduled_date);
                          return c.property.id === prop.id && isSameDay(when, day);
                        })
                        .sort((a, b) => {
                          const ad = new Date(a.completed_at ?? a.scheduled_date).getTime();
                          const bd = new Date(b.completed_at ?? b.scheduled_date).getTime();
                          return ad - bd;
                        });

                      return (
                        <div
                          key={`${prop.id}-${day.toISOString()}`}
                          className="relative border-t border-l border-slate-200 bg-white h-28"
                        >
                          {items.map((c, idx) => {
                            const color = getColorForCleaner(c.cleaner.id);
                            const top = 6 + idx * 22;
                            const amount = Math.round(c.amount ?? 0);
                            const transport = Math.round(c.transport_cost ?? 0);
                            return (
                              <div
                                key={c.id}
                                className="absolute left-1 right-1 rounded-full text-white text-[11px] leading-4 shadow-sm px-2 py-1 cursor-pointer"
                                style={{ top, backgroundColor: color }}
                                title={`${prop.name} • Cleaning ฿${amount} • Transport ฿${transport}`}
                                onClick={() => {
                                  setSelectedCleaning(c);
                                  setDetailsOpen(true);
                                }}
                              >
                                <div className="flex items-center gap-1 truncate">
                                  <span className="truncate">฿{amount} : ฿{transport}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                  })}
                </div>
              ))}

              {/* legend */}
              <div className="flex flex-wrap gap-3 mt-3">
                {cleaners.map((cl) => (
                  <div key={cl.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <span
                      className="inline-block w-3 h-3 rounded"
                      style={{ backgroundColor: getColorForCleaner(cl.id) }}
                    />
                    <span>{cl.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedCleaning && (
        <CleaningDetailsDialog
              cleaning={{
                ...selectedCleaning,
                property: {
                  ...selectedCleaning.property,
                  room_number: selectedCleaning.property.room_number ?? null
                }
              }}
          open={detailsOpen}
          onOpenChange={(o) => setDetailsOpen(o)}
          onUpdate={onUpdateCleanings || (() => {})}
        />
      )}
    </div>
  );
}


