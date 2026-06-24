// What: DevFlow セクション ステップカード <button> 押下時の <dialog> 開閉制御。
// Why: pf-modal と同じパターンで 1 ファイル完結、ステップ追加時に JS 編集不要にする。
// Gotcha: dialog.showModal() は focus trap / ESC 閉じは効くが、body scroll は止まらない。
//         body.modal-open class で overflow:hidden を当てて背後 HP を固定する。
//         閉じる経路 (X / 外側 / ESC) すべてで class を外すため dialog の close イベントで一元解除する。

const MODAL_OPEN_CLASS = 'modal-open';

const initDevflowModal = () => {
  // 開く（カード全体 button）
  document
    .querySelectorAll<HTMLButtonElement>('[data-devflow-modal-open]')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.devflowModalOpen;
        const dialog = document.getElementById(
          `devflow-modal-${id}`
        ) as HTMLDialogElement | null;
        if (!dialog) return;
        dialog.showModal();
        document.body.classList.add(MODAL_OPEN_CLASS);
      });
    });

  // 閉じる
  document.querySelectorAll<HTMLDialogElement>('dialog.devflow-modal').forEach((dialog) => {
    dialog.querySelectorAll<HTMLButtonElement>('[data-devflow-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
    // Gotcha: 外側クリック判定は e.target === dialog のときだけ閉じる。
    // 中身は .devflow-modal__inner が受けるため、中身のクリックでは target が inner 側になり閉じない。
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    // ESC / dialog.close() 経由を含め close イベントで一元的に body class を外す。
    dialog.addEventListener('close', () => {
      document.body.classList.remove(MODAL_OPEN_CLASS);
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDevflowModal, { once: true });
} else {
  initDevflowModal();
}
