// Updates セクションのデータソース
// note 連載・お知らせ・リリース情報を時系列で管理する
export const updates = [
  {
    date: '2026-05-21',
    category: '制作レポート',
    title: 'JukuMate の制作プロセス — Turnstile・flatpickr・SP 改行の地雷地帯',
    excerpt:
      'Turnstile 401 の真因は PAT 仕様、flatpickr 位置ズレは 2-pass 補正、whitespace-nowrap × SP overflow は md: prefix で解決。本番投入で詰まった 3 つを掘り起こす。',
    link: '#',
    status: '近日公開',
  },
  {
    date: '2026-05-14',
    category: 'note 連載',
    title: 'Claude Code で AIエージェント4体を雇って、フリーランス独立を始めた話',
    excerpt: 'こすらぼの運営記録・開発フロー・失敗談を毎週更新予定。第 1 回は近日公開。',
    link: '#',
    status: '近日公開',
  },
  {
    date: '2026-05-10',
    category: 'お知らせ',
    title: 'Co-Thrive Labs として正式始動',
    excerpt: 'AI と人間が共に育つ場所、という意味を込めて社名を変更。ポートフォリオサイトも新規公開。',
    link: '#',
    status: '公開準備中',
  },
];

export const updatesMoreLink = '#';
