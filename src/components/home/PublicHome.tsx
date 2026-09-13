'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/common/Navbar';
import { ClickSpark } from '@/components/common/ClickSpark';
import { HeroSection } from '@/components/sections/HeroSection';
import { ChallengeArena } from '@/components/sections/ChallengeArena';
import { PrizeSection } from '@/components/sections/PrizeSection';
import { GuidelinesSection } from '@/components/sections/GuidelinesSection';
import { ImportantRulesSection } from '@/components/sections/ImportantRulesSection';
import { TimelineSection } from '@/components/sections/TimelineSection';
import { VenuePerksSection } from '@/components/sections/VenuePerksSection';
import { OrganizersSection } from '@/components/sections/OrganizersSection';
import { FAQSection } from '@/components/sections/FAQSection';
import { Footer } from '@/components/sections/Footer';
import { OrionChatbot } from '@/components/chatbot/OrionChatbot';
import { ChallengeModal } from '@/components/modals/ChallengeModal';
import { TrackMarquee } from '@/components/motion/TrackMarquee';
import { INITIAL_REGISTERED_TEAMS } from '@/data/orionData';
import type { ProblemStatement, RegisteredTeam } from '@/types/orion';

// GSAP and its listeners load after hydration; the page is complete without them.
const MotionEffects = dynamic(
  () => import('@/components/motion/MotionEffects').then(mod => mod.MotionEffects),
  { ssr: false }
);

const SpaceBackground = dynamic(
  () => import('@/components/3d/SpaceBackground').then(mod => mod.SpaceBackground),
  { ssr: false }
);

// These chunks are absent from the current public page when registration is
// disabled, but remain ready for the next deployment that enables the flag.
const RegisterModal = dynamic(
  () => import('@/components/modals/RegisterModal').then(mod => mod.RegisterModal)
);
const TeamStatusModal = dynamic(
  () => import('@/components/modals/TeamStatusModal').then(mod => mod.TeamStatusModal)
);

interface PublicHomeProps {
  registrationEnabled: boolean;
}

export function PublicHome({ registrationEnabled }: PublicHomeProps) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<ProblemStatement | null>(null);
  const [teams, setTeams] = useState<RegisteredTeam[]>(INITIAL_REGISTERED_TEAMS);
  const [registeredCount, setRegisteredCount] = useState(0);

  useEffect(() => {
    if (!registrationEnabled) return;

    fetch('/api/registrations/count')
      .then(res => res.json())
      .then(data => {
        if (typeof data.registeredTeams === 'number') setRegisteredCount(data.registeredTeams);
      })
      .catch(() => {});
  }, [registrationEnabled]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);

    const handleBeforeUnload = () => window.scrollTo(0, 0);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const openStatus = registrationEnabled ? () => setIsStatusOpen(true) : undefined;

  return (
    <ClickSpark sparkColor="#00BCF2" sparkSize={14} sparkRadius={26} sparkCount={10} duration={420}>
      <div className="relative min-h-screen bg-[#020617] text-slate-100 selection:bg-[#00BCF2]/30 selection:text-[#BAE6FD]">
        <div data-scroll-progress className="scroll-progress" aria-hidden="true" />
        <SpaceBackground />
        <MotionEffects />
        <Navbar registrationEnabled={registrationEnabled} onOpenStatus={openStatus} />

        <main className="relative z-10 flex flex-col">
          <HeroSection
            onOpenStatus={openStatus}
            onExplorePrizes={() => document.getElementById('prizes')?.scrollIntoView({ behavior: 'smooth' })}
          />
          <TrackMarquee />
          <ChallengeArena onOpenProblemModal={setSelectedProblem} />
          <PrizeSection />
          <GuidelinesSection />
          <ImportantRulesSection />
          <TimelineSection />
          <OrganizersSection />
          <FAQSection />
          <VenuePerksSection />
        </main>

        <Footer onOpenStatus={openStatus} />

        {registrationEnabled && (
          <>
            <RegisterModal
              isOpen={isRegisterOpen}
              onClose={() => setIsRegisterOpen(false)}
              onSuccessRegister={newTeam => {
                setTeams(previous => [newTeam, ...previous]);
                setRegisteredCount(previous => previous + 1);
              }}
              totalTeamsCount={registeredCount}
            />
            <TeamStatusModal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} teams={teams} />
          </>
        )}

        <ChallengeModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
        />
        <OrionChatbot />
      </div>
    </ClickSpark>
  );
}
