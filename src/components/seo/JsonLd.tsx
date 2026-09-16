import React from 'react';
import { EVENT_METRICS, FAQ_DATA, GOOGLE_FORM_REGISTRATION_URL, PRIZE_TIERS } from '../../data/orionData';
import type { FAQItem } from '../../types/orion';
import { OG_IMAGE, SITE_NAME, SITE_URL, SOCIAL_PROFILES } from '@/lib/site';

const ID = {
  website: `${SITE_URL}/#website`,
  organization: `${SITE_URL}/#organization`,
  university: 'https://www.sathyabama.ac.in/#organization',
  event: `${SITE_URL}/#event`,
  webpage: `${SITE_URL}/#webpage`,
  faq: `${SITE_URL}/#faq`,
  venue: `${SITE_URL}/#venue`,
};

const addHours = (iso: string, hours: number) => {
  const end = new Date(new Date(iso).getTime() + hours * 3_600_000);
  // Keep the IST offset so the date reads the same way the site states it.
  return new Date(end.getTime() + 5.5 * 3_600_000).toISOString().replace('Z', '+05:30').replace('.000', '');
};

/** Serialise JSON-LD safely: a `</script>` inside FAQ text must not close the tag. */
const toJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

/** Site-wide graph: WebSite, organizers, venue. Rendered on every page. */
export const SiteJsonLd: React.FC = () => {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': ID.website,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: ['ORION 1.0 Hackathon', 'ORION Hackathon', 'ORION Hackathon Sathyabama'],
        description: 'Official website of ORION 1.0, the 24-hour national level hackathon by Microsoft Club SIST.',
        inLanguage: 'en-IN',
        publisher: { '@id': ID.organization },
      },
      {
        '@type': 'Organization',
        '@id': ID.organization,
        name: 'Microsoft Club SIST',
        alternateName: 'Microsoft Club, Sathyabama Institute of Science and Technology',
        url: SITE_URL,
        email: 'msclubsist@gmail.com',
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo.png`,
          width: 512,
          height: 512,
        },
        sameAs: SOCIAL_PROFILES,
        parentOrganization: { '@id': ID.university },
      },
      {
        '@type': 'CollegeOrUniversity',
        '@id': ID.university,
        name: 'Sathyabama Institute of Science and Technology',
        alternateName: 'SIST',
        url: 'https://www.sathyabama.ac.in',
        address: { '@id': `${ID.venue}-address` },
      },
      {
        '@type': 'Place',
        '@id': ID.venue,
        name: 'Sathyabama Institute of Science and Technology',
        hasMap: EVENT_METRICS.googleMapsUrl,
        address: {
          '@type': 'PostalAddress',
          '@id': `${ID.venue}-address`,
          streetAddress: 'Jeppiaar Nagar, Rajiv Gandhi Salai (OMR)',
          addressLocality: 'Chennai',
          addressRegion: 'Tamil Nadu',
          postalCode: '600119',
          addressCountry: 'IN',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 12.8718, longitude: 80.2207 },
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(graph) }} />;
};

/** Home page graph: the Event rich result plus FAQ. */
export const HomeJsonLd: React.FC = () => {
  const prizeSummary = PRIZE_TIERS.map(tier => `${tier.rank}: ${tier.amount}`).join(', ');

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': ID.webpage,
        url: `${SITE_URL}/`,
        name: 'ORION 1.0 — 24-Hour National Level Hackathon in Chennai',
        isPartOf: { '@id': ID.website },
        about: { '@id': ID.event },
        primaryImageOfPage: `${SITE_URL}${OG_IMAGE.url}`,
        inLanguage: 'en-IN',
      },
      {
        '@type': ['Event', 'EducationEvent'],
        '@id': ID.event,
        name: 'ORION 1.0 — National Level 24-Hour Hackathon',
        alternateName: 'ORION 1.0 Hackathon',
        description:
          `ORION 1.0 is a 24-hour national level offline hackathon organized by Microsoft Club SIST at Sathyabama Institute of Science and Technology, Chennai. ${EVENT_METRICS.prizePool} prize pool (${prizeSummary}) across FloatChat (Oceanic AI), LexVault (Zero-Knowledge Blockchain), SylvaSense (Climate-Tech Remote Sensing) and Open Innovation tracks. Round 1 is an online PPT qualifier; the top 70 teams reach the offline Grand Finale.`,
        url: `${SITE_URL}/`,
        // The finale moved from 18 Sep to 9–10 Oct. EventRescheduled + previousStartDate is
        // schema.org's way to say so; EventPostponed means "no new date yet", which is wrong.
        eventStatus: 'https://schema.org/EventRescheduled',
        previousStartDate: '2026-09-18T08:00:00+05:30',
        startDate: EVENT_METRICS.offlineFinaleIso,
        endDate: addHours(EVENT_METRICS.offlineFinaleIso, 24),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@id': ID.venue },
        image: [`${SITE_URL}${OG_IMAGE.url}`, `${SITE_URL}/logo.png`],
        organizer: [{ '@id': ID.organization }, { '@id': ID.university }],
        inLanguage: 'en-IN',
        isAccessibleForFree: false,
        audience: {
          '@type': 'Audience',
          audienceType: 'College students and early-career professionals across India',
        },
        offers: {
          '@type': 'Offer',
          name: 'Round 1 team registration',
          price: '100',
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          validFrom: '2026-08-01T00:00:00+05:30',
          validThrough: EVENT_METRICS.deadlineIso,
          url: GOOGLE_FORM_REGISTRATION_URL,
        },
      },
      {
        '@type': 'FAQPage',
        '@id': ID.faq,
        isPartOf: { '@id': ID.webpage },
        mainEntity: FAQ_DATA.map((item: FAQItem) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(graph) }} />;
};

/** Breadcrumb for an inner page (Home › page). */
export const BreadcrumbJsonLd: React.FC<{ name: string; path: string }> = ({ name, path }) => {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(data) }} />;
};
