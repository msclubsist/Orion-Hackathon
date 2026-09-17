import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { features } from '@/lib/features';

export const metadata: Metadata = {
  title: 'Team Dashboard',
  description:
    'Official team dashboard for ORION 1.0 Hackathon. Track payment verification status and monitor Grand Finale shortlisting.',
  robots: {
    index: features.registration,
    follow: features.registration,
  },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!features.registration) notFound();

  return <>{children}</>;
}
