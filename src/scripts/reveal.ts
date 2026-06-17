// ポンポン出現（設計書 §5.6 / 仕様書 v1.3 F4-b）。
// [data-reveal] を IntersectionObserver で viewport 入域検知し、gsap.to で
// translateY(24→0) + opacity(0→1) アニメ。同一バッチで入った要素は 100ms stagger。
// reduced-motion 即時表示。transform+opacity のみで GPU 合成（60fps）。
//
// Note: 当初は ScrollTrigger.batch で実装したが、Astro バンドル下で
// onEnter が発火しない事象（要素 isActive=true でも未呼出し）に当たり、
// 確実性重視で標準 IntersectionObserver に切替。GSAP はアニメ本体（gsap.to）のみ使用。
import gsap from 'gsap';

const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
if (targets.length) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    // 即時表示（アニメなし）。初期状態 CSS を打ち消す。
    gsap.set(targets, { opacity: 1, y: 0 });
  } else {
    // 初期状態確定（CSS と二重で担保。チラ見え防止）。
    gsap.set(targets, { opacity: 0, y: 24 });

    const io = new IntersectionObserver(
      (entries) => {
        // 同じバッチで入域した要素群を stagger でフェードイン。
        const entering = entries.filter((e) => e.isIntersecting);
        entering.forEach((entry, i) => {
          gsap.to(entry.target, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            delay: i * 0.1,
            overwrite: true,
          });
          io.unobserve(entry.target); // once: true 相当
        });
      },
      {
        // ScrollTrigger 'top 88%' 相当（viewport 下端から 12% 上で入域判定）。
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.01,
      }
    );

    targets.forEach((el) => io.observe(el));
  }
}
