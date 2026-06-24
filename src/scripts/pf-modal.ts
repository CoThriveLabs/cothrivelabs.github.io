// What: 詳細モーダル（<dialog>）の開閉と外側クリック判定。
// Why: 全カード共通 1 ファイルで完結させ、案件追加時に JS 編集を不要にする。
// Gotcha: dialog.showModal() は focus trap / ESC 閉じは効くが、body scroll は止まらない。
//         body.modal-open class で overflow:hidden を当てて背後 HP を固定する。
//         閉じる経路 (X / 外側 / ESC) すべてで class を外すため dialog の close イベントで一元解除する。

const PF_MODAL_OPEN_CLASS = 'modal-open';

const init = () => {
  // 開く
  document.querySelectorAll<HTMLButtonElement>('[data-pf-modal-open]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const slug = btn.dataset.pfModalOpen;
      const dialog = document.getElementById(`pf-modal-${slug}`) as HTMLDialogElement | null;
      if (!dialog) return;
      dialog.showModal();
      document.body.classList.add(PF_MODAL_OPEN_CLASS);
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
    // ESC / dialog.close() 経由を含め close イベントで一元的に body class を外す。
    dialog.addEventListener('close', () => {
      document.body.classList.remove(PF_MODAL_OPEN_CLASS);
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
