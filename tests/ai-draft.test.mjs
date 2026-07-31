import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { DRAFT_SCHEMA, SYSTEM_PROMPT, buildMarkdown, buildUserPrompt, toSlug, uniqueSlug } from '../scripts/lib/draft.mjs';
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs';
import { readWorkflow } from './helpers/workflow.mjs';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('日本語タイトルはそのまま、ファイル名に使えない文字だけ落とす', () => {
	assert.equal(toSlug('Astroで作る個人ブログ'), 'astroで作る個人ブログ');
	assert.equal(toSlug('Cloudflare Pages / 無料枠の話'), 'cloudflare-pages-無料枠の話');
	assert.equal(toSlug('  ひどい:名前?  '), 'ひどい名前');
	assert.equal(toSlug('***'), 'draft');
});

test('同名の記事があるときは連番を付ける', () => {
	assert.equal(uniqueSlug('メモ', new Set()), 'メモ');
	assert.equal(uniqueSlug('メモ', new Set(['メモ'])), 'メモ-2');
	assert.equal(uniqueSlug('メモ', new Set(['メモ', 'メモ-2'])), 'メモ-3');
});

test('生成した下書きはContent Collectionsのスキーマを満たす形で書き出す', () => {
	const markdown = buildMarkdown({
		title: 'コロン: を含む "タイトル"',
		description: '説明文',
		pubDate: new Date('2026-08-01T09:00:00Z'),
		body: '## 見出し\n\n本文。\n',
	});

	const fields = parseFrontmatter(markdown);
	assert.equal(fields.title, 'コロン: を含む "タイトル"');
	assert.equal(fields.description, '説明文');
	assert.equal(new Date(fields.pubDate).toISOString(), '2026-08-01T09:00:00.000Z');
	assert.ok(markdown.includes('## 見出し'));
	assert.doesNotMatch(markdown, /^# /m, 'h1はfrontmatterのtitleが持つので本文には置かない');
});

test('テーマ未指定でも過去記事を手がかりに書かせる', () => {
	const prompt = buildUserPrompt({
		topic: '',
		existingTitles: ['既存の記事'],
		samplePosts: [{ title: '既存の記事', body: '本文サンプル' }],
	});
	assert.match(prompt, /重複しない範囲/);
	assert.match(prompt, /- 既存の記事/);
	assert.match(prompt, /文体の参考/);
});

test('テーマを指定したらそれを使う', () => {
	const prompt = buildUserPrompt({ topic: 'OGP画像の自動生成', existingTitles: [], samplePosts: [] });
	assert.match(prompt, /テーマ: OGP画像の自動生成/);
});

test('構造化出力のスキーマは対応している書き方に収める', () => {
	assert.equal(DRAFT_SCHEMA.additionalProperties, false);
	assert.deepEqual(DRAFT_SCHEMA.required, ['title', 'description', 'tags', 'body']);
	for (const property of Object.values(DRAFT_SCHEMA.properties)) {
		assert.equal('minLength' in property, false, '文字数制約は構造化出力では使えない');
		assert.equal('maxLength' in property, false, '文字数制約は構造化出力では使えない');
	}
});

test('事実でないことを書かせないための指示を入れておく', () => {
	assert.match(SYSTEM_PROMPT, /体験していないことを事実のように書かない/);
	assert.match(SYSTEM_PROMPT, /確度の低い情報は書かない/);
	assert.match(SYSTEM_PROMPT, /公開前の下書き/);
});

test('APIの呼び出しは現行の書き方に揃える', async () => {
	const source = await read('scripts/draft-post.mjs');
	assert.match(source, /const MODEL = 'claude-opus-5'/);
	assert.match(source, /thinking: \{ type: 'adaptive' \}/);
	assert.match(source, /output_config: \{[\s\S]*?effort: 'high'/);
	assert.match(source, /fallbacks: 'default'/);
	assert.match(source, /stop_reason === 'refusal'/);
	// 現行モデルで廃止されたパラメータが残っていないこと
	for (const removed of ['temperature', 'top_p', 'top_k', 'budget_tokens']) {
		assert.doesNotMatch(source, new RegExp(`\\b${removed}\\b`), `${removed} は現行モデルでは400になる`);
	}
});

test('APIキーが無いときは静かに何もしない', async () => {
	const source = await read('scripts/draft-post.mjs');
	assert.match(source, /if \(!process\.env\.ANTHROPIC_API_KEY\)/);
	assert.match(source, /writeStepOutput\('created', 'false'\)/);
});

test('生成物は自動公開せずプルリクエストで止める', async () => {
	const workflow = await readWorkflow('ai-draft.yml');
	assert.match(workflow, /gh pr create/);
	assert.doesNotMatch(workflow, /HEAD:main/, '下書きをmainへ直接pushしない');

	// モデルの書いた文字列はシェルへ直接展開せず、環境変数を経由して渡す
	const shellScript = workflow.slice(workflow.indexOf('run: |', workflow.indexOf('プルリクエストを作成')));
	assert.doesNotMatch(shellScript, /\$\{\{/, 'run: の中でGitHub式を展開しない');
	assert.match(workflow, /DRAFT_TITLE: \$\{\{ steps\.draft\.outputs\.title \}\}/);
	assert.match(shellScript, /--title "[^"]*\$DRAFT_TITLE"/);
});
