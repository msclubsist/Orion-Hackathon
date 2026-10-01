import Image from 'next/image';
import type { Metadata } from 'next';
import {
  Terminal,
  Cpu,
  Globe,
  Shield,
  Mail,
  MapPin,
  ExternalLink,
  Code2,
  Users,
  BookOpen,
  Laptop,
  ArrowRight,
} from 'lucide-react';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Microsoft Club SIST | Sathyabama Institute of Science and Technology',
  description:
    'Official website of Microsoft Club SIST at Sathyabama Institute of Science and Technology, Chennai. Empowering student developers, researchers, and innovators in Cloud, AI, and Software Engineering.',
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: 'Microsoft Club SIST',
    description:
      'Official student technical community of Sathyabama Institute of Science and Technology, Chennai. Fostering excellence in AI, Cloud, and Software Engineering.',
    url: `${SITE_URL}/`,
    siteName: 'Microsoft Club SIST',
    images: [
      {
        url: '/club-logo.png',
        width: 432,
        height: 432,
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
    title: 'Workshops & Hands-on Labs',
    description:
      'Practical technical sessions covering Cloud Computing, AI/ML, Full Stack Web, and DevOps with industry-grade tools.',
  },
  {
    icon: Code2,
    title: 'Open Source & Projects',
    description:
      'Building collaborative student software, developer tools, and real-world systems to solve campus and community challenges.',
  },
  {
    icon: BookOpen,
    title: 'Certification & Skill Tracks',
    description:
      'Structured learning pathways for Microsoft Learn certifications, cloud fundamentals, and modern developer technologies.',
  },
  {
    icon: Users,
    title: 'Community & Mentorship',
    description:
      'Peer-to-peer knowledge sharing, alumni guidance, technical discussion groups, and career development support.',
  },
];

const DOMAINS = [
  {
    icon: Cpu,
    title: 'Artificial Intelligence & ML',
    desc: 'Deep learning models, natural language processing, computer vision, and generative AI systems.',
    tag: 'AI & Data',
  },
  {
    icon: Globe,
    title: 'Cloud & Azure Architecture',
    desc: 'Scalable cloud infrastructure, serverless deployments, microservices, and modern DevOps pipelines.',
    tag: 'Cloud-Native',
  },
  {
    icon: Laptop,
    title: 'Full Stack & Mobile Systems',
    desc: 'High-performance web applications, responsive user interfaces, and robust backend services.',
    tag: 'Engineering',
  },
  {
    icon: Shield,
    title: 'Cybersecurity & Systems',
    desc: 'Application security standards, secure coding practices, protocol analysis, and systems engineering.',
    tag: 'Security',
  },
];

