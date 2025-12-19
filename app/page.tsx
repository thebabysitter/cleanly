'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, KeyRound } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function Home() {
  const demoUrl = 'https://6dcy2s2xrn.ufs.sh/f/KxhfMBJIFhjsW4roDXN0vriqwoy1b4UMQlcI6J2mzCsSXVjk';
  const demoThumbnailUrl = 'https://6dcy2s2xrn.ufs.sh/f/KxhfMBJIFhjsZddiAUDj7ve3dU2u6VSfKt8qJsGEw9ATblpN';
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navbar */}
      <nav className="w-full bg-white/50 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-40" />
          </div>
          <Button asChild className="h-10 px-4">
            <Link href="#contact">Get Access</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
            Dustfree — streamline your{' '}
            <span className="text-[#005b9e]">property management</span> and{' '}
            <span className="text-[#1fa2ff]">cleaning workflow</span>
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

        {/* Demo Section */}
        <section className="w-full max-w-2xl px-4 mt-12">
          <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">How it works</h2>
              </div>

              {isDemoPlaying ? (
                <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-black">
                  <div className="aspect-video w-full">
                    <iframe
                      src={demoUrl}
                      title="Dustfree demo video"
                      className="h-full w-full"
                      allow="fullscreen; clipboard-read; clipboard-write; autoplay"
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDemoPlaying(true)}
                  className="group relative w-full overflow-hidden rounded-xl border border-slate-200 bg-black"
                  aria-label="Play demo video"
                >
                  <div className="aspect-video w-full">
                    <img
                      src={demoThumbnailUrl}
                      alt="Demo video thumbnail"
                      className="h-full w-full object-cover opacity-95 transition-opacity group-hover:opacity-100"
                      loading="lazy"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="grid place-items-center rounded-full bg-black/55 px-6 py-4 backdrop-blur-sm transition-transform group-hover:scale-105">
                      <div className="h-14 w-14 rounded-full bg-white/90 grid place-items-center">
                        <span className="ml-1 block h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-slate-900" />
                      </div>
                      <span className="mt-3 text-sm font-medium text-white">Play demo</span>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="w-full max-w-2xl px-4 mt-10">
          <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Want access or have questions?</h2>
              <p className="text-slate-600 mt-2">

                <span className="block mt-1">Send us an email on teamdustfree@gmail.com</span>
              </p>
              <div className="mt-5 flex justify-center">
                <Button asChild className="h-12 px-6">
                  <a href="mailto:teamdustfree@gmail.com">Email us</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer (Simple) */}
      <footer className="py-6 text-center text-slate-400 text-sm">
        © {new Date().getFullYear()} DustFree. All rights reserved.
      </footer>
    </div>
  );
}
