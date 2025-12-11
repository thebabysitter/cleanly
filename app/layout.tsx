import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DustFree - Property Management & Cleaning',
  description: 'Streamline your property management and cleaning workflow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
