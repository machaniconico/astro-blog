import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { buildLinkFacets, composePostText, extractPageMetadata, resolveTargets } from '../scripts/lib/social.mjs';
import { planShares, selectShareableUrls } from '../scripts/share-new-posts.mjs';
import { readWorkflow } from './helpers/workflow.mjs';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const NOW = new Date('2026-08-01T12:00:00Z');
const targets = [
	{ name: 'Bluesky', limit: 300, send: async () => {} },
	{ name: 'Mastodon', limit: 500, send: async () => {} },
];

test('共有するのは記事ページだけで、一覧やトップは流さない', () => {
	const urls = new Set([
		'https://example.com/',
		'https://example.com/blog/',
		'https://example.com/blog/hello/',
		'https://example.com/diary/2026-08-01-メモ/',
		'https://example.com/works/',
	]);
	assert.deepEqual(selectShareableUrls(urls), [
		'https://example.com/blog/hello/',
		'https://example.com/diary/2026-08-01-メモ/',
	]);
});

test('初回は記録だけ作って何も投稿しない（既存記事の一斉投稿を防ぐ）', async () => {
	const source = await read('scripts/share-new-posts.mjs');
	assert.match(source, /state === null/);
	assert.match(source, /bootstrap: true/);
	assert.match(source, /投稿はしていません/);
});

test('bootstrapで記録された既存記事はあとから投稿されない', () => {
	const state = { urls: { 'https://example.com/blog/old/': { sharedAt: NOW.toISOString(), bootstrap: true } } };
	const plan = planShares({ shareableUrls: ['https://example.com/blog/old/'], state, targets, now: NOW });
	assert.deepEqual(plan, []);
});

test('未共有の記事だけが投稿対象になる', () => {
	const state = {
		urls: { 'https://example.com/blog/old/': { sharedAt: NOW.toISOString(), targets: ['Bluesky', 'Mastodon'] } },
	};
	const plan = planShares({
		shareableUrls: ['https://example.com/blog/old/', 'https://example.com/blog/new/'],
		state,
		targets,
		now: NOW,
	});
	assert.deepEqual(
		plan.map((item) => item.url),
		['https://example.com/blog/new/'],
	);
});

test('片方のSNSだけ失敗した記事は、失敗した側だけ再送する', () => {
	const state = {
		urls: { 'https://example.com/blog/a/': { sharedAt: NOW.toISOString(), targets: ['Bluesky'] } },
	};
	const plan = planShares({ shareableUrls: ['https://example.com/blog/a/'], state, targets, now: NOW });
	assert.deepEqual(
		plan[0].targets.map((target) => target.name),
		['Mastodon'],
	);
});

test('共有先を後から増やしても、古い記事までさかのぼって投稿しない', () => {
	const state = { urls: { 'https://example.com/blog/a/': { sharedAt: '2026-01-01T00:00:00Z', targets: ['Bluesky'] } } };
	const plan = planShares({ shareableUrls: ['https://example.com/blog/a/'], state, targets, now: NOW });
	assert.deepEqual(plan, []);
});

test('1回の実行で投稿する本数に上限を置く', () => {
	const shareableUrls = ['a', 'b', 'c', 'd', 'e'].map((slug) => `https://example.com/blog/${slug}/`);
	const plan = planShares({ shareableUrls, state: { urls: {} }, targets, now: NOW });
	assert.equal(plan.length, 3);
});

test('公開ページのOGPからタイトルと説明を取り出す', () => {
	const html = `<!doctype html><html><head>
		<title>ふるいタイトル</title>
		<meta name="description" content="name側の説明" />
		<meta property="og:title" content="AstroとCloudflare Pages" />
		<meta property="og:description" content="構成を選んだ理由のまとめ &amp; 記録" />
	</head><body></body></html>`;
	assert.deepEqual(extractPageMetadata(html), {
		title: 'AstroとCloudflare Pages',
		description: '構成を選んだ理由のまとめ & 記録',
	});
});

test('OGPが無ければtitleタグへ落ちる', () => {
	assert.deepEqual(extractPageMetadata('<html><head><title>ただの記事</title></head></html>'), {
		title: 'ただの記事',
		description: '',
	});
});

test('投稿文は文字数上限に収まり、URLは必ず残る', () => {
	const url = 'https://machaniconico.com/blog/very-long-slug/';
	const text = composePostText({ title: 'あ'.repeat(200), description: 'い'.repeat(500), url }, { limit: 300 });

	assert.ok([...text].length <= 300, `300文字を超えた: ${[...text].length}`);
	assert.ok(text.endsWith(`\n${url}`));
});

test('短い記事はタイトルと説明の両方を載せる', () => {
	const text = composePostText(
		{ title: '新しい記事', description: '今日やったことのメモ', url: 'https://example.com/blog/a/' },
		{ limit: 300 },
	);
	assert.equal(text, '新しい記事\n\n今日やったことのメモ\nhttps://example.com/blog/a/');
});

test('Blueskyのリンク範囲はUTF-8のバイト数で数える', () => {
	const url = 'https://example.com/blog/a/';
	const text = `日本語のタイトル\n${url}`;
	const [facet] = buildLinkFacets(text);

	assert.equal(facet.features[0].uri, url);
	assert.equal(facet.index.byteStart, Buffer.byteLength('日本語のタイトル\n', 'utf8'));
	assert.equal(facet.index.byteEnd - facet.index.byteStart, url.length);
	assert.equal(text.slice(...[text.indexOf(url), text.indexOf(url) + url.length]), url);
});

test('シークレットが揃ったSNSだけが共有先になる', () => {
	assert.deepEqual(resolveTargets({}), []);
	assert.deepEqual(
		resolveTargets({ BLUESKY_IDENTIFIER: 'me.bsky.social', BLUESKY_APP_PASSWORD: 'x' }).map((t) => t.name),
		['Bluesky'],
	);
	assert.deepEqual(
		resolveTargets({ MASTODON_BASE_URL: 'https://mstdn.example', MASTODON_ACCESS_TOKEN: 'x' }).map((t) => t.limit),
		[500],
	);
});

test('共有済みリストの保存コミットではサイトを再ビルドしない', async () => {
	const workflow = await readWorkflow('publish-and-share.yml');
	assert.match(workflow, /\[skip ci\] \[CF-Pages-Skip\]/);
	assert.match(workflow, /run: node scripts\/share-new-posts\.mjs/);
});
