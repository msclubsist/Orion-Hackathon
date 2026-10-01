import type { Metadata } from 'next';
import { PublicHome } from '@/components/home/PublicHome';
import { HomeJsonLd } from '@/components/seo/JsonLd';
import { features } from '@/lib/features';
import { OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';

const TITLE = 'ORION 1.0 | 24-Hour National Level Hackathon in Chennai';
const DESCRIPTION =
  'ORION 1.0: a 24-hour national hackathon at Sathyabama, Chennai by Microsoft Club SIST. ₹1,00,000 prize pool, 4 AI, Web3 & climate tracks. Register for ₹100.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/orion`,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/orion`,
    siteName: SITE_NAME,
    images: [OG_IMAGE],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function OrionPage() {
  return (
    <>
      <HomeJsonLd />
      <PublicHome registrationEnabled={features.registration} portalEnabled={features.portal} />
    </>
  );
}
