// Hero イントロ演出: ページを開いた直後の順次フェードイン。
// 順序: 背景（既出）→ 周囲の装飾 → メンバー集合絵 → こすらぼロゴ → サブタイトル。
//
// heroImmersion.ts（scroll pin scrub）との競合回避が要点:
//   heroImmersion は .hero__logo / .hero__tagline を autoAlpha でスクロール退場させる。
//   イントロが同じラッパーの opacity を 0 にすると、coffeeStain の ScrollTrigger.refresh()
//   がイントロ途中（opacity 0）に走った瞬間 heroImmersion が visibility:hidden を記録し、
//   opacity を 1 に戻しても hidden が残って消える。
//   → イントロはラッパーではなく「中身」（ロゴ svg / サブタイトル span）をフェードし、
//     ラッパー opacity は CSS デフォルト 1 のまま heroImmersion に visible と記録させる。
//   art は heroImmersion が y/scale のみ（autoAlpha 不使用）なので opacity フェード可。
// reduced-motion 時は何もしない（CSS 通常表示。HeroLogo の手書きのみ動く）。
import gsap from 'gsap';

function setup() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const decorItems = gsap.utils.toArray<HTMLElement>('.hero__decor-item');
  const art = document.querySelector<HTMLElement>('.hero__art');
  const glow = document.querySelector<HTMLElement>('.hero__glow');
  const logoSvg = document.querySelector<HTMLElement>('.hero__logo .hero-logo');
  const taglineSpans = gsap.utils.toArray<HTMLElement>('.hero__tagline-l1, .hero__tagline-l2');
  if (!art || !logoSvg || !taglineSpans.length) return;

  // 各装飾の本来の opacity（葉系は薄い）を 0 にする前に控えておき、戻す先にする。
  const decorOpacity = decorItems.map((el) => parseFloat(getComputedStyle(el).opacity) || 1);

  // 初期状態は JS からセット（JS 無効時は CSS 通常表示が残る = プログレッシブ）。
  gsap.set(decorItems, { opacity: 0, y: 10 });
  gsap.set(art, { opacity: 0, y: 24 });
  // glow は art の子。自身の opacity を持たせることで art フェードと分離し、メンバー後に出す。
  if (glow) gsap.set(glow, { opacity: 0 });
  gsap.set(logoSvg, { opacity: 0, y: 14 });
  gsap.set(taglineSpans, { opacity: 0, y: 10 });

  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  // 周囲の web 系 + 葉系装飾を 1 つずつランダム順に（背景は既に表示済み）。
  // opacity は各自の本来値に戻す（薄さ維持）。stagger.each 0.05s / from:'random'。
  if (decorItems.length) {
    tl.to(decorItems, {
      opacity: (i) => decorOpacity[i],
      y: 0,
      duration: 0.4,
      stagger: { each: 0.05, from: 'random' },
    }, 0.2);
  }
  // メンバー集合イラスト
  tl.to(art, { opacity: 1, y: 0, duration: 0.8 }, 0.7);
  // 楕円光: メンバーが出そろった後にじわっと（art 完了の 1.5s からゆっくり 0.5s）
  if (glow) tl.to(glow, { opacity: 1, duration: 0.5, ease: 'sine.out' }, 1.5);
  // こすらぼロゴ（手書き描画は HeroLogo 側の CSS が同タイミングで走る）
  tl.to(logoSvg, { opacity: 1, y: 0, duration: 0.6 }, 1.25);
  // サブタイトル（2 行を行ごとに遅らせて）
  tl.to(taglineSpans, { opacity: 1, y: 0, duration: 0.7, stagger: 0.3 }, 2.05);
}

if (document.readyState === 'complete') setup();
else window.addEventListener('load', setup, { once: true });
