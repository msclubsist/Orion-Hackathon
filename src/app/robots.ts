import { MetadataRoute } from 'next';
import { features } from '@/lib/features';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://msclubsist.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: features.registration ? ['/', '/portal'] : ['/'],
        disallow: features.registration ? ['/admin', '/api/'] : ['/portal', '/admin', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: features.registration ? ['/', '/portal'] : ['/'],
        disallow: features.registration ? ['/admin', '/api/'] : ['/portal', '/admin', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
