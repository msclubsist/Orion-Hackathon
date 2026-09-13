import { MetadataRoute } from 'next';
import { features } from '@/lib/features';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/api/',
          '/uploads/',
          ...(features.registration ? ['/portal/reset'] : ['/portal']),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
