import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { whenFontsReady, onResize } from './lib/viewportFit';

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
const POP_SOFT_DURATION_S = 0.55;
const POP_SOFT_Y_PX = 80;
const POP_SOFT_X_PX = -30;
const POP_SOFT_ROT_DEG = -6;
const POP_SOFT_SCALE = 0.85;
const PAPER_DURATION_S = 0.7;
const PAPER_Y_PX = -30;
const PAPER_ROT_DEG = 1.5;
const PAPER_SCALE = 0.95;

type RevealKind = 'text' | 'card' | 'slide-x' | 'pop-soft' | 'paper';
type Entry = { el: HTMLElement; kind: RevealKind };

function getKind(el: HTMLElement): RevealKind {
  if (el.dataset.reveal === 'slide-x') return 'slide-x';
  if (el.dataset.reveal === 'pop-soft') return 'pop-soft';
  if (el.dataset.reveal === 'paper') return 'paper';
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
  } else if (kind === 'pop-soft') {
    // 立ち絵がぽんと飛び込む初期状態
    gsap.set(el, {
      opacity: 0,
      y: POP_SOFT_Y_PX,
      x: POP_SOFT_X_PX,
      rotation: POP_SOFT_ROT_DEG,
      scale: POP_SOFT_SCALE,
    });
  } else if (kind === 'paper') {
    // 紙レイヤがぺたっと貼り付く初期状態
    gsap.set(el, {
      opacity: 0,
      y: PAPER_Y_PX,
      x: 0,
      rotation: PAPER_ROT_DEG,
      scale: PAPER_SCALE,
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
  } else if (kind === 'pop-soft') {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: POP_SOFT_DURATION_S,
      ease: 'back.out(1.6)',
      overwrite: true,
    });
  } else if (kind === 'paper') {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: PAPER_DURATION_S,
      ease: 'back.out(1.4)',
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

// slide-x のカード群（Works/DevFlow の横帯カード）をまとめて発火させる。
// duration/easing/オフセット量は playReveal の slide-x 分岐と同一。stagger だけ短く入れて
// 完全同時ポップの単調さを避ける。
function playRevealGroup(els: HTMLElement[]) {
  gsap.to(els, {
    opacity: 1,
    x: 0,
    duration: SLIDE_X_DURATION_S,
    ease: 'power3.out',
    stagger: 0.05,
    overwrite: true,
  });
}

// fallback（pin なし）待機中の非表示状態。setInitialState と違い transform を一切持たない。
// IO が観測する矩形が常に自然なレイアウト位置と一致するようにするための待機専用の姿勢。
function setNeutralHidden(el: HTMLElement) {
  gsap.set(el, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 });
}

