// ちらほらイラスト視差。
// `[data-parallax][data-depth="front|mid|back"]` を持つ装飾要素を 3 段速度で scrub 視差させる。
//
// 責務分離:
//   - 視差(scrub) = このファイル（transform yPercent のみ）
//   - 出現(opacity) = reveal.ts（`data-reveal` 併記で IO が拾う）
//   - blur(奥行き) = CSS（reduce 時も維持）
//
// reduce 時は JS 走らせない → CSS の blur だけ残る（奥行き表現は維持・進行感は出さない）。
//
// Gotcha:
//   Astro <script type="module"> は defer 相当で DOMContentLoaded 前後に走るが、
//   fonts/images 未ロード時点では section 位置未確定で ScrollTrigger start/end が壊れる。
//   → window.load 後に setup + ScrollTrigger.refresh() で確定。
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// back ほど移動大＝奥行きで遅く見える視差。控えめ値（進行感を強調しない）。
const SPEED = { front: -8, mid: -18, back: -32 } as const;
type Depth = keyof typeof SPEED;

function setup() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // 視差停止・CSS blur は維持

  const targets = document.querySelectorAll<HTMLElement>('[data-parallax]');
  if (!targets.length) return;

  targets.forEach((el) => {
    const depth = ((el.dataset.depth ?? 'front') as Depth);
    const speed = SPEED[depth] ?? SPEED.front;
    gsap.to(el, {
      yPercent: speed,
      ease: 'none',
      scrollTrigger: {
        // 親 section を trigger にして section 通過中に scrub。
        // section の外にいる装飾は el 自身を trigger に fallback。
        trigger: el.closest('section') ?? el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  });

  // fonts/images ロード完了後の最終 refresh（要素位置確定後に start/end を再測定固定）。
  ScrollTrigger.refresh();
}

if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
