import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fitsViewport, whenFontsReady, onResize } from './lib/viewportFit';

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
    const measureTargets = [headingTitle, headingLead, ...cats].filter(Boolean) as HTMLElement[];

    let activeCleanup: (() => void) | undefined;

    // 中身が viewport 高さに収まる場合: 既存の pin タイムライン（stagger 値・時間配分）をそのまま構築する。
    const buildPinned = () => {
      container.dataset.layeredPin = 'pinned';

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
        delete container.dataset.layeredPin;
      };
    };

    // 中身が viewport 高さに収まらない場合: layered-pin をやめ、CSS 側の stacked ルールに委ねた上で
    // 見出し・cats を通常スクロール + IO で個別に順次発火させる。
    const buildStacked = () => {
      container.dataset.layeredPin = 'stacked';
      gsap.set([headingTitle, headingLead].filter(Boolean), { autoAlpha: 0, y: 16 });
      gsap.set(cats, { autoAlpha: 0, y: 30 });
      gsap.set([techPanel, comingPanel], { clearProps: 'all' });

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              gsap.to(el, {
                autoAlpha: 1,
                y: 0,
                duration: el === headingTitle || el === headingLead ? 0.3 : 0.4,
                ease: 'power2.out',
                overwrite: true,
              });
              io.unobserve(el);
            }
          });
        },
        { threshold: 0.999 }
      );

      // Gotcha: 要素自体が viewport より高い場合 threshold:0.999 に一生到達しない。
      // その場合だけ threshold 0 相当に緩和し、永久非表示を防ぐ。
      measureTargets.forEach((el) => {
        if (el.getBoundingClientRect().height > window.innerHeight) {
          const ioLoose = new IntersectionObserver(
            (loose) => loose.forEach((e) => {
              if (e.isIntersecting) {
                gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', overwrite: true });
                ioLoose.unobserve(el);
              }
            }),
            { threshold: 0 }
          );
          ioLoose.observe(el);
        } else {
          io.observe(el);
        }
      });

      return () => {
        io.disconnect();
        delete container.dataset.layeredPin;
      };
    };

    const rebuild = () => {
      activeCleanup?.();
      // headingTitle/headingLead は SectionHeading.astro 経由で素の [data-reveal] を持つため
      // Base.astro の FOUC 防止 CSS（transform: translateY(20px)）の対象になる。reveal.ts の
      // buildStepSection と同根の問題（変形済みの位置で fits を誤判定する）を避けるため、
      // 計測直前だけ transform を無効化し、直後に復元する。
      const prevTransforms = measureTargets.map((el) => el.style.transform);
      measureTargets.forEach((el) => { el.style.transform = 'none'; });
      const fits = fitsViewport(container, measureTargets);
      measureTargets.forEach((el, i) => { el.style.transform = prevTransforms[i]; });

      activeCleanup = fits ? buildPinned() : buildStacked();
    };

    rebuild();
    const stopResize = onResize(rebuild, 200);

    return () => {
      stopResize();
      activeCleanup?.();
    };
  });
};

whenFontsReady(() => {
  if (document.readyState === 'complete') setup();
  else window.addEventListener('load', setup, { once: true });
});
document.addEventListener('astro:page-load', setup);
