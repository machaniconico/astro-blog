/**
 * 予約投稿の共通ロジック。
 *
 * サイトは静的ビルドなので「公開されるページ」はビルド時点で確定する。
 * 未来のpubDateを持つ記事はここで落とし、ページ自体を生成させない。
 * 開発中（astro dev）は下書き確認のためそのまま表示する。
 */

type HasPubDate = { data: { pubDate: Date } };

export function isPublished(pubDate: Date, now: Date = new Date()): boolean {
	return import.meta.env.DEV || pubDate.getTime() <= now.getTime();
}

/** getCollection() の第2引数に渡すフィルタ。 */
export function publishedOnly(entry: HasPubDate): boolean {
	return isPublished(entry.data.pubDate);
}

/** 公開日の新しい順。 */
export function byNewestFirst(a: HasPubDate, b: HasPubDate): number {
	return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}
