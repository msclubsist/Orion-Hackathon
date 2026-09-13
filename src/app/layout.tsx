import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteJsonLd } from '@/components/seo/JsonLd';
import { OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';

const TITLE = 'ORION 1.0 | 24-Hour National Level Hackathon in Chennai';
// ~155 characters so Google shows it untruncated.
const DESCRIPTION =
  'ORION 1.0: a 24-hour national hackathon at Sathyabama, Chennai by Microsoft Club SIST. ₹1,00,000 prize pool, 4 AI, Web3 & climate tracks. Register for ₹100.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s | ORION 1.0 Hackathon',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'ORION 1.0',
    'ORION hackathon',
    'hackathon in Chennai',
    'national level hackathon 2026',
    '24 hour hackathon',
    'Sathyabama hackathon',
    'Microsoft Club SIST',
    'student hackathon India',
    'AI hackathon',
    'blockchain hackathon',
    'climate tech hackathon',
    'open innovation hackathon',
    'hackathon with cash prizes',
  ],
  authors: [{ name: 'Microsoft Club SIST', url: SITE_URL }],
  creator: 'Microsoft Club SIST',
  publisher: 'Sathyabama Institute of Science and Technology',
  category: 'technology',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/favicon.png', sizes: '192x192', type: 'image/png' }],
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Set these at build time after verifying the site in Google Search Console / Bing Webmaster Tools.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: '#0078D4',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className="scroll-smooth">
      <head>
        {/* Geo Location Tags for Chennai / Local Search Ranking */}
        <meta name="geo.region" content="IN-TN" />
        <meta name="geo.placename" content="Chennai" />
        <meta name="geo.position" content="12.8718;80.2207" />
        <meta name="ICBM" content="12.8718, 80.2207" />

        {/* Google Fonts Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet" 
        />
        
        {/* JSON-LD Rich Structured Data Schemas */}
        <SiteJsonLd />
      </head>
      <body className="bg-[#05070D] text-slate-100 antialiased selection:bg-cyan-500/25 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
