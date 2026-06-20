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
// fb7 §9（要件7・速度0.5倍）: 200 → 400。pin 区間長 (total+1)*STEP_DISTANCE_PX が2倍になり、
// 各要素の発火までのスクロール量が2倍（＝体感速度0.5倍）。duration は不変（アニメ自体の速さは据置）。
const STEP_DISTANCE_PX = 400;

// ── fb7 rev5 §1: シミ侵食を Services の reveal pin に統合（案1・STAIN_EXTRA 区間方式）──
// coffeeStain.ts の独立 pin は廃止。Services（#services）の reveal pin 末尾に専用区間を足し、
// 全カードが出揃ってからシミが「Services 固定中に」中央→四隅へ侵食する。Services のみ適用。
const STAIN_EXTRA_PX = 1100; // 旧 INVADE_PX と同値。Services pin に加算するシミ専用区間長。
const STAIN_R_MAX = 220; // --stain-r 最大（%）。rev4 §A: 220%×0.85=187%w で四隅(57%w)を確実に越える。
// B1（rev4.4 §2.3）の配分比を踏襲（edge 先行・fill 少し遅れて完成）。
const STAIN_EDGE_END = 0.4; // edge（--stain-r）拡張完了 stainP。
const STAIN_FILL_START = 0.25; // fill（--stain-fill-opacity）立ち上がり開始 stainP。
const STAIN_FILL_END = 0.55; // fill 完成 stainP。以降 1 を保持。

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

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
    document.querySelectorAll<HTMLElement>('[data-step-section]')
  );

  // pin 内に含まれる data-reveal を後段の IO モードから除外するため Set で記録
  const pinnedReveals = new Set<HTMLElement>();

  // fb7 rev5 §1.3: シミ侵食 progress 連動で works を z 降格させるための参照（侵食中だけ 9998）。
  const works = document.querySelector<HTMLElement>('.works');
  const stain = document.querySelector<HTMLElement>('[data-coffee-stain]');

  // DOM 縦順にソートしてから index で refreshPriority を付与（§5.1 順序根治）。
  // 上にあるセクションほど大きい値＝先に refresh され、その pin spacer が
  // 下のセクションの start に反映される（TechStack 救済の核）。
  stepSections
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
    .forEach((section, sectionIndex) => {
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
    const basePinLength = (total + 1) * STEP_DISTANCE_PX;

    // fb7 rev5 §1.2: Services のみ pin 末尾に STAIN_EXTRA_PX を足し、その区間をシミ専用にする。
    //   全カードは reveal 区間（先頭 basePinLength）に圧縮して収め、残り（STAIN_EXTRA 相当）でシミが進む。
    const isStainSection = section.id === 'services';
    const pinLength = basePinLength + (isStainSection ? STAIN_EXTRA_PX : 0);
    // revealRatio: reveal 区間（カード順次出現）が pin 全体に占める割合。
    //   Services: 3600/4700≒0.766。これ以降（0.766→1.0）が STAIN_EXTRA 区間＝シミ専用。
    //   非 Services: 1（全区間が reveal）。
    const revealRatio = basePinLength / pinLength;

    // 各要素が「出現済み」になる progress 閾値
    // 要素 i (0-indexed) は progress >= (i + 1) / (total + 1) で表示完了扱い。
    // Services は閾値を revealRatio で圧縮し、全カードが reveal 区間内（≦revealRatio）で出揃うようにする
    //   （pin を伸ばしてもカードがシミ専用区間に食い込まない＝「全カード後にシミ開始」を保証）。
    const thresholds = entries.map((_, i) => ((i + 1) / (total + 1)) * revealRatio);

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
      // anticipatePin は除去。Works(S5)/DevFlow(S6) の横スク pin が直前に存在するセクション
      // （TechStack 等）では先読み補正が逆に位置ずれを引き起こすため。
      invalidateOnRefresh: true,
      // DOM 上から順に大きい priority。上のセクションを先に refresh し、
      // その pin spacer を下のセクションの start に反映させる（TechStack 救済の核）。
      // 確定値（§5.1）: StudioAbout=200,Members=170,Services=140,Works-intro=110,TechStack=80。
      // 横スク/シミの値（100/90/125/40）を間に挟めるよう 30 刻みの広い間隔にする。
      refreshPriority: 200 - sectionIndex * 30,
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

        // fb7 rev5 §1.2(c): Services のみ、reveal 区間後の STAIN_EXTRA 区間でシミを set 駆動。
        //   B1（rev4.4 §2.3）の「set 駆動＝tween 競合ゼロ」パターンを踏襲（timeline tween を使わない）。
        if (isStainSection && stain) {
          // シミ専用区間 progress（revealRatio〜1.0 を 0→1 に正規化）。p<revealRatio は 0。
          const stainP = clamp01((p - revealRatio) / (1 - revealRatio));
          // edge（--stain-r）: stainP 0→EDGE_END で 0%→220% 先行。以降 220% 保持。
          const edge = stainP >= STAIN_EDGE_END ? 1 : stainP / STAIN_EDGE_END;
          // fill（--stain-fill-opacity）: stainP FILL_START→FILL_END で 0→1。以降 1 保持。
          let fill = 0;
          if (stainP >= STAIN_FILL_END) fill = 1;
          else if (stainP > STAIN_FILL_START)
            fill = (stainP - STAIN_FILL_START) / (STAIN_FILL_END - STAIN_FILL_START);
          gsap.set(stain, {
            '--stain-r': `${edge * STAIN_R_MAX}%`,
            '--stain-fill-opacity': fill,
          });
          // 侵食 progress 連動の works z 降格（侵食中だけ overlay 背面へ＝先走り二重保険・§1.3）。
          if (works) {
            if (stainP > 0 && stainP < 1) works.classList.add('is-stain-invading');
            else works.classList.remove('is-stain-invading');
          }
        }
      },
    });
  });

  // ───────────────────────────────────────────────
  // (2) IO ベース単発出現（pin 対象外の data-reveal）
  // ───────────────────────────────────────────────
  // pin セクション内の data-reveal は除外（上で処理済み）。
  // 領域 B / Hero / Works / DevFlow / Decor / WorkCard 等が対象。
  // 横スクが効く幅(768px+)のときだけ scroller 配下を IO 除外（§4.7.1 変更A'）。
  // SP(768px未満)はカードを IO 対象に残し、従来通り IO 単発フェードで表示する。
  // reduced-motion 時は手前の早期 return に入るためここに到達しない（幅だけで判定）。
  const isWide = window.matchMedia('(min-width: 768px)').matches;
  // 案 P フェーズ P（2026-06-20）: S7 TechStack を techstackReveal.ts の fixed overlay 演出に委譲。
  //   data-step-section 撤去で (1) pin パスからは自動除外されるが、(2) IO パスにも流さないようガード。
  //   PC + no-reduced-motion のときだけ overlay 内 reveal を IO 単発から除外する。
  //   ※ S2 StudioAbout の案 P は撤回済み（2026-06-20）。S2 は通常の pin+scrub 経路に戻った。
  const techstackWide = isWide && window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const allReveal = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]')
  );
  // fb7 rev9: works__intro から data-step-section を撤去（works 全体 1pin に統合）→
  //   pinnedReveals に登録されないため、PC で IO 単発フェードを発火させないよう明示除外する。
  //   reveal 駆動は horizontalZones.ts の timeline tween に一元化（scrub に乗せる GSAP 公式パターン）。
  //   横スク帯（.works__scroller 配下のカード）の IO 除外は PC のみ維持（SP は IO 単発フェード）。
  const ioTargets = allReveal.filter(
    (el) =>
      !pinnedReveals.has(el) &&
      !(isWide && el.closest('.works__scroller')) &&
      !(isWide && el.closest('.works__intro')) &&
      !(techstackWide && el.closest('[data-techstack-overlay]'))
  );

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
