import { MetadataRoute } from 'next';
import { features } from '@/lib/features';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://msclubsist.in';
  const currentDate = new Date().toISOString();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  if (features.registration) {
    entries.push({
      url: `${baseUrl}/portal`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.8,
    });
  }

  return entries;
}
