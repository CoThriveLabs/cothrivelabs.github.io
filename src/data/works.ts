import type { WorkDetail } from './works.types';

// What: ぎじろっと案件の完成データ。モーダル全項目埋め済み。
// Why: 1 案件で UI 完成度を担保し、他案件は後日 tagline 等を埋めるだけで詳細モーダル対応できる。
export const gizirotto: WorkDetail = {
  slug: 'gizirotto',

  title: 'ぎじろっと',
  subtitle: '家族の議事録 AI',
  thumbnail: '/works/gizirotto-thumb.svg',
  challenge:
    '議事録ツールの多くは会社の会議向けで、家族会議や家計報告など「家庭の議事録」は書式が揺れがちでした。',
  summary:
    '家族向けに振り切ったテンプレート議事録 SaaS。組み込みテンプレや独自テンプレ PDF から項目構造を抽出し、Claude が箇条書きメモを書式に沿って整形して PDF 出力します。',
  tags: ['Next.js 15', 'Supabase', 'Claude', 'PostgreSQL RLS'],
  primaryLink: {
    label: '見る',
    url: 'https://gizirotto.cothrivelabs.com',
    external: true,
  },

  tagline: 'Postgres RLS と JWT 注入で世帯を分離する家族議事録 AI',

  overview: [
    'Gizirotto（ぎじろっと）は、家族や少人数グループの議事録を AI が下書き・整形する Web アプリです。家族会議・月例の家計報告・子どもの予定共有など、形式がゆるく続けるほど書式が揺れていく「家庭の議事録」に特化しました。テンプレートに沿って AI が下書きすることで、家族の誰が書いても同じ書式で議事録が積み重なります。',
    '家庭の議事録は個人情報そのものです。データは家族（世帯）単位で完全に分離して保存し、他の家庭から一切見えない設計を、アプリ層ではなくデータベース層で保証しています。',
  ],

  security: [
    {
      heading: '認証（Authentication）',
      paragraphs: [
        '認証基盤は Supabase Auth を採用しています。マジックリンク（メールリンクログイン）とパスワード認証の 2 経路を提供し、サインアップ初回送信時には Cloudflare Turnstile のチャレンジ検証をサーバ側で必ず通します。セッションは HttpOnly Cookie（Supabase SSR）で保持し、JavaScript からは直接読めません。',
      ],
    },
    {
      heading: '認可（Authorization）— 本作の目玉',
      paragraphs: [
        '認可の中核は PostgreSQL の Row Level Security（RLS）と、Supabase Custom Access Token Hook による JWT 注入の二段構えです。',
        "ログイン時、custom_access_token_hook が family_members テーブルを引き、ユーザーが属する家族 ID を JWT クレーム family_id に注入します。Next.js Middleware はその JWT を検証したうえで family_id をリクエストに引き渡し、すべての RLS ポリシーが auth.jwt() ->> 'family_id' を基準に行レベルで他世帯のデータを遮断します。",
        'RLS ポリシーは USING（更新前行の可視性）と WITH CHECK（更新後行の許可）を両方指定しており、認証済みセッションでも自分の家族 ID を別世帯に書き換える攻撃を防ぎます。Storage バケットも (storage.foldername(name))[1] = (auth.jwt() ->> \'family_id\') で同様に分離しています。',
        "さらに SECURITY DEFINER の DB 関数はすべて SET search_path TO '' で固定しており、search_path 汚染による権限昇格を防いでいます。",
      ],
    },
    {
      heading: 'データ保護',
      paragraphs: [
        '通信は HTTPS（Vercel と Supabase が TLS 終端）。データベース（Supabase 管理 PostgreSQL）とオブジェクトストレージは保管時暗号化されます。',
        "API キー・シークレットは Vercel 環境変数で管理し、リポジトリには一切含めません。service_role 相当の秘密鍵はサーバ専用クライアントからのみ参照し、クライアントコンポーネントからは import 不可（'server-only' で物理的にブロック）。認証セッションは Supabase SSR の HttpOnly Cookie でクライアント JS から直接読めません。",
      ],
    },
    {
      heading: '入力検証',
      paragraphs: [
        'すべての API リクエストボディを Zod スキーマで検証しています。型・長さ・列挙値・条件付き必須（refine）まで宣言的に縛り、未検証データが下流ロジックに到達しないようにしています。',
        '家族作成・招待コード参加など重要な操作は、アプリ層 Zod に加えて PostgreSQL 関数内でも入力検証を二重化（長さ・正規表現・一意制約）。SQL は Supabase クライアントのパラメータ化クエリのみを使用し、文字列連結によるクエリ生成はゼロです。',
        'XSS: React の自動エスケープに加え、dangerouslySetInnerHTML の使用は招待 QR コード SVG（npm qrcode パッケージがサーバ側で生成）の 1 箇所に限定しています。',
      ],
    },
    {
      heading: 'レート制限・濫用防止（3 層）',
      paragraphs: [
        '1. IP burst（Edge Middleware）: Upstash Redis スライディングウィンドウで /api/* 全体を 10 req / 10 秒に制限。Edge runtime で実行し、認証チェックより前に走る安価なゲートです。',
        '2. 3 階層 AI quota（Postgres function 1 本に集約）: 家族あたり 1 日 30 回、ユーザーあたり 1 時間 10 回、グローバルではコストベース $0.50 / 日の atomic check を ai_usage_exceeded(p_family_id, p_user_id) 関数で同一トランザクション内に判定。race condition を排除しつつ、想定外の課金暴走を多段で抑止します。',
        '3. サインアップ試行記録: 初回マジックリンク送信時に IP と「メールアドレスのドメイン部分のみ」を signup_attempts に記録（PII 配慮で @ 以前は保存しない）。',
        '加えて Bot 対策として Cloudflare Turnstile siteverify をログイン・サインアップの両経路で必須化しています。',
      ],
    },
    {
      heading: 'エラーハンドリング（情報漏洩対策）',
      paragraphs: [
        'API エラー応答ヘルパー errorResponse() と SSE エラーヘルパー formatSseErrorPayload() を共通化し、本番環境では error.message を一切クライアントに返さない設計です。スタックトレース・内部ファイルパス・SQL 文字列の外部リークを根元で塞いでいます。サーバログには raw error を常に記録し、Vercel ログから調査可能です。',
      ],
    },
    {
      heading: '機密データ取扱（AI への送信ポリシー）',
      paragraphs: [
        '議事録テキストは整形・チャット支援のため Claude（Anthropic）に、スキャン PDF の OCR のため Mistral に送信されます。各社の API 規約により、これらのデータは AI モデルの学習に使用されません。',
        'プロンプトインジェクション対策として、システムプロンプトとユーザー入力は API レベルで明確に分離（system ブロックと messages[].content の構造分離）して送信しています。AI 呼び出しの利用量はすべて ai_usage_log に記録し（家族メンバーは自家族の残数のみ閲覧可能）、想定コスト超過を即時遮断します。',
      ],
    },
    {
      heading: '同意管理（プライバシー）',
      paragraphs: [
        '初回ログイン時に利用規約・プライバシーポリシーへの同意をモーダルで取得し、バージョン番号付きで user_consents に保存します。規約改定時はバージョン差分をトリガに再同意を求める設計です。',
      ],
    },
    {
      heading: '脆弱性報告',
      paragraphs: [
        'セキュリティポリシーを SECURITY.md で公開し、GitHub Private Vulnerability Reporting とメール窓口の 2 経路で脆弱性報告を受け付けています。',
      ],
    },
  ],

  techStack: [
    {
      category: 'フロントエンド',
      items: [
        { name: 'Next.js 15 (App Router)', note: 'Server Actions / Route Handlers をそのまま動かすため' },
        { name: 'React 19 / TypeScript', note: '型安全を全レイヤで担保' },
        { name: 'Tailwind CSS 3', note: 'デザインシステムを CSS 変数 + ユーティリティで集約' },
        { name: 'react-hook-form + Zod', note: 'クライアントとサーバで同一スキーマを共有' },
      ],
    },
    {
      category: 'バックエンド / インフラ',
      items: [
        { name: 'Supabase (PostgreSQL + RLS + Auth + Storage)', note: '家族単位の物理分離を DB レベルで保証' },
        { name: 'Next.js Server Actions / Route Handlers', note: 'Vercel サーバーレス上で完結' },
        { name: 'Supabase Edge Functions (Deno)', note: '通知メール等の非同期処理' },
        { name: 'Vercel', note: 'サーバーレス実行で運用ゼロ化' },
      ],
    },
    {
      category: 'AI / 文書処理',
      items: [
        { name: 'Claude (Anthropic)', note: '議事録整形・チャット支援。構造化出力 + プロンプトキャッシュ' },
        { name: 'Mistral OCR', note: 'スキャン PDF の文字抽出フォールバック' },
        { name: 'pdfjs-dist / pdf-lib / @napi-rs/canvas', note: 'PDF 解析・焼き込み・サーバ描画' },
        { name: 'tesseract.js', note: 'OCR フォールバック' },
        { name: 'mammoth / docxtemplater', note: 'docx 解析と出力' },
      ],
    },
    {
      category: 'セキュリティ / 運用',
      items: [
        { name: 'Cloudflare Turnstile', note: 'Bot 対策（ログイン・サインアップ両経路）' },
        { name: 'Upstash Redis + @upstash/ratelimit', note: 'IP burst を Edge で安価に弾く' },
        { name: 'Resend', note: '認証・通知メール' },
        { name: 'Dependabot', note: '月次バージョン更新 + GitHub セキュリティアップデート' },
      ],
    },
    {
      category: 'テスト',
      items: [
        { name: 'Vitest', note: 'unit 約 80 本 + integration 4 本（RLS 隔離テスト含む）' },
        { name: 'Playwright', note: 'E2E 環境' },
      ],
    },
  ],

  architectureNotes: [
    '「家族の議事録」という強いドメインに合わせ、世帯分離を DB レベルで担保することを設計の中心に置きました。アプリ層のうっかりミスでクロステナント漏洩が起きないよう、JWT 注入と RLS の二段構えに集約しています。',
    '座標変換（PDF ⇔ 画面）の真実を 1 モジュール（whiteout-coords.ts）に集約し、プレビューと最終出力のずれを防ぐ「座標の真実マップ」を採用。サーバ描画（@napi-rs/canvas）とブラウザプレビュー（Canvas2D）は描画 API だけを分離し、座標式という最も間違えやすいロジックを純関数で共有しています。',
    '過去議事録から家庭ごとの書き方の癖を学習するため、pgvector による埋め込みベクトル類似検索を採用。match_documents() 関数は p_family_id パラメータで世帯を絞り込んだうえで類似度上位の議事録を返し、ベクトル検索の段階でも世帯境界を超えない設計です（v1.1 で UI 公開予定）。',
  ],

  quality: [
    'テスト: Vitest で unit テスト約 80 本・integration テスト 4 本（うち 1 本は RLS 隔離を 2 家族 2 ユーザーで検証する integration テスト）。Playwright で E2E 環境を整備しています。',
    '型検査: tsc --noEmit を pnpm typecheck で実行可能。静的解析: ESLint 9 + eslint-config-next。',
    '依存更新: Dependabot で月次バージョン更新（PR 上限 3）+ GitHub セキュリティアップデート常時有効。',
    'ローカル開発: pnpm dev、Supabase ローカルスタックで RLS テストまで完結します。',
  ],

  links: [
    { label: '公開サイトを見る', url: 'https://gizirotto.cothrivelabs.com', external: true },
    { label: 'GitHub リポジトリ', url: 'https://github.com/cothrivelabs/gizirotto', external: true },
  ],
};

