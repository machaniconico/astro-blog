---
title: 'このブログを Astro で作った話'
description: '個人ブログを Astro v6 + Cloudflare Pages で構築した。技術選定の理由や構成をまとめておく。'
pubDate: '2024-06-01'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

個人サイトを長年「いつか作ろう」と思いながら先延ばしにしていたが、ようやく作った。

## なぜ Astro を選んだか

静的サイトジェネレーターはいくつか候補があった。Next.js、Hugo、Gatsby…。

Astro を選んだ理由は以下の3点:

- **ゼロ JS がデフォルト**: コンテンツ中心のブログに余計な JavaScript は不要
- **Markdown/MDX が一等市民**: コンテンツコレクションの仕組みが整っている
- **学習コスト**: React の知識がそのまま使える `.astro` コンポーネント

## 構成

```
src/
  content/
    blog/    ← 開発記録・技術メモ
    diary/   ← 日常の日記
    works/   ← 成果物一覧
  pages/
    blog/
    diary/
    works/
```

## デプロイ先

Cloudflare Pages を選んだ。無料枠が広く、GitHub との連携も簡単。

## 管理画面

Decap CMS（旧 Netlify CMS）を使って GitHub に直接 Markdown をプッシュできる仕組みにした。これで手元に開発環境がなくてもブログが書ける。

---

次回は CSS の設計についてまとめようと思う。
