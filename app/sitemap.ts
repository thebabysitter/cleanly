import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://dustfree.team/',
      changeFrequency: 'weekly',
      priority: 1,
      lastModified: new Date(),
    },
  ];
}

