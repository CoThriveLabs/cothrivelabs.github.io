// 技スタ → ComingSoon 境界のシミ終了処理（fb7 rev5・coffee-stain 全体消去）。
// 設計書: hp_v2_fb7_rev5_services_pin_stain_2026-06-19.md（rev4.2 の JS pin 全廃を継承）。
//
// 構造（rev4.2〜）: 覆い被さり JS pin は全廃済み。本ファイルは「シミ終了 IO」のみ。
//
// fb7 rev5 §4 変更（問題4: ComingSoon 以降が薄茶 overlay で隠れる）:
//   旧 rev4.2 は fill（::after）だけ 0 にしていたが、edge（::before の薄茶 radial・--stain-r:220%）が
//   残存し、fixed/z:9999 の coffee-stain が z:auto の Contact/Footer を視覚的に覆っていた
//   （pointer-events:none でクリックは透過＝「動くが薄茶で見えない」）。
//   → IO で coffee-stain 全体を消す: --stain-r:0 ＋ --stain-fill-opacity:0 を gsap.to し、
//     onComplete で .coffee-stain を display:none（edge radial の再描画も切り紙色世界を完成）。
//   発火を rootMargin で前倒しし、ComingSoon が画面に来る前に消え切るようにする。
//
// reduce/SP（§4.3 / rev5 §4）:
//   reduce 時はシミ自体出ない（reveal/coffeeStain が reduce で全オフ・fill は元々0）ため IO 不要 ⇒ 早期 return。
//   SP は非reduce なら ON（シミ終了・rev3 §11 方針）。

import gsap from 'gsap';

function setup() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 案 P フェーズ2 で ComingSoon section を fixed overlay 化したため、`.coming-soon` を
  // IO target にすると常時 viewport 内になり即発火してしまう（→ ロード直後に
  // stain.style.display='none' で侵食消失）。observe 対象は自然位置の wrapper である
  // CS sentinel に切替える（fixed 化されていない natural flow 要素）。
  // SP/reduce 時は CS sentinel が生成されていない可能性に備えて .coming-soon にフォールバック。
  const csTarget = document.querySelector<HTMLElement>('[data-comingsoon-sentinel]')
    ?? document.querySelector<HTMLElement>('.coming-soon');
  const stain = document.querySelector<HTMLElement>('[data-coffee-stain]');
  // reduce はシミ自体出ない（fill 元々0）ので IO 不要。要素欠落時も何もしない。
  if (reduceMotion || !csTarget || !stain) return;

  // ComingSoon が下から近づいたら領域A→B 境界＝coffee-stain 全体を消す（紙色世界へ）。
  // rev5 §4: fill だけでなく edge（--stain-r）も 0 にし、完了で display:none（edge radial 残存対策）。
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          gsap.to(stain, {
            '--stain-r': '0%',
            '--stain-fill-opacity': 0,
            duration: 0.6,
            ease: 'power1.out',
            overwrite: true,
            onComplete: () => {
              // edge/fill とも 0 化後、overlay を世界から消す（紙色世界を確定・再描画コストも切る）。
              stain.style.display = 'none';
            },
          });
          io.disconnect();
        }
      });
    },
    // rev5 §4: ComingSoon が画面に来る前に消え切るよう前倒し（下端から 15% 手前で発火）。
    { threshold: 0, rootMargin: '0px 0px 15% 0px' }
  );
  io.observe(csTarget);
}

// fonts/images ロード完了後に登録（要素位置確定後に IO を張る）。
if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
