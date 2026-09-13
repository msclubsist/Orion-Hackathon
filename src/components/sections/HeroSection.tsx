import React from 'react';
import Image from 'next/image';
import { 
  Rocket, 
  Search, 
  ChevronRight,
  MapPin
} from 'lucide-react';
import { CountdownTimer } from '../common/CountdownTimer';
import { ScrollReveal } from '../common/ScrollReveal';
import { sound } from '../../audio/soundEffects';
import { EVENT_METRICS, GOOGLE_FORM_REGISTRATION_URL, formatShortDate } from '../../data/orionData';

interface HeroSectionProps {
  onOpenRegister?: () => void;
  onOpenStatus?: () => void;
  onExplorePrizes?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenStatus, onExplorePrizes }) => {
  const handleStatusClick = () => {
    sound.playClick();
    if (onOpenStatus) {
      onOpenStatus();
    } else if (onExplorePrizes) {
      onExplorePrizes();
    }
  };

  const highlightPills = [
    { label: "PRIZE POOL", value: EVENT_METRICS.prizePool, color: "text-[#00BCF2]" },
    { label: "REGISTRATION FEE", value: `${EVENT_METRICS.round1Fee} / Team`, color: "text-emerald-400" },
    { label: "ONLINE DEADLINE", value: EVENT_METRICS.round1DatesAnnounced ? formatShortDate(EVENT_METRICS.onlineDeadlineIso) : EVENT_METRICS.datesTBA, color: "text-[#22D3EE]" },
    { label: "OFFLINE FINALE", value: EVENT_METRICS.finaleDateAnnounced ? `${formatShortDate(EVENT_METRICS.offlineFinaleIso)}${EVENT_METRICS.finaleDateTentative ? ' (TENT.)' : ''}` : EVENT_METRICS.datesTBA, color: "text-white" }
  ];

  return (
    <section data-hero className="relative min-h-screen pt-20 sm:pt-24 pb-20 px-4 flex flex-col justify-center items-center z-10 overflow-hidden text-center">
      
      {/* Microsoft Club Governance Telemetry Header */}
      <ScrollReveal direction="down" delay={50} duration={600} className="max-w-4xl mx-auto text-center mb-4 sm:mb-6 select-none">
        <div className="inline-flex items-center gap-3 py-1.5 px-5 bg-gradient-to-r from-transparent via-[#0078D4]/15 to-transparent border-y border-[#00BCF2]/25 backdrop-blur-md">
          {/* Glowing Microsoft 4-Color Energy Matrix */}
          <div className="grid grid-cols-2 gap-0.5 w-3 h-3 shrink-0 drop-shadow-[0_0_6px_rgba(0,164,239,0.9)]" title="Microsoft Club">
            <span className="bg-[#F25022] w-1.5 h-1.5 shadow-[0_0_4px_#F25022]" />
            <span className="bg-[#7FBA00] w-1.5 h-1.5 shadow-[0_0_4px_#7FBA00]" />
            <span className="bg-[#00A4EF] w-1.5 h-1.5 shadow-[0_0_4px_#00A4EF]" />
            <span className="bg-[#FFB900] w-1.5 h-1.5 shadow-[0_0_4px_#FFB900]" />
          </div>

          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.2em] text-[#E0F2FE] uppercase">
            MICROSOFT STUDENT HACKATHON
          </span>

          <span className="text-[#00BCF2]/50 font-mono text-xs hidden sm:inline">•</span>

          <span className="text-[11px] sm:text-xs font-mono font-semibold tracking-[0.15em] text-[#7DD3FC] uppercase hidden sm:inline">
            MICROSOFT CLUB SIST
          </span>

          <span className="text-[#00BCF2]/50 font-mono text-xs hidden md:inline">|</span>

          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-mono font-semibold tracking-[0.14em] text-[#38BDF8]">
            <MapPin className="w-3 h-3 text-[#38BDF8] shrink-0" />
            SIST CHENNAI
          </span>
        </div>
      </ScrollReveal>

      {/* Main Centered Hero Showcase */}
      <div className="max-w-4xl mx-auto flex flex-col items-center mb-8 w-full">
        
        {/* Grand Centered Hackathon Logo Showpiece */}
        <ScrollReveal direction="up" delay={100} duration={750} className="relative mb-6 flex flex-col items-center">
          <div data-hero-parallax className="relative flex flex-col items-center">
          
          {/* Multi-layered Celestial Halo Background Effects */}
          <div className="absolute -inset-10 bg-gradient-to-r from-[#0078D4]/30 via-[#00BCF2]/45 to-[#22D3EE]/30 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />
          <div className="absolute -inset-4 bg-[#00BCF2]/25 rounded-full blur-2xl pointer-events-none" />
          
          {/* Grand Logo Container (Borderless) */}
          <div className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-76 md:h-76 lg:w-88 lg:h-88 group animate-float flex items-center justify-center">
            <Image
              src="/orion-logo-v1.webp"
              width={512}
              height={512}
              sizes="(max-width: 640px) 208px, (max-width: 768px) 256px, (max-width: 1024px) 304px, 352px"
              preload
              alt="ORION 1.0 — 24H National Level Hackathon Official Logo - Microsoft Club SIST, Sathyabama Institute of Science and Technology" 
              className="relative w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(0,188,242,0.75)] group-hover:scale-105 transition-transform duration-500" 
            />
          </div>

          {/* Bespoke Mission Telemetry Ribbon */}
          <div className="mt-5 flex items-center justify-center gap-3 select-none">
            <div className="hidden sm:block w-12 md:w-20 h-px bg-gradient-to-r from-transparent via-[#00BCF2]/40 to-[#00BCF2]" />
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-gradient-to-r from-[#0078D4]/10 via-[#00BCF2]/15 to-[#0078D4]/10 border-y border-[#00BCF2]/30 backdrop-blur-xl">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span className="text-[11px] sm:text-xs font-mono tracking-[0.22em] text-[#BAE6FD] font-semibold uppercase">
                24H NATIONAL OFFLINE HACKATHON • SIST CHENNAI
              </span>
            </div>
          </div>
            <div className="hidden sm:block w-12 md:w-20 h-px bg-gradient-to-l from-transparent via-[#00BCF2]/40 to-[#00BCF2]" />
          </div>

        </ScrollReveal>

        {/* Centered Keynote Headlines */}
        <ScrollReveal direction="up" delay={180} duration={700} className="space-y-4 max-w-3xl">
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black tracking-tight leading-[1.05] text-white">
            {/* The visible slogan carries no search terms; this names the event for crawlers and screen readers. */}
            <span className="sr-only">ORION 1.0 — 24-Hour National Level Hackathon in Chennai: </span>
            <span className="hero-line"><span className="hero-line-inner">Code. Innovate.</span></span>
            <span className="hero-line"><span className="hero-line-inner hero-shine">Build the Future.</span></span>
          </h1>

          <p className="mt-5 text-base sm:text-lg md:text-xl text-[#BAE6FD] max-w-2xl mx-auto font-sans leading-relaxed font-normal">
            <strong className="text-white font-semibold">Microsoft provides the technology. ORION provides the vision. Participants build the future.</strong> <br />
            The premier nationwide 24-hour offline hackathon organized by <strong className="text-white font-semibold">Microsoft Club SIST</strong> at Sathyabama Institute of Science and Technology, Chennai.
          </p>

          {/* Centered Action Buttons */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mx-auto">
            
            <span data-magnetic="0.25" className="block w-full sm:w-auto">
            <a
              href={GOOGLE_FORM_REGISTRATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                sound.playLaunchWarp();
              }}
              className="btn-sheen btn-glow-cyan w-full sm:w-auto py-4 px-8 rounded-none font-display font-bold text-xs sm:text-sm tracking-wider text-[#020617] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#00BCF2] hover:opacity-95 transition-all shadow-2xl flex items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-[#020617]" />
              <span>REGISTER YOUR TEAM — ₹100</span>
              <ChevronRight className="w-4 h-4 text-[#020617] group-hover:translate-x-1 transition-transform" />
            </a>
            </span>

            {onOpenStatus && (
              <button
                onClick={handleStatusClick}
                className="w-full sm:w-auto py-4 px-7 rounded-none font-display font-bold text-xs sm:text-sm tracking-wider text-white bg-[#071426]/90 hover:bg-[#0B1E38] border border-[rgba(0,188,242,0.4)] hover:border-[#00BCF2] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Search className="w-4 h-4 text-[#00BCF2]" />
                <span>SQUAD STATUS LOOKUP</span>
              </button>
            )}

          </div>

        </ScrollReveal>

      </div>

      {/* Modern Key Metrics Ribbon */}
      <ScrollReveal direction="up" delay={250} duration={650} className="w-full max-w-5xl mb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {highlightPills.map((pill, idx) => (
            <div 
              key={idx}
              className="p-4 bg-[#0B1220]/75 backdrop-blur-2xl border border-[rgba(0,188,242,0.2)] hover:border-[#00BCF2]/70 rounded-none text-center shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className="text-[11px] font-sans font-semibold text-[#94A3B8] tracking-wider mb-1 uppercase">
                {pill.label}
              </div>
              <div className={`text-base sm:text-xl font-display font-black ${pill.color}`}>
                {pill.value}
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Countdown Timer Module */}
      <ScrollReveal direction="up" delay={350} duration={650} className="w-full max-w-3xl">
        <CountdownTimer />
      </ScrollReveal>

    </section>
  );
};