// What: 他 3 案件は tagline 空でカード本体のみ表示。
// Why: tagline が空文字なら詳細ボタン非描画 → 後日 tagline 等を埋めるだけで自動的に詳細ボタン出現。
export const sprout: WorkDetail = {
  slug: 'sprout',
  title: 'Sprout',
  subtitle: '成長する TODO アプリ',
  thumbnail: '/works/sprout-thumb.svg',
  challenge: 'ロードマップとタスクを一望できる場所がなく、長期目標の分解管理に困っていました。',
  summary:
    'ゴール→タスク→ステップの 3 階層で管理し、進捗に応じて植物が育つ SPA。AI エージェントが API 経由で直接タスクを投入でき、会話だけで運用できる設計です。',
  tags: ['FastAPI', 'SQLite', 'Vanilla JS'],
  primaryLink: { label: '見る', url: '/works/sprout/', external: false },
  tagline: '',
  overview: [],
  security: [],
  techStack: [],
  architectureNotes: [],
  quality: [],
  links: [],
};

export const leCielEtoile: WorkDetail = {
  slug: 'le-ciel-etoile',
  title: 'LE CIEL ÉTOILÉ',
  subtitle: '架空フレンチレストランの紹介サイト',
  thumbnail: '/works/le-ciel-thumb.svg',
  challenge: '同じ案件を 2 回作り、それぞれの長所と短所が残った状態でした。',
  summary:
    '2 版の良いとこ取りで v2 を作り直し、Canvas 星空背景と縦積みエディトリアル Hero で銀座モダンフレンチの世界観を表現した静的サイト。',
  tags: ['HTML/CSS/JS', 'Canvas 星空', 'パララックス'],
  primaryLink: { label: '見る', url: '/works/le-ciel-etoile/', external: false },
  tagline: '',
  overview: [],
  security: [],
  techStack: [],
  architectureNotes: [],
  quality: [],
  links: [],
};

export const jukumate: WorkDetail = {
  slug: 'jukumate',
  title: 'JukuMate',
  subtitle: '個人塾向け業務自動化 SaaS の営業 LP',
  thumbnail: '/works/jukumate-thumb.svg',
  challenge:
    '小規模塾は IT ツール選定の判断材料が少なく、保護者連絡や生徒管理に多くの時間を取られていました。',
  summary:
    '「保護者日次レポート + AI チャットボットでの学習可視化」を訴求する縦長 LP。塾長視点の Solution を 1 スクロールで体験できるよう、本ページめくり SVG 装飾とスクロール pin 演出を組み合わせました。',
  tags: ['Astro', 'GSAP', 'Cloudflare Workers'],
  primaryLink: { label: '見る', url: '/works/jukumate/', external: false },
  tagline: '',
  overview: [],
  security: [],
  techStack: [],
  architectureNotes: [],
  quality: [],
  links: [],
};

export const works: WorkDetail[] = [sprout, leCielEtoile, jukumate, gizirotto];
