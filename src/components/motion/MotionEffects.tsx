'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll- and pointer-driven motion for the public home page.
 *
 * Everything here is progressive enhancement: sections are fully readable
 * without it, it is loaded after hydration (see PublicHome), and it does
 * nothing for visitors who ask for reduced motion. Pointer effects (tilt,
 * magnetic buttons, card spotlight) only run on devices with a real hover
 * pointer, so touch phones don't pay for them.
 *
 * Targets are opted in with data attributes rather than class names so the
 * markup reads clearly and styling classes can change freely:
 *   data-scroll-progress   fixed bar scaled with page progress
 *   data-hero              hero section (parallax trigger)
 *   data-hero-parallax     logo block that drifts back as the hero scrolls away
 *   data-timeline          timeline container
 *   data-timeline-line     vertical line drawn with scroll
 *   data-timeline-comet    glowing dot that rides the line
 *   data-tilt              card tilted toward the pointer
 *   data-magnetic          button wrapper pulled toward the pointer
 *   data-spotlight         card with a pointer-following glow (CSS in globals.css)
 */
export function MotionEffects() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        finePointer: '(hover: hover) and (pointer: fine)',
      },
      context => {
        const { motion, finePointer } = context.conditions as { motion: boolean; finePointer: boolean };
        if (!motion) return;

        const cleanups: Array<() => void> = [];

        // 1. Page progress bar.
        const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');
        if (progress) {
          gsap.fromTo(
            progress,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: 'none',
              scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
            }
          );
        }

        // 2. Hero logo recedes into the starfield as the hero scrolls out.
        const hero = document.querySelector<HTMLElement>('[data-hero]');
        const heroParallax = document.querySelector<HTMLElement>('[data-hero-parallax]');
        if (hero && heroParallax) {
          gsap.to(heroParallax, {
            yPercent: 28,
            scale: 0.82,
            opacity: 0.35,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
          });
        }

        // 3. Section headings wipe up into view.
        gsap.utils.toArray<HTMLElement>('main section:not([data-hero]) h2').forEach(heading => {
          gsap.from(heading, {
            clipPath: 'inset(0% 0% 100% 0%)',
            y: 36,
            duration: 1,
            ease: 'expo.out',
            clearProps: 'clipPath,transform',
            scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
          });
        });

        // 4. Timeline line draws itself; a comet marks how far you've read.
        const timeline = document.querySelector<HTMLElement>('[data-timeline]');
        const line = document.querySelector<HTMLElement>('[data-timeline-line]');
        const comet = document.querySelector<HTMLElement>('[data-timeline-comet]');
        if (timeline && line) {
          const scrub = { trigger: timeline, start: 'top 65%', end: 'bottom 65%', scrub: 0.4 };
          gsap.fromTo(line, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: scrub });
          if (comet) {
            gsap.fromTo(comet, { top: '0%', opacity: 0 }, { top: '100%', opacity: 1, ease: 'none', scrollTrigger: scrub });
          }
        }

        // 5. Ribbon leans with scroll velocity (the ribbon's own drift is CSS).
        const ribbon = document.querySelector<HTMLElement>('[data-velocity-skew]');
        if (ribbon) {
          const setSkew = gsap.quickTo(ribbon, 'skewX', { duration: 0.5, ease: 'power3.out' });
          const trigger = ScrollTrigger.create({
            onUpdate: self => setSkew(gsap.utils.clamp(-8, 8, self.getVelocity() / -300)),
            onToggle: () => setSkew(0),
          });
          const settle = () => setSkew(0);
          ScrollTrigger.addEventListener('scrollEnd', settle);
          cleanups.push(() => {
            trigger.kill();
            ScrollTrigger.removeEventListener('scrollEnd', settle);
          });
        }

        if (!finePointer) {
          return () => cleanups.forEach(fn => fn());
        }

        // 6. Pointer-following glow on cards (painted by CSS from --mx/--my).
        const onPointerMove = (event: PointerEvent) => {
          const card = (event.target as Element | null)?.closest<HTMLElement>('[data-spotlight]');
          if (!card) return;
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
          card.style.setProperty('--my', `${event.clientY - rect.top}px`);
        };
        document.addEventListener('pointermove', onPointerMove, { passive: true });
        cleanups.push(() => document.removeEventListener('pointermove', onPointerMove));

        // 7. 3D tilt toward the pointer.
        gsap.utils.toArray<HTMLElement>('[data-tilt]').forEach(card => {
          gsap.set(card, { transformPerspective: 900, transformStyle: 'preserve-3d' });
          const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
          const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
          const move = (event: PointerEvent) => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width - 0.5;
            const py = (event.clientY - rect.top) / rect.height - 0.5;
            rotateY(px * 10);
            rotateX(py * -10);
          };
          const leave = () => {
            rotateX(0);
            rotateY(0);
          };
          card.addEventListener('pointermove', move);
          card.addEventListener('pointerleave', leave);
          cleanups.push(() => {
            card.removeEventListener('pointermove', move);
            card.removeEventListener('pointerleave', leave);
          });
        });

        // 8. Magnetic call-to-action buttons.
        gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach(wrapper => {
          const x = gsap.quickTo(wrapper, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.45)' });
          const y = gsap.quickTo(wrapper, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.45)' });
          const strength = Number(wrapper.dataset.magnetic) || 0.3;
          const move = (event: PointerEvent) => {
            const rect = wrapper.getBoundingClientRect();
            x((event.clientX - (rect.left + rect.width / 2)) * strength);
            y((event.clientY - (rect.top + rect.height / 2)) * strength);
          };
          const leave = () => {
            x(0);
            y(0);
          };
          wrapper.addEventListener('pointermove', move);
          wrapper.addEventListener('pointerleave', leave);
          cleanups.push(() => {
            wrapper.removeEventListener('pointermove', move);
            wrapper.removeEventListener('pointerleave', leave);
          });
        });

        return () => cleanups.forEach(fn => fn());
      }
    );

    // Lazy 3D scenes and accordions change the page height after load.
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
    };
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(document.body);
    window.addEventListener('load', refresh);

    return () => {
      clearTimeout(refreshTimer);
      resizeObserver.disconnect();
      window.removeEventListener('load', refresh);
      mm.revert();
    };
  }, []);

  return null;
}
