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

    const headingReveals = gsap.utils.toArray<HTMLElement>(
      techPanel.querySelectorAll<HTMLElement>('.techstack__heading, .techstack__heading [data-reveal]')
    );

    gsap.set(techPanel, { zIndex: 1, yPercent: 0, autoAlpha: 1 });
    gsap.set(comingPanel, { zIndex: 2, yPercent: 100, autoAlpha: 1 });
    gsap.set(headingReveals, { autoAlpha: 1, clearProps: 'transform' });
    gsap.set(cats, { autoAlpha: 0, y: 30 });

    const tl = gsap.timeline({
      scrollTrigger: {
        id: 'layered-pin-techstack-comingsoon',
        trigger: container,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * 2)}`,
        scrub: true,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 80,
      },
    });

    if (cats.length > 0) {
      tl.to(cats, {
        autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out',
      }, 0);
    }

    tl.to(comingPanel, {
      yPercent: 0, duration: 0.65, ease: 'none',
    }, cats.length > 0 ? 0.65 : 0);

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
