#!/usr/bin/env node
/**
 * 公開された記事をSNSへ自動シェアする。
 *
 * 「何が新しいか」はリポジトリの差分ではなくsitemap（＝本番に実際に出ているページ）で判断する。
 * こうするとURLの推測が要らず、まだデプロイが終わっていない記事を先に流してしまう事故も起きない。
 * 予約投稿で後から公開された記事も、次の実行で自然に拾われる。
 *
 * 共有済みの記録は .github/social/shared-posts.json に残す。
 * 初回はここが空なので、既存記事を一斉に投稿しないよう「記録だけ作って何も送らない」動きになる。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSitemapUrls } from './lib/sitemap.mjs';
import { composePostText, extractPageMetadata, resolveTargets } from './lib/social.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const STATE_FILE = path.join(REPO_ROOT, '.github/social/shared-posts.json');
const DEFAULT_SITE_URL = 'https://machaniconico.com';
const SHAREABLE_PATHS = [/^\/blog\/.+/, /^\/diary\/.+/];
const MAX_SHARES_PER_RUN = 3;
// 共有先を後から増やしたとき、過去記事すべてが再投稿されるのを防ぐ。
const RETRY_WINDOW_DAYS = 7;

const EMPTY_STATE = { version: 1, urls: {} };

export function selectShareableUrls(sitemapUrls, patterns = SHAREABLE_PATHS) {
	const shareable = [];
	for (const url of sitemapUrls) {
		let pathname;
		try {
			pathname = new URL(url).pathname;
		} catch {
			continue;
		}
		if (patterns.some((pattern) => pattern.test(pathname))) shareable.push(url);
	}
	return shareable.sort();
}

/**
 * 今回投稿すべきURLと、その送り先を決める。
 * 一部のSNSだけ失敗した記事は、成功した分を飛ばして残りだけ再送する。
 */
export function planShares({ shareableUrls, state, targets, limit = MAX_SHARES_PER_RUN, now = new Date() }) {
	const retryDeadline = now.getTime() - RETRY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
	const plan = [];

	for (const url of shareableUrls) {
		const record = state.urls[url];
		if (record?.bootstrap) continue;
		if (record && Date.parse(record.sharedAt) < retryDeadline) continue;

		const alreadySent = new Set(record?.targets ?? []);
		const pending = targets.filter((target) => !alreadySent.has(target.name));
		if (pending.length === 0) continue;

		plan.push({ url, targets: pending });
		if (plan.length >= limit) break;
	}

	return plan;
}

async function loadState() {
	try {
		const parsed = JSON.parse(await readFile(STATE_FILE, 'utf8'));
		return { version: 1, urls: {}, ...parsed };
	} catch (error) {
		if (error.code === 'ENOENT') return null;
		throw error;
	}
}

async function saveState(state) {
	await mkdir(path.dirname(STATE_FILE), { recursive: true });
	await writeFile(STATE_FILE, `${JSON.stringify(state, null, '\t')}\n`);
}

async function main() {
	const siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL;
	const dryRun = process.env.DRY_RUN === 'true';
	const targets = resolveTargets(process.env);

	if (targets.length === 0) {
		console.log('SNSのシークレットが未設定のため何もしません（設定するとその時点から共有が始まります）。');
		return;
	}
	console.log(`共有先: ${targets.map((target) => target.name).join(', ')}`);

	const sitemapUrls = await fetchSitemapUrls(siteUrl);
	const shareableUrls = selectShareableUrls(sitemapUrls);
	console.log(`公開中の共有対象ページ: ${shareableUrls.length}件`);

	const state = await loadState();
	if (state === null) {
		const now = new Date().toISOString();
		const seeded = { ...EMPTY_STATE, urls: {} };
		for (const url of shareableUrls) seeded.urls[url] = { sharedAt: now, bootstrap: true };
		if (!dryRun) await saveState(seeded);
		console.log(`初回実行のため、既存の${shareableUrls.length}件を共有済みとして記録しました（投稿はしていません）。`);
		return;
	}

	const plan = planShares({ shareableUrls, state, targets });
	if (plan.length === 0) {
		console.log('新しく共有する記事はありません。');
		return;
	}

	let failures = 0;
	for (const item of plan) {
		const response = await fetch(item.url);
		if (!response.ok) {
			console.warn(`${item.url} を読めなかったので次回に回します (HTTP ${response.status})`);
			failures += 1;
			continue;
		}

		const metadata = extractPageMetadata(await response.text());
		const record = state.urls[item.url] ?? { sharedAt: new Date().toISOString(), targets: [] };
		record.targets = record.targets ?? [];

		for (const target of item.targets) {
			const text = composePostText({ ...metadata, url: item.url }, { limit: target.limit });
			if (dryRun) {
				console.log(`--- ${target.name} (DRY_RUN) ---\n${text}`);
				continue;
			}
			try {
				await target.send(text);
				record.targets.push(target.name);
				console.log(`${target.name} へ投稿しました: ${metadata.title}`);
			} catch (error) {
				failures += 1;
				console.error(`${target.name} への投稿に失敗しました（次回再試行します）: ${error.message}`);
			}
		}

		if (record.targets.length > 0) state.urls[item.url] = record;
	}

	if (!dryRun) await saveState(state);
	if (failures > 0) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await main();
}
