import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { features } from '@/lib/features';

export const metadata: Metadata = {
  title: 'Team Dashboard',
  description:
    'Official team dashboard for ORION 1.0 Hackathon. Track payment verification status and monitor Grand Finale shortlisting.',
  robots: {
    index: features.portal || features.registration,
    follow: features.portal || features.registration,
  },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!features.portal && !features.registration) notFound();

  return <>{children}</>;
}
