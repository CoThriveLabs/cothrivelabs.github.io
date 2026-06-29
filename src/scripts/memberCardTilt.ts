// メンバーカード カーソル追従 tilt。
// 強さ=中（±15deg / ±30px）・戻し=0.6s。
//
// Why:
//   - 外殻 `.member-card` は reveal.ts のポップ tween（translateY/rotate/scale）を持つので
//     tilt の transform は inner `.member-card__tilt` に閉じる（干渉ゼロ）。
//   - GSAP quickTo を rotation 系 / translate 系の 2 層で持ち、mousemove ごとに値を流す。
//   - mouseleave で全パラメータを 0 に戻す（同 quickTo・duration 0.6s で戻る）。
//   - タッチ端末（pointer: fine 偽）・prefers-reduced-motion: reduce では何もしない。
import { gsap } from 'gsap';

const TILT_MAX_DEG = 15;   // ±15deg（X/Y 軸 rotation）
const TILT_MAX_PX = 30;    // ±30px（X/Y translate）
const DURATION = 0.6;      // 戻し / 追従の quickTo duration
const EASE = 'power3.out';

function setupCard(card: HTMLElement) {
  // tilt の transform を載せる inner。万一構造が古くて __tilt が無ければカード本体に fallback。
  const target = (card.querySelector('.member-card__tilt') as HTMLElement) ?? card;

  const setRotX = gsap.quickTo(target, 'rotationX', { duration: DURATION, ease: EASE });
  const setRotY = gsap.quickTo(target, 'rotationY', { duration: DURATION, ease: EASE });
  const setTx = gsap.quickTo(target, 'x', { duration: DURATION, ease: EASE });
  const setTy = gsap.quickTo(target, 'y', { duration: DURATION, ease: EASE });

  const onMove = (e: MouseEvent) => {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // -1..1 に正規化
    const nx = (e.clientX - cx) / (rect.width / 2);
    const ny = (e.clientY - cy) / (rect.height / 2);
    // vertical tilt は反転して「カーソル方向へ顔を向ける」自然な傾きにする
    setRotY(nx * TILT_MAX_DEG);
    setRotX(-ny * TILT_MAX_DEG);
    setTx(nx * TILT_MAX_PX);
    setTy(ny * TILT_MAX_PX);
  };

  const onLeave = () => {
    setRotX(0);
    setRotY(0);
    setTx(0);
    setTy(0);
  };

  card.addEventListener('mousemove', onMove);
  card.addEventListener('mouseleave', onLeave);
}

function init() {
  // タッチ端末は何もしない（hover 自体無いため）。
  if (!window.matchMedia('(pointer: fine)').matches) return;
  // モーション削減ユーザーには動かさない。
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = document.querySelectorAll<HTMLElement>('.member-card');
  cards.forEach(setupCard);
}

window.addEventListener('load', init);
