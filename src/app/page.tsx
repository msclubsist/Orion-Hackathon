import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Rocket,
  ArrowRight,
  Terminal,
  Cpu,
  Globe,
  Shield,
  Mail,
  MapPin,
  ExternalLink,
  Code2,
  Sparkles,
  Users,
  Award,
} from 'lucide-react';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Microsoft Club SIST | Sathyabama Institute of Science and Technology',
  description:
    'Official website of Microsoft Club SIST at Sathyabama Institute of Science and Technology, Chennai. Empowering student developers, researchers, and innovators.',
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: 'Microsoft Club SIST',
    description:
      'Official student technical community of Sathyabama Institute of Science and Technology, Chennai. Fostering innovation in AI, Cloud, and Software.',
    url: `${SITE_URL}/`,
    siteName: 'Microsoft Club SIST',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Microsoft Club SIST Logo',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
};

const PILLARS = [
  {
    icon: Terminal,
    title: 'Workshops & Bootcamps',
    description:
      'Hands-on technical masterclasses in Cloud, AI, Web Development, and DevOps powered by industry-standard tooling.',
  },
  {
    icon: Rocket,
    title: 'National Hackathons',
    description:
      'High-impact engineering sprints and challenges like ORION 1.0, connecting elite builders across universities.',
  },
  {
    icon: Code2,
    title: 'Open Source & Projects',
    description:
      'Building open-source tools, collaborative repositories, and production-grade applications built by students.',
  },
  {
    icon: Users,
    title: 'Mentorship & Network',
    description:
      'Peer-to-peer knowledge sharing, guidance from alumni and industry professionals, and career growth sessions.',
  },
];

const DOMAINS = [
  {
    title: 'Artificial Intelligence & ML',
    desc: 'Deep learning, LLMs, computer vision, and autonomous agent workflows.',
    tag: 'GenAI & Data',
  },
  {
    title: 'Cloud & Azure Architecture',
    desc: 'Serverless architecture, container orchestration, microservices, and DevOps.',
    tag: 'Cloud-Native',
  },
  {
    title: 'Full Stack & Mobile Systems',
    desc: 'Modern web platforms, progressive web apps, resilient backend APIs.',
    tag: 'Engineering',
  },
  {
    title: 'Cybersecurity & Infrastructure',
    desc: 'Application security, network protocols, defensive engineering, and compliance.',
    tag: 'Security',
  },
];

