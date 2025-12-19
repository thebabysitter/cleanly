import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://dustfree.team'),
  title: {
    default: 'Dustfree',
    template: '%s | Dustfree',
  },
  description:
    'Dustfree is an all-in-one platform for hosts and cleaners to manage property cleanings and operations.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Dustfree',
    title: 'Dustfree',
    description:
      'All-in-one platform for hosts and cleaners to manage property cleanings and operations.',
    images: [
      {
        url: '/logo.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dustfree',
    description:
      'All-in-one platform for hosts and cleaners to manage property cleanings and operations.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Dustfree',
    url: 'https://dustfree.team',
    logo: 'https://dustfree.team/logo.png',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'teamdustfree@gmail.com',
      },
    ],
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
