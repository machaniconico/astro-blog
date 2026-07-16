import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../src/layouts/BlogPost.astro', import.meta.url), 'utf8');

test('ブログ記事は日本語文書として読み上げ・改行される', () => {
	assert.match(source, /<html lang="ja">/);
});

test('長い記事タイトルはスマホで読みやすい固定段階の文字サイズへ下げる', () => {
	assert.match(source, /\.title h1 \{[\s\S]*?text-wrap: balance;[\s\S]*?overflow-wrap: anywhere;/);
	assert.match(source, /@media \(max-width: 540px\)[\s\S]*?\.title h1 \{\s*font-size: 2\.25em;/);
	assert.match(source, /@media \(max-width: 360px\)[\s\S]*?\.title h1 \{\s*font-size: 1\.8em;/);
	assert.doesNotMatch(source, /font-size:\s*(?:clamp\([^;]*vw|[^;]*vw)/);
});
