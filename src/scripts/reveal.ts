// 出現アニメ（設計書 §5.6 / 仕様書 v1.3 F4-b・2026-06-18 四次 FB 反映: pin + scrub 順次出現へ全面リワーク）。
//
// あめさん明示意図（2026-06-18 四次 FB）:
//   「スクロール入力＝画面が下に下がる、の固定概念を捨てる」
//   「各セクションは pin で画面に固定され、pin 中のスクロール量に応じて
//     内部要素が 1 つずつ順次表示される。全要素出たら pin 解除 → 次セクションへ自然遷移」
//   「ボタンを押すごとにカードが 1 枚追加される、と同じ挙動（ただしスクロール連動）」
//
// 参考サイト: https://sobajima.jp/120th-anniversary/（「これまでのあゆみ」セクション）
//
// 二系統:
//   (1) `[data-step-section]` を持つ section → pin + scrub 順次出現
//        対象: S2 StudioAbout / S3 Members / S4 Services / S7 TechStack
//        section 全体を pin、pin 中の progress に応じて内部 `[data-reveal]` を順次表示
//        要素 i の発火 progress: i / (totalCount + 1)
//        全要素出た時点（progress = totalCount / (totalCount + 1)）で pin 解除へ自然遷移
//        pin 区間長: 要素数 × STEP_DISTANCE_PX（既定 200px ≒ 2 wheel スクロール）
//   (2) 上記以外の `[data-reveal]` → 従来通り IO ベースの単発出現
//        対象: Hero / Works / DevFlow / 領域 B (ComingSoon / Contact) / Decor / WorkCard 等
//        画面入域時に 1 回だけフェード（pin なし）
//
// アニメ種別（両モード共通）:
//   - `.member-card` クラス: ポップ・斜め飛び込み + 反動
//       初期: opacity:0, x:-80, y:200, rotate:-15deg, scale:0.8
//       終了: opacity:1, x:0, y:0, rotate:0, scale:1
//       duration 0.6s / ease 'back.out(2.2)'
//   - それ以外（テキスト・見出し・リード文・カード以外）: フェード
//       初期: opacity:0, y:20
//       終了: opacity:1, y:0
//       duration 0.4s / ease 'power2.out'
//
// reduced-motion:
//   pin 化せず、全要素を即時表示（gsap.set で初期状態を打ち消し）。
//
// 他スクリプトとの干渉:
//   - bgGradient.ts(C): `--bg-current` CSS 変数のみ書く → DOM プロパティ非干渉。
//        pin 中も section 全体が中央帯と継続交差するため §5.4.1 のロジックで正しく動く。
//   - parallax.ts(G): `transform yPercent` scrub。同じ要素に data-reveal + data-parallax が
//        付くケース（Decor）は、Decor は IO モード（pin 対象外 section にあるため）→ 干渉なし。
//   - horizontalZones.ts(D): S5 Works / S6 DevFlow は pin 対象外（既存横スク pin 維持）→ 棲み分け。
//
// タスク D §5.5.1 で確定した実装パターン適用:
//   - window.load 後に ScrollTrigger 登録 + ScrollTrigger.refresh()
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// pin + scrub 各要素間の pin 区間長（px / 要素 1 つあたり）。
// 200px ≒ 2 wheel スクロールぶん（あめさん指示「約 2 wheel スクロール」）。
const STEP_DISTANCE_PX = 200;

// テキストフェード（カード以外）
const TEXT_DURATION_S = 0.4;
const TEXT_Y_PX = 20;

// メンバーカード = 斜め飛び込み + 反動
const CARD_DURATION_S = 0.6;
const CARD_Y_PX = 200;
const CARD_X_PX = -80;
const CARD_ROT_DEG = -15;
const CARD_SCALE = 0.8;

type Entry = { el: HTMLElement; isCard: boolean };

function isCardEl(el: HTMLElement): boolean {
  return el.classList.contains('member-card') || el.dataset.reveal === 'card';
}

function setInitialState(el: HTMLElement, isCard: boolean) {
  if (isCard) {
    gsap.set(el, {
      opacity: 0,
      y: CARD_Y_PX,
      x: CARD_X_PX,
      rotation: CARD_ROT_DEG,
      scale: CARD_SCALE,
    });
  } else {
    gsap.set(el, { opacity: 0, y: TEXT_Y_PX, x: 0, rotation: 0, scale: 1 });
  }
}

