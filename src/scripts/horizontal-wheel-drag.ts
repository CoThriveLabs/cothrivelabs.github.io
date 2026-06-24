// What: 横スクロール帯（.works__list / .devflow__list）の UX 拡張。
//   - クリック・ドラッグスクロール・wheel→横スク変換・テキスト選択防止を両立。
// Why: Embla Carousel DragHandler.ts と同パターン。
//   wheel は要素レベル listener だと届かないケースがあるため window レベルで一元処理。
// Gotcha:
//   - pointerdown で preventDefault すると compat mousedown/mouseup が抑制され子の focus/click が壊れる
//     （whatwg/dom Issue #917）。preventDefault は pointermove で閾値超え後だけ呼ぶ。
//   - wheel は { passive: false } 必須（preventDefault するため）、closest() で対象要素判定。

type Cleanup = () => void;

const DRAG_THRESHOLD = 6;
const WHEEL_TARGET_SELECTOR = '.works__list, .devflow__list';

// === wheel: window レベルで一元処理 ===
function attachGlobalWheel(): Cleanup {
  const onWheel = (e: WheelEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const list = target.closest(WHEEL_TARGET_SELECTOR) as HTMLElement | null;
    if (!list) return;

    if (e.shiftKey) return;
    const dy = e.deltaY;
    if (Math.abs(dy) < Math.abs(e.deltaX)) return; // 既に横優位なら触らない

    const max = list.scrollWidth - list.clientWidth;
    if (max <= 0) return; // 横スク余地なし → 縦スクに譲る

    const atStart = list.scrollLeft <= 0 && dy < 0;
    const atEnd = list.scrollLeft >= max - 0.5 && dy > 0;
    if (atStart || atEnd) return; // 末端 → 縦スクに譲る

    e.preventDefault();
    list.scrollLeft += dy;
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  return () => window.removeEventListener('wheel', onWheel as EventListener);
}

// === pointer: 要素レベル（Embla 方式そのまま）===
function attachPointerDrag(el: HTMLElement): Cleanup {
  let pointerId: number | null = null;
  let startX = 0;
  let startScrollLeft = 0;
  let preventClick = false;

  const onDragStart = (e: Event) => e.preventDefault();

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const tag = (e.target as Element | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    // pointerdown では preventDefault しない（子の focus/click を壊さないため）

    pointerId = e.pointerId;
    startX = e.clientX;
    startScrollLeft = el.scrollLeft;
    preventClick = false;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    const dx = e.clientX - startX;

    if (!preventClick && Math.abs(dx) > DRAG_THRESHOLD) {
      preventClick = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
      window.getSelection?.()?.removeAllRanges();
    }

    if (preventClick) {
      el.scrollLeft = startScrollLeft - dx;
      if (e.cancelable) e.preventDefault();
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    pointerId = null;
  };

  const onClickCapture = (e: MouseEvent) => {
    if (preventClick) {
      e.stopPropagation();
      e.preventDefault();
      preventClick = false;
    }
  };

  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('click', onClickCapture, true);

  return () => {
    el.removeEventListener('dragstart', onDragStart);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);
    el.removeEventListener('click', onClickCapture, true);
  };
}

// === init ===
const ATTACHED_KEY = '__horizontalWheelDragAttached';

const initHorizontalWheelDrag = () => {
  if ((window as unknown as Record<string, boolean>)[ATTACHED_KEY]) return;
  (window as unknown as Record<string, boolean>)[ATTACHED_KEY] = true;

  attachGlobalWheel();

  ['.works__list', '.devflow__list'].forEach((sel) => {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      attachPointerDrag(el);
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHorizontalWheelDrag, { once: true });
} else {
  initHorizontalWheelDrag();
}
