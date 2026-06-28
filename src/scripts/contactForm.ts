// S9 Contact フォーム送信。Turnstile token を JSON にまとめて Worker API に POST。
// 成功・失敗で aria-live 領域の文言を切替え、ボタン disabled で多重送信を防ぐ。

declare global {
  interface Window {
    turnstile?: {
      reset: (widgetId?: string) => void;
    };
  }
}

const FALLBACK_CONTACT = 'contact@cothrivelabs.com';

const MESSAGES = {
  pending: '送信中です…',
  success: '送信しました。確認メールをお送りしています。',
  turnstileMissing:
    'スパム判定の確認が完了していません。少し待ってから再度お試しください。',
  inputInvalid: '入力内容を確認してください。',
  rateLimited:
    '短時間に複数回送信されました。1 分ほど時間をおいてお試しください。',
  sendFailed: `送信に失敗しました。お手数ですが ${FALLBACK_CONTACT} まで直接ご連絡ください。`,
  networkDown: `ネットワーク不通です。お手数ですが ${FALLBACK_CONTACT} まで直接ご連絡ください。`,
} as const;

function init() {
  const form = document.querySelector<HTMLFormElement>('.contact__form');
  if (!form) return;

  const button = form.querySelector<HTMLButtonElement>('.contact__button');
  const status = form.querySelector<HTMLElement>('[data-contact-status]');
  const apiUrl = import.meta.env.PUBLIC_CONTACT_API_URL as string | undefined;

  if (!button || !status) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!apiUrl) {
      // env 未設定。本番ビルドでは Astro が build time に埋め込むため
      // ここに来るのは設定漏れのとき。ユーザーには汎用文言で誘導。
      status.textContent = MESSAGES.sendFailed;
      return;
    }

    const fd = new FormData(form);
    const token = fd.get('cf-turnstile-response');
    if (typeof token !== 'string' || token.length === 0) {
      status.textContent = MESSAGES.turnstileMissing;
      return;
    }

    button.disabled = true;
    status.textContent = MESSAGES.pending;

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          message: fd.get('message'),
          turnstileToken: token,
        }),
      });

      if (res.ok) {
        status.textContent = MESSAGES.success;
        form.reset();
        // Turnstile widget を再描画して次回送信に備える。
        window.turnstile?.reset();
      } else if (res.status === 429) {
        status.textContent = MESSAGES.rateLimited;
      } else if (res.status === 400) {
        status.textContent = MESSAGES.inputInvalid;
      } else {
        status.textContent = MESSAGES.sendFailed;
      }
    } catch {
      status.textContent = MESSAGES.networkDown;
    } finally {
      button.disabled = false;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export {};
