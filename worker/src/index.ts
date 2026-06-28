// Contact form Worker.
//
// Accepts POST /contact with JSON { name, email, message, turnstileToken }.
// Verifies Turnstile, validates input with zod, then sends two emails via
// Resend in parallel: an internal notification and a sender-side ack.
//
// Primary spam defence is Turnstile. The in-isolate Map below is a cheap
// secondary rate-limit (60s/IP); it intentionally does not span isolates
// since the realistic volume is "a few enquiries per month" and a global
// store (KV / Upstash) would add cost + ops surface for no clear gain.

import { z } from 'zod';

const Body = z.object({
  // name is interpolated into the email Subject. Reject CR/LF so a crafted
  // value cannot smuggle extra mail headers (Bcc / Reply-To etc.) past the
  // upstream provider, regardless of provider-side sanitisation guarantees.
  name: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[^\r\n]+$/, '改行文字は使用できません'),
  email: z.string().email().max(120),
  message: z.string().trim().min(10).max(2000),
  turnstileToken: z.string().min(1),
});

type Env = {
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  NOTIFY_TO: string;
  NOTIFY_FROM: string;
};

const ALLOWED_ORIGIN = 'https://cothrivelabs.com';
const RATE_LIMIT_WINDOW_MS = 60_000;

// IP -> last accepted submission timestamp (ms). isolate-local.
const rateLimit = new Map<string, number>();

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }
    if (req.method !== 'POST') {
      return cors(jsonError('method_not_allowed', 405));
    }

    const url = new URL(req.url);
    if (url.pathname !== '/contact') {
      return cors(jsonError('not_found', 404));
    }

    const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
    const now = Date.now();
    const last = rateLimit.get(ip);
    if (last !== undefined && now - last < RATE_LIMIT_WINDOW_MS) {
      return cors(jsonError('rate_limited', 429));
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return cors(jsonError('invalid_json', 400));
    }

    const parsed = Body.safeParse(payload);
    if (!parsed.success) {
      return cors(jsonError('invalid_input', 400));
    }
    const body = parsed.data;

    // Turnstile verification.
    const tsForm = new FormData();
    tsForm.append('secret', env.TURNSTILE_SECRET_KEY);
    tsForm.append('response', body.turnstileToken);
    tsForm.append('remoteip', ip);
    let turnstileOk = false;
    try {
      const tsRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body: tsForm }
      );
      const tsJson = (await tsRes.json()) as { success?: boolean };
      turnstileOk = tsJson.success === true;
    } catch {
      turnstileOk = false;
    }
    if (!turnstileOk) {
      return cors(jsonError('turnstile_failed', 400));
    }

    // Resend: notification + ack in parallel.
    const headers = {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    };

    const notifyReq = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: env.NOTIFY_FROM,
        to: env.NOTIFY_TO,
        reply_to: body.email,
        subject: `[Co-Thrive Labs] お問い合わせ: ${body.name} 様`,
        text:
          `お名前: ${body.name}\n` +
          `メール: ${body.email}\n\n` +
          `本文:\n${body.message}\n`,
      }),
    });

    const ackReq = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: env.NOTIFY_FROM,
        to: body.email,
        subject: '【Co-Thrive Labs】お問い合わせを受け付けました',
        text:
          `${body.name} 様\n\n` +
          'お問い合わせを受け付けました。平日 1〜2 営業日以内にご返信いたします。\n\n' +
          '---\n' +
          `いただいた内容:\n${body.message}\n` +
          '---\n\n' +
          'Co-Thrive Labs\n' +
          'https://cothrivelabs.com\n',
      }),
    });

    const [notifyRes, _ackRes] = await Promise.allSettled([notifyReq, ackReq]);

    // Notification must succeed. Ack failure (typo email etc.) is tolerated
    // because the internal notification already reached us.
    const notifyOk =
      notifyRes.status === 'fulfilled' && notifyRes.value.ok === true;
    if (!notifyOk) {
      return cors(jsonError('send_failed', 502));
    }

    rateLimit.set(ip, now);
    return cors(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
  },
};

function jsonError(code: string, status: number): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function cors(res: Response): Response {
  res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  res.headers.set('Access-Control-Max-Age', '86400');
  res.headers.set('Vary', 'Origin');
  return res;
}
