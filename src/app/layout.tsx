import type { Metadata, Viewport } from 'next';
import './globals.css';
import { JsonLd } from '@/components/seo/JsonLd';

const SITE_URL = 'https://msclubsist.in';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ORION 1.0 — 24H National Level Hackathon | Microsoft Club SIST',
    template: '%s | ORION 1.0 Hackathon',
  },
  description:
    'ORION 1.0 is India’s premier 24-hour national student hackathon organized by Microsoft Club SIST at Sathyabama Institute of Science and Technology, Chennai. Compete for ₹1,00,000+ in cash prizes across Oceanic AI, Zero-Knowledge Blockchain, Climate-Tech Remote Sensing, and Open Innovation.',
  applicationName: 'ORION 1.0 Hackathon Portal',
  keywords: [
    'ORION 1.0',
    'ORION Hackathon',
    'Microsoft Club SIST',
    'Sathyabama Hackathon',
    'Sathyabama Institute of Science and Technology',
    'National Hackathon 2026',
    'Chennai Hackathon 2026',
    '24-Hour Hackathon Chennai',
    'Coding Competition Chennai',
    'Student Hackathon India',
    'College Hackathon 2026',
    'AI Hackathon Chennai',
    'FloatChat Oceanic AI',
    'LexVault Zero Knowledge Blockchain',
    'SylvaSense Satellite AI',
    'Open Innovation Hackathon',
    'Hackathon with Cash Prizes',
    'SIST Microsoft Club',
    'Tamil Nadu Hackathons',
    'Engineering Hackathon 2026',
    'Web3 Blockchain Hackathon India',
    'Climate Tech Hackathon',
    'Offline 24-Hour Coding Sprint',
    'Top 70 Hackathon Qualifier',
  ],
  authors: [
    { name: 'Microsoft Club SIST', url: SITE_URL },
    { name: 'Sathyabama Institute of Science and Technology', url: 'https://www.sathyabama.ac.in' },
  ],
  creator: 'Microsoft Club SIST Technical Crew',
  publisher: 'Sathyabama Institute of Science and Technology',
  category: 'technology',
  classification: 'National Level Student Hackathon & Innovation Sprint',
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
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'ORION 1.0 — 24-Hour National Level Hackathon | Microsoft Club SIST',
    description:
      'India’s premier 24-hour national student hackathon at Sathyabama Institute of Science and Technology, Chennai. ₹1,00,000+ Prize Pool • 4 Cutting-Edge Challenge Tracks • Top 70 Offline Finale.',
    url: SITE_URL,
    siteName: 'ORION 1.0 National Hackathon',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'ORION 1.0 — Ignite the Genesis of Innovation • Microsoft Club SIST',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ORION 1.0 — 24H National Level Hackathon | Microsoft Club SIST',
    description:
      'Join India’s premier 24-hour national student hackathon at Sathyabama Institute of Science and Technology, Chennai. ₹1,00,000 Prize Pool. Register your squad now!',
    images: ['/logo.png'],
    creator: '@msclubsist',
    site: '@msclubsist',
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
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Geo Location Tags for Chennai / Local Search Ranking */}
        <meta name="geo.region" content="IN-TN" />
        <meta name="geo.placename" content="Chennai" />
        <meta name="geo.position" content="12.8718;80.2207" />
        <meta name="ICBM" content="12.8718, 80.2207" />
        
        {/* Search Engine Directives */}
        <meta name="rating" content="General" />
        <meta name="revisit-after" content="1 days" />

        {/* Google Fonts Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet" 
        />
        
        {/* JSON-LD Rich Structured Data Schemas */}
        <JsonLd />
      </head>
      <body className="bg-[#05070D] text-slate-100 antialiased selection:bg-cyan-500/25 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
