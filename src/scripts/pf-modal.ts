// What: 詳細モーダル（<dialog>）の開閉と外側クリック判定。
// Why: 全カード共通 1 ファイルで完結させ、案件追加時に JS 編集を不要にする。
// Gotcha: dialog.showModal() で focus trap / body scroll lock / ESC 閉じが標準で効く。show() ではダメ。

const init = () => {
  // 開く
  document.querySelectorAll<HTMLButtonElement>('[data-pf-modal-open]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const slug = btn.dataset.pfModalOpen;
      const dialog = document.getElementById(`pf-modal-${slug}`) as HTMLDialogElement | null;
      dialog?.showModal();
    });
  });

  // 閉じる
  document.querySelectorAll<HTMLDialogElement>('dialog.pf-modal').forEach((dialog) => {
    // 閉じるボタン群
    dialog.querySelectorAll<HTMLButtonElement>('[data-pf-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
    // Gotcha: 外側クリック判定は e.target === dialog のときだけ閉じる。
    // 中身は .pf-modal__inner が受けるため、中身のクリックでは target が inner 側になり閉じない。
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
