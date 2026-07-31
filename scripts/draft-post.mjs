#!/usr/bin/env node
/**
 * Claudeにブログ記事の下書きを書かせて src/content/blog/ にファイルを作る。
 *
 * 公開まで自動にはしない。GitHub Actions側でプルリクエストを立てるところまでが仕事で、
 * 人間が読んで直してマージするまで本番には出ない。
 */

import { appendFile, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { DRAFT_SCHEMA, SYSTEM_PROMPT, buildMarkdown, buildUserPrompt, toSlug, uniqueSlug } from './lib/draft.mjs';
import { readEntries } from './lib/frontmatter.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const BLOG_DIRECTORY = path.join(REPO_ROOT, 'src/content/blog');

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 32000;
const SAMPLE_POST_COUNT = 2;
const SAMPLE_POST_LENGTH = 4000;

function stripFrontmatter(source) {
	return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}

async function collectStyleReferences() {
	const entries = await readEntries(BLOG_DIRECTORY);
	const sorted = entries
		.filter((entry) => entry.pubDate)
		.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	const samplePosts = [];
	for (const entry of sorted.slice(0, SAMPLE_POST_COUNT)) {
		const body = stripFrontmatter(await readFile(entry.filePath, 'utf8'));
		samplePosts.push({ title: entry.title, body: body.slice(0, SAMPLE_POST_LENGTH) });
	}

	return { existingTitles: entries.map((entry) => entry.title), samplePosts };
}

async function writeStepOutput(name, value) {
	const outputFile = process.env.GITHUB_OUTPUT;
	if (!outputFile) return;
	const delimiter = `__${name.toUpperCase()}_EOF__`;
	await appendFile(outputFile, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

async function main() {
	if (!process.env.ANTHROPIC_API_KEY) {
		console.log('ANTHROPIC_API_KEY が未設定のため下書き生成をスキップします。');
		await writeStepOutput('created', 'false');
		return;
	}

	const topic = (process.env.TOPIC || '').trim();
	const { existingTitles, samplePosts } = await collectStyleReferences();
	console.log(topic ? `テーマ: ${topic}` : 'テーマ: 指定なし（Claudeに選ばせます）');

	const client = new Anthropic();
	const stream = client.beta.messages.stream({
		model: MODEL,
		max_tokens: MAX_TOKENS,
		thinking: { type: 'adaptive' },
		output_config: {
			effort: 'high',
			format: { type: 'json_schema', schema: DRAFT_SCHEMA },
		},
		// 安全側の分類器が誤って断ったときに別モデルへ自動で回すための保険。
		betas: ['server-side-fallback-2026-07-01'],
		fallbacks: 'default',
		system: SYSTEM_PROMPT,
		messages: [{ role: 'user', content: buildUserPrompt({ topic, existingTitles, samplePosts }) }],
	});

	const message = await stream.finalMessage();
	console.log(`トークン: 入力${message.usage.input_tokens} / 出力${message.usage.output_tokens}`);

	if (message.stop_reason === 'refusal') {
		console.error(`生成が断られました: ${message.stop_details?.explanation ?? '理由の説明はありません'}`);
		await writeStepOutput('created', 'false');
		process.exitCode = 1;
		return;
	}

	const textBlock = message.content.find((block) => block.type === 'text');
	if (!textBlock) throw new Error('本文のテキストブロックが返りませんでした');
	const draft = JSON.parse(textBlock.text);

	const takenSlugs = new Set(
		(await readdir(BLOG_DIRECTORY)).map((fileName) => fileName.replace(/\.(md|mdx)$/, '')),
	);
	const slug = uniqueSlug(toSlug(draft.title), takenSlugs);
	const filePath = path.join(BLOG_DIRECTORY, `${slug}.md`);

	await writeFile(
		filePath,
		buildMarkdown({
			title: draft.title,
			description: draft.description,
			pubDate: new Date(),
			body: draft.body,
		}),
	);

	console.log(`下書きを作成しました: ${path.relative(REPO_ROOT, filePath)}`);
	await writeStepOutput('created', 'true');
	await writeStepOutput('file_path', path.relative(REPO_ROOT, filePath));
	await writeStepOutput('title', draft.title);
	await writeStepOutput('description', draft.description);
	await writeStepOutput('tags', (draft.tags ?? []).join(', '));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await main();
}
