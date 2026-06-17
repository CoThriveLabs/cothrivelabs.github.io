// 横スク 2 ゾーン（設計書 §5.5 / §6 Phase 4 タスク D / 仕様書 v1 F3）。
// S5 Works = ステップ送り（pin + snap・1 枚ずつ吸着）
// S6 DevFlow = scrub 連続（pin + scrub・5 段連続横移動）
//
// gsap.matchMedia で (min-width: 768px) かつ非 reduced-motion のみ pin 有効。
// SP / reduced-motion は CSS 既定の縦積みのまま JS 介入しない（§5.5）。
// matchMedia の cleanup で revert（リサイズ時の二重 pin 防止・§6 Phase 4 タスク D 着手手順 4）。
//
// reveal.ts(B) / bgGradient.ts(C) との分離: 別ファイル・別インスタンス。
// bgGradient との干渉（Q-α5）: pin は DOM transform を touch するが、bgGradient は
// transform を読まず `--bg-current` のみ書くため物理干渉なし。発火タイミングのみ
// 観測（Phase 4 実機）。bgGradient は section 全体を観測しており、pin で section の
// レイアウト高さが伸びた状態でも中央帯交差は連続的に保たれる（DevFlow 入域 →
// pin 区間 → TechStack 入域 が DOM 順で連続）。三次実機で干渉なし確認済み。
//
// 【重要・三次で真因確定した実装パターン (Astro + GSAP ScrollTrigger)】
// Astro の <script type="module"> は defer 相当で DOMContentLoaded 前後に走るが、
// その時点では fonts (Fontsource self-host) / images が未ロードで section の最終
// top 位置が確定していない。ScrollTrigger は登録時に start/end を測定固定するため、
// その時点で計算すると pin の start 位置がずれて pin が永遠に発火しない症状になる
// （ IntersectionObserver は lazy 評価のため timing 影響なし。ScrollTrigger 特有）。
// → window.load 完了を待ってから matchMedia 登録 + ScrollTrigger.refresh() で確定。
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function setup() {
  const mm = gsap.matchMedia();

  // PC（≥768px）かつ reduced-motion 非希望時のみ pin 発動。
  mm.add(
    {
      isDesktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
    },
    (ctx) => {
      if (!ctx.conditions?.isDesktop) return;

      // ─────────────────────────────────────────────
      // S5 Works: ステップ送り（pin + snap）
      // ─────────────────────────────────────────────
      const worksSection = document.querySelector<HTMLElement>('.works');
      const worksList = document.querySelector<HTMLElement>('.works__list');
      if (worksSection && worksList) {
        const cards = worksList.querySelectorAll<HTMLElement>(':scope > *');
        const cardCount = cards.length;
        if (cardCount > 1) {
          // 横移動量 = (カード総幅) - (viewport 1 枚ぶん)
          // scrollWidth は flex row 化された後の実寸（CSS で row 化済み前提）。
          const totalScroll = () => worksList.scrollWidth - worksSection.clientWidth;

          gsap.to(worksList, {
            x: () => -totalScroll(),
            ease: 'none',
            scrollTrigger: {
              trigger: worksSection,
              start: 'top top',
              // カード枚数 × viewport 1 枚ぶんの pin 区間を確保。
              end: () => `+=${totalScroll()}`,
              pin: true,
              scrub: 1,
              snap: {
                snapTo: 1 / (cardCount - 1),
                duration: { min: 0.2, max: 0.5 },
                ease: 'power1.inOut',
              },
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          });
        }
      }

      // ─────────────────────────────────────────────
      // S6 DevFlow: scrub 連続（pin + scrub・5 段横移動）
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
            },
          });
          // 線が伸びる SVG コネクタ（§5.5）は段階実装可。まず横移動のみ完成させ、余裕で追加。
        }
      }

      // load 後の最終 refresh（section 位置確定後に pin start/end を再計算固定）。
      ScrollTrigger.refresh();
    }
  );
}

// fonts/images の最終ロード完了後に setup（pin start/end の測定対象 = section 最終位置を確定するため）。
// 設計書 §6 タスク D「Astro fonts/images ロード待ちパターン」参照。
if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
