// 技スタ → ComingSoon 境界のシミ終了処理（coffee-stain 全体消去）。
//
// What:
//   ComingSoon が下から近づいたら、領域A→B 境界として coffee-stain（edge + fill 両方）を gsap.to で
//   0 化し、onComplete で .coffee-stain を display:none する（edge radial 残存と再描画コストを切る）。
//
// Why（display:none まで切る理由）:
//   fixed/z:9999 の coffee-stain は pointer-events:none で透過するが、edge（薄茶 radial）が残ると
//   Contact/Footer を視覚的に覆ってしまう（「動くが薄茶で見えない」）。
//   --stain-fill-opacity:0 だけでは edge は消えないため、display:none で完全に世界から外す。
//
// Gotcha:
//   ComingSoon section は fixed overlay 化されている（comingSoonCover.ts）。
//   `.coming-soon` を IO target にすると常時 viewport 内になり即発火してしまうため、
//   observe 対象は自然位置の wrapper である CS sentinel（fixed 化されていない natural flow 要素）にする。
//   SP/reduce 時は sentinel が生成されないので .coming-soon にフォールバック。
//
// reduce/SP:
//   reduce 時はシミ自体出ない（reveal/coffeeStain が reduce で全オフ・fill は元々0）ため IO 不要 ⇒ 早期 return。
//   SP は非 reduce なら ON。

import gsap from 'gsap';

function setup() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const csTarget = document.querySelector<HTMLElement>('[data-comingsoon-sentinel]')
    ?? document.querySelector<HTMLElement>('.coming-soon');
  const stain = document.querySelector<HTMLElement>('[data-coffee-stain]');
  if (reduceMotion || !csTarget || !stain) return;

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
              // edge/fill とも 0 化後、overlay を世界から消す。
              stain.style.display = 'none';
            },
          });
          io.disconnect();
        }
      });
    },
    // ComingSoon が画面に来る前に消え切るよう前倒し（下端から 15% 手前で発火）。
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
