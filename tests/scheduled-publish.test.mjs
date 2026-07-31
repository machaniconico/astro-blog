import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { decideDeployment } from '../scripts/check-due-posts.mjs';
import { parseFrontmatter, parsePubDate } from '../scripts/lib/frontmatter.mjs';
import { countUnderPath, extractLocations } from '../scripts/lib/sitemap.mjs';
import { readWorkflow } from './helpers/workflow.mjs';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const NOW = new Date('2026-08-01T12:00:00Z');
const collection = (name, publicPath, pubDates) => ({
	name,
	publicPath,
	entries: pubDates.map((pubDate, index) => ({ title: `${name}-${index}`, pubDate: new Date(pubDate) })),
});

test('未来のpubDateを持つ記事はすべての公開経路から除外される', async () => {
	const helper = await read('src/lib/posts.ts');
	assert.match(helper, /import\.meta\.env\.DEV \|\| pubDate\.getTime\(\) <= now\.getTime\(\)/);

	const callSites = [
		['src/pages/blog/index.astro', "getCollection('blog', publishedOnly)"],
		['src/pages/blog/[...slug].astro', "getCollection('blog', publishedOnly)"],
		['src/pages/diary/index.astro', "getCollection('diary', publishedOnly)"],
		['src/pages/diary/[...slug].astro', "getCollection('diary', publishedOnly)"],
		['src/pages/works/index.astro', "getCollection('works', publishedOnly)"],
		['src/pages/rss.xml.js', "getCollection('blog', publishedOnly)"],
	];
	for (const [filePath, expected] of callSites) {
		assert.ok((await read(filePath)).includes(expected), `${filePath} が予約投稿のフィルタを通していない`);
	}
});

test('個別ページのgetStaticPathsも絞り込むので未公開記事のURLは生成されない', async () => {
	for (const filePath of ['src/pages/blog/[...slug].astro', 'src/pages/diary/[...slug].astro']) {
		const source = await read(filePath);
		assert.match(source, /getStaticPaths\(\)[\s\S]*?getCollection\('(?:blog|diary)', publishedOnly\)/);
	}
});

test('CMSから公開日時を選べる（予約投稿の入口）', async () => {
	const config = await read('public/admin/config.yml');
	assert.doesNotMatch(config, /name: pubDate\n\s*widget: hidden/);
	const dateFields = config.match(/name: pubDate\n\s*widget: datetime/g) ?? [];
	assert.equal(dateFields.length, 2, '日記とブログの両方に公開日時の入力が要る');
	assert.match(config, /picker_utc: false/);
});

test('frontmatterからタイトルと公開日時を読み取れる', () => {
	const fields = parseFrontmatter(
		['---', 'title: "はじめての: 記録"', 'pubDate: 2026-08-01T09:00:00+09:00', 'tags:', '  - 日記', '---', '本文'].join(
			'\n',
		),
	);
	assert.equal(fields.title, 'はじめての: 記録');
	assert.equal(parsePubDate(fields.pubDate).toISOString(), '2026-08-01T00:00:00.000Z');
	assert.equal(fields.tags, undefined, 'リスト行は読み飛ばす');
});

test('壊れた日付はnullになり、判定から静かに外れる', () => {
	assert.equal(parsePubDate('きのう'), null);
	assert.equal(parsePubDate(''), null);
	assert.equal(parsePubDate(undefined), null);
});

test('一覧ページ自身はsitemapの記事本数に数えない', () => {
	const urls = ['https://example.com/blog/', 'https://example.com/blog/a/', 'https://example.com/diary/b/'];
	assert.equal(countUnderPath(urls, '/blog/'), 1);
	assert.equal(countUnderPath(urls, '/diary/'), 1);
});

test('sitemapのlocを取り出せる', () => {
	const xml = '<urlset><url><loc>https://example.com/a/</loc></url><url><loc>https://example.com/b/?x=1&amp;y=2</loc></url></urlset>';
	assert.deepEqual(extractLocations(xml), ['https://example.com/a/', 'https://example.com/b/?x=1&y=2']);
});

test('公開時刻を過ぎた記事が本番より多いときだけ再ビルドする', () => {
	const collections = [collection('blog', '/blog/', ['2026-07-01T00:00:00Z', '2026-08-01T09:00:00Z'])];
	const live = new Set(['https://example.com/blog/', 'https://example.com/blog/old/']);

	const needed = decideDeployment({ collections, sitemapUrls: live, now: NOW });
	assert.equal(needed.shouldDeploy, true);
	assert.match(needed.reasons[0], /公開時刻を過ぎた記事が2本、本番に出ているのは1本/);
});

test('本番に出そろっていれば毎時のcronでもビルドしない（無料枠を守る）', () => {
	const collections = [collection('blog', '/blog/', ['2026-07-01T00:00:00Z', '2026-08-01T09:00:00Z'])];
	const live = new Set(['https://example.com/blog/a/', 'https://example.com/blog/b/']);

	assert.equal(decideDeployment({ collections, sitemapUrls: live, now: NOW }).shouldDeploy, false);
});

test('未来の記事はまだ数に入らない', () => {
	const collections = [collection('blog', '/blog/', ['2026-08-01T18:00:00Z'])];
	const live = new Set();

	assert.equal(decideDeployment({ collections, sitemapUrls: live, now: NOW }).shouldDeploy, false);
});

test('sitemapが読めないときは直近の公開ぶんだけを見る', () => {
	const justDue = [collection('blog', '/blog/', ['2026-08-01T11:30:00Z'])];
	const longDone = [collection('blog', '/blog/', ['2026-07-01T00:00:00Z'])];

	assert.equal(decideDeployment({ collections: justDue, sitemapUrls: null, now: NOW }).shouldDeploy, true);
	assert.equal(decideDeployment({ collections: longDone, sitemapUrls: null, now: NOW }).shouldDeploy, false);
});

test('個別ページを持たないコレクションはsitemapがあっても直近判定に落とす', () => {
	const collections = [collection('works', null, ['2026-08-01T11:30:00Z'])];

	const decision = decideDeployment({ collections, sitemapUrls: new Set(), now: NOW });
	assert.equal(decision.shouldDeploy, true);
	assert.match(decision.reasons[0], /works: 直近90分/);
});

test('定期ジョブは公開が必要なときだけデプロイフックを叩く', async () => {
	const workflow = await readWorkflow('publish-and-share.yml');
	assert.match(workflow, /cron: '5 \* \* \* \*'/);
	assert.match(workflow, /run: node scripts\/check-due-posts\.mjs/);
	assert.match(workflow, /if: steps\.check\.outputs\.should_deploy == 'true'[\s\S]*?CF_PAGES_DEPLOY_HOOK/);
	assert.match(workflow, /concurrency:\n\s*group: publish-and-share/);
});
