import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { features } from '@/lib/features';

export const metadata: Metadata = {
  title: 'Mission Command Center | ORION 1.0 Admin',
  description: 'Administrative command center for ORION 1.0 Hackathon operations.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!features.portal && !features.registration) notFound();

  return <>{children}</>;
}
