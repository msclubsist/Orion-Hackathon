'use client';

import React, { useMemo, useState } from 'react';
import {
  HelpCircle,
  Search,
  X,
  Plus,
  Sparkles,
  Users,
  FileText,
  Trophy,
  MapPin,
  ShieldAlert,
  Bot,
  Mail,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';
import { EVENT_METRICS, FAQ_DATA } from '../../data/orionData';
import type { FAQItem } from '../../types/orion';
import { sound } from '../../audio/soundEffects';

const ALL = 'all';

/** Display metadata per data category. Unknown categories still render, with a generic icon. */
const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  'About ORION 1.0': { label: 'About ORION 1.0', icon: Sparkles },
  'Eligibility & Squads': { label: 'Eligibility & Teams', icon: Users },
  'Round 1 & PPT Submissions': { label: 'Round 1 & PPT', icon: FileText },
  'Finale & Fees': { label: 'Finale & Fees', icon: Trophy },
  'Hospitality & Venue': { label: 'Venue & Stay', icon: MapPin },
  'Special Mentions': { label: 'Event-Day Rules', icon: ShieldAlert },
};

const metaFor = (category: string) => CATEGORY_META[category] ?? { label: category, icon: HelpCircle };

/** In the "All" view each topic shows this many questions, with a link to the rest. */
const PREVIEW_PER_TOPIC = 3;

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);

const InstagramIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const QUICK_FACTS = [
  { label: 'Prize pool', value: EVENT_METRICS.prizePool },
  { label: 'Round 1 fee', value: `${EVENT_METRICS.round1Fee} per team` },
  { label: 'Team size', value: `${EVENT_METRICS.teamSize} members` },
  { label: 'Round 1 deadline', value: EVENT_METRICS.deadlineDate },
  { label: 'Grand Finale', value: EVENT_METRICS.offlineFinaleDate },
  { label: 'Venue', value: 'Sathyabama (SIST), Chennai' },
];

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(query);
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="bg-[#00BCF2]/25 text-white">
        {text.slice(at, at + query.length)}
      </mark>
    );
    from = at + query.length;
    at = lower.indexOf(query, from);
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

/** Answers use "• " lines for lists; render those as real lists. */
function Answer({ text, query }: { text: string; query: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-2 my-3">
        {bullets.map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-[0.55em] w-1.5 h-1.5 rotate-45 bg-[#00BCF2] shrink-0 shadow-[0_0_6px_#00BCF2]" />
            <span><Highlight text={item} query={query} /></span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  text.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•')) {
      bullets.push(trimmed.replace(/^•\s*/, ''));
      return;
    }
    flush();
    if (trimmed) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-2 first:mt-0 last:mb-0">
          <Highlight text={trimmed} query={query} />
        </p>
      );
    }
  });
  flush();
  return <>{blocks}</>;
}

interface FAQRowProps {
  faq: FAQItem;
  number: number;
  isOpen: boolean;
  onToggle: () => void;
  query: string;
  hidden?: boolean;
  showCategory?: boolean;
  /** h4 when the row sits under a topic heading (h3), otherwise h3. */
  headingLevel?: 'h3' | 'h4';
}

