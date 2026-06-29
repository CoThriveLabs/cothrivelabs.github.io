// ハンバーガー jump 時にターゲットセクションのアニメを即時最終状態へ。
// Why: step-section pin scrub / layered-pin は top top 着地で progress 0 のまま固まる。
//      手動スクロールしないと中身が見えない → メニュー導線として致命的。
// 除外: Hero (heroImmersion 全体 pin) と layered-pin の親 ScrollTrigger は kill しない（体験破壊）。
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const LAYERED_PIN_ID = 'layered-pin-techstack-comingsoon';
// layered-pin scrub の進行率。0.47 で cats stagger 開始 / 0.65 = cats 出揃い完了直後 /
// 0.78 から comingsoon が登り始めるので、cats 全部見えていて techstack を覆われていない 0.65 を狙う。
const LAYERED_PIN_TARGET_PROGRESS = 0.65;

export type InstantRevealResult = { recommendedScrollY?: number };

export function instantRevealSection(targetEl: HTMLElement): InstantRevealResult {
  // 1. data-reveal / data-reveal-late を最終状態へ
  const revealEls = Array.from(
    targetEl.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-late]')
  );
  revealEls.forEach((el) => {
    gsap.set(el, {
      opacity: 1,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      overwrite: true,
    });
  });

  // 2. layered-pin の cats（autoAlpha + y） を最終状態へ
  const layeredEls = Array.from(
    targetEl.querySelectorAll<HTMLElement>('[data-layered-reveal]')
  );
  layeredEls.forEach((el) => {
    gsap.set(el, { autoAlpha: 1, y: 0, overwrite: true });
  });

  // 3. techstack heading（autoAlpha + y） を最終状態へ
  const headHead = targetEl.querySelector<HTMLElement>('.techstack__heading .section-heading__head');
  const headLead = targetEl.querySelector<HTMLElement>('.techstack__heading .section-heading__lead');
  if (headHead) gsap.set(headHead, { autoAlpha: 1, y: 0, overwrite: true });
  if (headLead) gsap.set(headLead, { autoAlpha: 1, y: 0, overwrite: true });

  // 4. target に紐づく ScrollTrigger を kill。除外: Hero と layered-pin 親。
  //    step-section pin が消えて下のコンテンツが詰まる → 後で refresh して座標再計算する。
  let layeredSt: ScrollTrigger | undefined;
  ScrollTrigger.getAll().forEach((st) => {
    if (st.vars.id === LAYERED_PIN_ID) {
      layeredSt = st;
      return;
    }
    const t = st.trigger as HTMLElement | null;
    if (!t) return;
    if (t.classList?.contains('hero')) return;
    if (t === targetEl || targetEl.contains(t)) {
      st.kill(true);
    }
  });

  ScrollTrigger.refresh();

  // 5. target が layered-pin 配下なら、pin 内の進行率 0.65 相当の scrollY を返す。
  //    layered-pin は kill しないので、その pin spacer 内に target が埋まっており、
  //    通常の scrollIntoView では pin 終端まで吹っ飛んでしまうのを防ぐ。
  if (layeredSt) {
    const trig = layeredSt.trigger as HTMLElement | null;
    if (trig && (trig === targetEl || trig.contains(targetEl) || targetEl.contains(trig))) {
      const recommendedScrollY = layeredSt.start + (layeredSt.end - layeredSt.start) * LAYERED_PIN_TARGET_PROGRESS;
      return { recommendedScrollY };
    }
  }

  return {};
}
