import { MetadataRoute } from 'next';
import { features } from '@/lib/features';
import { CONTENT_LAST_MODIFIED, OG_IMAGE, SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 1.0,
      images: [`${SITE_URL}${OG_IMAGE.url}`, `${SITE_URL}/orion-logo-v1.webp`],
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  if (features.registration) {
    entries.push({
      url: `${SITE_URL}/portal`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  return entries;
}
