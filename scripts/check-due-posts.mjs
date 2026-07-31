#!/usr/bin/env node
/**
 * 予約投稿のための再ビルド判定。
 *
 * 静的サイトなので、公開時刻が来ても誰かがビルドを叩かないと記事は出ない。
 * かといって毎時ビルドするとCloudflare Pages無料枠（月500ビルド）を使い切るので、
 * 「公開時刻を過ぎたのに、まだ本番に出ていない記事」があるときだけデプロイを促す。
 *
 * 判定は2段構え:
 *   1. sitemapが読めるとき … リポジトリ側の公開済み本数と、本番に出ている本数を比べる。
 *      cronが1回飛んでも次回に拾い直せる。
 *   2. sitemapが読めないとき … 直近LOOKBACK_MINUTES分に公開時刻を迎えた記事があるかで判定する。
 *
 * 個別ページを持たないコレクション（works）は常に2の方法で見る。
 */

import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries } from './lib/frontmatter.mjs';
import { countUnderPath, fetchSitemapUrls } from './lib/sitemap.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_SITE_URL = 'https://machaniconico.com';
const DEFAULT_LOOKBACK_MINUTES = 90;

const COLLECTIONS = [
	{ name: 'blog', directory: 'src/content/blog', publicPath: '/blog/' },
	{ name: 'diary', directory: 'src/content/diary', publicPath: '/diary/' },
	// works は一覧ページだけで個別ページが無いため、sitemapとの本数比較ができない。
	{ name: 'works', directory: 'src/content/works', publicPath: null },
];

export function decideDeployment({
	collections,
	sitemapUrls = null,
	now = new Date(),
	lookbackMinutes = DEFAULT_LOOKBACK_MINUTES,
}) {
	const lookbackStart = new Date(now.getTime() - lookbackMinutes * 60_000);
	const reasons = [];
	const pending = [];

	for (const collection of collections) {
		const due = collection.entries.filter((entry) => entry.pubDate && entry.pubDate <= now);

		if (sitemapUrls && collection.publicPath) {
			const liveCount = countUnderPath(sitemapUrls, collection.publicPath);
			if (due.length > liveCount) {
				reasons.push(
					`${collection.name}: 公開時刻を過ぎた記事が${due.length}本、本番に出ているのは${liveCount}本`,
				);
				pending.push(...due.map((entry) => entry.title));
			}
			continue;
		}

		const justDue = due.filter((entry) => entry.pubDate > lookbackStart);
		if (justDue.length > 0) {
			reasons.push(`${collection.name}: 直近${lookbackMinutes}分で公開時刻を迎えた記事が${justDue.length}本`);
			pending.push(...justDue.map((entry) => entry.title));
		}
	}

	return { shouldDeploy: reasons.length > 0, reasons, pending };
}

async function writeStepOutput(name, value) {
	const outputFile = process.env.GITHUB_OUTPUT;
	if (!outputFile) return;
	await appendFile(outputFile, `${name}=${value}\n`);
}

async function main() {
	const siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL;
	const lookbackMinutes = Number(process.env.LOOKBACK_MINUTES) || DEFAULT_LOOKBACK_MINUTES;

	const collections = [];
	for (const collection of COLLECTIONS) {
		const entries = await readEntries(path.join(REPO_ROOT, collection.directory));
		for (const entry of entries) {
			if (!entry.pubDate) console.warn(`警告: ${entry.filePath} のpubDateを解釈できませんでした`);
		}
		collections.push({ ...collection, entries });
	}

	let sitemapUrls = null;
	try {
		sitemapUrls = await fetchSitemapUrls(siteUrl);
	} catch (error) {
		console.warn(`sitemapを取得できないため直近${lookbackMinutes}分だけを見て判定します: ${error.message}`);
	}

	const decision = decideDeployment({ collections, sitemapUrls, lookbackMinutes });

	if (decision.shouldDeploy) {
		console.log('再ビルドが必要です。');
		for (const reason of decision.reasons) console.log(`  - ${reason}`);
		for (const title of decision.pending) console.log(`  公開待ち: ${title}`);
	} else {
		console.log('公開待ちの記事はありません。ビルドはスキップします。');
	}

	await writeStepOutput('should_deploy', String(decision.shouldDeploy));
	await writeStepOutput('reason', decision.reasons.join(' / ') || 'なし');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await main();
}
