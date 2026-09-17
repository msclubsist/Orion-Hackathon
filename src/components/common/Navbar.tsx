'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Rocket, 
  Menu, 
  X, 
  ChevronRight 
} from 'lucide-react';
import { GooeyNav } from './GooeyNav';
import { GOOGLE_FORM_REGISTRATION_URL, SUBMISSION_DRIVE_URL } from '@/data/orionData';

interface NavbarProps {
  registrationEnabled?: boolean;
  onOpenRegister?: () => void;
  onOpenStatus?: () => void;
}

const NAV_ITEMS = [
  { label: "CHALLENGES", href: "#challenges" },
  { label: "PRIZES", href: "#prizes" },
  { label: "GUIDELINES", href: "#guidelines" },
  { label: "RULES", href: "#rules" },
  { label: "TIMELINE", href: "#timeline" },
  { label: "ORGANIZERS", href: "#organizers" },
  { label: "FAQ", href: "#faq" },
  { label: "VENUE & PERKS", href: "#venue" },
];

export const Navbar: React.FC<NavbarProps> = ({ registrationEnabled = false }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = NAV_ITEMS.map(item => item.href.substring(1));
      const scrollPosition = window.scrollY + 220;

      let currentSection = '';
      for (let i = sections.length - 1; i >= 0; i--) {
        const sectionEl = document.getElementById(sections[i]);
        if (sectionEl && sectionEl.offsetTop <= scrollPosition) {
          currentSection = sections[i];
          break;
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeIndex = activeSection 
    ? NAV_ITEMS.findIndex(item => item.href === `#${activeSection}`) 
    : -1;

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'py-3 bg-[#0B1220]/85 backdrop-blur-2xl border-b border-white/15 shadow-xl' 
          : 'py-4 bg-[#0B1220]/65 backdrop-blur-xl border-b border-white/10'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          
          {/* Brand Lockup */}
          <a 
            href="#"
            className="flex items-center gap-3 group cursor-pointer shrink-0"
          >
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <Image
                src="/orion-logo-v1.webp"
                width={512}
                height={512}
                sizes="40px"
                loading="eager"
                alt="ORION 1.0 — Microsoft Club SIST 24-Hour Hackathon" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,188,242,0.5)] group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-white group-hover:text-[#00BCF2] transition-colors">
                  ORION 1.0
                </span>
                <span className="text-[10px] font-sans text-[#00BCF2] bg-[#00BCF2]/10 px-2 py-0.5 rounded-none font-semibold border border-[#00BCF2]/20">
                  SIST
                </span>
              </div>
              <div className="text-[10px] font-sans text-[#94A3B8] font-medium hidden sm:block">
                Microsoft Club SIST
              </div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center justify-center">
            <GooeyNav 
              items={NAV_ITEMS}
              activeIndex={activeIndex}
              particleCount={6}
              particleDistances={[50, 8]}
              particleR={60}
              animationTime={350}
              colors={[1, 2, 3, 4]}
            />
          </div>

          {/* Desktop Action Controls */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {registrationEnabled && (
              <a
                href={SUBMISSION_DRIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-none font-mono-hud font-bold text-xs text-[#BAE6FD] hover:text-white bg-[#07193D] border border-[#38BDF8]/40 hover:border-[#38BDF8] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>UPLOAD PPT</span>
              </a>
            )}

            {/* Primary CTA */}
            <span data-magnetic="0.35" className="inline-block">
            <a
              href={GOOGLE_FORM_REGISTRATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow-cyan px-5 py-2.5 rounded-none font-sans font-bold text-xs tracking-wide text-[#020617] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#00BCF2] hover:opacity-95 transition-all shadow-md flex items-center gap-2 active:scale-98 cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5 text-[#020617]" />
              <span>Register Team — ₹100</span>
            </a>
            </span>
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            {registrationEnabled && (
              <a
                href={SUBMISSION_DRIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-2 rounded-none font-mono-hud text-[11px] text-[#BAE6FD] bg-[#07193D] border border-[#38BDF8]/40"
              >
                Upload PPT
              </a>
            )}
            <a
              href={GOOGLE_FORM_REGISTRATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-none font-sans font-bold text-xs text-[#020617] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#00BCF2] active:scale-95 transition-transform shadow-sm flex items-center justify-center"
            >
              Register ₹100
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-none bg-[#071426] border border-white/10 text-slate-400 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0B1220]/95 backdrop-blur-2xl border-b border-white/15 px-4 py-4 space-y-3 shadow-2xl">
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item, idx) => {
                const isActive = activeSection === item.href.substring(1);
                return (
                  <a
                    key={idx}
                    href={item.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-none border text-xs font-sans font-medium transition-all flex items-center justify-between ${
                      isActive 
                        ? 'bg-[#00BCF2]/10 border-[#00BCF2]/40 text-[#00BCF2] font-bold'
                        : 'bg-[#071426]/60 border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#00BCF2]" />
                  </a>
                );
              })}
            </div>
            {registrationEnabled && <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <a
                href={SUBMISSION_DRIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 text-center text-xs font-mono-hud font-bold text-[#BAE6FD] bg-[#07193D] border border-[#38BDF8]/40"
              >
                UPLOAD PPT
              </a>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 text-center text-xs font-mono-hud text-rose-300 bg-rose-950/40 border border-rose-500/40"
              >
                ADMIN
              </Link>
            </div>}
          </div>
        )}
      </header>

      {/* Floating Bottom Quick Action Bar for Mobile */}
      <nav
        aria-label="Mobile quick actions"
        className="fixed bottom-3 inset-x-3 z-40 lg:hidden pointer-events-auto"
      >
        <div className="p-2 bg-[#0B1220]/95 backdrop-blur-2xl border border-white/15 rounded-none shadow-2xl flex items-center">
          <a
            href={GOOGLE_FORM_REGISTRATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-none font-sans font-bold text-xs text-[#020617] bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#00BCF2] flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
          >
            <Rocket className="w-4 h-4 text-[#020617]" />
            <span>Register Your Team — ₹100</span>
          </a>
        </div>
      </nav>
    </>
  );
};
