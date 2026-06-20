// 横スク 2 ゾーン。
//   Works   = ステップ送り（pin + snap・1 枚ずつ吸着）
//   DevFlow = scrub 連続（pin + scrub・5 段連続横移動）
//
// gsap.matchMedia で (min-width: 768px) かつ非 reduced-motion のみ pin 有効。
// SP / reduced-motion は CSS 既定の縦積みのまま JS 介入しない。
// matchMedia の cleanup で revert（リサイズ時の二重 pin 防止）。
//
// 他スクリプトとの分離:
//   - reveal.ts / bgGradient.ts とは別ファイル・別インスタンス。
//   - bgGradient は `--bg-current` のみ書く（DOM transform は触らない）ので、pin 中も干渉ゼロ。
//
// Gotcha:
//   Astro の <script type="module"> は defer 相当で DOMContentLoaded 前後に走るが、
//   その時点では fonts/images 未ロードで section の最終 top 位置が確定していない。
//   ScrollTrigger は登録時に start/end を測定固定するため、その段階で計算すると
//   pin start 位置がずれて pin が永遠に発火しない症状になる
//   （IntersectionObserver は lazy 評価のため timing 影響なし。ScrollTrigger 特有）。
//   → window.load 完了を待ってから matchMedia 登録 + ScrollTrigger.refresh() で確定。
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// カード帯「右から登場」区間の長さ（px）。reveal.ts の STEP_DISTANCE_PX(=400) と同値で速度感を揃える。
// 横スク本体（centeredTotal）は据置。
const ENTER_PX = 400;
// works 全体 1pin 化の reveal 区間（見出し+説明文を順次表示）長さ（px）。
// reveal.ts STEP_DISTANCE_PX(=400) と同値（速度感を他セクションと揃える）。
const REVEAL_PX = 400;

