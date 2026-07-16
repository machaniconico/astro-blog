import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

const blogDirectory = new URL('../src/content/blog/', import.meta.url);
const fileNames = await readdir(blogDirectory);

test('CMS管理のブログ記事は通常Markdownへ統一する', () => {
	assert.ok(fileNames.length > 0);
	assert.deepEqual(fileNames.filter((name) => name.endsWith('.mdx')), []);
	assert.ok(fileNames.every((name) => name.endsWith('.md')));
});

test('公開記事へインラインJavaScriptを直接埋め込まない', async () => {
	for (const fileName of fileNames) {
		const source = await readFile(new URL(fileName, blogDirectory), 'utf8');
		assert.doesNotMatch(source, /<script\b/i, `${fileName} にscript要素を置かない`);
		assert.doesNotMatch(source, /\son[a-z]+\s*=/i, `${fileName} にイベント属性を置かない`);
		assert.doesNotMatch(source, /javascript\s*:/i, `${fileName} にjavascript URLを置かない`);
	}
});
