import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { SiteJsonLd } from '@/components/seo/JsonLd';
import { OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';

// Self-hosted at build time: no render-blocking request to fonts.googleapis.com,
// and size-adjusted fallbacks keep text from shifting when the font swaps in.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

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
    <html lang="en-IN" className={`scroll-smooth ${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Geo Location Tags for Chennai / Local Search Ranking */}
        <meta name="geo.region" content="IN-TN" />
        <meta name="geo.placename" content="Chennai" />
        <meta name="geo.position" content="12.8718;80.2207" />
        <meta name="ICBM" content="12.8718, 80.2207" />
        
        {/* JSON-LD Rich Structured Data Schemas */}
        <SiteJsonLd />
      </head>
      <body className="bg-[#05070D] text-slate-100 antialiased selection:bg-cyan-500/25 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
