import React from 'react';

const ITEMS = [
  'FloatChat · Oceanic AI',
  '₹1,00,000 Prize Pool',
  'LexVault · Zero-Knowledge Blockchain',
  '24-Hour Offline Sprint',
  'SylvaSense · Climate Remote Sensing',
  'Top 70 Grand Finale',
  'Open Innovation',
  'SIST Chennai',
];

const MS_COLORS = ['#F25022', '#7FBA00', '#00A4EF', '#FFB900'];

/**
 * Infinite ribbon of tracks and headline facts between the hero and the
 * challenge arena. The drift is pure CSS (so it runs before any JS loads);
 * MotionEffects adds a skew that follows scroll velocity. Decorative, so it's
 * hidden from assistive tech — the same facts are stated in the sections below.
 */
export function TrackMarquee() {
  const row = (copy: number) => (
    <div className="marquee-row flex shrink-0 items-center" key={copy}>
      {ITEMS.map((item, i) => (
        <span key={item} className="flex items-center">
          <span className="px-6 sm:px-8 font-display font-bold text-sm sm:text-lg tracking-[0.12em] uppercase text-[#E0F2FE] whitespace-nowrap">
            {item}
          </span>
          <span
            className="w-2 h-2 rotate-45 shrink-0"
            style={{ background: MS_COLORS[i % MS_COLORS.length], boxShadow: `0 0 10px ${MS_COLORS[i % MS_COLORS.length]}` }}
          />
        </span>
      ))}
    </div>
  );

  return (
    <div aria-hidden="true" className="relative z-10 py-4 sm:py-5 overflow-hidden border-y border-[#00BCF2]/20 bg-[#071426]/70 backdrop-blur-md select-none marquee-mask">
      <div data-velocity-skew className="flex w-max marquee-track">
        {row(0)}
        {row(1)}
      </div>
    </div>
  );
}
