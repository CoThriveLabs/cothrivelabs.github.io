// F4-e ちらほらイラスト視差（設計書 §5.8 / §5.8.1 / §6 Phase 4 タスク G）。
// `[data-parallax][data-depth="front|mid|back"]` を持つ装飾要素を 3 段速度で
// scrub 視差させる。blur は CSS（data-depth）静的、速度のみ JS。
//
// 責務分離（§5.8.1）:
//   - 視差(scrub) = parallax.ts（本ファイル・transform yPercent のみ）
//   - 出現(opacity) = reveal.ts(B)（`data-reveal` 併記で IO が拾う）
//   - blur(奥行き) = CSS（reduce 時も維持・仕様書 F4-e 明示）
//
// reduce 時は JS 走らせない → CSS の blur だけ残る = 仕様一致（§5.8.1 / §5.0）。
//
// 【タスク D §5.5.1 で確定した実装パターン適用】
// Astro <script type="module"> は defer 相当で DOMContentLoaded 前後に走るが、
// fonts/images 未ロードで section 位置未確定 → ScrollTrigger の start/end 計算が
// 壊れて scrub が効かない既知問題。→ window.load 後に setup + ScrollTrigger.refresh()。
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// back ほど移動大＝奥行きで遅く見える視差。控えめ値（§5.0 進行感を強調しない）。
const SPEED = { front: -8, mid: -18, back: -32 } as const;
type Depth = keyof typeof SPEED;

function setup() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // 視差停止・CSS blur は維持（§5.8.1）

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

  // fonts/images ロード完了後の最終 refresh（§5.5.1 A・タスク D 三次で確定したパターン）。
  ScrollTrigger.refresh();
}

if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
