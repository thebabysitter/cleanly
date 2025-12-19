import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/cleaner/', '/admin/', '/api/'],
      },
    ],
    sitemap: 'https://dustfree.team/sitemap.xml',
    host: 'https://dustfree.team',
  };
}

