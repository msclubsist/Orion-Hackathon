'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowUp, 
  MapPin, 
  Mail,
  FileText,
  ExternalLink
} from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';
import { sound } from '../../audio/soundEffects';
import { GOOGLE_FORM_REGISTRATION_URL } from '@/data/orionData';

interface FooterProps {
  onOpenRegister?: () => void;
  onOpenStatus?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const scrollToTop = () => {
    sound.playHover();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative z-10 bg-[#040E24] border-t border-[rgba(212,233,255,0.14)] pt-16 pb-24 lg:pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        
        <ScrollReveal direction="up" delay={50} duration={600}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12 text-left">
            
            {/* Col 1: Brand & Organizer */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <Image
                    src="/orion-logo-v1.webp"
                    width={512}
                    height={512}
                    sizes="40px"
                    alt="ORION 1.0 — Microsoft Club SIST Hackathon" 
                    className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]" 
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-black text-base text-white tracking-wider">
                      ORION 1.0
                    </span>
                    <div className="grid grid-cols-2 gap-0.5 w-2 h-2 shrink-0 opacity-90" title="Microsoft Club">
                      <span className="bg-[#F25022] w-0.8 h-0.8" />
                      <span className="bg-[#7FBA00] w-0.8 h-0.8" />
                      <span className="bg-[#00A4EF] w-0.8 h-0.8" />
                      <span className="bg-[#FFB900] w-0.8 h-0.8" />
                    </div>
                  </div>
                  <div className="text-[9px] font-mono-hud text-[#7DD3FC]">MICROSOFT CLUB SIST</div>
                </div>
              </div>
              <p className="text-xs text-[#BAE6FD] font-sans leading-relaxed mb-4 font-normal">
                National flagship 24-hour hackathon engineered by <strong className="text-white">Microsoft Club SIST</strong>, Sathyabama Institute of Science and Technology, Chennai.
              </p>
              <div className="text-[10px] font-mono-hud text-[#38BDF8] flex items-center gap-1">
                <span>IGNITE THE GENESIS OF INNOVATION</span>
              </div>
            </div>

            {/* Col 2: Fast Navigation */}
            <div>
              <h4 className="text-xs font-mono-hud text-white font-bold tracking-widest uppercase mb-4">
                MISSION SECTORS
              </h4>
              <ul className="space-y-2 text-xs font-sans text-[#BAE6FD]">
                <li><a href="#challenges" className="hover:text-[#38BDF8] transition-colors">Challenge Arena (04 Tracks)</a></li>
                <li><a href="#prizes" className="hover:text-[#38BDF8] transition-colors">₹1,00,000 Prize Pool & Bounties</a></li>
                <li><a href="#guidelines" className="hover:text-[#38BDF8] transition-colors">Two-Tier Selection Protocol</a></li>
                <li><a href="#rules" className="hover:text-[#38BDF8] transition-colors">Important Rules (Submission &amp; Finale)</a></li>
                <li><a href="#timeline" className="hover:text-[#38BDF8] transition-colors">Event Timeline & Milestones</a></li>
                <li><a href="#venue" className="hover:text-[#38BDF8] transition-colors">Finalist Accommodation & Venue</a></li>
                <li><Link href="/terms" className="text-[#38BDF8] hover:text-white transition-colors flex items-center gap-1 font-bold"><span>Official Rulebook & Terms</span> →</Link></li>
              </ul>
            </div>

            {/* Col 3: Quick Commands */}
            <div>
              <h4 className="text-xs font-mono-hud text-white font-bold tracking-widest uppercase mb-4">
                COMMAND ACTIONS
              </h4>
              <div className="space-y-2.5">
                <a
                  href={GOOGLE_FORM_REGISTRATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    sound.playLaunchWarp();
                  }}
                  className="btn-sheen w-full py-3 px-4 rounded-none bg-[#0B2556] hover:bg-[#103374] border border-[#38BDF8]/40 text-xs font-mono-hud text-[#38BDF8] hover:text-white transition-all text-left flex items-center justify-between cursor-pointer active:scale-95 shadow-sm font-bold"
                >
                  <span>REGISTER TEAM</span>
                  <span className="text-[10px] bg-[#38BDF8] text-[#040E24] px-2 py-0.5 font-bold shadow-sm">₹100</span>
                </a>

                <Link
                  href="/terms"
                  className="w-full py-2.5 px-4 bg-[#030712] hover:bg-[#07101E] border border-white/10 text-xs font-mono-hud text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>TERMS & CONDITIONS</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                </Link>
              </div>
            </div>

            {/* Col 4: Dispatch, Socials & Support */}
            <div>
              <h4 className="text-xs font-mono-hud text-white font-bold tracking-widest uppercase mb-4">
                MISSION CONTROL & SUPPORT
              </h4>
              <div className="space-y-3 text-xs font-sans text-[#BAE6FD]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                  <span>Sathyabama Institute of Science and Technology, OMR, Chennai — 600119</span>
                </div>
                
                {/* Support Gmail */}
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                  <a 
                    href="mailto:msclubsist@gmail.com" 
                    className="hover:text-[#38BDF8] transition-colors font-mono font-medium text-white"
                  >
                    msclubsist@gmail.com
                  </a>
                </div>

                {/* Instagram Page */}
                <div className="flex items-center gap-2 pt-1">
                  <svg className="w-3.5 h-3.5 text-[#E1306C] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                  <a 
                    href="https://www.instagram.com/orion1.0_" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-[#38BDF8] transition-colors font-mono text-slate-300"
                  >
                    @orion1.0_
                  </a>
                </div>
              </div>
            </div>

          </div>
        </ScrollReveal>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[rgba(212,233,255,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono-hud text-[#7DD3FC]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span>© 2026 ORION 1.0 • Microsoft Club SIST. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <Link href="/terms" className="text-[#38BDF8] hover:underline">
              Terms & Conditions
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span>SIST CHENNAI</span>
            <span>•</span>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-[#38BDF8] hover:text-white transition-colors cursor-pointer group"
            >
              <span>RETURN TO TOP</span>
              <ArrowUp className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
