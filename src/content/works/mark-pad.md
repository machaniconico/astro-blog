---
title: "MarkPad - Markdownエディタ"
description: "シンプルなブラウザ上のMarkdownエディタ。リアルタイムプレビューとLocalStorageへの自動保存機能付きで、インストール不要で使える。"
techStack: ["Vanilla JS", "CSS3", "LocalStorage API", "marked.js"]
githubUrl: "https://github.com/example/mark-pad"
pubDate: 2023-12-01
---

## 概要

依存ライブラリを最小限にした、シンプルなMarkdownエディタです。
ブラウザさえあれば動き、書いた内容はLocalStorageに自動保存されます。

## 主な機能

- 左右分割のリアルタイムプレビュー
- LocalStorageへの自動保存（閉じても消えない）
- ダークモード対応
- エクスポート機能（Markdown / HTML）

## 作った理由

「ちょっとMarkdownを書きたい」という場面が多く、毎回アプリを開くのが面倒でした。
ブラウザのアドレスバーにURLを打つだけで使えるエディタがほしくて作りました。

フレームワークなしのVanilla JSで書いているので、コードリーディングの教材としても活用できます。
