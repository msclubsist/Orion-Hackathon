'use client';

import React from 'react';
import { 
  Clock
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { ScrollReveal } from '../common/ScrollReveal';
import { TIMELINE_PHASES } from '../../data/orionData';

export const TimelineSection: React.FC = () => {
  return (
    <section id="timeline" className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <ScrollReveal direction="up" delay={50} duration={600} className="text-center max-w-2xl mx-auto mb-16 select-none">
          <div className="inline-flex items-center gap-2.5 px-4 py-1 bg-gradient-to-r from-transparent via-[#00BCF2]/10 to-transparent border-y border-[#00BCF2]/25 text-xs font-mono font-bold tracking-[0.18em] text-[#BAE6FD] uppercase mb-4 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#00BCF2]" />
            <span>MISSION TIMELINE • SCHEDULE MILESTONES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white tracking-tight">
            Event <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Timeline</span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 mt-3 font-sans leading-relaxed">
            Key milestones from online registration to the 24-hour offline grand finale at SIST Chennai.
          </p>
        </ScrollReveal>

        {/* Timeline Path */}
        <div data-timeline className="max-w-4xl mx-auto relative text-left">
          
          {/* Vertical Trajectory Line */}
          <div data-timeline-line className="absolute left-4 sm:left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#00BCF2] via-[#0078D4] to-[#071426] -translate-x-1/2 hidden sm:block shadow-[0_0_12px_rgba(0,188,242,0.4)]" />
          <div aria-hidden="true" className="absolute left-1/2 top-4 bottom-4 w-0 hidden sm:block pointer-events-none">
            <div data-timeline-comet className="timeline-comet" />
          </div>

          <div className="space-y-8 relative">
            {TIMELINE_PHASES.map((item, idx) => {
              const isEven = idx % 2 === 0;
              const isCurrent = item.status === 'active';

              return (
                <ScrollReveal
                  key={idx}
                  direction={isEven ? "left" : "right"}
                  delay={idx * 100}
                  duration={650}
                  className={`flex flex-col sm:flex-row items-center gap-6 ${
                    isEven ? 'sm:flex-row-reverse' : ''
                  }`}
                >
                  
                  {/* Content Card */}
                  <div className="w-full sm:w-[calc(50%-2rem)]">
                    <GlassCard
                      glowColor={isCurrent ? 'cyan' : 'violet'}
                      className={`p-6 border bg-[#0B1220]/90 rounded-none transition-all duration-300 hover:-translate-y-1 ${
                        isCurrent 
                          ? 'border-[#00BCF2] shadow-[0_0_30px_rgba(0,188,242,0.25)]' 
                          : 'border-[rgba(0,188,242,0.18)] hover:border-[#00BCF2]/50 shadow-xl'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgba(0,188,242,0.12)]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-sans text-[#00BCF2] font-bold">
                            PHASE {item.number}
                          </span>
                        </div>
                        <span className={`text-[10px] font-sans px-2.5 py-0.5 rounded-none font-bold ${
                          isCurrent
                            ? 'bg-[#00BCF2] text-[#020617] shadow-[0_0_10px_rgba(0,188,242,0.5)]'
                            : 'bg-[#071426] text-[#22D3EE] border border-[rgba(0,188,242,0.2)]'
                        }`}>
                          {item.date}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-display font-bold text-white mb-1">
                        {item.title}
                      </h3>
                      <div className="text-xs font-sans text-[#00BCF2] mb-3 font-semibold">
                        <span>{item.subtitle}</span>
                      </div>

                      <ul className="space-y-1.5 text-xs text-[#BAE6FD] font-sans">
                        {item.highlights.map((h, hIdx) => (
                          <li key={hIdx} className="flex items-start gap-1.5">
                            <span className="text-[#00BCF2] font-bold">›</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  </div>

                  {/* Central Node Badge */}
                  <div className="z-20 shrink-0 w-8 h-8 rounded-none bg-[#071426] border border-[#00BCF2] flex items-center justify-center text-[#00BCF2] shadow-[0_0_15px_rgba(0,188,242,0.5)] hidden sm:flex">
                    {isCurrent ? (
                      <span className="w-2.5 h-2.5 bg-[#00BCF2] animate-ping" />
                    ) : (
                      <span className="w-2 h-2 bg-[#00BCF2]" />
                    )}
                  </div>

                  {/* Empty Spacer Column for layout symmetry */}
                  <div className="w-full sm:w-[calc(50%-2rem)] hidden sm:block" />

                </ScrollReveal>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
