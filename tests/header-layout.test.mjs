import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const header = await readFile(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const headerLink = await readFile(new URL('../src/components/HeaderLink.astro', import.meta.url), 'utf8');
const globalStyles = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');

test('公開ヘッダーは日本語のメインナビゲーションとして識別できる', () => {
	assert.match(header, /<nav aria-label="メインナビゲーション">/);
	for (const label of ['ホーム', '作品', 'ブログ', '日記']) assert.match(header, new RegExp(`>${label}<`));
	assert.match(headerLink, /aria-current=\{isActive \? 'page' : undefined\}/);
});

test('スマホではブランドと4分割ナビを安定した2段にする', () => {
	assert.match(header, /@media \(max-width: 720px\)/);
	assert.match(header, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
	assert.match(header, /\.internal-links a \{[\s\S]*?min-height: 44px;[\s\S]*?white-space: nowrap;/);
	assert.match(header, /h2 a,[\s\S]*?text-overflow: ellipsis;[\s\S]*?white-space: nowrap;/);
});

test('ヘッダー操作はキーボード焦点と動きの軽減設定に対応する', () => {
	assert.match(header, /nav a:focus-visible/);
	assert.match(header, /@media \(prefers-reduced-motion: reduce\)/);
	assert.doesNotMatch(header, /letter-spacing:\s*-/);
	assert.match(header, /href="https:\/\/github\.com\/machaniconico"[^>]*rel="noopener noreferrer"/);
});

test('ページ幅と余白を含めてもスマホ画面からはみ出さない', () => {
	assert.match(globalStyles, /\*,\s*\*::before,\s*\*::after\s*\{\s*box-sizing: border-box;/);
});
