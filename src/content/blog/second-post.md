---
title: 'TypeScript を本格的に使い始めて気づいたこと'
description: 'JavaScript から TypeScript へ移行して半年。型の恩恵を実感した場面とハマりどころをメモ。'
pubDate: '2024-07-10'
heroImage: '../../assets/blog-placeholder-4.jpg'
---

JavaScript だけで書いていた頃は「TypeScript は大げさ」と思っていた。半年使い続けた今、その考えは完全に変わった。

## 型があって助かった場面

### API レスポンスの扱い

```typescript
type Post = {
  id: number;
  title: string;
  pubDate: string;
};

async function fetchPosts(): Promise<Post[]> {
  const res = await fetch('/api/posts');
  return res.json();
}
```

`res.json()` が `any` を返すことを型で縛れる。コレがないと本番で `undefined is not a function` が出てから気づく羽目になる。

### リファクタリング時

関数の引数を変更したとき、呼び出し箇所全体がエラーで赤くなる。これを修正していくだけで漏れなくリファクタできる。

## ハマりどころ

### `strictNullChecks` は最初からオンに

途中からオンにすると膨大な修正が必要になる。プロジェクト開始時に `tsconfig.json` で `"strict": true` を設定しておくのがベスト。

### 型アサション (`as`) の多用

「とりあえず動かしたい」ときに `as unknown as HogeType` を乱用しがち。後で負債になるので早めに直す癖をつけたい。

## まとめ

型エラーはバグの予告編。TypeScript の型チェックに怒られるうちが花、と思って付き合っていく。
