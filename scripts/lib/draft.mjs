/**
 * AI下書き生成の純粋な部分（プロンプト組み立て・ファイル名・Markdown化）。
 * APIを呼ばないので単体テストしやすい。
 */

const UNSAFE_IN_FILENAME = /[/\\?%*:|"'<>.,;=+#&()[\]{}!^~`$@]/g;
const MAX_SLUG_LENGTH = 60;

/** 日本語はそのまま残しつつ、ファイル名に使えない文字だけ落とす。 */
export function toSlug(title) {
	const slug = title
		.trim()
		.toLowerCase()
		.replace(/[\s　]+/g, '-')
		.replace(UNSAFE_IN_FILENAME, '')
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, MAX_SLUG_LENGTH)
		.replace(/-+$/, '');
	return slug || 'draft';
}

/** 同名ファイルがあるときは連番を足す。 */
export function uniqueSlug(slug, takenSlugs) {
	if (!takenSlugs.has(slug)) return slug;
	for (let suffix = 2; suffix < 100; suffix += 1) {
		const candidate = `${slug}-${suffix}`;
		if (!takenSlugs.has(candidate)) return candidate;
	}
	throw new Error(`${slug} の空き番号が見つかりませんでした`);
}

/** frontmatter付きMarkdownへ。値はJSON文字列にしてYAMLのエスケープ事故を防ぐ。 */
export function buildMarkdown({ title, description, pubDate, body }) {
	const frontmatter = [
		'---',
		`title: ${JSON.stringify(title)}`,
		`description: ${JSON.stringify(description)}`,
		`pubDate: ${JSON.stringify(pubDate.toISOString())}`,
		'---',
	].join('\n');
	return `${frontmatter}\n\n${body.trim()}\n`;
}

export const SYSTEM_PROMPT = [
	'あなたは個人開発ブログ「個人開発のすゝめ」の書き手です。',
	'管理人は会社員をしながら、AIを使ったアプリ開発とAdobeソフトでのコンテンツ制作を始めたばかりの人物です。',
	'',
	'書き方のルール:',
	'- 日本語で書く。本文は常体（だ・である）で、既存記事の落ち着いたトーンに合わせる。',
	'- 見出しは h2（##）と h3（###）だけを使う。h1 は使わない（タイトルはfrontmatterが持つ）。',
	'- 実際に手を動かした人の記録として書く。体験していないことを事実のように書かない。',
	'- 数値・バージョン・価格など確度の低い情報は書かない。必要なら「◯◯あたり」とぼかすか、触れない。',
	'- 宣伝文句や煽り、絵文字、過剰な感嘆符は使わない。',
	'- 1200〜2000字程度。読み終わって何か1つ持ち帰れる内容にする。',
	'- これは公開前の下書き。人間が加筆修正してから公開する前提で書く。',
].join('\n');

export function buildUserPrompt({ topic, existingTitles, samplePosts }) {
	const sections = [];

	sections.push(
		topic
			? `次のテーマでブログ記事の下書きを書いてください。\n\nテーマ: ${topic}`
			: [
					'ブログ記事の下書きを1本書いてください。',
					'テーマは、下の既存記事と重複しない範囲で、このブログの読者に役立ちそうなものを自分で選んでください。',
				].join('\n'),
	);

	if (existingTitles.length > 0) {
		sections.push(`これまでに書いた記事のタイトル:\n${existingTitles.map((title) => `- ${title}`).join('\n')}`);
	}

	for (const sample of samplePosts) {
		sections.push(`文体の参考（既存記事「${sample.title}」）:\n\n${sample.body}`);
	}

	return sections.join('\n\n---\n\n');
}

export const DRAFT_SCHEMA = {
	type: 'object',
	properties: {
		title: { type: 'string', description: '記事タイトル。40文字以内。' },
		description: { type: 'string', description: '一覧やOGPに出る要約。120文字以内。' },
		tags: {
			type: 'array',
			items: { type: 'string' },
			description: 'プルリクエストの説明に載せる参考タグ。3〜5個。',
		},
		body: { type: 'string', description: 'Markdown本文。frontmatterとh1は含めない。' },
	},
	required: ['title', 'description', 'tags', 'body'],
	additionalProperties: false,
};
