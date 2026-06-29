// グラデ背景切替。
// data-bg を持つトリガー要素（切替先セクション先頭）の位置を毎フレーム再評価し、
// viewport 中央帯にあるトリガーの色を --bg-current に書き換える。
// 滑らかさは CSS の transition: background-color が担当（GSAP 不使用＝依存ゼロ）。
//
// Why tick 駆動:
//   IntersectionObserver は entries 変化時のみ callback 発火。
//   トリガー要素が「中央帯にとどまったまま外側状態（stainInvading 等）が変化」する区間で
//   color 判定が更新されない構造欠陥がある。逆スクロール時の侵食縮小再生区間で paper-warm が
//   固着するのが代表症状。getBoundingClientRect の毎フレーム評価で根本解消する。

type BgColor = 'paper' | 'paper-warm' | 'paper-deep';
const VAR: Record<BgColor, string> = {
  'paper': 'var(--c-paper)',
  'paper-warm': 'var(--c-paper-warm)',
  'paper-deep': 'var(--c-paper-deep)',
};

// HTML 側で各トリガー要素に data-bg="paper" / "paper-deep" を付与（どの色へ
// 切り替えるかは HTML が宣言・色の責務を HTML/CSS 側へ）。
const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-bg]'));

if (triggers.length) {
  let currentBg: BgColor | null = null;
  const setBg = (color: BgColor) => {
    if (color === currentBg) return;
    currentBg = color;
    document.documentElement.style.setProperty('--bg-current', VAR[color]);
  };

  // viewport 中央帯（高さ 40%）= IO の rootMargin '-30% 0px -30% 0px' と同等。
  const bandRatio = 0.3;

  let rafScheduled = false;
  function evaluate() {
    rafScheduled = false;
    const vh = window.innerHeight;
    const bandTop = vh * bandRatio;
    const bandBottom = vh * (1 - bandRatio);

    // シミ侵食中は works-sentinel を採用候補から除外。
    // Why: 上スクロールで侵食縮小再生が走る区間で、Works 内の works-sentinel が中央帯交差したまま
    // 残ると DOM 順最下優先で paper-warm が勝ち、シミ overlay 周囲の地色が前段の paper にならず
    // 逆再生が視認できない。
    // 判定: stain-sentinel が viewport に交差している（cover phase 中）= 侵食 progress 0..1 中。
    // CSS scroll-driven animation と同じソースを参照するので、進行度の整合が崩れない。
    const stainSentinel = document.querySelector<HTMLElement>('[data-stain-sentinel]');
    let stainInvading = false;
    if (stainSentinel) {
      const sr = stainSentinel.getBoundingClientRect();
      stainInvading = sr.top < vh && sr.bottom > 0;
    }

    // DOM 順（= triggers 配列の順）で最下のものを採用 =「最も下＝スクロール進行方向側」を正とする。
    let last: HTMLElement | null = null;
    for (const el of triggers) {
      // 侵食中は works-sentinel を採用候補から外す（Services の data-bg="paper" を勝たせる）。
      if (stainInvading && el.hasAttribute('data-works-sentinel')) continue;
      const r = el.getBoundingClientRect();
      // 中央帯（top..bottom）と矩形が交差しているか。
      if (r.bottom < bandTop) continue;
      if (r.top > bandBottom) continue;
      last = el;
    }

    if (last) {
      setBg((last.dataset.bg as BgColor) ?? 'paper');
    } else {
      // 中央帯に何も入っていない時は初期色 C2 に戻す
      // （Hero/Footer 領域で前回入域時の色が残留しないように）。
      setBg('paper');
    }
  }

  function schedule() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(evaluate);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();
}
