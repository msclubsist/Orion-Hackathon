import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { OG_IMAGE } from '@/lib/site';

const TITLE = 'Official Rulebook & Terms';
const DESCRIPTION =
  'Official ORION 1.0 hackathon rulebook: eligibility, team size, Round 1 PPT submission rules, Grand Finale conduct, judging and terms of participation.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: {
    title: `${TITLE} | ORION 1.0 Hackathon`,
    description: DESCRIPTION,
    url: '/terms',
    type: 'article',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ORION 1.0 Hackathon`,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd name={TITLE} path="/terms" />
      {children}
    </>
  );
}
