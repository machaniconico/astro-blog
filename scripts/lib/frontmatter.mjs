/**
 * コンテンツファイルのfrontmatterを読むための最小実装。
 *
 * GitHub Actionsから動かすスクリプト用。ここで必要なのはスカラー値
 * （title / description / pubDate）だけなので、YAMLパーサは足さない。
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---/;
const SCALAR_FIELD = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/;
const CONTENT_EXTENSIONS = new Set(['.md', '.mdx']);

function unquote(value) {
	if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
		try {
			return JSON.parse(value);
		} catch {
			return value.slice(1, -1);
		}
	}
	const singleQuoted = /^'([\s\S]*)'$/.exec(value);
	return singleQuoted ? singleQuoted[1].replace(/''/g, "'") : value;
}

/** frontmatterのスカラー項目だけを取り出す。リストやネストの行は読み飛ばす。 */
export function parseFrontmatter(source) {
	const block = FRONTMATTER_BLOCK.exec(source);
	if (!block) return {};

	const fields = {};
	for (const line of block[1].split(/\r?\n/)) {
		const field = SCALAR_FIELD.exec(line);
		if (!field) continue;
		const value = field[2].trim();
		if (value === '' || value === '[]') continue;
		fields[field[1]] = unquote(value);
	}
	return fields;
}

/** pubDateをDateへ。解釈できない値はnullを返し、呼び出し側で警告する。 */
export function parsePubDate(value) {
	if (typeof value !== 'string' || value === '') return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** コレクション配下の記事を読む。ディレクトリが無い場合は空配列。 */
export async function readEntries(directory) {
	let fileNames;
	try {
		fileNames = await readdir(directory);
	} catch (error) {
		if (error.code === 'ENOENT') return [];
		throw error;
	}

	const entries = [];
	for (const fileName of fileNames.sort()) {
		if (!CONTENT_EXTENSIONS.has(path.extname(fileName))) continue;
		const filePath = path.join(directory, fileName);
		const fields = parseFrontmatter(await readFile(filePath, 'utf8'));
		entries.push({
			filePath,
			fileName,
			title: fields.title ?? fileName,
			pubDate: parsePubDate(fields.pubDate),
		});
	}
	return entries;
}
