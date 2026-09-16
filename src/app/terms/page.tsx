'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ScrollReveal } from '@/components/common/ScrollReveal';
import { IMPORTANT_RULES, IMPORTANT_RULES_NOTICE } from '@/data/orionData';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC] selection:bg-[#22D3EE] selection:text-[#020617]">
      
      {/* Background Starfield & Radial Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#071426_0%,#020617_70%,#000000_100%)] opacity-90" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00A4EF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#22D3EE]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top Microsoft 4-Color Energy Strip */}
      <div className="sticky top-0 z-50 w-full h-1 flex shadow-lg">
        <div className="w-1/4 bg-[#F25022]" />
        <div className="w-1/4 bg-[#7FBA00]" />
        <div className="w-1/4 bg-[#00A4EF]" />
        <div className="w-1/4 bg-[#FFB900]" />
      </div>

      {/* Sticky Header Nav */}
      <header className="sticky top-1 z-40 bg-[#07101E]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-xs font-mono font-bold text-[#38BDF8] hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>RETURN TO ORION 1.0 PORTAL</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#0B2556]/60 border border-[#38BDF8]/30 rounded-none text-[11px] font-mono text-[#38BDF8]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>OFFICIAL RULEBOOK & POLICIES</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative z-10 pt-12 pb-8 px-4 sm:px-8 max-w-6xl mx-auto text-left">
        <ScrollReveal direction="up" delay={50}>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00A4EF]/10 border border-[#00A4EF]/40 mb-4">
            <div className="grid grid-cols-2 gap-0.5 w-2 h-2 shrink-0">
              <span className="bg-[#F25022] w-0.8 h-0.8" />
              <span className="bg-[#7FBA00] w-0.8 h-0.8" />
              <span className="bg-[#00A4EF] w-0.8 h-0.8" />
              <span className="bg-[#FFB900] w-0.8 h-0.8" />
            </div>
            <span className="text-[11px] font-mono font-bold text-[#00A4EF] tracking-widest uppercase">
              MICROSOFT CLUB SIST • STUDENT DEVELOPMENT CELL
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-white uppercase mb-3">
            ORION <span className="text-[#22D3EE]">1.0</span>
          </h1>
          <p className="text-sm sm:text-base font-mono text-[#94A3B8] tracking-wider uppercase mb-6">
            OFFICIAL HACKATHON RULEBOOK & PARTICIPANT GUIDELINES
          </p>
          <p className="text-xs sm:text-sm font-sans text-slate-300 max-w-3xl leading-relaxed">
            Organized by <strong>Microsoft Club SIST</strong>, Student Development Cell, Sathyabama Institute of Science and Technology, Chennai. Please review all terms, qualification procedures, and code of conduct policies carefully.
          </p>
        </ScrollReveal>

        {/* Quick Highlights Summary Card */}
        <div className="mt-8 p-5 sm:p-6 bg-[#07101E]/90 border border-[#38BDF8]/40 shadow-[0_0_30px_rgba(56,189,248,0.12)]">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#22D3EE] uppercase tracking-wider mb-4 pb-2 border-b border-white/10">
            <Sparkles className="w-4 h-4 text-[#22D3EE]" />
            <span>QUICK REFERENCE — WHAT PARTICIPANTS MUST KNOW</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans text-slate-300">
            <div className="p-3 bg-[#020617] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] block uppercase">Round 1 Registration</span>
              <strong className="text-white text-sm">₹100 per team</strong>
              <span className="text-slate-400 block text-[11px]">Flat fee covering 2–6 squad members</span>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] block uppercase">Grand Finale Selection</span>
              <strong className="text-[#22D3EE] text-sm">TOP 70 TEAMS</strong>
              <span className="text-slate-400 block text-[11px]">Qualified for 24-Hour Offline Sprint</span>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] block uppercase">Finalist Confirmation</span>
              <strong className="text-white text-sm">₹250 per head</strong>
              <span className="text-slate-400 block text-[11px]">Per-participant confirmation for Top 70</span>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] block uppercase">Accommodation</span>
              <strong className="text-emerald-400 text-sm">FREE for Finalists</strong>
              <span className="text-slate-400 block text-[11px]">On-campus stay for registered finalists</span>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5 space-y-1">
              <span className="text-slate-400 font-mono text-[10px] block uppercase">Hospitality Provided</span>
              <strong className="text-white text-sm">Food, Water, Wi-Fi & AC</strong>
              <span className="text-slate-400 block text-[11px]">All hackathon meals & facilities included</span>
            </div>
            <div className="p-3 bg-[#020617] border border-rose-500/30 bg-rose-950/10 space-y-1">
              <span className="text-rose-400 font-mono text-[10px] block uppercase">Refund Policy</span>
              <strong className="text-rose-300 text-sm">STRICTLY NON-REFUNDABLE</strong>
              <span className="text-rose-400/80 block text-[11px]">All payments & slots are non-transferable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Rulebook Body */}
      <main className="relative z-10 py-8 px-4 sm:px-8 max-w-6xl mx-auto text-left space-y-6">
        
        {/* Important Rules Notice (Official Announcement) */}
        <section id="important-rules" className="p-6 sm:p-8 bg-gradient-to-br from-[#1a1305] via-[#07101E] to-[#07101E] border border-amber-400/50 shadow-[0_0_30px_rgba(255,185,0,0.12)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-400/20">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 tracking-widest uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>OFFICIAL NOTICE — {IMPORTANT_RULES_NOTICE.title}</span>
            </div>
            <span className="text-[10px] font-mono text-amber-200/70 uppercase tracking-wider">Applies to all registered teams</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            <strong className="text-white">{IMPORTANT_RULES_NOTICE.greeting}</strong> {IMPORTANT_RULES_NOTICE.intro}
          </p>

          <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {IMPORTANT_RULES.map((rule) => (
              <li key={rule.number} className="p-4 bg-[#020617] border border-white/5 flex gap-4">
                <span className="text-2xl font-display font-black text-amber-400/80 leading-none select-none">{rule.number}</span>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-white font-mono text-xs uppercase tracking-wide">{rule.title}</strong>
                    <span className="px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-white/10 uppercase">{rule.appliesTo}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-semibold">{rule.summary}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.detail}</p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {rule.allowed}</span>
                    <span className="inline-flex items-center gap-1.5 text-rose-300"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {rule.notAllowed}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="p-4 bg-rose-950/20 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-rose-200 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{IMPORTANT_RULES_NOTICE.warning}</span>
            </p>
            <div className="text-[11px] font-mono text-slate-400 sm:text-right shrink-0">
              <span className="block">Regards,</span>
              <span className="block text-white font-bold">{IMPORTANT_RULES_NOTICE.signOff}</span>
              <span className="block text-[#38BDF8]">{IMPORTANT_RULES_NOTICE.signOffOrg}</span>
            </div>
          </div>
        </section>

        {/* Section 1 */}
        <section className="p-6 bg-[#07101E] border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
            <span>01. ABOUT ORION 1.0</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            ORION 1.0 is a competitive hackathon designed to encourage innovation, technical problem-solving, teamwork, creativity, and the development of practical solutions to real-world challenges.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-[#020617] border border-white/5">
              <strong className="text-white font-mono text-xs block mb-1">Round 1 — Online Qualifier</strong>
              <p className="text-xs text-slate-400">Teams participate in the initial online round and submit their solution/idea according to the instructions communicated by the organizers.</p>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5">
              <strong className="text-[#22D3EE] font-mono text-xs block mb-1">Round 2 — 24-Hour Offline Grand Finale</strong>
              <p className="text-xs text-slate-400">The Top 70 Teams selected from Round 1 will qualify for the offline Grand Finale conducted at Sathyabama Institute of Science and Technology, Chennai.</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic pt-1">
            Participation in ORION 1.0 constitutes acceptance of all rules, policies, and instructions contained in this rulebook and any official event communication issued by the organizing committee.
          </p>
        </section>

        {/* Section 2 */}
        <section className="p-6 bg-[#07101E] border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
            <span>02. ELIGIBILITY & TEAM COMPOSITION</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside">
            <li>ORION 1.0 is open to eligible student participants as specified in the official event announcement and registration portal.</li>
            <li>Each team must consist of a minimum of <strong>2 members</strong> and a maximum of <strong>6 members</strong>.</li>
            <li>Participants must provide accurate information during registration.</li>
            <li>A participant may be registered as a member of only one team.</li>
            <li>Duplicate participation across multiple teams is strictly prohibited.</li>
            <li>Teams are responsible for ensuring that all registered members satisfy the eligibility requirements.</li>
            <li>Participants may be required to produce a valid college/university identification card or other identification at the Grand Finale.</li>
          </ul>
          <p className="text-xs text-rose-400 font-mono">
            ⚠ Any false or misleading registration information may result in cancellation of participation.
          </p>
        </section>

        {/* Section 3 & 4 & 5 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="p-6 bg-[#07101E] border border-white/10 space-y-3">
            <div className="text-xs font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
              03. ROUND 1 — QUALIFIER
            </div>
            <div className="p-2 bg-[#020617] border border-[#38BDF8]/30 text-center font-mono">
              <span className="text-xs text-slate-400 block">Registration Fee</span>
              <span className="text-lg font-bold text-white">₹100 per team</span>
              <span className="text-[10px] text-slate-400 block">Flat for entire squad</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
              <li>Submit within announced deadline.</li>
              <li>Late entries will not be considered.</li>
              <li>Prescribed template format required.</li>
              <li>Strict AI limit: Maximum 10% AI assistance permitted.</li>
              <li>Incomplete entries will be rejected.</li>
            </ul>
          </section>

          <section className="p-6 bg-[#07101E] border border-white/10 space-y-3">
            <div className="text-xs font-mono font-bold text-[#22D3EE] tracking-widest uppercase">
              04. SELECTION OF TOP 70
            </div>
            <div className="p-2 bg-[#020617] border border-[#22D3EE]/30 text-center font-mono">
              <span className="text-xs text-slate-400 block">Shortlisted Squads</span>
              <span className="text-lg font-bold text-[#22D3EE]">TOP 70 TEAMS</span>
              <span className="text-[10px] text-slate-400 block">Qualify for Offline Finale</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Round 1 submissions will be evaluated according to official criteria. Selection decisions made through the official evaluation process are final.
            </p>
          </section>

          <section className="p-6 bg-[#07101E] border border-white/10 space-y-3">
            <div className="text-xs font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
              05. GRAND FINALE CONFIRMATION FEE
            </div>
            <div className="p-2 bg-[#020617] border border-[#38BDF8]/30 text-center font-mono">
              <span className="text-xs text-slate-400 block">Confirmation Fee</span>
              <span className="text-lg font-bold text-white">₹250 PER HEAD</span>
              <span className="text-[10px] text-slate-400 block">Top 70 finalists only</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The ₹250 amount is charged per head (per registered finalist member), not flat per team. Failure to confirm within deadline may result in slot cancellation.
            </p>
          </section>
        </div>

        {/* Section 6 & 7 (Policies) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="p-6 bg-[#07101E] border border-rose-500/40 bg-rose-950/10 space-y-3">
            <div className="text-xs font-mono font-bold text-rose-400 tracking-widest uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>06. STRICT NO-REFUND POLICY</span>
            </div>
            <p className="text-xs sm:text-sm text-rose-200 font-semibold uppercase">
              ALL PAYMENTS ARE STRICTLY NON-REFUNDABLE.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Once payment has been successfully made, refunds will not be provided for reasons including withdrawal, failure to attend, late arrival, travel difficulties, academic commitments, team disputes, or disqualification.
            </p>
          </section>

          <section className="p-6 bg-[#07101E] border border-amber-500/40 bg-amber-950/10 space-y-3">
            <div className="text-xs font-mono font-bold text-amber-400 tracking-widest uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>07. NON-TRANSFERABLE REGISTRATION</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-200 font-semibold uppercase">
              REGISTRATION, PAYMENTS & SLOTS ARE NON-TRANSFERABLE.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Teams cannot transfer registration to another team, sell/exchange finalist slots, or request payment adjustments across teams. Any attempt to manipulate slots will trigger disqualification.
            </p>
          </section>
        </div>

        {/* Section 8 & 9 (Attendance & Reporting) */}
        <section className="p-6 bg-[#07101E] border border-white/10 space-y-3">
          <div className="text-xs font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
            08 & 09. GRAND FINALE REPORTING, ENTRY & ATTENDANCE
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="p-3 bg-[#020617] border border-white/5 space-y-1">
              <strong className="text-white font-mono block">Prompt Reporting</strong>
              <p className="text-slate-400">All qualified participants must report according to the official schedule for ID check, check-in, and participant briefing.</p>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5 space-y-1">
              <strong className="text-white font-mono block">No Late Entry</strong>
              <p className="text-slate-400">Joining the hackathon midway after the permitted reporting/check-in window is strictly not allowed.</p>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5 space-y-1">
              <strong className="text-white font-mono block">Continuous 24H Sprint</strong>
              <p className="text-slate-400">Participants must remain within designated event premises. Exits require explicit organizer authorization.</p>
            </div>
          </div>
        </section>

        {/* Section 10, 11, 12 (Hospitality & Amenities) */}
        <section className="p-6 bg-[#07101E] border border-white/10 space-y-4">
          <div className="text-xs font-mono font-bold text-[#22D3EE] tracking-widest uppercase">
            10, 11 & 12. ACCOMMODATION, FOOD & FACILITIES PROVIDED
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="p-3 bg-[#020617] border border-white/5">
              <strong className="text-emerald-400 font-mono block mb-1">FREE Accommodation</strong>
              <p className="text-slate-400">Provided free of charge exclusively to registered members of Top 70 finalist squads. (Not open to unregistered guests/friends).</p>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5">
              <strong className="text-white font-mono block mb-1">Meals & Refreshments</strong>
              <p className="text-slate-400">Food and drinking water arranged for registered participants throughout the 24-hour sprint.</p>
            </div>
            <div className="p-3 bg-[#020617] border border-white/5">
              <strong className="text-white font-mono block mb-1">Infrastructure & Swags</strong>
              <p className="text-slate-400">High-speed Wi-Fi, air-conditioned workspaces, power access, basic event infrastructure, and participant swags.</p>
            </div>
          </div>
        </section>

        {/* Section 13 & 14 (Participant Checklist) */}
        <section className="p-6 bg-[#07101E] border border-white/10 space-y-3">
          <div className="text-xs font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
            13 & 14. ITEMS PARTICIPANTS MUST BRING (CHECKLIST)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-4 bg-[#020617] border border-white/5 space-y-2">
              <strong className="text-white font-mono block text-xs">Mandatory Technical Gear:</strong>
              <ul className="space-y-1 list-disc list-inside text-slate-400">
                <li>Laptop and original laptop charger</li>
                <li>Mobile phone charger and charging cables</li>
                <li>Extension box / power strip (highly recommended)</li>
                <li>Required adapters and development peripherals</li>
                <li>Valid College/University ID Card</li>
                <li>Registration confirmation copy / Portal access pass</li>
              </ul>
            </div>
            <div className="p-4 bg-[#020617] border border-white/5 space-y-2">
              <strong className="text-white font-mono block text-xs">Personal & Overnight Essentials:</strong>
              <ul className="space-y-1 list-disc list-inside text-slate-400">
                <li>Personal medicines and prescription drugs</li>
                <li>Personal hygiene products</li>
                <li>Sweater / jacket (venue is AC for extended periods)</li>
                <li>Bedsheet / light blanket for overnight rest</li>
                <li>Comfortable clothing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 15, 16, 17, 18, 19 (Code Quality, AI, & IP) */}
        <section className="p-6 bg-[#07101E] border border-white/10 space-y-4">
          <div className="text-xs font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
            15 – 19. ORIGINALITY, PLAGIARISM, AI TOOLS & INTELLECTUAL PROPERTY
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              <strong>Originality of Projects:</strong> Teams must not present a previously completed project as though it was developed during ORION 1.0. Teams may be asked to demonstrate commit logs, architecture history, and individual contributions.
            </p>
            <p>
              <strong>Plagiarism & Malpractice:</strong> Copying code from other teams, unauthorized code exchange, fabricating progress, or tampering with rival systems will result in immediate disqualification.
            </p>
            <p>
              <strong>Use of AI Tools:</strong> AI-assisted development tools (Copilot, ChatGPT, Claude) are permitted, but teams must thoroughly understand and defend their architecture, code, and methodology.
            </p>
            <p>
              <strong>Intellectual Property:</strong> Participants retain 100% ownership of original IP created during ORION 1.0. Participation does not transfer ownership to the organizers.
            </p>
          </div>
        </section>

        {/* Section 20 – 33 (Conduct, Judging, Safety, Authority) */}
        <section className="p-6 bg-[#07101E] border border-white/10 space-y-3">
          <div className="text-xs font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
            20 – 33. JUDGING, CODE OF CONDUCT, DISCIPLINE & SAFETY
          </div>
          <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <p><strong>Judging Decisions:</strong> Decisions made by the authorized jury panel regarding evaluations, scoring, and rankings are final.</p>
            <p><strong>Discipline & Respect:</strong> Professional conduct is mandatory. Disruptive behavior, harassment, tampering with university property, or disturbing other teams will lead to eviction and disciplinary actions.</p>
            <p><strong>Emergency Exceptions:</strong> Safety takes absolute priority. In medical or natural emergencies, follow the directions of authorized event staff immediately.</p>
            <p><strong>Certificates:</strong> Issued to verified participants who satisfy active participation criteria.</p>
          </div>
        </section>

        {/* Participant Declaration */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-[#0B192C] to-[#040E24] border border-[#22D3EE]/50 text-center space-y-4">
          <h3 className="font-display font-black text-lg sm:text-xl text-white uppercase tracking-wider">
            ORION 1.0 PARTICIPANT DECLARATION
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            By completing registration and participating in ORION 1.0, each participant confirms that the information submitted during registration is accurate and that they have read, understood, and agreed to comply with all official rules, venue regulations, and safety guidelines.
          </p>
          <div className="text-xs font-mono text-[#22D3EE] font-bold tracking-widest uppercase">
            INNOVATION • INTEGRITY • COLLABORATION
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00BCF2] to-[#38BDF8] hover:brightness-110 text-[#040E24] font-display font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(56,189,248,0.4)]"
            >
              <span>RETURN TO MAIN PORTAL</span>
              <ChevronRight className="w-4 h-4 text-[#040E24]" />
            </Link>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#030712] py-8 px-4 text-center text-xs text-[#64748B] font-mono">
        <p className="mb-2">© 2026 ORION 1.0 • Microsoft Club SIST. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#94A3B8]">
          <a href="mailto:msclubsist@gmail.com" className="hover:text-[#38BDF8]">
            msclubsist@gmail.com
          </a>
          <span>•</span>
          <a href="https://www.instagram.com/orion1.0_" target="_blank" rel="noopener noreferrer" className="hover:text-[#38BDF8]">
            @orion1.0_
          </a>
        </div>
      </footer>

    </div>
  );
}
