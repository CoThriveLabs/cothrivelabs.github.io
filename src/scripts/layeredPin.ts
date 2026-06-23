import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const setup = () => {
  const mm = gsap.matchMedia();
  mm.add(
    { isDesktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)' },
    (ctx) => {
      if (!ctx.conditions?.isDesktop) return;

      const container = document.querySelector<HTMLElement>('.layered-pin-container');
      const panels = gsap.utils.toArray<HTMLElement>('.layered-pin-panel');
      if (!container || panels.length < 2) return;

      gsap.set(panels, { zIndex: (i, _, targets) => targets.length - i });

      const cats = container.querySelectorAll<HTMLElement>('.techstack__cat[data-reveal]');
      cats.forEach((el) => gsap.set(el, { opacity: 0.001, y: 30 }));
      const thresholds = Array.from(cats, (_, i) => (i + 1) / (cats.length + 1));

      gsap.to('.layered-pin-panel:not(:last-child)', {
        yPercent: -100,
        ease: 'none',
        stagger: 0.5,
        scrollTrigger: {
          trigger: '.layered-pin-container',
          start: 'top top',
          end: '+=200%',
          scrub: true,
          pin: true,
          pinSpacing: true,
          invalidateOnRefresh: true,
          refreshPriority: 80,
          onUpdate: (self) => {
            const p = self.progress;
            const cardPhase = p / 0.5;
            if (cardPhase <= 1) {
              cats.forEach((el, i) => {
                if (cardPhase >= thresholds[i]) {
                  gsap.to(el, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
                } else if (cardPhase < thresholds[i] - 0.02) {
                  gsap.set(el, { opacity: 0.001, y: 30 });
                }
              });
            }
          },
        },
      });
    }
  );
};

if (document.readyState === 'complete') setup();
else window.addEventListener('load', setup, { once: true });
