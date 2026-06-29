// シミ overlay の初期リセット + 全 ScrollTrigger の最終 refresh 集約。
//
// What:
//   (1) ロード時の初期リセット（--stain-r:0% / --stain-fill-opacity:0 / inline display 解除）。
//   (2) 最終 refresh の単一集約（rAF×2 → ScrollTrigger.refresh()）。
//
// Why（駆動コードを CSS に完全移譲した理由）:
//   - 旧設計の独立 ScrollTrigger（scrub:true）は GSAP 公式パターンだったが、上流の pin spacer
//     確定タイミングや refresh chain に依存して逆スクロール時の再 active 化が不安定だった。
//   - CSS scroll-driven animation（view-timeline + @property + @keyframes）に置換し、
//     ブラウザネイティブで上下スクロール双方向動作を保証。
//   - Base.astro 側で @supports (animation-timeline: scroll()) ガード + @media (prefers-reduced-motion) 制御。
//   - 未サポート（Safari 16- 等）では @keyframes 未発火 → 静止状態（stain-r:0%）で崩れなし。
//
// Gotcha:
//   前ページ離脱時に inline style として stain.style.display='none' 等が残ることがあるため、
//   ロード時に明示的に空文字へ戻して CSS デフォルトに復帰させる。

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';

gsap.registerPlugin(ScrollTrigger);

const setup = () => {
  const stain = document.querySelector<HTMLElement>('[data-coffee-stain]');

  // (1) 初期状態を強制リセット（要素が無くても (2) refresh 集約は実行する）。
  if (stain) {
    stain.style.display = '';
  }

  // (2) 最終 refresh の単一集約。rAF×2 で全 pin spacer の DOM 反映後に refresh する。
  //     reveal の Services pin・横スク・cover IO もこの集約 refresh で測られる。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  });
};

if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
