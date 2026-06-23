// PF カード / 詳細モーダルのデータ型。
// What: WorkCard.astro に渡す制作物 1 件の完全データ構造。
// Why: カード表示用とモーダル表示用のフィールドを 1 オブジェクトに集約し、データ追加時に UI 改修ゼロにする。

export type WorkLink = {
  label: string;
  url: string;
  /** 外部リンクなら true。target="_blank" rel="noopener noreferrer" を付ける目印 */
  external?: boolean;
};

export type WorkTechCategory = {
  category: string;
  items: { name: string; note: string }[];
};

export type WorkSecuritySection = {
  /** モーダルアコーディオン見出し（例: "認証（Authentication）"） */
  heading: string;
  /** 公開文言（敬体）。複数段落は配列で渡す */
  paragraphs: string[];
};

export type WorkDetail = {
  /** URL slug。dialog の id="pf-modal-{slug}" 等に使う */
  slug: string;

  // カード本体表示
  title: string;
  subtitle: string;
  /** サムネ画像。public/works/ 配下を想定 */
  thumbnail: string;
  /** カード上で表示する「課題」短文 */
  challenge: string;
  /** カード上で表示する「内容」2-3 行 */
  summary: string;
  /** カード上のタグ（短縮）。3-5 個 */
  tags: string[];
  /** 主リンク（「見る」ボタン遷移先）。外部 URL または内部パス */
  primaryLink: WorkLink;

  // 詳細モーダル
  /** モーダル冒頭 1 行コピー（見出し）。空文字なら詳細ボタン非表示 */
  tagline: string;
  /** モーダル「概要」セクションの本文 */
  overview: string[];
  /** モーダル「セキュリティ実装」サブアコーディオン群 */
  security: WorkSecuritySection[];
  /** モーダル「技術スタック」カテゴリ別 */
  techStack: WorkTechCategory[];
  /** モーダル「アーキテクチャ判断」本文 */
  architectureNotes: string[];
  /** モーダル「品質保証」本文 */
  quality: string[];
  /** モーダル下部「外部リンク」 */
  links: WorkLink[];
};
