/**
 * SNSへの共有まわり。依存を増やさないよう、どのAPIもfetchで直接叩く。
 *
 * 対応: Bluesky（アプリパスワード）/ Mastodon（アクセストークン）。
 * どちらもシークレットが設定されているものだけが有効になる。
 */

const BLUESKY_DEFAULT_SERVICE = 'https://bsky.social';
const URL_IN_TEXT = /https?:\/\/[^\s<>"']*[^\s<>"'.,)]/g;

const countCharacters = (value) => [...value].length;
const collapseWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

function truncate(value, maxCharacters) {
	const characters = [...value];
	if (characters.length <= maxCharacters) return value;
	return `${characters.slice(0, Math.max(0, maxCharacters - 1)).join('')}…`;
}

function decodeHtmlEntities(value) {
	return value
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&');
}

function findMetaContent(html, keys) {
	const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
	for (const key of keys) {
		for (const tag of tags) {
			const name = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag);
			if (!name || name[1].toLowerCase() !== key) continue;
			const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag);
			if (content) return decodeHtmlEntities(content[1]);
		}
	}
	return '';
}

/** 公開済みページのHTMLからタイトルと説明を取り出す。 */
export function extractPageMetadata(html) {
	const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
	return {
		title: findMetaContent(html, ['og:title']) || decodeHtmlEntities(titleTag ? titleTag[1].trim() : ''),
		description: findMetaContent(html, ['og:description', 'description']),
	};
}

/** 投稿文を組み立てる。URLは必ず残し、あふれる分はタイトル→説明の順に削る。 */
export function composePostText({ title, description = '', url }, options = {}) {
	const { limit = 300 } = options;
	const link = `\n${url}`;
	const budget = Math.max(1, limit - countCharacters(link));

	const headline = truncate(collapseWhitespace(title), budget);
	const summary = collapseWhitespace(description);
	const remaining = budget - countCharacters(headline) - 2;

	const body = summary && remaining > 8 ? `${headline}\n\n${truncate(summary, remaining)}` : headline;
	return `${body}${link}`;
}

/** Blueskyでリンクをクリック可能にするfacet。オフセットはUTF-8のバイト数で数える。 */
export function buildLinkFacets(text) {
	const encoder = new TextEncoder();
	return [...text.matchAll(URL_IN_TEXT)].map((match) => {
		const byteStart = encoder.encode(text.slice(0, match.index)).length;
		return {
			index: { byteStart, byteEnd: byteStart + encoder.encode(match[0]).length },
			features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }],
		};
	});
}

async function postJson(fetchImpl, url, body, headers = {}) {
	const response = await fetchImpl(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body),
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`${url} が HTTP ${response.status} を返しました: ${text.slice(0, 200)}`);
	return text ? JSON.parse(text) : {};
}

export async function postToBluesky(config, text, options = {}) {
	const { fetchImpl = fetch, now = new Date() } = options;
	const service = config.service || BLUESKY_DEFAULT_SERVICE;

	const session = await postJson(fetchImpl, new URL('/xrpc/com.atproto.server.createSession', service).toString(), {
		identifier: config.identifier,
		password: config.appPassword,
	});

	return postJson(
		fetchImpl,
		new URL('/xrpc/com.atproto.repo.createRecord', service).toString(),
		{
			repo: session.did,
			collection: 'app.bsky.feed.post',
			record: {
				$type: 'app.bsky.feed.post',
				text,
				createdAt: now.toISOString(),
				langs: ['ja'],
				facets: buildLinkFacets(text),
			},
		},
		{ authorization: `Bearer ${session.accessJwt}` },
	);
}

export async function postToMastodon(config, text, options = {}) {
	const { fetchImpl = fetch } = options;
	return postJson(
		fetchImpl,
		new URL('/api/v1/statuses', config.baseUrl).toString(),
		{ status: text, visibility: 'public', language: 'ja' },
		{ authorization: `Bearer ${config.accessToken}` },
	);
}

/** 環境変数から有効な共有先を組み立てる。設定が無いSNSは黙って無効になる。 */
export function resolveTargets(env, options = {}) {
	const targets = [];

	if (env.BLUESKY_IDENTIFIER && env.BLUESKY_APP_PASSWORD) {
		targets.push({
			name: 'Bluesky',
			limit: 300,
			send: (text) =>
				postToBluesky(
					{
						identifier: env.BLUESKY_IDENTIFIER,
						appPassword: env.BLUESKY_APP_PASSWORD,
						service: env.BLUESKY_SERVICE,
					},
					text,
					options,
				),
		});
	}

	if (env.MASTODON_BASE_URL && env.MASTODON_ACCESS_TOKEN) {
		targets.push({
			name: 'Mastodon',
			limit: 500,
			send: (text) =>
				postToMastodon(
					{ baseUrl: env.MASTODON_BASE_URL, accessToken: env.MASTODON_ACCESS_TOKEN },
					text,
					options,
				),
		});
	}

	return targets;
}
