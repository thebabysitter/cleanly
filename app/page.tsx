'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, User, KeyRound } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {/* Logo / Header */}
      <div className="mb-12 flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
          <span style={{ color: '#005b9e' }}>dust</span>
          <span style={{ color: '#1fa2ff' }}>free</span>
        </h1>
        <p className="text-slate-600 text-lg sm:text-xl max-w-sm">
          Streamline your property management and cleaning workflow
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link href="/cleaner-login" className="w-full">
          <Button 
            className="w-full h-16 text-lg font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-between px-6" 
            variant="default"
          >
            <span className="flex items-center gap-3">
              <User className="w-5 h-5" />
              I'm a Cleaner
            </span>
            <span className="text-slate-400">→</span>
          </Button>
        </Link>
        
        <Link href="/auth" className="w-full">
          <Button 
            className="w-full h-16 text-lg font-medium shadow-sm hover:shadow-md transition-all bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 flex items-center justify-between px-6" 
            variant="ghost"
          >
            <span className="flex items-center gap-3">
              <KeyRound className="w-5 h-5" />
              I'm a Host
            </span>
            <span className="text-slate-400">→</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
