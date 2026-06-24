import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STEP_DISTANCE_PX = 400;
const TEXT_DURATION_S = 0.4;
const TEXT_Y_PX = 20;
const CARD_DURATION_S = 0.6;
const CARD_Y_PX = 200;
const CARD_X_PX = -80;
const CARD_ROT_DEG = -15;
const CARD_SCALE = 0.8;
const SLIDE_X_PX = 120;
const SLIDE_X_DURATION_S = 0.8;

type RevealKind = 'text' | 'card' | 'slide-x';
type Entry = { el: HTMLElement; kind: RevealKind };

function getKind(el: HTMLElement): RevealKind {
  if (el.dataset.reveal === 'slide-x') return 'slide-x';
  if (el.classList.contains('member-card') || el.dataset.reveal === 'card') return 'card';
  return 'text';
}

function setInitialState(el: HTMLElement, kind: RevealKind) {
  if (kind === 'card') {
    gsap.set(el, {
      opacity: 0,
      y: CARD_Y_PX,
      x: CARD_X_PX,
      rotation: CARD_ROT_DEG,
      scale: CARD_SCALE,
    });
  } else if (kind === 'slide-x') {
    gsap.set(el, {
      opacity: 0,
      x: SLIDE_X_PX,
      y: 0,
      rotation: 0,
      scale: 1,
    });
  } else {
    gsap.set(el, {
      opacity: 0,
      y: TEXT_Y_PX,
      x: 0,
      rotation: 0,
      scale: 1,
    });
  }
}

function setVisibleState(el: HTMLElement) {
  gsap.set(el, {
    opacity: 1,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
  });
}

function playReveal(el: HTMLElement, kind: RevealKind) {
  if (kind === 'card') {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: CARD_DURATION_S,
      ease: 'back.out(2.2)',
      overwrite: true,
    });
  } else if (kind === 'slide-x') {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: SLIDE_X_DURATION_S,
      ease: 'power3.out',
      overwrite: true,
    });
  } else {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: TEXT_DURATION_S,
      ease: 'power2.out',
      overwrite: true,
    });
  }
}

function showAllWithoutMotion() {
  const all = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-late]'));
  all.forEach(setVisibleState);
}

function setup() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;

  if (reduceMotion || !isDesktop) {
    showAllWithoutMotion();
    return;
  }

  const stepSections = Array.from(document.querySelectorAll<HTMLElement>('[data-step-section]'));
  const pinnedReveals = new Set<HTMLElement>();
  const devflowSection = document.querySelector<HTMLElement>('.devflow');

  stepSections
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
    .forEach((section, sectionIndex) => {
      const revealEls = Array.from(section.querySelectorAll<HTMLElement>('[data-reveal]'));
      if (!revealEls.length) return;

      const entries: Entry[] = revealEls.map((el) => {
        const kind = getKind(el);
        pinnedReveals.add(el);
        return { el, kind };
      });

      entries.forEach(({ el, kind }) => setInitialState(el, kind));

      const total = entries.length;
      const sectionStep = Number(section.dataset.stepDistance) || STEP_DISTANCE_PX;
      const pinLength = (total + 1) * sectionStep;
      const thresholds = entries.map((_, i) => (i + 1) / (total + 1));
      const shown = entries.map(() => false);

      const isAfterDevflow = devflowSection
        ? Boolean(devflowSection.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING)
        : false;

      const refreshPriority = isAfterDevflow
        ? 60 - sectionIndex * 10
        : 200 - sectionIndex * 30;

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${pinLength}`,
        pin: true,
        pinSpacing: true,
        scrub: true,
        invalidateOnRefresh: true,
        refreshPriority,
        onUpdate: (self) => {
          const p = self.progress;

          entries.forEach(({ el, kind }, i) => {
            if (!shown[i] && p >= thresholds[i]) {
              shown[i] = true;
              playReveal(el, kind);
            } else if (shown[i] && p < thresholds[i] - 0.01) {
              shown[i] = false;
              setInitialState(el, kind);
            }
          });
        },
      });
    });

  const allReveal = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

  const ioTargets = allReveal.filter(
    (el) =>
      !pinnedReveals.has(el) &&
      !el.closest('.techstack') &&
      !el.closest('[data-techstack-overlay]')
  );

  if (ioTargets.length) {
    ioTargets.forEach((el) => setInitialState(el, getKind(el)));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            playReveal(el, getKind(el));
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
    );

    ioTargets.forEach((el) => io.observe(el));
  }

  const lateTargets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-late]'));

  if (lateTargets.length) {
    lateTargets.forEach((el) => setInitialState(el, getKind(el)));

    const ioLate = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            playReveal(el, getKind(el));
            ioLate.unobserve(el);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30% 0px' }
    );

    lateTargets.forEach((el) => ioLate.observe(el));
  }

  ScrollTrigger.refresh();
}

if (document.readyState === 'complete') setup();
else window.addEventListener('load', setup, { once: true });
