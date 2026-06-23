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

type Entry = { el: HTMLElement; isCard: boolean };

function isCardEl(el: HTMLElement): boolean {
  return el.classList.contains('member-card') || el.dataset.reveal === 'card';
}

function setInitialState(el: HTMLElement, isCard: boolean) {
  if (isCard) {
    gsap.set(el, {
      opacity: 0,
      y: CARD_Y_PX,
      x: CARD_X_PX,
      rotation: CARD_ROT_DEG,
      scale: CARD_SCALE,
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

function playReveal(el: HTMLElement, isCard: boolean) {
  if (isCard) {
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
        const isCard = isCardEl(el);
        pinnedReveals.add(el);
        return { el, isCard };
      });

      entries.forEach(({ el, isCard }) => setInitialState(el, isCard));

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

          entries.forEach(({ el, isCard }, i) => {
            if (!shown[i] && p >= thresholds[i]) {
              shown[i] = true;
              playReveal(el, isCard);
            } else if (shown[i] && p < thresholds[i] - 0.01) {
              shown[i] = false;
              setInitialState(el, isCard);
            }
          });
        },
      });
    });

  const allReveal = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

  const ioTargets = allReveal.filter(
    (el) =>
      !pinnedReveals.has(el) &&
      !el.closest('.works__scroller') &&
      !el.closest('.works__intro') &&
      !el.closest('.devflow') &&
      !el.closest('.techstack') &&
      !el.closest('[data-techstack-overlay]')
  );

  if (ioTargets.length) {
    ioTargets.forEach((el) => setInitialState(el, isCardEl(el)));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            playReveal(el, isCardEl(el));
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
    lateTargets.forEach((el) => setInitialState(el, isCardEl(el)));

    const ioLate = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            playReveal(el, isCardEl(el));
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
