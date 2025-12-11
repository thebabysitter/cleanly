'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Cleanings' },
  { href: '/dashboard/properties', label: 'Properties' },
  { href: '/dashboard/cleaners', label: 'Cleaners' },
  { href: '/dashboard/payments', label: 'Payments' },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                isActive
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}
