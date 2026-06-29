import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let mm: gsap.MatchMedia | undefined;

const DESKTOP_QUERY = '(min-width: 768px) and (prefers-reduced-motion: no-preference)';

const setup = () => {
  mm?.revert();
  mm = gsap.matchMedia();

  mm.add(DESKTOP_QUERY, () => {
    const container = document.querySelector<HTMLElement>('.layered-pin-container');
    if (!container) return;

    const techPanel = container.querySelector<HTMLElement>('[data-panel="techstack"]');
    const comingPanel = container.querySelector<HTMLElement>('[data-panel="comingsoon"]');

    if (!techPanel || !comingPanel) return;

    const cats = gsap.utils.toArray<HTMLElement>(
      techPanel.querySelectorAll<HTMLElement>('.techstack__cat[data-layered-reveal]')
    );

    const headingTitle = techPanel.querySelector<HTMLElement>('.techstack__heading .section-heading__head');
    const headingLead = techPanel.querySelector<HTMLElement>('.techstack__heading .section-heading__lead');

    gsap.set(techPanel, { zIndex: 1, yPercent: 0, autoAlpha: 1 });
    gsap.set(comingPanel, { zIndex: 2, yPercent: 100, autoAlpha: 1 });
    if (headingTitle) gsap.set(headingTitle, { autoAlpha: 0, y: 16 });
    if (headingLead) gsap.set(headingLead, { autoAlpha: 0, y: 16 });
    gsap.set(cats, { autoAlpha: 0, y: 30 });

    const tl = gsap.timeline({
      scrollTrigger: {
        id: 'layered-pin-techstack-comingsoon',
        trigger: container,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * 3)}`,
        scrub: true,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 80,
      },
    });

    // 進捗 0.0〜1.0 = 3 viewport 分。1 viewport ≒ 0.333。
    // 順次発火: title → lead → (1 viewport 空き) → cats stagger → comingPanel
    if (headingTitle) {
      tl.to(headingTitle, {
        autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out',
      }, 0);
    }
    if (headingLead) {
      tl.to(headingLead, {
        autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out',
      }, 0.08);
    }

    if (cats.length > 0) {
      // lead 完了(≒0.14) + 1 viewport(0.333) ≒ 0.47 から cats stagger を開始
      tl.to(cats, {
        autoAlpha: 1, y: 0, duration: 0.13, stagger: 0.08, ease: 'power2.out',
      }, 0.47);
    }

    tl.to(comingPanel, {
      yPercent: 0, duration: 0.20, ease: 'none',
    }, cats.length > 0 ? 0.78 : 0);

    requestAnimationFrame(() => { ScrollTrigger.refresh(); });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  });
};

if (document.readyState === 'complete') setup();
else window.addEventListener('load', setup, { once: true });

document.addEventListener('astro:page-load', setup);