function setup() {
  const mm = gsap.matchMedia();

  // PC（≥768px）かつ reduced-motion 非希望時のみ pin 発動。
  // SP / reduce 時は CSS 既定の縦積みでカードを reveal.ts の IO 単発フェードで表示する。
  mm.add(
    {
      isDesktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
    },
    (ctx) => {
      if (!ctx.conditions?.isDesktop) return;

      // cleanup から参照するため callback スコープに保持（個別カードではなく帯ごと制御）。
      let worksBand: HTMLElement | null = null;

      // ─────────────────────────────────────────────
      // Works: 帯が右から登場 → 中央停止 → 横スク
      // works 全体 1pin 統合 + reveal を timeline tween で scrub 駆動（公式パターン）。
      //   reveal を ScrollTrigger.onUpdate ではなく timeline.fromTo() として scrub に乗せることで
      //   scrub:1 + onUpdate gsap.to 衝突パターンを構造的に回避する。
      //   pin 対象: .works 全体（intro + scroller を 1 つの viewport に収める）。
      // ─────────────────────────────────────────────
      const worksWhole = document.querySelector<HTMLElement>('.works');
      const worksSection = document.querySelector<HTMLElement>('.works__scroller');
      const worksList = document.querySelector<HTMLElement>('.works__list');
      const worksIntro = document.querySelector<HTMLElement>('.works__intro');
      // SectionHeading.astro 内の data-reveal 構造（h2 ラッパ → lead）:
      //   .section-heading__head[data-reveal]（h2 を含む見出しブロック）と
      //   .section-heading__lead[data-reveal]（リード文）の 2 つ。
      const introReveals = worksIntro
        ? Array.from(worksIntro.querySelectorAll<HTMLElement>('[data-reveal]'))
        : [];
      const revealH2: HTMLElement | null = introReveals[0] ?? null;
      const revealLead: HTMLElement | null = introReveals[1] ?? null;

      // cleanup 用に保持。
      let revealH2Ref: HTMLElement | null = revealH2;
      let revealLeadRef: HTMLElement | null = revealLead;

      if (worksWhole && worksSection && worksList) {
        const cards = worksList.querySelectorAll<HTMLElement>(':scope > *');
        const cardCount = cards.length;
        if (cardCount > 1) {
          const firstCard = cards[0];

          const cardEls = Array.from(cards) as HTMLElement[];
          gsap.set(cardEls, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 });
          worksBand = worksList;

          // startX: 最初のカードが viewport 中央に来る x 座標。
          // listLeft = worksList 左端と worksSection 左端の距離（既存 padding 等で変わるため動的計測）。
          // Gotcha: pin 対象が .works（worksWhole）で worksSection には transform が付かない一方、
          //   worksList には GSAP が transform を付ける（pin 中・初期 set 後とも）。
          //   getBoundingClientRect().left は transform 込みの値を返すため、両者を素直に引くと
          //   transform 残留で計算が汚染される。
          //   → 現在の x を gsap.getProperty で取り出して引き、worksList の素 left に戻してから差を取る。
          const getStartX = () => {
            const viewportW = worksSection.clientWidth;
            const cardW = firstCard.offsetWidth;
            const currentX = (gsap.getProperty(worksList, 'x') as number) || 0;
            const listLeft =
              worksList.getBoundingClientRect().left -
              currentX -
              worksSection.getBoundingClientRect().left;
            return (viewportW - cardW) / 2 - listLeft;
          };

          // centeredTotal: 最初→最後のカードを中央に運ぶ全スクロール量。
          const getCenteredTotal = () => worksList.scrollWidth - firstCard.offsetWidth;

          // enterStartX: 帯の登場開始位置（画面右外＝startX + ビューポート幅）。
          const getEnterStartX = () => getStartX() + worksSection.clientWidth;

          // 初期位置: 帯は画面右外。reveal 要素は不可視（pin 開始まで非表示で待機）。
          gsap.set(worksList, { opacity: 1, x: () => getEnterStartX() });
          if (revealH2) gsap.set(revealH2, { opacity: 0, y: 20, x: 0, rotation: 0, scale: 1 });
          if (revealLead) gsap.set(revealLead, { opacity: 0, y: 20, x: 0, rotation: 0, scale: 1 });

          // pin 区間長 = REVEAL_PX（見出し+lead 順次出現）+ ENTER_PX（帯登場）+ centeredTotal（横スク本体）。
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: worksWhole,
              start: 'top top',
              end: () => `+=${REVEAL_PX + ENTER_PX + getCenteredTotal()}`,
              pin: worksWhole,
              pinSpacing: true,
              scrub: 1,
              snap: {
                // reveal/enter は吸着なし。scroll 区間のみカード単位 snap。
                snapTo: (value: number) => {
                  const total = REVEAL_PX + ENTER_PX + getCenteredTotal();
                  const rRatio = REVEAL_PX / total;
                  const eRatio = (REVEAL_PX + ENTER_PX) / total;
                  if (value < rRatio) return value;
                  if (value < eRatio) return value;
                  const p = (value - eRatio) / (1 - eRatio);
                  return eRatio + (Math.round(p * (cardCount - 1)) / (cardCount - 1)) * (1 - eRatio);
                },
                duration: { min: 0.2, max: 0.5 },
                ease: 'power1.inOut',
              },
              invalidateOnRefresh: true,
              anticipatePin: 1,
              // refreshPriority 降順: StudioAbout200 > Members170 > Services140 > Works110 > DevFlow90 > TechStack80。
              refreshPriority: 110,
              // リサイズ/fonts ロード後の保険。pin 開始前（progress=0）は worksList を
              // 右外に強制 set し、初期状態で画面内にカードが見えてしまうのを防ぐ。
              onRefresh: (self) => {
                if (self.progress === 0) {
                  gsap.set(worksList, { x: getEnterStartX() });
                }
              },
              // onUpdate は使わない（scrub:1 + onUpdate gsap.to は競合するため timeline tween に一元化）。
            },
          });

          // 時間軸正規化（duration の単位を ENTER_PX に揃える既存規約）。
          const revealDur = REVEAL_PX / ENTER_PX; // = 1.0
          const enterDur = 1;
          const scrollDur = getCenteredTotal() / ENTER_PX;

          // ── reveal 区間 (0 〜 revealDur)：見出し → lead を順次出現（timeline tween）──
          // 区間長 1.0 のうち、h2 を 0〜0.4、lead を 0.4〜0.8 で表示。
          if (revealH2) {
            tl.fromTo(
              revealH2,
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
              0
            );
          }
          if (revealLead) {
            tl.fromTo(
              revealLead,
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
              0.4
            );
          }
          // 帯は reveal 中ずっと右外で静止させる。
          // fromTo で from/to を両方 getEnterStartX() に固定し、進行度 0〜revealDur の間 x が
          // 画面内から動く tween を完全に排除する（pin 開始の瞬間に右外 jump）。
          // tl.to だけだと from=現在値(x:0 画面内) → to=getEnterStartX(右外) として作用してしまい、
          // reveal 中にカードが右へ流れて消える挙動になるため、fromTo で明示固定する。
          tl.fromTo(
            worksList,
            { x: () => getEnterStartX() },
            { x: () => getEnterStartX(), duration: revealDur, ease: 'none' },
            0
          );

          // ── enter 区間 (revealDur 〜 revealDur+enterDur)：帯が右外 → 中央へ ──
          tl.fromTo(
            worksList,
            { x: () => getEnterStartX() },
            { x: () => getStartX(), ease: 'power3.out', duration: enterDur },
            revealDur
          );

          // ── scroll 区間：横スク本体（リニア・既存ロジック据置） ──
          tl.fromTo(
            worksList,
            { x: () => getStartX() },
            { x: () => getStartX() - getCenteredTotal(), ease: 'none', duration: scrollDur },
            revealDur + enterDur
          );
        }
      }

      // ─────────────────────────────────────────────
      // DevFlow: scrub 連続（pin + scrub・5 段横移動）
      // ─────────────────────────────────────────────
      const devflowSection = document.querySelector<HTMLElement>('.devflow');
      const devflowList = document.querySelector<HTMLElement>('.devflow__list');
      if (devflowSection && devflowList) {
        const steps = devflowList.querySelectorAll<HTMLElement>(':scope > *');
        if (steps.length > 1) {
          const totalScroll = () => devflowList.scrollWidth - devflowSection.clientWidth;

          gsap.to(devflowList, {
            x: () => -totalScroll(),
            ease: 'none',
            scrollTrigger: {
              trigger: devflowSection,
              start: 'top top',
              end: () => `+=${totalScroll()}`,
              pin: true,
              scrub: true, // 連続 scrub（スクロール量にリニア連動）
              invalidateOnRefresh: true,
              anticipatePin: 1,
              // refreshPriority: TechStack(80) の直前で 90。
              refreshPriority: 90,
            },
          });
        }
      }

      // 初期 refresh のみ（section 位置確定後に pin start/end を再計算固定）。
      // rAF×2 の最終 refresh は最終 script（coffeeStain.ts）へ集約。
      // 各 script で個別に rAF refresh すると登録途中の中間状態で何度も測り直し競合するため。
      ScrollTrigger.refresh();

      // PC 条件を外れて revert される瞬間（= SP に縮む等）に帯と見出し+lead を表示へ戻す。
      // これがないと revert 後 worksList が opacity:0 のまま残りカードが消える。
      return () => {
        if (worksBand) {
          gsap.set(worksBand, { opacity: 1, x: 0 });
        }
        if (revealH2Ref) {
          gsap.set(revealH2Ref, { opacity: 1, y: 0 });
        }
        if (revealLeadRef) {
          gsap.set(revealLeadRef, { opacity: 1, y: 0 });
        }
      };
    }
  );
}

// fonts/images の最終ロード完了後に setup（pin start/end の測定対象 = section 最終位置を確定するため）。
if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
