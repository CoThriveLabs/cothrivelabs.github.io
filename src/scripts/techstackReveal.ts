// TechStack を fixed overlay + scrollY 監視で「画面転移なく順次出現」させる。
//
// Why（pin チェーンから切り離す理由）:
//   reveal.ts (1) の pin + scrub 順次出現チェーンの末端では、上流セクションの refreshPriority 連鎖の
//   累積誤差により「先走り」（カテゴリが想定より早く表示）が発生する。
//   pin を使わず sentinel rect のみに依存する方式に切替えることで根本解消する。
//
// 構造:
//   - TechStack の自然位置に sentinel（高さ固定）= 下流（ComingSoon / Contact）の絶対座標を維持。
//   - TechStack section 本体は position: fixed で画面中央に常駐（active 時のみ可視）。
//   - scrollY 監視で sentinel が viewport 内に入った量に応じて [data-reveal] を順次 active 化。
//
// PC + no-reduced-motion のみ。SP / reduce 時は何もせず、
// TechStack は自然フロー + reveal.ts (2) の IO 単発出現で表示される。

function setup() {
  const mql = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const wide = window.matchMedia('(min-width: 768px)');
  if (!mql.matches || !wide.matches) return;

  const sentinel = document.querySelector<HTMLElement>('[data-techstack-sentinel]');
  const overlay = document.querySelector<HTMLElement>('[data-techstack-overlay]');
  if (!sentinel || !overlay) return;

  const reveals = Array.from(overlay.querySelectorAll<HTMLElement>('[data-reveal]'));
  const total = reveals.length;
  if (total === 0) return;

  // sentinel の縦区間を [0, 1] に正規化して各要素の閾値を求める。
  // 0.65〜1.0 を ComingSoon cover 区間として残し、全要素は 0〜0.65 で出揃わせる
  // （comingSoonCover.ts の COVER_START と連動）。
  const REVEAL_END = 0.65;
  const thresholds = reveals.map((_, i) => ((i + 1) / (total + 1)) * REVEAL_END);

  let rafScheduled = false;
  function onScroll() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      const r = sentinel!.getBoundingClientRect();
      const sentinelHeight = r.height;
      const progress = -r.top / sentinelHeight;
      const inRange = progress >= 0 && progress <= 1;
      overlay!.classList.toggle('is-active', inRange);
      if (!inRange) {
        reveals.forEach((el) => {
          el.classList.remove('is-revealed');
          // Astro scoped CSS の壁を回避（class セレクタは scope 抜けないが inline style は常に勝つ）
          el.style.opacity = '0';
          el.style.transform = 'translateY(20px)';
        });
        return;
      }
      reveals.forEach((el, i) => {
        const revealed = progress >= thresholds[i];
        el.classList.toggle('is-revealed', revealed);
        // 子コンポーネント要素（SectionHeading の .section-heading__head 等）にも確実に効かせる
        el.style.opacity = revealed ? '1' : '0';
        el.style.transform = revealed ? 'none' : 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      });
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