function FAQRow({ faq, number, isOpen, onToggle, query, hidden, showCategory, headingLevel = 'h3' }: FAQRowProps) {
  const Heading = headingLevel;
  const id = `faq-${slugify(faq.question)}`;
  return (
    <div
      id={id}
      hidden={hidden}
      data-spotlight
      className={`relative overflow-hidden border transition-colors duration-300 ${
        isOpen
          ? 'bg-[#0B1220]/95 border-[#00BCF2]/50 shadow-[0_0_28px_rgba(0,188,242,0.12)]'
          : 'bg-[#0B1220]/60 border-white/10 hover:border-[#00BCF2]/35'
      }`}
    >
      {/* Open-state accent rail */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00BCF2] to-[#0078D4] transition-transform duration-500 origin-top ${
          isOpen ? 'scale-y-100' : 'scale-y-0'
        }`}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${id}-answer`}
        className="relative z-10 w-full px-4 py-4 sm:px-6 sm:py-5 text-left flex items-start gap-3 sm:gap-4 cursor-pointer group"
      >
        <span className="font-mono text-[11px] sm:text-xs text-[#00BCF2] font-bold shrink-0 mt-1 tabular-nums">
          {String(number).padStart(2, '0')}
        </span>
        <span className="flex-1 min-w-0">
          {showCategory && (
            <span className="block text-[10px] font-mono font-semibold tracking-[0.14em] uppercase text-[#7DD3FC]/70 mb-1">
              {metaFor(faq.category).label}
            </span>
          )}
          <Heading className="font-display font-bold text-sm sm:text-base text-white leading-snug group-hover:text-[#E0F2FE] transition-colors">
            <Highlight text={faq.question} query={query} />
          </Heading>
        </span>
        <span
          className={`shrink-0 w-7 h-7 flex items-center justify-center border transition-all duration-300 ${
            isOpen
              ? 'bg-[#00BCF2]/15 border-[#00BCF2] text-[#00BCF2] rotate-45'
              : 'bg-white/5 border-white/10 text-slate-400 group-hover:border-[#00BCF2]/50 group-hover:text-[#00BCF2]'
          }`}
        >
          <Plus className="w-4 h-4" />
        </span>
      </button>

      {/* Answer stays in the DOM when collapsed so search engines and find-in-page still see it. */}
      <div
        id={`${id}-answer`}
        role="region"
        aria-labelledby={id}
        inert={!isOpen}
        className={`relative z-10 grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-11 pr-4 sm:pl-[3.75rem] sm:pr-8 pb-5 sm:pb-6 text-[13px] sm:text-sm text-slate-300 font-sans leading-relaxed">
            <Answer text={faq.answer} query={query} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const FAQSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [rawQuery, setRawQuery] = useState('');
  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set([FAQ_DATA[0]?.question]));

  const query = rawQuery.trim().toLowerCase();

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    FAQ_DATA.forEach(faq => counts.set(faq.category, (counts.get(faq.category) ?? 0) + 1));
    return [...counts.entries()].map(([id, count]) => ({ id, count, ...metaFor(id) }));
  }, []);

  const matches = useMemo(
    () =>
      FAQ_DATA.filter(faq => {
        if (activeCategory !== ALL && faq.category !== activeCategory) return false;
        if (!query) return true;
        return faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query);
      }),
    [activeCategory, query]
  );

  const grouped = activeCategory === ALL && !query;

  const toggle = (question: string) => {
    sound.playHover();
    setOpenSet(prev => {
      const next = new Set(prev);
      if (next.has(question)) next.delete(question);
      else next.add(question);
      return next;
    });
  };

  const selectCategory = (id: string) => {
    sound.playClick();
    setActiveCategory(id);
    setRawQuery('');
    const first = FAQ_DATA.find(faq => id === ALL || faq.category === id);
    setOpenSet(new Set(first ? [first.question] : []));
    // Bring the list back into view on phones, where the topic bar sits above it.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('faq-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const allOpen = matches.length > 0 && matches.every(faq => openSet.has(faq.question));
  const toggleAll = () => {
    sound.playClick();
    setOpenSet(allOpen ? new Set() : new Set(matches.map(faq => faq.question)));
  };

  const askAI = (question?: string) => {
    sound.playClick();
    window.dispatchEvent(new CustomEvent('orion:open-chat', { detail: { question } }));
  };

  const activeLabel = activeCategory === ALL ? 'all topics' : metaFor(activeCategory).label;

  return (
    <section id="faq" className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto text-left">
        {/* Section Header */}
        <ScrollReveal direction="up" delay={50} duration={600} className="text-center max-w-2xl mx-auto mb-12 select-none">
          <div className="inline-flex items-center gap-2.5 px-4 py-1 bg-gradient-to-r from-transparent via-[#00BCF2]/10 to-transparent border-y border-[#00BCF2]/25 text-xs font-mono font-bold tracking-[0.18em] text-[#BAE6FD] uppercase mb-4 shadow-sm">
            <HelpCircle className="w-3.5 h-3.5 text-[#00BCF2]" />
            <span>KNOWLEDGE BASE • {FAQ_DATA.length} ANSWERS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white tracking-tight">
            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Questions</span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 mt-3 font-sans leading-relaxed">
            Everything about the ORION 1.0 national hackathon — eligibility, registration, the Round 1 PPT, Grand Finale fees, prizes, and your stay at SIST Chennai.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ── Sidebar: search, topics, quick facts, help ─────────────────── */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4 min-w-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute z-10 left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00BCF2] pointer-events-none" />
              <input
                type="search"
                value={rawQuery}
                onChange={event => setRawQuery(event.target.value)}
                placeholder="Search questions — fees, PPT, hostel…"
                aria-label="Search frequently asked questions"
                className="w-full bg-[#0B1220]/80 backdrop-blur-xl border border-white/10 focus:border-[#00BCF2]/70 outline-none pl-11 pr-10 py-3.5 text-sm text-white placeholder:text-slate-500 font-sans transition-colors [&::-webkit-search-cancel-button]:hidden"
              />
              {rawQuery && (
                <button
                  type="button"
                  onClick={() => setRawQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Topics: horizontal scroller on phones, vertical list on desktop */}
            <nav aria-label="FAQ topics" className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ul className="flex lg:flex-col gap-2 w-max lg:w-auto lg:bg-[#0B1220]/60 lg:backdrop-blur-xl lg:border lg:border-white/10 lg:p-2">
                {[{ id: ALL, label: 'All questions', icon: HelpCircle, count: FAQ_DATA.length }, ...categories].map(cat => {
                  const Icon = cat.icon;
                  const active = activeCategory === cat.id;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => selectCategory(cat.id)}
                        aria-pressed={active}
                        className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 lg:py-3 text-left text-xs sm:text-[13px] font-sans font-semibold whitespace-nowrap border lg:border-0 transition-all cursor-pointer ${
                          active
                            ? 'bg-[#00BCF2]/15 border-[#00BCF2]/60 text-white'
                            : 'bg-[#0B1220]/70 lg:bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`hidden lg:block absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#00BCF2] transition-transform duration-300 ${active ? 'scale-y-100' : 'scale-y-0'}`}
                        />
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#00BCF2]' : 'text-slate-500'}`} />
                        <span className="flex-1">{cat.label}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 tabular-nums ${
                            active ? 'bg-[#00BCF2] text-[#020617]' : 'bg-white/5 text-slate-500'
                          }`}
                        >
                          {cat.count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Quick facts (desktop sidebar; repeated after the list on phones) */}
            <QuickFacts className="hidden lg:block" />

            {/* Help */}
            <HelpCard className="hidden lg:block" onAsk={() => askAI()} />
          </aside>

          {/* ── Questions ────────────────────────────────────────────────── */}
          <div id="faq-list" className="lg:col-span-8 min-w-0 scroll-mt-24">
            <div className="flex items-center justify-between gap-3 mb-4 text-xs font-sans">
              <p className="text-slate-400" aria-live="polite">
                {query ? (
                  <>
                    <span className="text-white font-semibold">{matches.length}</span> result{matches.length === 1 ? '' : 's'} for “{rawQuery.trim()}” in {activeLabel}
                  </>
                ) : (
                  <>
                    <span className="text-white font-semibold">{matches.length}</span> questions in {activeLabel}
                  </>
                )}
              </p>
              {matches.length > 0 && !grouped && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="shrink-0 font-mono font-bold tracking-wider uppercase text-[#00BCF2] hover:text-white transition-colors cursor-pointer"
                >
                  {allOpen ? 'Collapse all' : 'Expand all'}
                </button>
              )}
            </div>

            {matches.length === 0 ? (
              <div className="border border-dashed border-[#00BCF2]/30 bg-[#0B1220]/60 p-8 text-center">
                <Search className="w-8 h-8 text-[#00BCF2]/60 mx-auto mb-3" />
                <p className="font-display font-bold text-white mb-1">No matching question</p>
                <p className="text-sm text-slate-400 mb-5">Try another word, or ask ORION AI directly — it knows the full rulebook.</p>
                <button
                  type="button"
                  onClick={() => askAI(rawQuery.trim())}
                  className="btn-glow-cyan inline-flex items-center gap-2 px-5 py-3 font-display font-bold text-xs tracking-wider text-[#020617] bg-gradient-to-r from-white via-[#BAE6FD] to-[#00BCF2] cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  ASK ORION AI
                </button>
              </div>
            ) : grouped ? (
              <div className="space-y-10">
                {categories.map(cat => {
                  const items = matches.filter(faq => faq.category === cat.id);
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#00BCF2]/10 border border-[#00BCF2]/30">
                          <Icon className="w-4 h-4 text-[#00BCF2]" />
                        </span>
                        <h3 className="font-display font-bold text-white text-base sm:text-lg tracking-tight">{cat.label}</h3>
                        <span className="flex-1 h-px bg-gradient-to-r from-[#00BCF2]/30 to-transparent" />
                      </div>
                      <div className="space-y-2.5">
                        {items.map((faq, i) => (
                          <FAQRow
                            key={faq.question}
                            faq={faq}
                            number={i + 1}
                            isOpen={openSet.has(faq.question)}
                            onToggle={() => toggle(faq.question)}
                            query=""
                            hidden={i >= PREVIEW_PER_TOPIC}
                            headingLevel="h4"
                          />
                        ))}
                      </div>
                      {items.length > PREVIEW_PER_TOPIC && (
                        <button
                          type="button"
                          onClick={() => selectCategory(cat.id)}
                          className="mt-3 inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#00BCF2] hover:text-white transition-colors group cursor-pointer"
                        >
                          See all {items.length} in {cat.label}
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2.5">
                {matches.map((faq, i) => (
                  <FAQRow
                    key={faq.question}
                    faq={faq}
                    number={i + 1}
                    isOpen={openSet.has(faq.question)}
                    onToggle={() => toggle(faq.question)}
                    query={query}
                    showCategory={activeCategory === ALL}
                  />
                ))}
              </div>
            )}

            {/* Phones: facts and help after the questions */}
            <div className="lg:hidden grid gap-4 mt-8">
              <QuickFacts />
              <HelpCard onAsk={() => askAI()} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function QuickFacts({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#0B1220]/60 backdrop-blur-xl border border-white/10 p-5 ${className}`}>
      <h3 className="text-[11px] font-mono font-bold tracking-[0.16em] uppercase text-[#BAE6FD] mb-3">ORION 1.0 at a glance</h3>
      <dl className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-2.5 text-xs font-sans">
        {QUICK_FACTS.map(fact => (
          <div key={fact.label} className="flex flex-col lg:flex-row lg:items-baseline lg:justify-between gap-0.5 lg:gap-3 lg:border-b lg:border-white/5 lg:pb-2 last:border-0 last:pb-0">
            <dt className="text-slate-500">{fact.label}</dt>
            <dd className="text-white font-semibold lg:text-right">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HelpCard({ className = '', onAsk }: { className?: string; onAsk: () => void }) {
  return (
    <div className={`relative overflow-hidden border border-[#00BCF2]/30 bg-gradient-to-br from-[#0078D4]/20 via-[#0B1220]/80 to-[#0B1220]/80 p-5 ${className}`}>
      <div aria-hidden="true" className="absolute -top-10 -right-10 w-32 h-32 bg-[#00BCF2]/20 blur-3xl pointer-events-none" />
      <p className="relative font-display font-bold text-white text-base mb-1">Still have a question?</p>
      <p className="relative text-xs text-slate-400 mb-4 leading-relaxed">ORION AI answers instantly from the official rulebook, or reach the organizing team directly.</p>
      <button
        type="button"
        onClick={onAsk}
        className="relative btn-glow-cyan w-full inline-flex items-center justify-center gap-2 px-4 py-3 font-display font-bold text-xs tracking-wider text-[#020617] bg-gradient-to-r from-white via-[#BAE6FD] to-[#00BCF2] cursor-pointer"
      >
        <Bot className="w-4 h-4" />
        ASK ORION AI
      </button>
      <div className="relative grid grid-cols-2 gap-2 mt-2">
        <a
          href="mailto:msclubsist@gmail.com"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-sans font-semibold text-[#BAE6FD] bg-[#071426]/80 border border-white/10 hover:border-[#00BCF2]/60 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" /> Email us
        </a>
        <a
          href="https://www.instagram.com/orion1.0_"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-sans font-semibold text-[#BAE6FD] bg-[#071426]/80 border border-white/10 hover:border-[#00BCF2]/60 transition-colors"
        >
          <InstagramIcon className="w-3.5 h-3.5" /> Instagram
        </a>
      </div>
    </div>
  );
}
