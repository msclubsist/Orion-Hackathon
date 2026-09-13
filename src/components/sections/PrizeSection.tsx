'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  Layout, 
  HardDrive, 
  Presentation
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { ScrollReveal } from '../common/ScrollReveal';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { PRIZE_TIERS, SPECIAL_TRACK_BOUNTIES } from '../../data/orionData';

const Trophy3D = dynamic(
  () => import('../3d/Trophy3D').then((mod) => mod.Trophy3D),
  { ssr: false }
);

export const PrizeSection: React.FC = () => {
  const bountyIcons = [Cpu, Layout, HardDrive, Presentation];
  const trophyMountRef = useRef<HTMLDivElement>(null);
  const [shouldLoadTrophy, setShouldLoadTrophy] = useState(false);

  useEffect(() => {
    const mount = trophyMountRef.current;
    if (!mount || shouldLoadTrophy) return;
    if (!('IntersectionObserver' in window)) {
      const fallback = globalThis.setTimeout(() => setShouldLoadTrophy(true), 0);
      return () => globalThis.clearTimeout(fallback);
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShouldLoadTrophy(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(mount);
    return () => observer.disconnect();
  }, [shouldLoadTrophy]);

  return (
    <section id="prizes" className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <ScrollReveal direction="up" delay={50} duration={600} className="text-center max-w-2xl mx-auto mb-16 select-none">
          <div className="inline-flex items-center gap-2.5 px-4 py-1 bg-gradient-to-r from-transparent via-[#00BCF2]/10 to-transparent border-y border-[#00BCF2]/25 text-xs font-mono font-bold tracking-[0.18em] text-[#BAE6FD] uppercase mb-4 shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-[#00BCF2]" />
            <span>PRIZE REWARDS // MISSION BOUNTIES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white tracking-tight">
            <AnimatedCounter value="₹1,00,000" duration={1800} /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-blue-500">Prize Pool</span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 mt-3 font-sans leading-relaxed">
            Honoring technical execution, architectural innovation, and software craftsmanship.
          </p>
        </ScrollReveal>

        {/* 3D Interactive Trophy Centerpiece */}
        <ScrollReveal direction="up" delay={100} duration={600} className="max-w-md mx-auto mb-10 h-48 sm:h-56 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div ref={trophyMountRef} className="relative z-10 w-full h-full">
            {shouldLoadTrophy && <Trophy3D className="relative z-10 cursor-grab active:cursor-grabbing" />}
          </div>
        </ScrollReveal>

        {/* 3 Podium Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16 items-stretch text-left">
          {PRIZE_TIERS.map((tier, idx) => {
            const isFirst = idx === 0;

            return (
              <ScrollReveal
                key={idx}
                direction="up"
                delay={idx * 120}
                duration={650}
                className={`h-full ${isFirst ? 'lg:-translate-y-4' : ''}`}
              >
                <div data-tilt className="h-full">
                <GlassCard
                  glowColor={isFirst ? "cyan" : idx === 1 ? "violet" : "amber"}
                  className={`p-7 sm:p-8 flex flex-col justify-between border ${
                    isFirst 
                      ? 'border-blue-500/60 bg-slate-900/80 shadow-2xl ring-1 ring-blue-500/30' 
                      : 'border-slate-800 bg-slate-900/60 shadow-xl'
                  } rounded-2xl h-full transition-all duration-300 hover:-translate-y-2`}
                >
                  <div>
                    {/* Rank Badge & Label */}
                    <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-800">
                      <span className="text-xs font-sans text-blue-400 flex items-center gap-1.5 font-bold">
                        {isFirst && <Crown className="w-4 h-4 text-blue-400" />}
                        {tier.rank.toUpperCase()}
                      </span>
                      <span className={`text-xs font-sans px-3 py-1 rounded-full border ${
                        isFirst 
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400 font-bold' 
                          : 'border-slate-800 bg-slate-950 text-slate-400 font-medium'
                      }`}>
                        {tier.badge}
                      </span>
                    </div>

                    {/* Prize Amount */}
                    <div className="mb-4">
                      <div className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight">
                        <AnimatedCounter value={tier.amount} duration={1500} />
                      </div>
                      <div className="text-xs font-sans text-slate-400 mt-1 font-medium">
                        {tier.label}
                      </div>
                    </div>

                    {/* Perks List */}
                    <div className="space-y-2.5 my-6">
                      <span className="text-xs font-sans text-slate-400 uppercase tracking-wider block font-semibold">
                        ALLOCATED REWARDS:
                      </span>
                      <ul className="space-y-2">
                        {tier.perks.map((perk, i) => (
                          <li key={i} className="text-xs font-sans text-slate-300 flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs font-sans text-slate-400">
                    <span>ALLOCATED</span>
                    <span className="text-white font-bold">{tier.amount} CASH GRANT</span>
                  </div>
                </GlassCard>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Special Track Bounties Grid */}
        <ScrollReveal direction="up" delay={200} duration={600} className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs sm:text-sm font-sans text-slate-300 font-bold tracking-wider uppercase">
              SPECIAL TRACK REWARD BOUNTIES
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {SPECIAL_TRACK_BOUNTIES.map((bounty, idx) => {
              const Icon = bountyIcons[idx] || Cpu;

              return (
                <div
                  key={idx}
                  className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-blue-400 shadow-sm group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-sans text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-bold">
                        BOUNTY
                      </span>
                    </div>

                    <h4 className="text-sm font-display font-bold text-white mb-1.5 group-hover:text-blue-300 transition-colors">
                      {bounty.title}
                    </h4>

                    <p className="text-xs text-slate-400 font-sans leading-relaxed font-normal">
                      {bounty.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-sans text-blue-400 font-semibold">
                    {bounty.reward}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
};
