// 既に計測済みの bottom 値（コンテナ上端と同じ基準の座標系）から fits 判定だけを行う。
// 呼び出し側が別の理由（fallback 発火の座標キャッシュ等）で既に getBoundingClientRect() 済みのときに
// fitsViewport の内部でもう一度同じ要素を測り直す無駄を避けるために分離してある。
export function fitsFromRects(containerTop: number, bottoms: number[]): boolean {
  if (!bottoms.length) return true;
  const maxBottom = Math.max(...bottoms);
  return maxBottom - containerTop <= window.innerHeight;
}

// 対象要素群の最下端が、コンテナ上端から window.innerHeight 以内に収まるかを判定する。
// pin/layered-pin どちらも `start: 'top top'`（コンテナ上端が viewport 上端に揃う）前提のため、
// 「コンテナ上端からの距離」と「viewport 高さ」の比較がそのまま pin 中に見える範囲の判定になる。
// Gotcha: 個々の要素の getBoundingClientRect() は祖先の overflow:hidden / max-height の影響を
// 受けない（クリップは描画時のみで、子要素自身のレイアウト寸法は変わらない）ため、
// pinned CSS が既に適用された状態で呼んでも計測値は狂わない。
// Gotcha: 呼び出し側の要素に初期 transform（CSS 焼き込み or GSAP 適用済み）が乗っていると、
// この関数はその変形済みの位置を計測してしまう。FOUC 防止で transform が焼き込まれている
// 要素を対象にする場合は、呼び出し側で transform を一時的に無効化してから呼ぶこと。
export function fitsViewport(container: HTMLElement, targets: HTMLElement[]): boolean {
  if (!targets.length) return true;
  const containerTop = container.getBoundingClientRect().top;
  return fitsFromRects(containerTop, targets.map((el) => el.getBoundingClientRect().bottom));
}

// フォント読み込み完了後に実行する（実測がフォント swap 前の暫定サイズにならないように）。
// document.fonts 非対応ブラウザは即実行にフォールバック。
export function whenFontsReady(cb: () => void): void {
  const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready?.then) {
    fonts.ready.then(cb, cb);
  } else {
    cb();
  }
}

// リサイズ時の再判定用。デバウンスして返す cleanup で listener を解除できる。
export function onResize(cb: () => void, debounceMs = 200): () => void {
  let timer: number | undefined;
  const handler = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(cb, debounceMs);
  };
  window.addEventListener('resize', handler);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener('resize', handler);
  };
}