const STATS = [
  { value: '1,000+', label: 'Student Innovators' },
  { value: '15+', label: 'Events & Bootcamps' },
  { value: '₹1 Lakh', label: 'Hackathon Prize Pool' },
  { value: 'Top 70', label: 'Teams in Finale' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Ambience */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,188,242,0.18)_0%,rgba(7,20,38,0.4)_50%,transparent_75%)] blur-2xl" />
        <div className="absolute top-1/3 -left-32 h-[450px] w-[500px] bg-[radial-gradient(circle,rgba(0,120,212,0.12)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-10 -right-32 h-[450px] w-[500px] bg-[radial-gradient(circle,rgba(56,189,248,0.1)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071426]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden border border-cyan-400/30 bg-[#0B1E3B]/70 p-1 shadow-[0_0_15px_rgba(0,188,242,0.25)] transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Microsoft Club SIST Logo"
                width={40}
                height={40}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  Microsoft Club
                </span>
                <span className="border border-cyan-400/40 bg-cyan-500/10 px-1.5 py-0.2 text-[10px] font-bold text-cyan-300">
                  SIST
                </span>
              </div>
              <p className="text-[10px] text-slate-400">School of Computing</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-xs font-semibold tracking-wider text-slate-300 md:flex">
            <a href="#about" className="hover:text-cyan-300 transition-colors uppercase">
              About
            </a>
            <a href="#domains" className="hover:text-cyan-300 transition-colors uppercase">
              Domains
            </a>
            <a href="#featured" className="hover:text-cyan-300 transition-colors uppercase">
              Events
            </a>
            <a href="#contact" className="hover:text-cyan-300 transition-colors uppercase">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/orion"
              className="group flex items-center gap-2 border border-cyan-400/60 bg-gradient-to-r from-[#0078D4] to-[#00BCF2] px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(0,188,242,0.35)] transition-all hover:brightness-110 hover:shadow-[0_0_25px_rgba(0,188,242,0.55)]"
            >
              <span>ORION 1.0</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo Badge & Institution Tag */}
          <div className="mx-auto mb-8 flex flex-col items-center">
            <div className="relative mb-6 flex h-28 w-28 items-center justify-center border border-cyan-400/40 bg-gradient-to-b from-[#0B2545] to-[#040E24] p-3 shadow-[0_0_40px_rgba(0,188,242,0.3)] sm:h-32 sm:w-32">
              <Image
                src="/logo.png"
                alt="Microsoft Club SIST"
                width={128}
                height={128}
                priority
                className="h-full w-full object-contain filter drop-shadow-[0_0_12px_rgba(0,188,242,0.5)]"
              />
            </div>

            {/* Microsoft 4-Color Energy Bar */}
            <div className="mb-4 flex items-center gap-1.5" title="Microsoft Technical Community">
              <span className="h-2 w-2 bg-[#F25022]" />
              <span className="h-2 w-2 bg-[#7FBA00]" />
              <span className="h-2 w-2 bg-[#00A4EF]" />
              <span className="h-2 w-2 bg-[#FFB900]" />
            </div>

            <div className="inline-flex items-center gap-2 border border-cyan-300/30 bg-[#07193D]/80 px-3 py-1 text-[11px] font-medium tracking-wide text-cyan-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              SATHYABAMA INSTITUTE OF SCIENCE AND TECHNOLOGY · CHENNAI
            </div>
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
            Microsoft Club <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">SIST</span>
          </h1>

          <p className="mt-4 font-mono text-sm uppercase tracking-[0.22em] text-cyan-300/90 sm:text-base">
            Ignite the Genesis of Innovation
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base sm:leading-7">
            The premier student technical community at Sathyabama Institute of Science and Technology. We empower passionate technologists through intensive workshops, real-world engineering sprints, and national hackathons.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/orion"
              className="flex items-center gap-2.5 border border-cyan-400/80 bg-gradient-to-r from-[#0078D4] via-[#0091FF] to-[#00BCF2] px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_30px_rgba(0,188,242,0.4)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Rocket className="h-4 w-4" />
              <span>Explore ORION 1.0 Hackathon</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#about"
              className="flex items-center gap-2 border border-white/20 bg-slate-900/60 px-6 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-md transition-all hover:border-cyan-400/50 hover:bg-slate-800/80 hover:text-white"
            >
              <span>Learn About Club</span>
            </a>
          </div>
        </div>
      </section>

      {/* Featured Spotlight: ORION 1.0 */}
      <section id="featured" className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden border border-cyan-400/40 bg-gradient-to-br from-[#0B1E3B]/90 via-[#071426]/90 to-[#020617] p-6 shadow-[0_0_50px_rgba(0,188,242,0.18)] sm:p-10">
            <div className="absolute top-0 right-0 h-48 w-48 bg-[radial-gradient(circle,rgba(0,188,242,0.25)_0%,transparent_70%)] blur-2xl pointer-events-none" />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                  <Sparkles className="h-3 w-3" />
                  FLAGSHIP NATIONAL EVENT
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  ORION 1.0 — 24-Hour National Hackathon
                </h2>
                <p className="max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                  A nationwide collegiate engineering sprint bringing the Top 70 teams to SIST Chennai for an offline 24-hour sprint. Featuring tracks in Artificial Intelligence, Web3 & FinTech, Climate Tech, and Open Innovation with a ₹1,00,000 cash grant prize pool.
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="border border-white/10 bg-slate-900/60 px-2.5 py-1 text-[11px] font-mono text-cyan-200">
                    ₹1,00,000 Prize Pool
                  </span>
                  <span className="border border-white/10 bg-slate-900/60 px-2.5 py-1 text-[11px] font-mono text-cyan-200">
                    4 Technical Tracks
                  </span>
                  <span className="border border-white/10 bg-slate-900/60 px-2.5 py-1 text-[11px] font-mono text-cyan-200">
                    Top 70 Finalists
                  </span>
                  <span className="border border-white/10 bg-slate-900/60 px-2.5 py-1 text-[11px] font-mono text-cyan-200">
                    SIST Chennai
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href="/orion"
                  className="inline-flex w-full items-center justify-center gap-2.5 border border-cyan-300 bg-cyan-400 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#020617] shadow-[0_0_25px_rgba(0,188,242,0.4)] transition-all hover:bg-cyan-300 hover:shadow-[0_0_35px_rgba(0,188,242,0.6)] sm:w-auto"
                >
                  <span>Visit ORION Website</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-4 border border-white/10 bg-[#071426]/60 p-6 sm:grid-cols-4">
            {STATS.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="font-display text-2xl font-bold text-white sm:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About & Pillars */}
      <section id="about" className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              CORE MISSION
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
              What We Do at Microsoft Club
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-xs text-slate-400 sm:text-sm">
              We bridge the gap between classroom theory and production engineering through structured programs and community initiatives.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="group border border-white/10 bg-[#071426]/50 p-6 transition-all duration-300 hover:border-cyan-400/40 hover:bg-[#0B1E3B]/60"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center border border-cyan-400/30 bg-[#07193D] text-cyan-300 transition-colors group-hover:border-cyan-400 group-hover:bg-cyan-500/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Focus Domains */}
      <section id="domains" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              TECHNICAL SPECIALIZATIONS
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
              Explore Our Domains
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DOMAINS.map((domain, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between border border-white/10 bg-[#071426]/40 p-5 hover:border-cyan-400/30 transition-colors"
              >
                <div>
                  <span className="inline-block border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                    {domain.tag}
                  </span>
                  <h3 className="mt-3 font-display text-sm font-bold text-white">
                    {domain.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {domain.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Connect */}
      <section id="contact" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="border border-white/10 bg-[#071426]/80 p-8 sm:p-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
              <div>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  CONNECT WITH US
                </span>
                <h2 className="mt-2 font-display text-3xl font-bold text-white">
                  Get in Touch
                </h2>
                <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  Whether you are a student eager to join, an organization looking to partner, or an enthusiast wanting to collaborate on events — reach out to our team.
                </p>

                <div className="mt-6 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-cyan-300 shrink-0" />
                    <a
                      href="mailto:msclubsist@gmail.com"
                      className="hover:text-cyan-300 transition-colors"
                    >
                      msclubsist@gmail.com
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-cyan-300 shrink-0 mt-0.5" />
                    <span>
                      Sathyabama Institute of Science and Technology, Jeppiaar Nagar,
                      Rajiv Gandhi Salai, Chennai, Tamil Nadu 600119
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8">
                <a
                  href="mailto:msclubsist@gmail.com"
                  className="flex items-center justify-between border border-cyan-400/40 bg-[#0B2545]/60 p-4 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-400 hover:bg-[#0B2545]"
                >
                  <span>Send an Email</span>
                  <ExternalLink className="h-4 w-4 text-cyan-400" />
                </a>

                <Link
                  href="/orion"
                  className="flex items-center justify-between border border-white/15 bg-slate-900/60 p-4 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-white"
                >
                  <span>ORION 1.0 Hackathon Hub</span>
                  <ArrowRight className="h-4 w-4 text-cyan-400" />
                </Link>

                <a
                  href="https://www.instagram.com/orion1.0_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between border border-white/15 bg-slate-900/60 p-4 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-white"
                >
                  <span>Instagram Updates (@orion1.0_)</span>
                  <ExternalLink className="h-4 w-4 text-cyan-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#020617] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center border border-cyan-400/30 bg-[#0B1E3B] p-0.5">
              <Image
                src="/logo.png"
                alt="Microsoft Club SIST"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-white">
                Microsoft Club SIST
              </p>
              <p className="text-[10px] text-slate-400">
                Sathyabama Institute of Science and Technology
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
            <Link href="/orion" className="hover:text-cyan-300 transition-colors">
              ORION 1.0
            </Link>
            <Link href="/portal" className="hover:text-cyan-300 transition-colors">
              Team Portal
            </Link>
            <Link href="/rules" className="hover:text-cyan-300 transition-colors">
              Guidelines
            </Link>
            <Link href="/terms" className="hover:text-cyan-300 transition-colors">
              Terms & Conditions
            </Link>
          </div>

          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Microsoft Club SIST. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