// セクション 1 つ分の pin+scrub（fits/shift）または通常スクロール IO（fallback）を構築する。
// overflow = 中身の自然な高さ - viewport 高さ、firstTop = 全 reveal 要素中で最も上にある
// 要素の自然 top、で三分岐する:
//   overflow <= 0              : 従来どおり start:'top top'
//   0 < overflow < firstTop     : pin 開始位置を overflow 分だけ後ろにずらして中身を viewport に収める
//   overflow >= firstTop        : pin をやめて通常スクロール + IO 順次発火
// shift の条件を overflow<firstTop に絞ることで、shift しても全要素の bottom が必ず shift を
// 上回る（＝ pin 開始時点でどの要素も 1px も画面外に押し出されない）ことが数式で保証される。
function buildStepSection(section: HTMLElement, refreshPriority: number): () => void {
  const revealEls = Array.from(section.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!revealEls.length) return () => {};

  const entries: Entry[] = revealEls.map((el) => ({ el, kind: getKind(el) }));

  // fits 判定・fallback の可視判定は「初期 transform を含まない自然なレイアウト位置」で行う。
  // Base.astro が FOUC 防止のため [data-reveal] に初期 transform を CSS で焼き込んでおり
  // （例: .member-card は translateY(200px) translateX(-80px) rotate(-15deg) scale(0.8)）、
  // setInitialState 呼び出し前でも getBoundingClientRect() は既に変形済みの値を返す。
  // 一時的に transform を空にして計測し、直後に元へ戻すことでちらつきなく自然座標を取得する。
  // fits 判定と fallback 発火判定を同じ 1 回の計測で済ませる（要素ごとの getBoundingClientRect()
  // を二重に呼ばないよう、ここで得た座標を両方の用途に使い回す）。
  const prevTransforms = entries.map(({ el }) => el.style.transform);
  entries.forEach(({ el }) => { el.style.transform = 'none'; });
  const containerTop = section.getBoundingClientRect().top;
  const naturalRect = new Map(
    entries.map(({ el }) => {
      const r = el.getBoundingClientRect();
      return [el, { top: r.top - containerTop, bottom: r.bottom - containerTop }];
    })
  );
  entries.forEach(({ el }, i) => { el.style.transform = prevTransforms[i]; });

  const H = Math.max(...entries.map((e) => naturalRect.get(e.el)!.bottom));
  const firstTop = Math.min(...entries.map((e) => naturalRect.get(e.el)!.top));
  const vh = window.innerHeight;
  const overflow = H - vh;

  entries.forEach(({ el, kind }) => setInitialState(el, kind));

  const cardEntries = entries.filter((e) => e.kind === 'slide-x');
  const nonCardEntries = entries.filter((e) => e.kind !== 'slide-x');
  const grouped = cardEntries.length > 0;

  // Gotcha: shift は「shift しても全要素の bottom が shift を上回る」ことが数式で保証される
  // 範囲（overflow < firstTop）でしか使わない。この条件を緩めると、shift 量が先頭要素の自然
  // top を超え、その要素の上部が pin 期間中ずっと画面外に押し出される。
  const canShift = overflow > 0 && overflow < firstTop;

  if (overflow <= 0 || canShift) {
    const shift = overflow > 0 ? overflow : 0;
    const sectionStep = Number(section.dataset.stepDistance) || STEP_DISTANCE_PX;
    const steps = grouped ? nonCardEntries.length + 1 : nonCardEntries.length;
    const pinLength = (steps + 1) * sectionStep;
    const cardThreshold = grouped ? (nonCardEntries.length + 1) / (steps + 1) : 0;

    const nonCardShown = new Map<HTMLElement, boolean>(nonCardEntries.map((e) => [e.el, false]));
    let cardGroupShown = false;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: shift > 0 ? () => `top+=${shift} top` : 'top top',
      end: () => `+=${pinLength}`,
      pin: true,
      pinSpacing: true,
      scrub: true,
      invalidateOnRefresh: true,
      refreshPriority,
      onUpdate: (self) => {
        const p = self.progress;
        nonCardEntries.forEach(({ el, kind }, i) => {
          const th = (i + 1) / (steps + 1);
          const shown = nonCardShown.get(el)!;
          if (!shown && p >= th) {
            nonCardShown.set(el, true);
            playReveal(el, kind);
          } else if (shown && p < th - 0.01) {
            nonCardShown.set(el, false);
            setInitialState(el, kind);
          }
        });
        if (grouped) {
          if (!cardGroupShown && p >= cardThreshold) {
            cardGroupShown = true;
            playRevealGroup(cardEntries.map((e) => e.el));
          } else if (cardGroupShown && p < cardThreshold - 0.01) {
            cardGroupShown = false;
            cardEntries.forEach(({ el, kind }) => setInitialState(el, kind));
          }
        }
      },
    });
    return () => trigger.kill();
  }

  // overflow >= firstTop（かつ overflow > 0）: pin をやめて通常スクロール + IO 順次発火。
  const cleanups: Array<() => void> = [];

  nonCardEntries.forEach(({ el, kind }) => {
    setNeutralHidden(el);
    // Gotcha: 要素自体が viewport より高い場合 threshold:0.999 に一生到達しない。
    // その場合だけ threshold 0 相当（isIntersecting=true 即発火）に緩和する。
    const tall = el.getBoundingClientRect().height > window.innerHeight;
    const io = new IntersectionObserver(
      (ioEntries) => {
        ioEntries.forEach((entry) => {
          if (entry.isIntersecting) {
            // ここで初めてオフセット姿勢へ瞬時に切り替え、直後に本来のフライインを再生する。
            // 同一 tick 内の連続実行のため間に paint が挟まらずチラつきは発生しない。
            setInitialState(el, kind);
            playReveal(el, kind);
            io.disconnect();
          }
        });
      },
      { threshold: tall ? 0 : 0.999 }
    );
    io.observe(el);
    cleanups.push(() => io.disconnect());
  });

  if (grouped) {
    // カード帯は横 1 列（overflow-x）のため「全体可視」基準では初期スクロール位置で
    // 見えていないカードが一生発火しない。行コンテナ自体を汎用 IO と同じ基準で観測し、
    // 「行が画面に入り始めたら」カード全部をまとめて発火させる。
    const rowContainer =
      cardEntries[0].el.closest<HTMLElement>('.works__list, .devflow__list') ?? section;
    const rowIo = new IntersectionObserver(
      (rowEntries) => {
        rowEntries.forEach((entry) => {
          if (entry.isIntersecting) {
            playRevealGroup(cardEntries.map((e) => e.el));
            rowIo.unobserve(rowContainer);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
    );
    rowIo.observe(rowContainer);
    cleanups.push(() => rowIo.disconnect());
  }

  return () => cleanups.forEach((fn) => fn());
}

// StudioAbout 専用。fits 判定・start シフト・fallback のいずれも行わない、常時無条件 pin。
// リサイズでも再構築しない。
function buildAlwaysPinnedSection(section: HTMLElement, refreshPriority: number): void {
  const revealEls = Array.from(section.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!revealEls.length) return;

  const entries: Entry[] = revealEls.map((el) => ({ el, kind: getKind(el) }));
  entries.forEach(({ el, kind }) => setInitialState(el, kind));

  const total = entries.length;
  const sectionStep = Number(section.dataset.stepDistance) || STEP_DISTANCE_PX;
  const pinLength = (total + 1) * sectionStep;
  const thresholds = entries.map((_, i) => (i + 1) / (total + 1));
  const shown = entries.map(() => false);

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
}

// StudioAbout は fits/shift/fallback の対象外。常時無条件 pin（buildAlwaysPinnedSection）に固定する。
const ALWAYS_PIN_SELECTOR = '.studio-about';

function setup() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;

  if (reduceMotion || !isDesktop) {
    showAllWithoutMotion();
    return;
  }

  const allStepSections = Array.from(document.querySelectorAll<HTMLElement>('[data-step-section]'))
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  const devflowSection = document.querySelector<HTMLElement>('.devflow');
  const pinnedReveals = new Set<HTMLElement>();
  allStepSections.forEach((section) => {
    section.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => pinnedReveals.add(el));
  });

  const priorityFor = (section: HTMLElement) => {
    const sectionIndex = allStepSections.indexOf(section); // 全 step-section 内での位置（従来の番号付けを維持）
    const isAfterDevflow = devflowSection
      ? Boolean(devflowSection.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING)
      : false;
    return isAfterDevflow ? 60 - sectionIndex * 10 : 200 - sectionIndex * 30;
  };

  // StudioAbout: 対象外。1 回だけ構築し、リサイズでも再構築しない。
  allStepSections
    .filter((section) => section.matches(ALWAYS_PIN_SELECTOR))
    .forEach((section) => buildAlwaysPinnedSection(section, priorityFor(section)));

  // S3/S4/S5/S6: fits/shift/fallback + カード一括化の対象。
  const adaptiveSections = allStepSections.filter((section) => !section.matches(ALWAYS_PIN_SELECTOR));
  const cleanups = new Map<HTMLElement, () => void>();
  const rebuildAdaptive = () => {
    adaptiveSections.forEach((section) => {
      cleanups.get(section)?.();
      cleanups.set(section, buildStepSection(section, priorityFor(section)));
    });
    ScrollTrigger.refresh();
  };

  whenFontsReady(() => {
    rebuildAdaptive();

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
    // rebuildAdaptive() が末尾で既に ScrollTrigger.refresh() を実行済みのため、ここでは呼ばない
    // （ioTargets/lateTargets は素の IntersectionObserver で ScrollTrigger と無関係）。
  });

  onResize(rebuildAdaptive, 200);
}

if (document.readyState === 'complete') setup();
else window.addEventListener('load', setup, { once: true });
