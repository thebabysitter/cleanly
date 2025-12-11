'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, KeyRound } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navbar */}
      <nav className="w-full bg-white/50 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-40" />
          </div>
          {/* Optional: Add "Login" or other nav items here if needed later */}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
            Streamline your <span className="text-[#005b9e]">property management</span> and <span className="text-[#1fa2ff]">cleaning workflow</span>
          </h1>
          <p className="text-slate-600 text-lg sm:text-xl max-w-lg mx-auto">
            The all-in-one platform for hosts and cleaners to track and manage property cleanings effortlessly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md px-4">
          <Link href="/cleaner-login" className="flex-1">
            <Button 
              className="w-full h-14 text-base font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2" 
              variant="default"
            >
              <User className="w-5 h-5" />
              I'm a Cleaner
            </Button>
          </Link>
          
          <Link href="/auth" className="flex-1">
            <Button 
              className="w-full h-14 text-base font-medium shadow-sm hover:shadow-md transition-all bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 flex items-center justify-center gap-2" 
              variant="ghost"
            >
              <KeyRound className="w-5 h-5" />
              I'm a Host
            </Button>
          </Link>
        </div>
      </main>
      
      {/* Footer (Simple) */}
      <footer className="py-6 text-center text-slate-400 text-sm">
        © {new Date().getFullYear()} DustFree. All rights reserved.
      </footer>
    </div>
  );
}
