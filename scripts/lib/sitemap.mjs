/**
 * 公開中のURL一覧をsitemapから取得する。
 *
 * 「いま本番に何が出ているか」を知る手段として使う。ビルド済みの事実を見るので、
 * cronが落ちて1回スキップされても次回の実行で取りこぼしを拾い直せる。
 */

const LOCATION = /<loc>\s*([^<]+?)\s*<\/loc>/g;
const MAX_CHILD_SITEMAPS = 20;

function decodeXmlEntities(value) {
	return value
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&');
}

export function extractLocations(xml) {
	return [...xml.matchAll(LOCATION)].map((match) => decodeXmlEntities(match[1]));
}

/** 同じパス階層のページ数を数える（例: '/blog/' なら記事ページの本数）。 */
export function countUnderPath(urls, prefix) {
	let count = 0;
	for (const url of urls) {
		let pathname;
		try {
			pathname = new URL(url).pathname;
		} catch {
			continue;
		}
		if (pathname.startsWith(prefix) && pathname.length > prefix.length) count += 1;
	}
	return count;
}

/**
 * sitemap-index.xmlを起点に、公開中のページURLをすべて集める。
 * CDNのキャッシュを避けるためクエリを付ける。取得できないときは例外を投げる。
 */
export async function fetchSitemapUrls(siteUrl, options = {}) {
	const { fetchImpl = fetch, cacheBuster = String(Date.now()) } = options;

	const load = async (url) => {
		const target = new URL(url);
		target.searchParams.set('_', cacheBuster);
		const response = await fetchImpl(target.toString(), {
			headers: { 'cache-control': 'no-cache' },
		});
		if (!response.ok) throw new Error(`${target.pathname} の取得に失敗しました (HTTP ${response.status})`);
		return extractLocations(await response.text());
	};

	const pageUrls = new Set();
	const indexLocations = await load(new URL('/sitemap-index.xml', siteUrl).toString());
	const childSitemaps = indexLocations.filter((location) => location.endsWith('.xml'));

	for (const location of childSitemaps.slice(0, MAX_CHILD_SITEMAPS)) {
		for (const pageUrl of await load(location)) {
			if (!pageUrl.endsWith('.xml')) pageUrls.add(pageUrl);
		}
	}
	for (const location of indexLocations) {
		if (!location.endsWith('.xml')) pageUrls.add(location);
	}

	return pageUrls;
}
