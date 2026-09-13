'use client';

import React from 'react';
import { 
  ArrowUpRight, 
  Waves, 
  ShieldCheck, 
  TreePine, 
  Cpu, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';
import { PROBLEM_STATEMENTS } from '../../data/orionData';
import type { ProblemStatement } from '../../types/orion';

interface ChallengeArenaProps {
  onOpenProblemModal: (problem: ProblemStatement) => void;
}

export const ChallengeArena: React.FC<ChallengeArenaProps> = ({ onOpenProblemModal }) => {
  const [ps1, ps2, ps3, ps4] = PROBLEM_STATEMENTS;

  return (
    <section id="challenges" className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <ScrollReveal direction="up" delay={50} duration={600} className="text-center max-w-3xl mx-auto mb-14 select-none">
          <div className="inline-flex items-center gap-2.5 px-4 py-1 bg-gradient-to-r from-transparent via-[#00BCF2]/10 to-transparent border-y border-[#00BCF2]/25 text-xs font-mono font-bold tracking-[0.18em] text-[#BAE6FD] uppercase mb-4 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-[#00BCF2]" />
            <span>MISSION TRACKS // BENTO CHALLENGE ARENA</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white tracking-tight">
            Challenge <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#BAE6FD] via-[#00BCF2] to-[#38BDF8]">Arena</span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 mt-3 font-sans leading-relaxed">
            Choose your track to inspect architecture, evaluation benchmarks, and submission deliverables. Click any card or action button to unlock the full engineering dossier.
          </p>

          {/* Microsoft Ecosystem Integration Callout */}
          <div className="mt-6 p-3 sm:p-4 rounded-none bg-[#0B1220]/80 border border-white/10 flex flex-wrap items-center justify-center gap-3 text-xs font-sans text-slate-300 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-0.5 w-3 h-3" title="Microsoft">
                <span className="bg-[#F25022] w-1.2 h-1.2 rounded-none" />
                <span className="bg-[#7FBA00] w-1.2 h-1.2 rounded-none" />
                <span className="bg-[#00A4EF] w-1.2 h-1.2 rounded-none" />
                <span className="bg-[#FFB900] w-1.2 h-1.2 rounded-none" />
              </div>
              <span className="font-bold text-white">Microsoft Cloud & AI Stack</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400">Azure OpenAI • GitHub Copilot • Azure Cosmos DB • Microsoft Sentinel</span>
          </div>
        </ScrollReveal>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Bento Card 1: FloatChat (Col Span 7) */}
          {ps1 && (
            <ScrollReveal direction="up" delay={100} duration={600} className="md:col-span-12 lg:col-span-7 flex">
              <div 
                onClick={() => onOpenProblemModal(ps1)}
                data-spotlight
                className="w-full group cursor-pointer text-left relative flex flex-col justify-between p-6 sm:p-8 md:p-9 bg-[#0B1220]/85 border border-white/10 hover:border-[#00BCF2]/60 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(0,188,242,0.15)] overflow-hidden"
              >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#00BCF2]/10 via-[#0078D4]/5 to-transparent blur-3xl pointer-events-none group-hover:from-[#00BCF2]/20 transition-all duration-500" />
                
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00BCF2]/10 border border-[#00BCF2]/30 text-xs font-mono font-bold text-[#BAE6FD]">
                      <Waves className="w-3.5 h-3.5 text-[#00BCF2]" />
                      <span>{ps1.code} • OCEAN INFORMATICS</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/25">
                      FLAGSHIP TRACK
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-2xl sm:text-3xl font-display font-black text-white group-hover:text-[#00BCF2] transition-colors mb-2 tracking-tight">
                    {ps1.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans font-medium text-[#7DD3FC] mb-4 leading-relaxed">
                    {ps1.tagline}
                  </p>

                  {/* Overview Excerpt */}
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-6 line-clamp-3">
                    {ps1.overview}
                  </p>

                  {/* Key Features List */}
                  <div className="space-y-2 mb-6">
                    {ps1.keyFeatures.slice(0, 3).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00BCF2] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Tech Stack & Action Button */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {ps1.techStack.slice(0, 3).map((tech, i) => (
                      <span key={i} className="text-[11px] font-mono px-2.5 py-1 bg-[#071426] border border-white/10 text-slate-300">
                        {tech}
                      </span>
                    ))}
                    {ps1.techStack.length > 3 && (
                      <span className="text-[11px] font-mono px-2 py-1 bg-[#071426] text-slate-500">
                        +{ps1.techStack.length - 3} more
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProblemModal(ps1);
                    }}
                    className="btn-glow-cyan self-start sm:self-auto py-2.5 px-4 font-sans font-bold text-xs text-[#020617] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#00BCF2] hover:opacity-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>Inspect Dossier</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#020617]" />
                  </button>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Bento Card 2: LexVault (Col Span 5) */}
          {ps2 && (
            <ScrollReveal direction="up" delay={200} duration={600} className="md:col-span-12 lg:col-span-5 flex">
              <div 
                onClick={() => onOpenProblemModal(ps2)}
                data-spotlight
                className="w-full group cursor-pointer text-left relative flex flex-col justify-between p-6 sm:p-8 bg-[#0B1220]/85 border border-white/10 hover:border-violet-500/60 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] overflow-hidden"
              >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-violet-500/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none group-hover:from-violet-500/20 transition-all duration-500" />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/30 text-xs font-mono font-bold text-violet-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                      <span>{ps2.code} • APPLIED ZK CRYPTO</span>
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-2xl font-display font-black text-white group-hover:text-violet-400 transition-colors mb-2 tracking-tight">
                    {ps2.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans font-medium text-violet-300 mb-4 leading-relaxed">
                    {ps2.tagline}
                  </p>

                  {/* Overview Excerpt */}
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-6 line-clamp-3">
                    {ps2.overview}
                  </p>

                  {/* Key Features List */}
                  <div className="space-y-2 mb-6">
                    {ps2.keyFeatures.slice(0, 2).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Tech Stack & Action Button */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {ps2.techStack.slice(0, 2).map((tech, i) => (
                      <span key={i} className="text-[11px] font-mono px-2.5 py-1 bg-[#071426] border border-white/10 text-slate-300">
                        {tech}
                      </span>
                    ))}
                    <span className="text-[11px] font-mono px-2 py-1 bg-[#071426] text-slate-500">
                      +{ps2.techStack.length - 2}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProblemModal(ps2);
                    }}
                    className="py-2.5 px-4 font-sans font-bold text-xs text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/25 border border-violet-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>Inspect Dossier</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-violet-300" />
                  </button>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Bento Card 3: SylvaSense (Col Span 5) */}
          {ps3 && (
            <ScrollReveal direction="up" delay={300} duration={600} className="md:col-span-12 lg:col-span-5 flex">
              <div 
                onClick={() => onOpenProblemModal(ps3)}
                data-spotlight
                className="w-full group cursor-pointer text-left relative flex flex-col justify-between p-6 sm:p-8 bg-[#0B1220]/85 border border-white/10 hover:border-emerald-500/60 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden"
              >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-emerald-500/10 via-teal-600/5 to-transparent blur-3xl pointer-events-none group-hover:from-emerald-500/20 transition-all duration-500" />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-300">
                      <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{ps3.code} • EARTH OBSERVATION AI</span>
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-2xl font-display font-black text-white group-hover:text-emerald-400 transition-colors mb-2 tracking-tight">
                    {ps3.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans font-medium text-emerald-300 mb-4 leading-relaxed">
                    {ps3.tagline}
                  </p>

                  {/* Overview Excerpt */}
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-6 line-clamp-3">
                    {ps3.overview}
                  </p>

                  {/* Key Features List */}
                  <div className="space-y-2 mb-6">
                    {ps3.keyFeatures.slice(0, 2).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Tech Stack & Action Button */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {ps3.techStack.slice(0, 2).map((tech, i) => (
                      <span key={i} className="text-[11px] font-mono px-2.5 py-1 bg-[#071426] border border-white/10 text-slate-300">
                        {tech}
                      </span>
                    ))}
                    <span className="text-[11px] font-mono px-2 py-1 bg-[#071426] text-slate-500">
                      +{ps3.techStack.length - 2}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProblemModal(ps3);
                    }}
                    className="py-2.5 px-4 font-sans font-bold text-xs text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>Inspect Dossier</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
                  </button>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Bento Card 4: Open Innovation Track (Col Span 7) */}
          {ps4 && (
            <ScrollReveal direction="up" delay={400} duration={600} className="md:col-span-12 lg:col-span-7 flex">
              <div 
                onClick={() => onOpenProblemModal(ps4)}
                data-spotlight
                className="w-full group cursor-pointer text-left relative flex flex-col justify-between p-6 sm:p-8 md:p-9 bg-[#0B1220]/85 border border-white/10 hover:border-cyan-400/60 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(0,188,242,0.15)] overflow-hidden"
              >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#00BCF2]/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none group-hover:from-[#00BCF2]/20 transition-all duration-500" />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00BCF2]/10 border border-[#00BCF2]/30 text-xs font-mono font-bold text-[#BAE6FD]">
                      <Sparkles className="w-3.5 h-3.5 text-[#00BCF2]" />
                      <span>{ps4.code} • OPEN INNOVATION & STUDENT PROJECTS</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300 font-bold px-2 py-0.5 bg-amber-400/10 border border-amber-400/30 animate-pulse">
                      ROUND 1 ONLY
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-2xl sm:text-3xl font-display font-black text-white group-hover:text-[#00BCF2] transition-colors mb-2 tracking-tight">
                    {ps4.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans font-medium text-[#BAE6FD] mb-4 leading-relaxed">
                    {ps4.tagline}
                  </p>

                  {/* Overview Excerpt */}
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-6 line-clamp-3">
                    {ps4.overview}
                  </p>

                  {/* Key Features List */}
                  <div className="space-y-2 mb-6">
                    {ps4.keyFeatures.slice(0, 3).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00BCF2] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Tech Stack & Action Button */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {ps4.techStack.slice(0, 3).map((tech, i) => (
                      <span key={i} className="text-[11px] font-mono px-2.5 py-1 bg-[#071426] border border-white/10 text-slate-300">
                        {tech}
                      </span>
                    ))}
                    {ps4.techStack.length > 3 && (
                      <span className="text-[11px] font-mono px-2 py-1 bg-[#071426] text-slate-500">
                        +{ps4.techStack.length - 3} more
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProblemModal(ps4);
                    }}
                    className="btn-glow-cyan self-start sm:self-auto py-2.5 px-4 font-sans font-bold text-xs text-[#020617] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#00BCF2] hover:opacity-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>Inspect Dossier</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#020617]" />
                  </button>
                </div>
              </div>
            </ScrollReveal>
          )}

        </div>

      </div>
    </section>
  );
};

