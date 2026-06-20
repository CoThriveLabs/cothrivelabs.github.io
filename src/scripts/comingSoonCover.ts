// 案 P フェーズ2（2026-06-20・あめさん要望「TechStack 画面の上に下から覆い被さる」/
// ろぴ確定設計）: TechStack → ComingSoon cover transition。
//
// 構造：
//   - TechStack sentinel の progress 0.65〜1.0 を cover 区間とし、
//     ComingSoon overlay の transform を translateY(100vh → 0) で補間して下からせり上げる。
//   - CS sentinel 区間内は overlay が画面固定（transform = 0）。
//   - CS sentinel 消化後（cs.bottom <= vh）は is-unpinned で fixed 解除して自然フロー復帰。
//
// PC + no-reduced-motion のみ。SP / reduce 時は何もせず、ComingSoon は自然フローで表示される
// （ComingSoon.astro の @media ガードで sentinel/overlay は static 扱いに戻る）。
//
// rev4.2 破綻の罠（sticky × pin 競合）は pin 不使用・plain JS により構造的に回避。

function setup() {
  const mql = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const wide = window.matchMedia('(min-width: 768px)');
  if (!mql.matches || !wide.matches) return;

  const techSentinel = document.querySelector<HTMLElement>('[data-techstack-sentinel]');
  const csSentinel = document.querySelector<HTMLElement>('[data-comingsoon-sentinel]');
  const overlay = document.querySelector<HTMLElement>('[data-comingsoon-overlay]');
  if (!techSentinel || !csSentinel || !overlay) return;

  // TechStack progress のうち cover 演出に充てる区間（techstackReveal.ts の REVEAL_END=0.65 と整合）。
  const COVER_START = 0.65;
  const COVER_END = 1.0;

  let rafScheduled = false;
  function onScroll() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      const t = techSentinel!.getBoundingClientRect();
      const cs = csSentinel!.getBoundingClientRect();
      const vh = window.innerHeight;
      const tProgress = -t.top / t.height;

      // cover 完了瞬間（CS sentinel top が viewport top に到達 = T sentinel 完全通過）で
      // fixed 解除して通常スクロールに移行。あめさん要望「ComingSoon→次セクションは通常スクロール」。
      const csConsumed = cs.top <= 0;
      overlay!.classList.toggle('is-unpinned', csConsumed);
      if (csConsumed) {
        // inline transform を残すと is-unpinned の transform:none を上書きしてしまうのでクリア。
        overlay!.style.transform = '';
        return;
      }

      // transform 補間: cover 区間外は端点に貼り付け、区間内は線形補間。
      let translateY: number;
      if (tProgress < COVER_START) {
        translateY = vh;
      } else if (tProgress >= COVER_START && tProgress <= COVER_END) {
        const c = (tProgress - COVER_START) / (COVER_END - COVER_START);
        translateY = (1 - c) * vh;
      } else {
        translateY = 0;
      }
      // inline style で直書き（Astro scoped CSS 壁の回避・案 P 系列の共通パターン）。
      overlay!.style.transform = `translateY(${translateY}px)`;
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
