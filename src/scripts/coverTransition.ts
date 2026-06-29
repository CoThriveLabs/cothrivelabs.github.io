// 技スタ → ComingSoon 境界のシミ overlay 表示制御。
//
// What:
//   ComingSoon が下から近づいたら coffee-stain を display:none で消し、離れたら復帰する。
//   下方向だけでなく上スクロールでも再表示できるよう双方向で切り替える。
//
// Why（gsap.to による tween を撤廃した理由）:
//   --stain-r / --stain-fill-opacity は CSS scroll-driven animation（Base.astro 内）が
//   駆動しているため、gsap.to で同じ変数を tween するとブラウザ側のアニメと競合する。
//   display 切替だけで edge / fill 両方とも画面から完全に消えるため、tween 不要。
//
// Gotcha:
//   display:none 要素は ::before/::after が render tree から外れ、CSS
//   animation-timeline の計算対象から除外される。一度消して disconnect すると
//   上スクロールで戻った時に scroll-driven anim が再アタッチされない（片道トラップ）。
//   よって IO は disconnect せず常駐させ、isIntersecting に応じて双方向で切り替える。
//
// reduce/SP:
//   reduce 時はシミ自体出ない（@supports + @media (prefers-reduced-motion) ガード）ため早期 return。
//   SP は非 reduce なら ON（IO のみ・transform はない）。

function setup() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const csTarget = document.querySelector<HTMLElement>('.coming-soon');
  const stain = document.querySelector<HTMLElement>('[data-coffee-stain]');
  if (reduceMotion || !csTarget || !stain) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        // 接近時は非表示、離脱時は空文字で stylesheet 既定値（display 指定なし）へ戻す。
        stain.style.display = e.isIntersecting ? 'none' : '';
      });
    },
    // ComingSoon 直前で何度も往復する微振動帯を圧縮するため 10% に設定。
    { threshold: 0, rootMargin: '0px 0px 10% 0px' }
  );
  io.observe(csTarget);
}

if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
