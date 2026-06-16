// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
//
// Co-Thrive Labs Portfolio — GitHub Pages (User site) 配信設定
// - site: 絶対 URL の生成（canonical / og:image / sitemap 等）に使用
// - base: User site (xxx.github.io) はリポジトリ名がパスに乗らないため不要
//   ※ プロジェクトサイトに切り替える場合は base: '/repo-name/' を追加
// - output: 'static' は v6 のデフォルトだが、Pages 用に明示
// - trailingSlash: 'ignore' で /about と /about/ どちらでも解決
export default defineConfig({
  site: 'https://cothrivelabs.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // 出力は <page>/index.html 形式（Pages との相性が良い）
    format: 'directory',
  },
  integrations: [
    sitemap({
      // 作業用ルート（/index-v2）と実験用（/sandbox/*）は noindex 扱い → sitemap からも除外。
      // ※ /index-v2 は Phase 2-C で index.astro へ移植され消滅する一時ルート。
      filter: (page) => !page.includes('/index-v2') && !page.includes('/sandbox'),
    }),
  ],
});
