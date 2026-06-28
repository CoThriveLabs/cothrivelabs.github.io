import type { WorkDetail } from './works.types';

// What: ぎじろっと案件の完成データ。モーダル全項目埋め済み。
// Why: 1 案件で UI 完成度を担保し、他案件は後日 tagline 等を埋めるだけで詳細モーダル対応できる。
export const gizirotto: WorkDetail = {
  slug: 'gizirotto',

  title: 'ぎじろっと',
  subtitle: '家族の議事録 AI',
  thumbnail: '/works/gizirotto-thumb.png',
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

// What: Sprout 案件の完成データ。pf-data/sprout.md の公開文言を反映。
// Why: 個人ローカル運用 TODO アプリ。セキュリティではなくデータ設計 + UI/UX 独自性が核。
export const sprout: WorkDetail = {
  slug: 'sprout',
  title: 'Sprout',
  subtitle: '成長する TODO アプリ',
  thumbnail: '/works/sprout-thumb.png',
  challenge: 'ロードマップとタスクを一望できる場所がなく、長期目標の分解管理に困っていました。',
  summary:
    'ゴール→タスク→ステップの 3 階層で管理し、進捗に応じて植物が育つ SPA。AI エージェントが API 経由で直接タスクを投入でき、会話だけで運用できる設計です。',
  tags: ['FastAPI', 'SQLite', 'Vanilla JS'],
  primaryLink: { label: '見る', url: '/works/sprout/', external: false },

  tagline: 'フレームワークも絵文字も使わず、5 種の植物 SVG だけで「続ける楽しさ」を設計した個人向けタスク管理',

  overview: [
    'Sprout（スプラウト）は、ロードマップに沿ってタスクをこなすほど画面の中の植物が育っていく、個人向けの階層タスク管理 SPA です。フリーランス独立に向けて夢を行動レベルまで分解できるよう、ゴール / タスク / サブタスク / ステップの 4 階層で進捗を管理し、達成度に応じて 5 種類の植物が 20 段階で成長する仕掛けで「育てる楽しさ」をやる気の燃料に変えます。',
    'AI エージェント（Claude Code 等）と協調することを最初から前提に設計しており、ロードマップ JSON を 1 リクエストで一括投入できる API、Goal 更新のたびに Markdown を自動で書き出すエクスポート機能を備えます。バックエンドは FastAPI + SQLite、フロントエンドは Vanilla HTML / CSS / JavaScript で、.bat ダブルクリックで起動できる完全ローカル完結型です。',
  ],

  // What: Sprout の核セクション群（pf-data md 章 3 由来）。
  // Gotcha: 型は security[] だが、本案件では「データ設計 + UI/UX 独自性」の章群を格納している（型キーは共通）。
  security: [
    {
      heading: '3 テーブルで 4 階層を表現する自己参照モデル',
      paragraphs: [
        'Sprout のデータモデルの中心は goals / tasks / steps の 3 テーブルですが、tasks.parent_task_id の自己参照外部キーによって Goal → Task → Subtask（任意の深さ）→ Step の 4 階層を表現します。サブタスク用テーブルを別途用意しなかったのは、再帰的な分解の深さに上限を設けないためです。フリーランス独立というゴールを「大タスク → 中タスク → 小タスク → ステップ」と、人によってまちまちな粒度で刻めるよう、テーブル数を増やさずに任意ネストを許容する設計を選びました。',
        '進捗集計は再帰関数 calc_task_progress_recursive(task, db) で実装しています。葉（Step を持つ末端 Task）は Step の done 比率から算出（cancelled ステップは分母から除外）、中間ノード（Subtask を持つ Task）は非キャンセル子タスクの進捗の単純平均、Goal はトップレベルタスクの進捗の単純平均で計算します。',
        'status も自動派生で連動します。Step を 1 つ完了するたびに _sync_task_status_from_steps(task, db) が leaf Task の status を todo / in_progress / done に再計算し、その変化を _sync_parent_status が親へ再帰的に伝播。「子が全部 done なら親も done、全部 todo なら親も todo、それ以外は in_progress」というルールでツリー全体を一貫させます。Task 完了時の completed_at も派生で自動セットされ、手動更新を要求しません。',
      ],
    },
    {
      heading: 'Markdown 自動エクスポート',
      paragraphs: [
        'Goal・Task・Step に対する作成・更新・削除・並び替えのすべてで、safe_export(goal_id, db) が呼ばれ、そのゴールの内容が Markdown ファイルとして自動的に書き出されます。出力フォルダは設定でカスタマイズ可能で、ファイル名は goal_{id}_{sanitized_title}.md の形式。ゴール削除時に対応する .md も削除されます。',
        'Markdown 構造は GitHub Flavored Markdown のチェックボックス記法（[x] / [ ] / [-]）を採用し、エディタや GitHub プレビューでそのまま読めます。これにより、AI エージェント（Claude 等）が Sprout の DB を直接読み書きしなくても、書き出された .md を読むだけでゴールの全体像を把握できる「人間 ⇔ AI ⇔ アプリの 3 者で同じドキュメントを共有する」運用が成立します。エクスポートは safe_export でラップされ、書き込み失敗時も API レスポンスには影響しません（best-effort export）。',
      ],
    },
    {
      heading: 'ロードマップ JSON 一括取り込み + タスク名検索',
      paragraphs: [
        'AI エージェントとの協調を最初から前提に、ロードマップ JSON を 1 リクエストで一括登録できる POST /api/import/roadmap エンドポイントを備えます。Goal・Task（任意ネスト）・Step・Tag をまとめて作成し、safe_export で対応する .md も自動生成します。RoadmapTask.subtasks は自身を再帰的に含む Pydantic スキーマで、Pydantic 2 の前方参照（model_rebuild()）で型解決しています。',
        'タスク検索は GET /api/tasks?title={キーワード} で大文字小文字を区別しない部分一致検索を提供。ヘッダーの検索ボックスから利用でき、Ctrl+K（Mac は Cmd+K）でフォーカスを瞬時に持っていけるショートカットを OS 判定込みで実装しています。',
      ],
    },
    {
      heading: '植物 UI 設計（5 種 × 20 段階・全部オリジナル SVG）',
      paragraphs: [
        'ゴールごとに 5 種類の植物（向日葵 / 桜 / サボテン / 観葉植物 / あさがお）から選択でき、達成度（progress 0〜100%）に応じて 20 段階の成長ステージ（種 → 芽吹き → 双葉 → 本葉 → 若苗 → 苗 → 苗木 → 生長期 → 青葉 → 繁茂 → 充実 → つぼみ → ふくらみ → 開花間近 → 開花 → 盛り → 満開 → 完熟 → 完成 → ゴール達成）で植物の姿が変化します。',
        '植物グラフィクスはすべてインライン SVG の path + gradient で記述され、ラスタ画像（PNG / JPG / SVG ファイル）は一切使用していません。static/js/plant.js（約 2,579 行）に植物別の枝・葉・花描画関数（sakuraBranch / sakuraBud 等）と段階別の構成ロジックが集約され、buildPlantSVG(plantType, stage) 1 関数で SVG 文字列を返します。linearGradient と radialGradient を多用し、葉の陰影・花の凹凸・幹の側面ハイライトを単色ではなく階調表現で描き、ポートフォリオレベルの絵作りを目指しています。',
      ],
    },
    {
      heading: '絵文字ゼロ方針 + Web Audio API でその場合成 SE',
      paragraphs: [
        'Sprout は絵文字を一切使用しません。ヘッダーのロゴ、検索アイコン、設定の歯車、新規ゴールの「+」、ロードマップ取り込みの矢印、温室カードのチェックボックス、すべてが手書きの SVG path で構築されています。favicon すらインライン SVG（data:image/svg+xml;utf8,...）で埋め込み、外部 favicon.ico への HTTP リクエストすら発生させない設計にしました（404 回避兼ねる）。これは「ポートフォリオとして "絵文字を貼って済ませない" 姿勢を技術で表明する」ための意図的な制約です。',
        '効果音（SE）も同様の発想で、外部音源ファイルを 1 つも使わず Web Audio API でその場合成しています。OscillatorNode で C5・E5・G5 等の周波数を組み合わせ、ステップ完了は明るい上昇音（C5→E5）、タスク完了は和音（C5+E5+G5）、ゴール達成は上昇アルペジオ（C5→E5→G5→C6）と、操作の区別を音で表現。triangle 波と sine 波を使い分け、軽量で気持ちのよいフィードバックを実現します。',
      ],
    },
    {
      heading: 'Vanilla 実装（フレームワーク非依存）',
      paragraphs: [
        'フロントエンドは React・Vue・Svelte 等のフレームワーク、bundler（webpack / vite 等）、npm エコシステムを一切使わず、素のブラウザ環境で動作する HTML / CSS / JavaScript のみで構築しています。<script> タグで api.js → utils.js → sounds.js → plant.js → greenhouse.js → app.js を順に読み込む、IIFE（即時実行関数）による module pattern で名前空間を分離する素朴な実装です。',
        '選定理由は 3 つ。(1) 配布の単純さ: .bat ダブルクリックで起動できる個人ローカル用ツールに、ビルドステップを挟みたくない。(2) 依存の最小化: フレームワーク・npm 依存を持たないことで、サプライチェーン攻撃面とアップグレード負担をゼロに。(3) AI エージェント連携の見通し: AI が静的解析でコードを把握しやすく、改修が局所化される。',
        'XSS 対策は utils.js の escHtml(str) ヘルパーで HTML 特殊文字をエスケープし、ユーザー入力を DOM に流す箇所では明示的に通します。',
      ],
    },
  ],

  techStack: [
    {
      category: 'バックエンド',
      items: [
        { name: 'Python 3.11+ / FastAPI 0.115+', note: '型ヒント駆動の自動 OpenAPI 生成と Pydantic 統合' },
        { name: 'SQLAlchemy 2.0+', note: '自己参照 relationship でタスク階層を双方向管理' },
        { name: 'SQLite', note: '単一ファイル運用・サーバレス。個人ローカル特化で運用ゼロ化を最優先' },
        { name: 'Pydantic 2.0+', note: 'リクエスト / レスポンスでスキーマ統一。再帰スキーマも model_rebuild() で解決' },
      ],
    },
    {
      category: 'フロントエンド',
      items: [
        { name: 'Vanilla HTML / CSS / JavaScript', note: 'フレームワーク・bundler・npm 依存ゼロ' },
        { name: 'Noto Sans JP (Google Fonts CDN)', note: '唯一の外部依存。プリコネクトで初回ロード軽減' },
        { name: 'インライン SVG (path + gradient)', note: '植物・アイコン・favicon すべて SVG path で記述' },
      ],
    },
    {
      category: 'オーディオ',
      items: [
        { name: 'Web Audio API', note: 'OscillatorNode で和音を合成し SE を音で区別' },
        { name: 'HTML5 Audio', note: '集中環境用 ambient sound レイヤ（v2 で音源差し替え予定）' },
      ],
    },
    {
      category: 'テスト・配布',
      items: [
        { name: 'pytest 8.0+ / httpx', note: 'FastAPI TestClient で API 統合テスト' },
        { name: 'StaticPool + in-memory SQLite', note: '各テスト関数ごとに DB を作り直す完全分離' },
        { name: 'start_sprout.bat', note: 'ダブルクリックで仮想環境 → uvicorn → ブラウザ自動オープン' },
      ],
    },
  ],

  architectureNotes: [
    'Sprout の構成は「個人がローカルで使う」という強いドメイン制約から逆算しています。家族や複数ユーザーを想定しないため、認証・テナント分離・水平スケーリングといった一般的な Web サービスの関心事は意図的にスコープ外とし、その分をデータモデル設計とフィードバック演出（植物の成長・SE・ロードマップ自動エクスポート）に振り切りました。FastAPI は AI エージェントとのスキーマ駆動連携を最優先、SQLite は個人運用で PostgreSQL のオーバーヘッドを払う理由がないため、Vanilla フロントエンドはビルドステップを増やさず AI が静的解析でコードを把握しやすくするため、それぞれ採用しています。',
    '進捗の真実は「Step の状態だけ」を入力とし、Task の status・progress・completed_at は派生で計算します。手動で「親タスクを done にする」必要をなくしたことで、進捗の不整合（子タスクは未完なのに親が done 等）を構造的に発生させない設計です。Markdown エクスポートは「人間も AI エージェントも、Sprout を直接触らずに進捗を読み取れる第二の真実」として用意しました。AI に DB 接続を渡す必要がなく、書き出された .md を Claude Code 等に読ませるだけで、ゴールの全体像と完了状況を共有できます。',
  ],

  quality: [
    'テスト: pytest で API 統合テスト約 45 本（test_goals.py / test_tasks.py / test_steps.py / test_tags.py / test_search.py / test_progress.py）。各テスト関数ごとに Base.metadata.drop_all → create_all で DB を初期化する完全分離設計。in-memory SQLite + StaticPool でディスク I/O ゼロ。',
    'テスト対象: CRUD・cascade 削除・進捗計算（leaf / 再帰 / cancelled 除外 / 丸め）・タスク名部分一致検索（大文字小文字無視・空クエリ）・タグの多対多。',
    '型と契約: Pydantic 2 のスキーマで API リクエスト・レスポンスを統一。Swagger UI（/docs）でフロント・AI エージェント側から契約を確認できます。',
    '配布: start_sprout.bat で仮想環境起動 → uvicorn 起動 → ブラウザ自動オープン。Windows での「動かなさ」が発生しないようパス・改行・エンコードを揃え済み。',
  ],

  links: [],
};

// What: LE CIEL ÉTOILÉ v2 案件の完成データ。pf-data/le-ciel.md の公開文言を反映。
// Why: 架空コーポレートサイト。セキュリティ / データ設計ではなく設計プロセス + タイポ + 軽量実装が核。
export const leCielEtoile: WorkDetail = {
  slug: 'le-ciel-etoile',
  title: 'LE CIEL ÉTOILÉ',
  subtitle: '架空フレンチレストランの紹介サイト',
  thumbnail: '/works/le-ciel-thumb.png',
  challenge: '同じ案件を 2 回作り、それぞれの長所と短所が残った状態でした。',
  summary:
    '2 版の良いとこ取りで v2 を作り直し、Canvas 星空背景と縦積みエディトリアル Hero で銀座モダンフレンチの世界観を表現した静的サイト。',
  tags: ['HTML/CSS/JS', 'Canvas 星空', 'パララックス'],
  primaryLink: { label: '見る', url: 'https://le-ciel-etoile.cothrivelabs.com', external: true },

  tagline: '設計書→実装の分離プロセスで仕上げた、三言語タイポと Canvas 星空の銀座フレンチ',

  overview: [
    'LE CIEL ÉTOILÉ（ル・シエル・エトワール）は、「銀座の夜に降る、フランスの記憶」をコンセプトにした架空の銀座モダンフレンチ・コーポレートサイトです。実在しないレストランを舞台に、Web 制作における情報設計・タイポグラフィ・モーション・アクセシビリティを総合的に検証することを目的としたポートフォリオ作品です。',
    '地上 150m の星空をテーマに、深ネイビー × 金 × 銅の落ち着いた色相と、英語・日本語・フランス語の三言語を階層的に運用する三書体タイポグラフィで、ロマンチックでありながらも上品なエディトリアル調を狙いました。実装はフレームワーク・ビルドツール・npm 依存を一切使わず、HTML / CSS / Vanilla JavaScript の三点だけで完結しています。',
  ],

  // What: LE CIEL の核セクション群（pf-data md 章 3 由来）。
  // Gotcha: 型キーは security[] だが、本案件では「設計プロセス + タイポ設計 + 軽量実装」の章群を格納している。
  security: [
    {
      heading: '設計書 DESIGN.md 約 780 行による「設計 → 実装」の分離',
      paragraphs: [
        '本案件の最大の特徴は、実装着手前にレストラン業態・コピー文言・カラーパレット・タイポ運用ルール・セクション別レイアウト・インタラクション仕様・アクセシビリティ仕様・フォーム仕様・自己確認チェックリストまでを DESIGN.md に記述しきっていることです。コードを書き始めてから「これどう書こう」と迷う余地がなくなり、実装段階は設計書を順番に消化していくだけのフェーズになります。',
        'DESIGN.md は §1 統合方針表、§2 コピー全文の確定文言、§3 セクション別 3 断面のレイアウト構造、§4 Interior グリッド再設計（v1 の問題と採用案を意思決定として記録）、§5 Concept スマホ修正、§6 三言語タイポグラフィ統一ルール、§7 CSS 変数最終値、§8 インタラクション仕様（8 サブセクション）、§9 アクセシビリティ仕様、§10 フォーム実装仕様、§11 ファイル構成、§12 実装チェックリスト 17 項目、§13 制約再掲、§14 v1 流用対応表 — の全 14 章構成です。',
        'この設計書ドリブンの進め方は、ポートフォリオサイトでありながら「設計と実装を分離して品質を担保する」という実務志向の制作プロセスを成果物として示すためのものです。設計書自体がリポジトリにそのまま残しており、採用面接や案件評価の場でドキュメントを併読していただけます。',
      ],
    },
    {
      heading: '三言語タイポグラフィ設計（英 / 日 / 仏 × 三書体）',
      paragraphs: [
        'タイポグラフィは英語（Cinzel）/ 英語 latin serif（Cormorant Garamond）/ 日本語明朝（Shippori Mincho）の三書体を、用途別に厳密に切り分けて運用しています。これは「フランス料理 + 銀座 + 星空」というブランド世界観をフォントの選定で支えるためで、設計書 §6 に統一ルールとして文書化しています。',
        'eyebrow（章番号付き小見出し）は英語 × Cinzel、section title（H2）は日本語 × Shippori Mincho、副題は英語斜体 × Cormorant Garamond italic、コース名はフランス語 + 日本語ルビ、形容ラベル・装飾はフランス語斜体、CTA ボタンは英語主・日本語副、Footer タグラインは英語 + フランス語、といった具合に階層と言語をマッピングしています。',
        '特にフォーム入力は、フランス語小見出し（Nom / Email / Téléphone 等）の下に日本語ラベル（お名前 / メールアドレス）を二段で並べる二言語併記レイアウトを採用しています。実用性と世界観表現を両立させる現実的な落としどころです。',
      ],
    },
    {
      heading: 'Canvas 星空背景（Vanilla で書ききった軽量実装）',
      paragraphs: [
        '背景は固定配置の <canvas> に約 100〜160 個の星を requestAnimationFrame でツインクルさせています。Three.js / PixiJS 等のライブラリは使わず、Canvas 2D API のみで実装しました。',
        '実装の要点は、星の生成密度を画面サイズで動的決定（Math.round((W * H) / 12000) を基準に最小 100・最大 160 に丸める）、devicePixelRatio を 2x で上限、半径 1.05 以上の星にのみ金色のグロー二重描画、Math.sin(time * speed + phase) の単純位相シフトで各星に固有の phase と speed を持たせて自然な瞬き、prefers-reduced-motion: reduce で静的描画に切替、resize 時は 120ms debounce で再生成コストを抑える、の 6 点です。',
        'CSS 側では position: fixed; inset: 0; z-index: 0; opacity: 0.55; pointer-events: none; で全ページ背景として固定。コンテンツのクリック操作を妨げません。',
      ],
    },
    {
      heading: 'Hero パララックス（lerp 補間）と IntersectionObserver Reveal',
      paragraphs: [
        'Hero 背景のパララックスは、スクロール量をそのまま translateY に流すのではなく、線形補間（lerp）で滑らかに追従させています。current += (target - current) * 0.08 の 1 行だけで「滑らかに追いつく」挙動を作り、scale(1.06) で背景にわずかな拡大を与えることでパララックスで上下した際に端が見切れないようにバッファを持たせています。prefers-reduced-motion: reduce 時はループ自体を実行しません。',
        'スクロール連動の要素出現（[data-reveal]）は IntersectionObserver で観測 → 可視化したら unobserve で監視解除する方式。一度表示した要素は二度と監視しないため、ページが長くなっても監視コストが上がりません。CSS 側では [data-reveal] の初期状態が opacity: 0 / translateY(30px)、.is-in 付与で opacity: 1 / translateY(0) への遷移を定義しています。',
      ],
    },
    {
      heading: 'レスポンシブの設計思想（clamp() ベースの可変設計）',
      paragraphs: [
        'breakpoint を多用するのではなく、clamp(最小, 流体, 最大) で連続的に縮尺するレイアウトを基本としています。代表例は --pad-x: clamp(20px, 4vw, 64px) や --section-py: clamp(80px, 10vw, 160px)、.hero__title { font-size: clamp(3.5rem, 11vw, 9.5rem) } 等です。',
        'breakpoint は本当に必要な転換点（1024px / 768px / 720px / 480px）にだけ置き、それ以外は clamp() で吸収する考え方です。これにより「1023px と 1025px で見た目が急に変わる」「中途半端な画面幅でレイアウトが破綻する」といった問題が起きにくくなります。加えて Interior グリッドでは、設計途中で見つかった「aspect-ratio 実高が grid track 高を超えて figcaption が次行に被る」という競合問題を、CSS コメントとして残し、span 2 + aspect-ratio: auto のリセットで解決しています。',
      ],
    },
    {
      heading: 'アクセシビリティ（CSS と JS の両側で prefers-reduced-motion を尊重）',
      paragraphs: [
        '支援技術と環境設定への配慮を、HTML / CSS / JS の各レイヤで重ね合わせています。HTML 側は aria-label / aria-expanded のトグル / aria-hidden="true"（装飾 canvas, scroll インジケータ）/ role="status" + aria-live="polite"（フォーム成功オーバーレイ）/ <iframe title="LE CIEL ÉTOILÉ 地図"> / 全 <img> に alt 属性、CSS 側は @media (prefers-reduced-motion: reduce) でアニメ・トランジションを 0.01ms に潰し [data-reveal] を最初から可視化、JS 側は matchMedia(\'(prefers-reduced-motion: reduce)\') を起動時に評価し Canvas はループ停止＆静的描画、Hero パララックスは即 return、フォーム成功時のスクロールは behavior: \'auto\' にフォールバック、という三層構造です。',
      ],
    },
  ],

  techStack: [
    {
      category: 'マークアップ・スタイル',
      items: [
        { name: 'HTML5 (セマンティック / aria 属性配慮)', note: 'section / article / figure / dl をドキュメント構造どおりに使用' },
        { name: 'CSS3 (CSS Variables / Grid / Flexbox / clamp())', note: '全レイアウト値を clamp() で連続的に縮尺' },
      ],
    },
    {
      category: 'スクリプト・アニメ',
      items: [
        { name: 'Vanilla JavaScript (IIFE module pattern)', note: 'フレームワーク・トランスパイラ・バンドラ不使用' },
        { name: 'Canvas 2D API', note: '星空背景を自前実装。requestAnimationFrame + dpr 2x 上限' },
        { name: 'IntersectionObserver', note: '[data-reveal] 一括観測。可視化したら unobserve' },
        { name: 'requestAnimationFrame + lerp', note: 'Hero パララックスを線形補間で滑らかに追従' },
      ],
    },
    {
      category: 'フォント・配信',
      items: [
        { name: 'Cinzel / Cormorant Garamond / Shippori Mincho (Google Fonts)', note: '三書体運用。preconnect でハンドシェイク短縮' },
        { name: '純粋静的（任意の静的サーバで配信可）', note: 'index.html 単体で動作' },
        { name: 'ビルド: なし', note: 'npm エコシステム不使用。サプライチェーンリスクと運用コストをゼロに' },
      ],
    },
  ],

  architectureNotes: [
    'LE CIEL ÉTOILÉ v2 の構成は「架空コーポレートサイトの完成品としての見栄えを、最も少ない依存で達成する」という制約から逆算しています。1 ページ・1 セクション数〜という規模に対し、React / Vue 等のフレームワークを入れるコストが見合わないため、bundler・トランスパイラ・パッケージマネージャを通さず、index.html を開けば動く完結性を優先しました。サプライチェーン攻撃面とアップグレード負担もゼロです。',
    '三書体 / 三言語を採用したのは、「フランス料理 × 銀座」というドメインでラテン書体 1 系統では世界観の階層が単調になるためです。display（Cinzel）/ serif latin（Cormorant Garamond）/ serif 日本語（Shippori Mincho）の三系統を、章番号・見出し・本文・装飾ラベル・ボタン・フォームラベルの各階層に貼り分けることで、エディトリアル雑誌のようなタイポ階層を構築しています。Canvas で星空を描くのは、CSS の radial-gradient を keyframes でアニメーションさせる方式では星の数や個別位相を制御しにくく、reduced-motion で静止状態に切り替えるのも難しいためです。Canvas 2D で書くと、星の位置 / 半径 / 位相 / 速度を独立に持てて、reduced-motion 時はループを止めるだけで静的描画に切り替わります。',
  ],

  quality: [
    'アクセシビリティ: aria 属性（label / expanded / hidden / controls / role="status" + aria-live）、全画像 alt、iframe title、:focus-visible で金 1px のフォーカスリング、prefers-reduced-motion: reduce を CSS と JS の両側で尊重（Canvas ループ停止・パララックス無効・reveal を初期可視化）。',
    'HTML セマンティック: <section> / <article>（コース）/ <figure> + <figcaption>（Interior カード）/ <dl> + <dt> + <dd>（Access 情報）をドキュメント構造どおりに使用。',
    'SEO / OGP: <meta name="description"> / <meta property="og:title"> / <meta property="og:description"> を設定。ページタイトルは「LE CIEL ÉTOILÉ — 銀座 モダンフレンチ」。',
    'フォーム品質: クライアントサイドで email / tel の正規表現検証 + date の本日以降チェック、エラー時は最初のエラーフィールドへ scrollIntoView({ block: \'center\' }) してフォーカス、成功時は role="status" のオーバーレイを表示。',
    '自己確認: 実装完了時の 17 項目チェックリストを DESIGN.md §12 に用意し、提出前に全項目を機械的に確認。',
  ],

  links: [],
};

// What: JukuMate 案件の完成データ。pf-data/jukumate.md の公開文言を反映。
// Why: 架空 LP + 実稼働 MVP。AI プロンプト設計 + 多層レート制御 + セールスファネル設計が核。
export const jukumate: WorkDetail = {
  slug: 'jukumate',
  title: 'JukuMate',
  subtitle: '個人塾向け業務自動化 SaaS の営業 LP',
  thumbnail: '/works/jukumate-thumb.png',
  challenge:
    '小規模塾は IT ツール選定の判断材料が少なく、保護者連絡や生徒管理に多くの時間を取られていました。',
  summary:
    '「保護者日次レポート + AI チャットボットでの学習可視化」を訴求する縦長 LP。塾長視点の Solution を 1 スクロールで体験できるよう、本ページめくり SVG 装飾とスクロール pin 演出を組み合わせました。',
  tags: ['Astro', 'GSAP', 'Cloudflare Workers'],
  primaryLink: { label: '見る', url: 'https://jukumate.pages.dev/', external: true },

  tagline: 'AI プロンプト設計 + 多層レート制御 + セールスファネル設計',

  overview: [
    'JukuMate は、中学受験・高校受験が混在する小規模な個人塾の塾長先生・オーナー先生に向けて、日々の業務のなかで「気を遣うけれど時間がかかる仕事」を AI で軽くするための業務支援サービスを想定した架空ポートフォリオ作品です。実在しないサービスを舞台に、AI プロダクトとして必要な「ランディングページ × バックエンド × プロンプト設計 × フォーム連携 × スパム対策 × 観測・テスト」を一貫して組み立てることを目的としました。',
    '「保護者レポートの下書きに月何時間も使ってしまう」「退塾しそうな生徒のサインに気づくのが遅れる」「LINE 連絡の文面を毎回考えるのが負担」「月謝管理が属人化している」——個人塾の現場にありがちな 4 つの悩みを起点に、AI が「書く」と「気づく」を肩代わりし、先生は「教えること」に集中できる、という設計思想で全体を組みました。LP からは 3 つの AI 体験デモ（保護者レポート下書き / 退塾予兆ミニ判定 / 5 ターン制限の AI 診断チャット）が実際に動作し、最終 CTA は 30 分の個別相談予約フォーム（Cloudflare Turnstile + ハニーポット + レート制限の三重ガード）に接続されます。',
    'LP 内の数値メトリクス（保護者レポート時間削減率・退塾予兆検知率・LINE 連絡業務時間削減率など）はすべてポートフォリオ訴求のための想定値であり、実サービスの実測値ではありません。業界に存在する類似サービスへの言及は公式情報の範囲にとどめており、批判的なトーンは含めていません。',
  ],

  // What: JukuMate の核セクション群（pf-data md 章 3 由来）。
  // Gotcha: 型キーは security[] だが、本案件では「AI プロンプト設計 + 多層レート制御 + セールスファネル設計」の章群を格納している。
  security: [
    {
      heading: 'プロンプト 2 種の役割分離（診断 AI / 保護者レポート下書き AI）',
      paragraphs: [
        'AI 機能は用途別に 2 種のプロンプトを完全分離しました。プロダクト診断 AI（SYSTEM_PROMPT）は塾長の課題を 1〜2 ターンでヒアリングし、JukuMate の features YAML（F1〜F4）の中から該当機能を 1〜3 個提案し、5 ターン目で「30 分の無料相談」CTA を必ず挿入する設計。保護者レポート下書き AI（PARENT_REPORT_SYSTEM_PROMPT）は 1 ターン完結で、講師から渡される週次の生徒データを材料に 250〜400 字の下書きを 1 通生成します。',
        '両プロンプトとも few-shot example を 2〜3 本ずつ埋め込み、トーン（穏やか・丁寧・リスペクト・煽り文句禁止・絵文字禁止）と文字数（1 ターン 150 字以内目安 / レポート 250〜350 字目安）をモデルに明示しています。',
      ],
    },
    {
      heading: 'Guardrail 5 条（診断 AI）',
      paragraphs: [
        '診断 AI には Guardrail を 5 条で明文化しました。(1) オフトピック拒否: 学習塾運営に明らかに無関係な話題（雑談・料理・政治・株・コーディング・芸能等）は丁寧に断り、定型文「JukuMate に関するご相談に話題を戻させてください」で会話を戻す。一方、塾運営や生徒の学習に関する相談は、口語的・メモ書き的でも形式不備を理由に断らず受け止める。',
        '(2) 競合扱い: Comiru / Studyplus for School 等の名前を出されても、貶し評価や比較ランキングは答えず「個別のご状況を 30 分相談で詳しくお聞かせください」に誘導する。(3) 料金の取り扱い: 具体的な金額・割引率は答えず、価格非公開ポリシーを保ったまま 30 分相談に誘導する。',
        '(4) 機能ハルシネーション禁止: features YAML にない機能を「あります」と答えない。類似課題が出たら最も近い features を「ご要望に近い機能としては〜」と前置きして提案する。(5) 個人情報の取り扱い: 名前・連絡先・生徒の実名は AI 側で求めない。万一ユーザーが入力してきた場合、応答内で復唱しない。',
      ],
    },
    {
      heading: 'オフトピック判定のコード 1 ソース化',
      paragraphs: [
        'オフトピック拒否時に AI が応答に必ず含める「マーカー文言」（"話題を戻させて" / "お答えしづらく"）を OFFTOPIC_MARKERS 定数として 1 ソース化し、Worker 側の isOfftopicRefusal 判定（フロントに渡すフラグ）とプロンプト内の few-shot 文言を同じ配列から供給しています。これにより「プロンプトの拒否文言とサーバ判定ロジックがズレる」古典的なバグを構造的に排除しました。',
      ],
    },
    {
      heading: '3 層レート制御（IP / セッション / 月間）',
      paragraphs: [
        'LLM API はコストが入力の不確定さに比例するため、悪意ある大量リクエストや想定外の人気で月額予算を一気に壊す可能性があります。JukuMate ではこれを 3 層で防御しました。',
        '層 1 — IP レート制限: Cloudflare Rate Limiting binding（RATE_LIMITER）で IP 単位 20 req/60s。先頭で弾くことで以降の Anthropic 呼び出しと KV 読み書きを発生させない。',
        '層 2 — セッション × ターン上限: 診断 AI は history.length / 2 でターン数を算出し、MAX_TURNS = 5 に到達したら 422 turn_limit_exceeded を返す。1 セッションでの上限を守る。',
        '層 3 — 月間グローバル上限: KV namespace（MONTHLY_COUNTER / MONTHLY_COUNTER_PARENT_REPORT）に月別キー（month:YYYY-MM）で +1 し、MONTHLY_LIMIT = 5000（診断）/ MONTHLY_LIMIT_PARENT_REPORT = 2000（レポート）到達で 503 monthly_limit_reached を返す。診断とレポートで枠を分けることで、片方の暴騰でもう片方が止まらない。各層は適切な HTTP ステータス（429 / 422 / 503）と機械可読 error コードで返し、フロント側で UI 表示を分岐できるようにしています。',
      ],
    },
    {
      heading: 'CORS 厳格化とプレビュー URL 許可',
      paragraphs: [
        '/api/* への CORS は本番 Origin（https://jukumate.pages.dev）+ ローカル開発 2 つを ALLOWED_ORIGINS に明示しつつ、Cloudflare Pages のプレビュー URL（https://<branch>.jukumate.pages.dev）は正規表現で動的に許可する設計。プレビューデプロイで動作確認したいが、第三者からの埋め込み呼び出しは止める、という運用要件をシンプルに両立させています。',
      ],
    },
    {
      heading: 'フォーム送信の三重ガード + GAS 連携',
      paragraphs: [
        '最終 CTA の個別相談予約フォームは、フロント側 3 重ガード + バックエンド GAS 連携の二段構えで組みました。Cloudflare Turnstile（専用ページ turnstile-test.astro で挙動を検証したうえで本フォームに組み込み）、ハニーポット（ボット自動入力対策）、レート制限（過剰送信防止）の 3 重ガードに加え、環境変数 PUBLIC_GAS_URL を経由して GAS Web App doPost に POST → Google Sheets 追記 + 通知メール + 業種別自動返信メール（中受 / 高受 / 大受 / 総合等の業種別 HTML テンプレートを切替）を実行します。',
      ],
    },
    {
      heading: '価格非公開 + 対話導入型ファネル',
      paragraphs: [
        '価格はあえて非公開とし、Pricing セクションでは「JukuMate ベーシック」プラン名と「初月無料 / 初期費用ゼロ / 解約自由 / クレカ登録不要」の 4 点セット + BETA バッジを掲示し、料金詳細は 30 分の個別相談で案内する設計。診断 AI の Guardrail にも料金問合せの 30 分相談誘導が明文化されており、LP から AI 体験、AI 体験から個別相談予約までを一直線で接続しています。Beta セクションは「一緒に作ってくださる先生方を、募集しています。」のメッセージで、初期セットアップ・データ移行・操作レクチャーを専任スタッフが伴走するベータ体制を訴求します。',
      ],
    },
  ],

  techStack: [
    {
      category: 'Frontend',
      items: [
        { name: 'Astro v5', note: '静的書き出し + 部分動的アイランドのマルチページ構成' },
        { name: 'Tailwind v4', note: '@tailwindcss/vite でネイティブ統合・設定コスト最小化' },
        { name: 'TypeScript', note: '型安全を全レイヤで担保' },
      ],
    },
    {
      category: 'Backend (AI)',
      items: [
        { name: 'Cloudflare Workers + Hono', note: 'ルーティングと CORS / Validator (zod) を簡潔に' },
        { name: '@anthropic-ai/sdk + Claude Haiku 4.5', note: '安価な層で月間カウンタ上限と組み合わせて実質無料圏で運用可能' },
        { name: 'Prompt Cache (cache_control: ephemeral)', note: 'SYSTEM_PROMPT に効かせて低コスト化' },
      ],
    },
    {
      category: 'Form / 外部連携',
      items: [
        { name: 'Google Apps Script (GAS) + Sheets + Gmail', note: 'フォーム蓄積 + 通知メール + 業種別自動返信を月額ゼロで実現' },
        { name: 'Cloudflare Turnstile', note: 'Bot 対策。turnstile-test.astro で動作検証済' },
        { name: 'ハニーポット + Rate Limiting', note: 'ボット自動入力対策 + 過剰送信防止' },
      ],
    },
    {
      category: 'Infra / 観測',
      items: [
        { name: 'Cloudflare Pages + Workers', note: 'エッジ完結で低レイテンシ' },
        { name: 'Cloudflare KV (TTL 35 日)', note: '月間グローバル上限カウンタ' },
        { name: 'Cloudflare Rate Limiting binding', note: 'IP burst を Edge で安価に弾く' },
        { name: 'Workers Analytics', note: 'head sampling 100%（ポートフォリオ規模）' },
      ],
    },
    {
      category: 'Quality',
      items: [
        { name: 'Vitest (@cloudflare/vitest-pool-workers)', note: 'Anthropic SDK を vi.mock で実 API コストゼロの 10 ケース' },
        { name: 'Playwright', note: 'Turnstile 動作・予約フォーム送信・モバイルメニュー等の E2E' },
        { name: 'Lighthouse 計測 4 回', note: '4 段階で lighthouse-*.json をリポジトリ同梱しスコア推移を可視化' },
      ],
    },
  ],

  architectureNotes: [
    'Astro v5 を採用したのは、静的書き出しを基本としつつ AI チャット・予約フォーム等のインタラクション部分だけアイランド化できる「マルチページ × 部分動的」の構造が LP に合致するためです。Cloudflare Pages + Workers + KV + Rate Limiting はエッジで完結することによる低レイテンシと、KV / Rate Limiting binding の従量課金が小規模 PF 想定では実質無料に収まる点を評価しました。Pages のプレビュー URL も Worker CORS で正規表現許可しやすい構成です。',
    'Anthropic Claude Haiku 4.5 はトーンコントロール（穏やか・煽らない日本語）と Guardrail 遵守の指示追従性が、本サービスの「塾長先生をリスペクトする」要件に合致します。Haiku は最も安価な層で月間カウンタ上限と組み合わせれば実質無料圏で運用可能。プロンプトキャッシュ（cache_control: { type: \'ephemeral\' }）を SYSTEM_PROMPT に効かせて低コスト化しました。GAS + Sheets + Gmail は、フォーム受信のためだけに有料 SaaS や DB を立てるのは過剰なため、Google アカウントだけで「Sheets 蓄積 + Gmail 通知 + 業種別自動返信」の三役を月額ゼロで実現する選択です。',
  ],

  quality: [
    'Vitest ユニットテスト: Worker は @cloudflare/vitest-pool-workers + Anthropic SDK の vi.mock で、実 API 通信もコストも発生させずに 10 ケース（U-1 正常 / U-2 UUID 不正 / U-3 message 文字数 / U-4 ターン上限 / U-5 IP レート / U-6 月間上限 / U-7 SDK 例外 / U-8 CORS allowlist / U-9 health / U-10 KV +1 検証）をカバー。',
    'Playwright E2E: site/playwright.config.ts で構成。Turnstile 動作・予約フォーム送信・モバイルメニュー等の体験フローを実機ブラウザで検証可能。',
    'Lighthouse 計測 4 回: 4 段階で lighthouse-*.json をリポジトリに同梱し、デザイン変更前後のスコア推移を可視化。',
  ],

  links: [],
};

export const works: WorkDetail[] = [gizirotto, sprout, leCielEtoile, jukumate];
