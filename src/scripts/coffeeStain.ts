// S4 Services → シミ侵食（fb7 rev5・独立 pin 全廃・reveal.ts へ統合）。
// 設計書: hp_v2_fb7_rev5_services_pin_stain_2026-06-19.md。
//
// rev5 §1 構造変更:
//   旧 rev4.x は coffeeStain.ts が独立 ScrollTrigger pin（#coffee-stain-anchor・start:'bottom top'）で
//   侵食を駆動していたが、これだと Services 退場後に侵食が始まり Services が固定されない（破綻）。
//   → 侵食駆動を reveal.ts の Services pin（#services＝[data-step-section]）に統合（STAIN_EXTRA 区間）。
//     reveal.ts が onUpdate の set 駆動で --stain-r / --stain-fill-opacity / works z 降格を全て担う。
//
//   このファイルに残すのは 2 つだけ:
//     (1) ロード時の初期リセット（--stain-r:0% / fill:0）＝ロード直後の全面バグ防止（必須維持）。
//     (2) 最終 refresh の単一集約（rAF×2 → ScrollTrigger.refresh()）。
//         Base.astro の読み込み順で coffeeStain.ts が最後なので、全 pin spacer 確定後に 1 回 refresh する
//         集約役をここに残す（reveal/横スク/parallax/cover が個別 refresh で競合しないため・rev4.x §5.2 踏襲）。
//
// reduce（rev5 §1.5 / rev3 §11）: reduce 時はシミ自体出ない（reveal も §11 でカード即時表示）。
//   初期リセットだけ行い独立 pin は元々無い。最終 refresh は他 script も登録しているため reduce でも実行する。

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const setup = () => {
  const stain = document.querySelector<HTMLElement>('[data-coffee-stain]');

  // (1) 初期状態を強制リセット（ページロード時の全面バグ防止）。要素が無くても refresh 集約は行う。
  if (stain) {
    // あめさん要望「S4→次セクション移行時の中央広がりアニメ消失」修正（2026-06-20）:
    // 前回ページの coverTransition.ts onComplete で stain.style.display='none' が立った状態が
    // ページリロード後も inline style として残置する事象を検出（さき eval で確認）。明示的に
    // display を空文字に戻して CSS のデフォルト表示状態（block 等）に復帰させる。
    stain.style.display = '';
    gsap.set(stain, { '--stain-r': '0%', '--stain-fill-opacity': 0 });
  }

  // (2) 最終 refresh の単一集約（§5.2）。最終スクリプト coffeeStain で 1 回だけ。
  //     rAF×2 で全 pin spacer の DOM 反映後に refresh（priority 順で測定される）。
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
