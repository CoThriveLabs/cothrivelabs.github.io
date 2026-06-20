// グラデ背景切替。
// data-bg を持つトリガー要素（切替先セクション先頭）を IO で監視し、
// 入域時に --bg-current を該当の紙色に書き換える。
// 滑らかさは CSS の transition: background-color が担当（GSAP 不使用＝依存ゼロ）。
//
// reveal.ts とは IO instance / ファイルを完全分離（観測パラメータと unobserve 戦略が逆のため）。

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

  // 入域中トリガーを「現在交差中」で全件追跡する Set。
  // Gotcha: IO entries は「変化があったもの」だけ届く＋順序は IO 仕様上未定義のため
  //   `entries[entries.length-1]` は DOM 順最下と一致しない。
  //   隣接 section が重複交差する scrollY 区間では、entries 順序依存だと意図しない色が勝つ。
  //   → callback ごとに差分を Set に反映し、毎回 DOM 順で最下のトリガーを正としてリプレイする。
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
        // （Hero/Footer 領域で前回入域時の色が残留しないように）。
        setBg('paper');
        return;
      }
      // DOM 順（= triggers 配列の順）で最下のものを採用 =「最も下＝スクロール進行方向側」を
      // 正とする。entries 順序には依存しない。
      let last: HTMLElement | null = null;
      for (const el of triggers) {
        if (intersecting.has(el)) last = el;
      }
      if (last) setBg((last.dataset.bg as BgColor) ?? 'paper');
    },
    {
      // viewport 中央帯（高さ 40%）に入った瞬間に切替。
      // 帯を広めに取ることで「やわらかフェード」感を出す
      // （複数同時交差は intersecting Set + DOM 順最下採用で正しく扱う）。
      rootMargin: '-30% 0px -30% 0px',
      threshold: 0,
    }
  );

  // unobserve しない（往復＝双方向スクロールで再切替するため）。
  triggers.forEach((el) => io.observe(el));
}
