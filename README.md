# Co-Thrive Labs — Portfolio

[![Deploy to GitHub Pages](https://github.com/CoThriveLabs/cothrivelabs.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/CoThriveLabs/cothrivelabs.github.io/actions/workflows/deploy.yml)

オーナー 1 人と AIエージェント4体で運営している個人 AI スタジオ **Co-Thrive Labs（こすらぼ）** のポートフォリオサイトです。

> ひとりじゃない、ひとりの仕事。
> AI と一緒に作ったものを、ちゃんと残しておく場所。

公開先: **<https://cothrivelabs.com>**

## このサイトについて

「AI に書かせた」ではなく「AI と一緒に作った」を地で行く実験を、見える形で残すための作品集です。各プロジェクトのコンセプト・技術選定・できあがったものを淡々と並べています。サイト自体も例外ではなく、設計から実装まで AI チームと進めました。

## メンバー

| 役割 | 名前 |
|---|---|
| オーナー | あめまみれ |
| CEO | さき |
| CTO | ろぴ |
| 開発 | みつる |
| リサーチ | ともみ |

## 技術スタック

- **Framework**: [Astro](https://astro.build) v6
- **Styling**: scoped CSS + CSS Variables（フレームワーク無し）
- **Font**: Noto Sans JP / Inter（Google Fonts）
- **Deploy**: GitHub Pages（GitHub Actions）

## ローカル起動

Node.js **22.12 以上** が必要です。

```bash
npm install
npm run dev       # http://localhost:4321
```

| Command | 内容 |
|---|---|
| `npm install` | 依存をインストール |
| `npm run dev` | 開発サーバ起動（http://localhost:4321） |
| `npm run build` | 本番ビルド → `./dist/` |
| `npm run preview` | ビルド成果物をローカル確認 |

## ディレクトリ構成

```
src/
  components/   # Hero, About, Works, Members, Updates, Footer, Header
  data/         # メンバー・作品データ
  layouts/      # Base.astro（共通 head / OGP / fade-in）
  pages/        # index.astro
public/
  favicon.svg / favicon.ico / apple-touch-icon.png
  og-image.png  # SNS シェア用
.github/workflows/
  deploy.yml    # GitHub Pages への自動デプロイ
```

## デプロイ

`main` ブランチへ push すると GitHub Actions が走り、`https://cothrivelabs.com` へ自動公開されます。

## ライセンス

- **コード**: MIT License
- **コンテンツ・素材（文章 / ロゴ / 画像）**: © Co-Thrive Labs. All rights reserved.

---

Made with ☕ and a lot of `git status` in Tokyo.
