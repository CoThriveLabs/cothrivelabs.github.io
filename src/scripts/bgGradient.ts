// 演出 B: グラデ背景切替（設計書 §5.3 / 仕様書 v1.3 F4-c）。
// 発火 3 箇所のトリガー要素（切替先セクション先頭）を IO で監視し、入域時に
// --bg-current を C2 / C-DEEP へ書き換える。滑らかさは CSS の
// transition: background-color が担当（§5.3.1）。GSAP 不使用＝依存ゼロ。
//
// reveal.ts とは IO instance / ファイルを完全分離（§5.4.1）。観測パラメータ
// （中央帯 -30%/-30% = 5 次 FB で広げた）・unobserve 戦略（往復のため観測継続）が逆なため。

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
  const setBg = (color: BgColor) =>
    document.documentElement.style.setProperty('--bg-current', VAR[color]);

  // 入域中トリガーを「現在交差中」で全件追跡する Set。IO entries は「変化が
  // あったもの」だけ届くため、callback ごとに差分を Set に反映し、毎回 DOM 順で
  // 最下のトリガーを正としてリプレイする。
  // 三次テストで真因確定: entries の順序は IO 仕様上未定義のため
  // `entries[entries.length-1]` は DOM 順最下と一致しない。かつ section 全体を
  // 観測対象にしているため隣接 section (Members↔DevFlow) が重複交差する scrollY
  // 区間が存在し、旧実装ではその区間で paper が勝って paper-deep が一度も発火
  // しなかった。
  const intersecting = new Set<HTMLElement>();

  const io = new IntersectionObserver(
    (entries) => {
      // 状態更新: 交差変化を Set に反映。
      for (const e of entries) {
        if (e.isIntersecting) intersecting.add(e.target as HTMLElement);
        else intersecting.delete(e.target as HTMLElement);
      }

      if (intersecting.size === 0) {
        // 中央帯に何も入っていない時は初期色 C2 に戻す
        // （Hero/Footer 領域で前回入域時の色が残留しないため・三次テスト発見）
        setBg('paper');
        return;
      }
      // DOM 順（= triggers 配列の順）で最下のものを採用 = 設計書の「最も下＝
      // スクロール進行方向側」の本来意図。entries 順序に依存しない。
      let last: HTMLElement | null = null;
      for (const el of triggers) {
        if (intersecting.has(el)) last = el;
      }
      if (last) setBg((last.dataset.bg as BgColor) ?? 'paper');
    },
    {
      // viewport 中央帯（高さ 40%）に入った瞬間に切替（§5.3.3・§5.10.3 5 次 FB で 10% → 40% へ拡幅、
      // 「やわらかフェード」狙い。intersecting Set + DOM 順最下採用ロジックで複数同時交差にも対応済）。
      rootMargin: '-30% 0px -30% 0px',
      threshold: 0,
    }
  );

  // unobserve しない（往復＝双方向スクロールで再切替するため・§5.3.2）。
  triggers.forEach((el) => io.observe(el));
}
