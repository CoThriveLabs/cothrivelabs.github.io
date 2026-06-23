import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ENTER_PX = 400;
const REVEAL_PX = 400;
const getExtraPx = () => 0.15 * window.innerHeight;

function setup() {
  const mm = gsap.matchMedia();

  mm.add(
    { isDesktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)' },
    (ctx) => {
      if (!ctx.conditions?.isDesktop) return;

      let worksBand: HTMLElement | null = null;
      const worksWhole = document.querySelector<HTMLElement>('.works');
      const worksSection = document.querySelector<HTMLElement>('.works__scroller');
      const worksList = document.querySelector<HTMLElement>('.works__list');
      const worksIntro = document.querySelector<HTMLElement>('.works__intro');
      const introReveals = worksIntro ? Array.from(worksIntro.querySelectorAll<HTMLElement>('[data-reveal]')) : [];
      const revealH2 = introReveals[0] ?? null;
      const revealLead = introReveals[1] ?? null;
      let revealH2Ref = revealH2;
      let revealLeadRef = revealLead;

      if (worksWhole && worksSection && worksList) {
        const cards = worksList.querySelectorAll<HTMLElement>(':scope > *');
        const cardCount = cards.length;

        if (cardCount > 1) {
          const firstCard = cards[0];
          const cardEls = Array.from(cards) as HTMLElement[];

          gsap.set(cardEls, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 });

          worksBand = worksList;

          const getStartX = () => {
            const viewportW = worksSection.clientWidth;
            const cardW = firstCard.offsetWidth;
            const currentX = (gsap.getProperty(worksList, 'x') as number) || 0;
            const listLeft = worksList.getBoundingClientRect().left - currentX - worksSection.getBoundingClientRect().left;

            return (viewportW - cardW) / 2 - listLeft;
          };

          const getCenteredTotal = () => worksList.scrollWidth - firstCard.offsetWidth;
          const getEnterStartX = () => getStartX() + worksSection.clientWidth;

          gsap.set(worksList, { opacity: 1, x: () => getEnterStartX() });

          if (revealH2) gsap.set(revealH2, { opacity: 0, y: 20, x: 0, rotation: 0, scale: 1 });
          if (revealLead) gsap.set(revealLead, { opacity: 0, y: 20, x: 0, rotation: 0, scale: 1 });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: worksWhole,
              start: 'top top',
              end: () => `+=${REVEAL_PX + ENTER_PX + getCenteredTotal() + getExtraPx()}`,
              pin: worksWhole,
              pinSpacing: true,
              scrub: 1,
              snap: {
                snapTo: (value) => {
                  const scrollSpan = getCenteredTotal();
                  const total = REVEAL_PX + ENTER_PX + scrollSpan + getExtraPx();
                  const rRatio = REVEAL_PX / total;
                  const eRatio = (REVEAL_PX + ENTER_PX) / total;
                  const sRatio = (REVEAL_PX + ENTER_PX + scrollSpan) / total;

                  if (value < rRatio) return value;
                  if (value < eRatio) return value;
                  if (value >= sRatio) return sRatio;

                  const p = (value - eRatio) / (sRatio - eRatio);

                  return eRatio + (Math.round(p * (cardCount - 1)) / (cardCount - 1)) * (sRatio - eRatio);
                },
                duration: { min: 0.2, max: 0.5 },
                ease: 'power1.inOut',
              },
              invalidateOnRefresh: true,
              anticipatePin: 1,
              refreshPriority: 110,
              onRefresh: (self) => {
                if (self.progress === 0) gsap.set(worksList, { x: getEnterStartX() });
              },
            },
          });

          const revealDur = REVEAL_PX / ENTER_PX;
          const enterDur = 1;
          const scrollDur = getCenteredTotal() / ENTER_PX;

          if (revealH2) {
            tl.fromTo(
              revealH2,
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
              0
            );
          }

          if (revealLead) {
            tl.fromTo(
              revealLead,
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
              0.4
            );
          }

          tl.fromTo(
            worksList,
            { x: () => getEnterStartX() },
            { x: () => getEnterStartX(), duration: revealDur, ease: 'none' },
            0
          );

          tl.fromTo(
            worksList,
            { x: () => getEnterStartX() },
            { x: () => getStartX(), ease: 'power3.out', duration: enterDur },
            revealDur
          );

          tl.fromTo(
            worksList,
            { x: () => getStartX() },
            { x: () => getStartX() - getCenteredTotal(), ease: 'none', duration: scrollDur },
            revealDur + enterDur
          );

          const extraDur = () => getExtraPx() / ENTER_PX;

          tl.to(
            worksList,
            { x: () => getStartX() - getCenteredTotal(), ease: 'none', duration: extraDur() },
            revealDur + enterDur + scrollDur
          );
        }
      }

      const devflowPin = document.querySelector<HTMLElement>('[data-devflow-pin]');
      const devflowList = document.querySelector<HTMLElement>('.devflow__list');

      if (devflowPin && devflowList) {
        const steps = devflowList.querySelectorAll<HTMLElement>(':scope > *');

        if (steps.length > 1) {
          const revealEls = Array.from(devflowPin.querySelectorAll<HTMLElement>('[data-reveal]'));

          revealEls.forEach((el) => gsap.set(el, { opacity: 0, y: 20 }));
          gsap.set(devflowList, { x: 0 });

          const totalScroll = () => Math.max(0, devflowList.scrollWidth - devflowPin.clientWidth);
          const REVEAL_RATIO = 0.3;
          const SCROLL_RATIO = 0.7;

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: devflowPin,
              start: 'top top',
              end: () => '+=4500',
              pin: devflowPin,
              pinSpacing: true,
              scrub: true,
              invalidateOnRefresh: true,
              anticipatePin: 1,
              refreshPriority: 90,
            },
          });

          revealEls.forEach((el, i) => {
            const startTime = (i / revealEls.length) * REVEAL_RATIO;
            const dur = (REVEAL_RATIO / revealEls.length) * 1.2;

            tl.fromTo(
              el,
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: dur, ease: 'power2.out' },
              startTime
            );
          });

          tl.fromTo(
            devflowList,
            { x: 0 },
            { x: 0, duration: REVEAL_RATIO, ease: 'none' },
            0
          );

          tl.fromTo(
            devflowList,
            { x: 0 },
            { x: () => -totalScroll(), duration: SCROLL_RATIO, ease: 'none' },
            REVEAL_RATIO
          );
        }
      }

      ScrollTrigger.refresh();

      return () => {
        if (worksBand) gsap.set(worksBand, { opacity: 1, x: 0 });
        if (revealH2Ref) gsap.set(revealH2Ref, { opacity: 1, y: 0 });
        if (revealLeadRef) gsap.set(revealLeadRef, { opacity: 1, y: 0 });
      };
    }
  );
}

if (document.readyState === 'complete') setup();
else window.addEventListener('load', setup, { once: true });