function playReveal(el: HTMLElement, isCard: boolean) {
  if (isCard) {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: CARD_DURATION_S,
      ease: 'back.out(2.2)',
      overwrite: true,
    });
  } else {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: TEXT_DURATION_S,
      ease: 'power2.out',
      overwrite: true,
    });
  }
}

function setup() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ───────────────────────────────────────────────
  // reduced-motion: 全 [data-reveal] を即時表示・pin なし
  // ───────────────────────────────────────────────
  if (reduceMotion) {
    const all = document.querySelectorAll<HTMLElement>('[data-reveal]');
    gsap.set(Array.from(all), { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 });
    return;
  }

  // ───────────────────────────────────────────────
  // (1) pin + scrub 順次出現セクション
  // ───────────────────────────────────────────────
  // `[data-step-section]` を持つ section を pin、内部 `[data-reveal]` を順次表示。
  // 順次表示の順序 = section 内の DOM 順（querySelectorAll 自然順）。
  // 入れ子の section（万が一）は外側のみ拾う想定。
  const stepSections = Array.from(
    document.querySelectorAll<HTMLElement>('section[data-step-section]')
  );

  // pin 内に含まれる data-reveal を後段の IO モードから除外するため Set で記録
  const pinnedReveals = new Set<HTMLElement>();

  stepSections.forEach((section) => {
    // section 内の全 [data-reveal] を DOM 順に拾う（section 全体スコープ）。
    const revealEls = Array.from(
      section.querySelectorAll<HTMLElement>('[data-reveal]')
    );
    if (!revealEls.length) return;

    const entries: Entry[] = revealEls.map((el) => {
      const isCard = isCardEl(el);
      pinnedReveals.add(el);
      return { el, isCard };
    });

    // 初期状態を JS でも担保（CSS と二重・チラ見え防止）。
    entries.forEach(({ el, isCard }) => setInitialState(el, isCard));

    const total = entries.length;
    // pin 区間長 = (total + 1) × STEP_DISTANCE_PX
    // +1 余白: 最終要素が出てから pin 解除まで少し余白を取り、急遷移を避ける。
    const pinLength = (total + 1) * STEP_DISTANCE_PX;

    // 各要素が「出現済み」になる progress 閾値
    // 要素 i (0-indexed) は progress >= (i + 1) / (total + 1) で表示完了扱い
    const thresholds = entries.map((_, i) => (i + 1) / (total + 1));

    // 表示状態を覚えておくフラグ（双方向スクロール対応）
    const shown = entries.map(() => false);

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${pinLength}`,
      pin: true,
      // scrub true: スクロール量で progress が連続的に動く。
      // ただしアニメ自体は閾値またぎ時に gsap.to で別途再生（scrub に直接乗せない）→
      // カードのポップ・反動が「進行度に張り付く」のではなく、閾値通過の瞬間に
      // 1 度きり再生される（ボタンクリックでカード追加のようなトンッとした出現）。
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        entries.forEach(({ el, isCard }, i) => {
          if (!shown[i] && p >= thresholds[i]) {
            shown[i] = true;
            playReveal(el, isCard);
          } else if (shown[i] && p < thresholds[i] - 0.01) {
            // 双方向: 上スクロールで progress が閾値を下回ったら初期状態に戻す
            // （-0.01 はチャタリング防止のヒステリシス）
            shown[i] = false;
            setInitialState(el, isCard);
          }
        });
      },
    });
  });

  // ───────────────────────────────────────────────
  // (2) IO ベース単発出現（pin 対象外の data-reveal）
  // ───────────────────────────────────────────────
  // pin セクション内の data-reveal は除外（上で処理済み）。
  // 領域 B / Hero / Works / DevFlow / Decor / WorkCard 等が対象。
  const allReveal = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]')
  );
  const ioTargets = allReveal.filter((el) => !pinnedReveals.has(el));

  if (ioTargets.length) {
    ioTargets.forEach((el) => {
      const isCard = isCardEl(el);
      setInitialState(el, isCard);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            playReveal(el, isCardEl(el));
            io.unobserve(el);
          }
        });
      },
      {
        // 中央帯やや早出し（IO は要素単位・section に縛られず素直に入域で発火）。
        threshold: 0.08,
        rootMargin: '0px 0px -8% 0px',
      }
    );
    ioTargets.forEach((el) => io.observe(el));
  }

  // fonts/images ロード完了後の最終 refresh（§5.5.1 A / タスク D 知見）。
  ScrollTrigger.refresh();
}

if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