const STATS = [
  { value: '1,000+', label: 'Active Members' },
  { value: '25+', label: 'Technical Sessions' },
  { value: '4', label: 'Core Domains' },
  { value: '100%', label: 'Student-Driven' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Ambience */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[520px] w-[850px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,188,242,0.16)_0%,rgba(7,20,38,0.35)_50%,transparent_75%)] blur-2xl" />
        <div className="absolute top-1/3 -left-32 h-[400px] w-[450px] bg-[radial-gradient(circle,rgba(0,120,212,0.1)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-10 -right-32 h-[400px] w-[450px] bg-[radial-gradient(circle,rgba(56,189,248,0.08)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071426]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#" className="group flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden border border-cyan-400/30 bg-[#0B1E3B]/80 p-1 shadow-[0_0_15px_rgba(0,188,242,0.2)] transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/club-logo.png"
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
          </a>

          <nav className="hidden items-center gap-7 text-xs font-semibold tracking-wider text-slate-300 md:flex">
            <a href="#about" className="hover:text-cyan-300 transition-colors uppercase">
              About
            </a>
            <a href="#pillars" className="hover:text-cyan-300 transition-colors uppercase">
              Pillars
            </a>
            <a href="#domains" className="hover:text-cyan-300 transition-colors uppercase">
              Domains
            </a>
            <a href="#contact" className="hover:text-cyan-300 transition-colors uppercase">
              Contact
            </a>
          </nav>

          <a
            href="#contact"
            className="flex items-center gap-1.5 border border-cyan-400/50 bg-[#0B2545] px-3.5 py-2 text-xs font-bold text-cyan-200 transition-all hover:border-cyan-300 hover:bg-[#103366] hover:text-white shadow-sm"
          >
            <span>Join Community</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* Official Logo Display */}
          <div className="mx-auto mb-6 flex flex-col items-center">
            <div className="relative mb-5 flex h-28 w-28 items-center justify-center border border-cyan-400/40 bg-gradient-to-b from-[#0B2545] to-[#040E24] p-2.5 shadow-[0_0_35px_rgba(0,188,242,0.25)] sm:h-32 sm:w-32">
              <Image
                src="/club-logo.png"
                alt="Microsoft Club SIST"
                width={128}
                height={128}
                priority
                className="h-full w-full object-contain filter drop-shadow-[0_0_10px_rgba(0,188,242,0.4)]"
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
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
            Microsoft Club <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">SIST</span>
          </h1>

          <p className="mt-3 font-mono text-sm uppercase tracking-[0.2em] text-cyan-300/90 sm:text-base">
            Ignite the Genesis of Innovation
          </p>

          <p className="mx-auto mt-5 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm sm:leading-6">
            The official student technical community of Sathyabama Institute of Science and Technology. Fostering engineering curiosity, cloud technologies, and technical innovation through student-led learning and collaboration.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#about"
              className="flex items-center gap-2 border border-cyan-400/80 bg-gradient-to-r from-[#0078D4] to-[#00BCF2] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_25px_rgba(0,188,242,0.35)] transition-all hover:brightness-110"
            >
              <span>Explore Club</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>

            <a
              href="#contact"
              className="flex items-center gap-2 border border-white/20 bg-slate-900/60 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-200 backdrop-blur-md transition-all hover:border-cyan-400/50 hover:bg-slate-800/80 hover:text-white"
            >
              <span>Contact Us</span>
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-4 border border-white/10 bg-[#071426]/60 p-5 sm:grid-cols-4">
            {STATS.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="font-display text-2xl font-bold text-white sm:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section id="pillars" className="px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              OUR PILLARS
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              What We Do
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-xs text-slate-400">
              Structured initiatives designed to support student developers at every stage of their journey.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="group border border-white/10 bg-[#071426]/50 p-5 transition-all duration-300 hover:border-cyan-400/40 hover:bg-[#0B1E3B]/60"
                >
                  <div className="mb-3.5 inline-flex h-10 w-10 items-center justify-center border border-cyan-400/30 bg-[#07193D] text-cyan-300 transition-colors group-hover:border-cyan-400 group-hover:bg-cyan-500/20">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Domains Section */}
      <section id="domains" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              SPECIALIZATIONS
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Technical Domains
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DOMAINS.map((domain, idx) => {
              const Icon = domain.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col justify-between border border-white/10 bg-[#071426]/40 p-4 hover:border-cyan-400/30 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                        {domain.tag}
                      </span>
                      <Icon className="h-4 w-4 text-cyan-300/70" />
                    </div>
                    <h3 className="mt-3 font-display text-xs font-bold text-white">
                      {domain.title}
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                      {domain.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl border border-white/10 bg-[#071426]/60 p-6 sm:p-8">
          <div className="space-y-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              ABOUT THE CLUB
            </span>
            <h2 className="font-display text-2xl font-bold text-white">
              Sathyabama Microsoft Student Community
            </h2>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Microsoft Club SIST operates under the School of Computing at Sathyabama Institute of Science and Technology, Chennai. Our mission is to create a dynamic ecosystem where students learn cutting-edge technology, build impactful projects, and gain exposure to industry standards and Microsoft developer ecosystems.
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Through collaborative initiatives, mentorship, and continuous hands-on learning, the club prepares passionate students to grow into confident developers, system architects, and tech innovators.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-4xl border border-white/10 bg-[#071426]/80 p-6 sm:p-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                GET IN TOUCH
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                Connect With Us
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Interested in joining Microsoft Club SIST, collaborating on tech sessions, or learning more about our initiatives? Reach out to us.
              </p>

              <div className="mt-5 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-cyan-300 shrink-0" />
                  <a
                    href="mailto:msclubsist@gmail.com"
                    className="hover:text-cyan-300 transition-colors"
                  >
                    msclubsist@gmail.com
                  </a>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-cyan-300 shrink-0 mt-0.5" />
                  <span>
                    School of Computing, Sathyabama Institute of Science and Technology,
                    Jeppiaar Nagar, Chennai, Tamil Nadu 600119
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
              <a
                href="mailto:msclubsist@gmail.com"
                className="flex items-center justify-between border border-cyan-400/40 bg-[#0B2545]/60 p-3.5 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-400 hover:bg-[#0B2545]"
              >
                <span>Email Us directly</span>
                <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
              </a>

              <a
                href="https://www.instagram.com/msclubsist"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border border-white/15 bg-slate-900/60 p-3.5 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-white"
              >
                <span>Follow on Instagram (@msclubsist)</span>
                <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#020617] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="relative flex h-7 w-7 items-center justify-center border border-cyan-400/30 bg-[#0B1E3B] p-0.5">
              <Image
                src="/club-logo.png"
                alt="Microsoft Club SIST"
                width={28}
                height={28}
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

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <a href="#about" className="hover:text-cyan-300 transition-colors">
              About
            </a>
            <a href="#pillars" className="hover:text-cyan-300 transition-colors">
              Pillars
            </a>
            <a href="#domains" className="hover:text-cyan-300 transition-colors">
              Domains
            </a>
            <a href="#contact" className="hover:text-cyan-300 transition-colors">
              Contact
            </a>
          </div>

          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Microsoft Club SIST. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
