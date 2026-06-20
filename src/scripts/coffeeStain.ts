// シミ overlay の初期リセット + 全 ScrollTrigger の最終 refresh 集約。
//
// What:
//   このファイルに残す責務は 2 つだけ。
//     (1) ロード時の初期リセット（--stain-r:0% / --stain-fill-opacity:0 / inline display 解除）。
//     (2) 最終 refresh の単一集約（rAF×2 → ScrollTrigger.refresh()）。
//
// Why:
//   - 侵食駆動本体は reveal.ts の Services pin（STAIN_EXTRA 区間）に統合済み。
//     coffeeStain.ts は独立 pin を持たない（Services 退場後に侵食が始まると Services が固定されないため）。
//   - Base.astro の読み込み順で coffeeStain.ts が最後なので、全 pin spacer 確定後に
//     1 回だけ refresh する集約役をここに残す（reveal/横スク/parallax/cover の個別 refresh 競合回避）。
//
// Gotcha:
//   前ページ離脱時に coverTransition.ts onComplete で stain.style.display='none' が
//   inline style として残ることがあるため、ロード時に明示的に空文字へ戻して CSS デフォルトに復帰させる。
//
// reduce: シミ自体出ないが、最終 refresh は他 script も登録しているため reduce でも実行する。

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const setup = () => {
  const stain = document.querySelector<HTMLElement>('[data-coffee-stain]');

  // (1) 初期状態を強制リセット（要素が無くても (2) refresh 集約は実行する）。
  if (stain) {
    // 前ページ離脱時に残った inline display:none を解除（Gotcha 参照）。
    stain.style.display = '';
    gsap.set(stain, { '--stain-r': '0%', '--stain-fill-opacity': 0 });
  }

  // (2) 最終 refresh の単一集約。rAF×2 で全 pin spacer の DOM 反映後に refresh する。
  //     reveal の Services pin（STAIN_EXTRA 込み）・横スク・cover IO もこの集約 refresh で測られる。
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
