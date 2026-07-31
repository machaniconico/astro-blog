# Astro Starter Kit: Blog

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🤖 自動投稿のしくみ

自動化は3つ。**どれも必要なシークレットが未設定のあいだは何もしない**ので、使いたいものだけ設定すれば動き出す。
設定場所は GitHub の Settings → Secrets and variables → Actions。

| シークレット | 使う機能 | 取得元 |
| :-- | :-- | :-- |
| `CF_PAGES_DEPLOY_HOOK` | 予約投稿 | Cloudflare ダッシュボード → Pages → 対象プロジェクト → Settings → Builds & deployments → Deploy hooks |
| `BLUESKY_IDENTIFIER` / `BLUESKY_APP_PASSWORD` | SNS共有 | Bluesky の Settings → App Passwords |
| `MASTODON_BASE_URL` / `MASTODON_ACCESS_TOKEN` | SNS共有 | 各インスタンスの 設定 → 開発 → 新規アプリ |
| `ANTHROPIC_API_KEY` | AI下書き | [Anthropic Console](https://console.anthropic.com/) |

### 1. 予約投稿（`.github/workflows/publish-and-share.yml`）

`/admin` の「公開日時」に未来の日時を選ぶと、その時刻を過ぎてから自動で公開される。

静的サイトなので、未来の記事はビルド時に丸ごと除外している（`src/lib/posts.ts`）。ページ自体が生成されないため、
URLを直接叩いても見えないし、RSSにもsitemapにも載らない。公開するには再ビルドが要るので、毎時のジョブが
「公開時刻を過ぎたのに本番に出ていない記事」を探し、**あるときだけ**デプロイフックを叩く。
Cloudflare Pages の無料枠（月500ビルド）を毎時ビルドで使い切らないための作りになっている。

- 判定はsitemap（＝本番に実際に出ているページ）と突き合わせるので、cronが1回飛んでも次回で拾い直せる
- GitHubのcronは混雑時に数分〜十数分遅れる。分単位の正確さが要るなら Cloudflare Workers の Cron Trigger のほうが安定する
- 個別ページを持たない `works` だけはsitemapと比較できないため、「直近90分に公開時刻を迎えたか」で判定する

### 2. SNS自動シェア（同じワークフロー）

公開された記事を Bluesky / Mastodon へ投稿する。設定したSNSだけが有効になる。

何が新しいかはリポジトリの差分ではなく **sitemap** で判断している。まだデプロイが終わっていない記事を先に流す事故が起きず、
予約投稿で後から公開された記事も自然に拾われる。投稿済みの記録は `.github/social/shared-posts.json`。

- **初回は既存記事を「共有済み」として記録するだけで、投稿はしない**（過去記事の一斉投稿を防ぐため）
- 片方のSNSだけ失敗した場合は、失敗した側だけ次回再送する
- X(Twitter) は未対応。書き込みに OAuth 1.0a 署名が必要で、検証できないコードを載せたくなかったため。
  足すなら `scripts/lib/social.mjs` の `resolveTargets` に1件追加する形になる

### 3. AI下書き自動生成（`.github/workflows/ai-draft.yml`）

Actions → 「AI下書きの自動生成」→ Run workflow でテーマを渡すと、Claude が記事の下書きを書いて
**プルリクエストとして提出する**（毎週月曜9時にも自動実行）。自動では公開しない。

- 生成物は事実確認が必要。マージ前に本文を読むこと
- frontmatter の `pubDate` を未来の日時に変えてマージすれば、そのまま予約投稿になる
- 定期生成が不要なら、ワークフローの `schedule:` ブロックを消せば手動専用になる

### テスト

```sh
npm test
```

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
