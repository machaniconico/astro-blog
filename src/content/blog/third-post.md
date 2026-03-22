---
title: 'CSS カスタムプロパティでテーマ管理を楽にする'
description: 'CSS 変数（カスタムプロパティ）を使ったダークモード対応とデザイントークン管理のやり方。'
pubDate: '2024-08-05'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

このブログのスタイルを書きながら、CSS カスタムプロパティの使い勝手の良さを再確認した。

## 基本的な使い方

```css
:root {
  --bg-primary: #0b1120;
  --text-primary: #e2e8f0;
  --accent: #4f9cf9;
  --border-color: rgba(255, 255, 255, 0.08);
}
```

`:root` に定義しておくと全体で参照できる。

```css
.card {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
```

## ダークモード対応

```css
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1120;
    --text: #e2e8f0;
  }
}
```

`prefers-color-scheme` メディアクエリと組み合わせるだけ。コンポーネント側は何も変えなくていい。

## デザイントークンとして扱う

カスタムプロパティをデザイントークンとして体系化すると管理しやすい:

- `--color-*` → カラーパレット
- `--space-*` → 余白サイズ
- `--font-size-*` → フォントサイズ
- `--radius-*` → 角丸

Figma と命名規則を合わせるとデザイン〜実装間の翻訳コストが下がる。

## まとめ

CSS-in-JS や Tailwind が普及しても、CSS カスタムプロパティの価値は変わらない。シンプルで強力な仕組みとして、引き続き使い続けていく。
