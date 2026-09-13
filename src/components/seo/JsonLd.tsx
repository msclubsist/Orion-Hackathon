import React from 'react';
import { FAQ_DATA } from '../../data/orionData';
import type { FAQItem } from '../../types/orion';
import { features } from '@/lib/features';

export const JsonLd: React.FC = () => {
  const baseUrl = 'https://msclubsist.in';

  // 1. Event Schema (Google Hackathon / Competition Rich Snippet)
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'ORION 1.0 — National Level 24-Hour Hackathon',
    alternateName: 'ORION 1.0 Hackathon',
    description:
      'ORION 1.0 is a prestigious 24-hour national offline hackathon organized by Microsoft Club SIST at Sathyabama Institute of Science and Technology, Chennai. Featuring a ₹1,00,000 cash prize pool across FloatChat, LexVault, SylvaSense, and Open Innovation tracks.',
    startDate: '2026-09-18T08:00:00+05:30',
    endDate: '2026-09-19T14:00:00+05:30',
    // Previously scheduled dates above are being revised; marked EventPostponed until the new
    // schedule is confirmed, per Google/schema.org guidance for date changes.
    eventStatus: 'https://schema.org/EventPostponed',
    eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: 'Sathyabama Institute of Science and Technology',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Jeppiaar Nagar, Rajiv Gandhi Salai (OMR)',
        addressLocality: 'Chennai',
        addressRegion: 'Tamil Nadu',
        postalCode: '600119',
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 12.8718,
        longitude: 80.2207,
      },
    },
    image: [
      `${baseUrl}/logo.png`,
      `${baseUrl}/icon.png`,
    ],
    organizer: [
      {
        '@type': 'Organization',
        name: 'Microsoft Club SIST',
        url: baseUrl,
        sameAs: [
          'https://www.instagram.com/orion1.0_',
          'https://www.linkedin.com/company/microsoft-club-sist',
        ],
      },
      {
        '@type': 'CollegeOrUniversity',
        name: 'Sathyabama Institute of Science and Technology',
        url: 'https://www.sathyabama.ac.in',
      },
    ],
    offers: {
      '@type': 'Offer',
      name: 'Round 1 Qualifier Registration',
      price: '100',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      validFrom: '2026-08-01T00:00:00+05:30',
      validThrough: '2026-09-21T23:59:59+05:30',
      url: baseUrl,
    },
    performer: {
      '@type': 'Organization',
      name: 'Microsoft Club SIST Technical Crew',
    },
    typicalAgeRange: '17-30',
  };

  // 2. Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Microsoft Club SIST',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      'https://www.instagram.com/orion1.0_',
      'https://www.linkedin.com/company/microsoft-club-sist',
    ],
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: 'Sathyabama Institute of Science and Technology',
      url: 'https://www.sathyabama.ac.in',
    },
  };

  // 3. FAQPage Schema (For Google FAQ snippet rich cards)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map((item: FAQItem) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  // 4. BreadcrumbList Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Challenges',
        item: `${baseUrl}/#challenges`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Prizes',
        item: `${baseUrl}/#prizes`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'Guidelines',
        item: `${baseUrl}/#guidelines`,
      },
      {
        '@type': 'ListItem',
        position: 5,
        name: 'Timeline',
        item: `${baseUrl}/#timeline`,
      },
      ...(features.registration ? [{
        '@type': 'ListItem',
        position: 6,
        name: 'Team Portal',
        item: `${baseUrl}/portal`,
      }] : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
};
