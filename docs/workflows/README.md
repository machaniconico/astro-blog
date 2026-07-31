# ワークフロー定義（設置待ち）

このディレクトリの2つのYAMLは、**`.github/workflows/` へ移すと動き出す**GitHub Actionsの定義です。

## なぜここに置いてあるのか

`.github/workflows/` 配下のファイルは、`workflow` スコープを持たないトークンでは push できません。
作業したエージェントのトークンにそのスコープが無かったため、内容を失わないよう一時的にここへ置いています。
**中身は完成しているので、移動するだけで使えます。**

## 設置のしかた

どちらか好きな方法で。

### ローカルから（おすすめ）

```sh
git switch claude/auto-post-feature-rkj6m1
mkdir -p .github/workflows
git mv docs/workflows/publish-and-share.yml .github/workflows/
git mv docs/workflows/ai-draft.yml .github/workflows/
git rm docs/workflows/README.md
git commit -m "ci: ワークフローを .github/workflows へ設置"
git push
```

### GitHubのWeb画面から

Add file → Create new file でパスに `.github/workflows/publish-and-share.yml` と入力し、
このディレクトリの同名ファイルの中身を貼り付けて保存。`ai-draft.yml` も同様に。
そのあとこの `docs/workflows/` ディレクトリごと削除してください。

## 移す前に

必要なシークレットの設定はリポジトリ直下の `README.md` の「自動投稿のしくみ」を参照してください。
**シークレットが未設定のあいだ、どのワークフローも何もしません**ので、先に設置してしまっても害はありません。

なお、テストは `.github/workflows/` と `docs/workflows/` のどちらにあっても通るようになっています。
移動しても `npm test` は緑のままです。
