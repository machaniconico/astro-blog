---
title: AstroとCloudflare Pagesで個人ブログを構築した記録
description: Astro + Cloudflare Pages + Sveltia CMSでこのブログを構築した手順と、構成を選んだ理由のまとめ。
pubDate: 2026-06-07
heroImage: ''
---

## このブログの構成

このブログは次の構成で動いている。

- フレームワーク: Astro（静的サイトジェネレーター）
- ホスティング: Cloudflare Pages
- コンテンツ管理: Sveltia CMS
- 記事フォーマット: Markdown / MDX

## Astroを選んだ理由

ブログのような「ほぼ静的なサイト」には、Astroが相性抜群だった。デフォルトでJavaScriptをほとんど配信しないので表示が速い。公式のブログテンプレートが充実していて、Content Collectionsで記事のfrontmatterを型安全に扱えるのも便利。

## Cloudflare Pagesでのデプロイ

GitHubリポジトリを接続するだけで、pushのたびに自動でビルド＆デプロイされる。無料枠でも帯域無制限なのが個人開発には嬉しいポイント。独自ドメインの設定もダッシュボードから数クリックで完了した。

## Sveltia CMSで記事管理

記事の実体はリポジトリ内のMarkdownファイルだが、毎回エディタとGitを開くのは少し面倒。そこでGitベースのヘッドレスCMSであるSveltia CMSを導入した。/adminにアクセスすればブラウザから記事の作成・編集ができて、保存するとそのままGitにコミットされる。UIが軽快で日本語対応なのも気に入っている。

## まとめ

「Astro + Cloudflare Pages + Sveltia CMS」の組み合わせは、無料で始められて運用も楽。個人ブログの構成としてかなりおすすめできる。次はOGP画像の自動生成あたりを試してみたい。
