// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
//
// Co-Thrive Labs Portfolio — GitHub Pages (User site) 配信設定
// - site: 絶対 URL の生成（canonical / og:image / sitemap 等）に使用
// - base: User site (xxx.github.io) はリポジトリ名がパスに乗らないため不要
//   ※ プロジェクトサイトに切り替える場合は base: '/repo-name/' を追加
// - output: 'static' は v6 のデフォルトだが、Pages 用に明示
// - trailingSlash: 'ignore' で /about と /about/ どちらでも解決
export default defineConfig({
  site: 'https://cothrivelabs.github.io',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // 出力は <page>/index.html 形式（Pages との相性が良い）
    format: 'directory',
  },
});
