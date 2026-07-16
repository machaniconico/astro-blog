const escapeHtml = (value = '') =>
	String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');

const decodeHtml = (value = '') =>
	String(value)
		.replaceAll('&quot;', '"')
		.replaceAll('&gt;', '>')
		.replaceAll('&lt;', '<')
		.replaceAll('&amp;', '&');

const normalizePhotoLayout = (layout) => (layout === 'wide' ? 'wide' : 'normal');
const normalizeTextSize = (size) =>
	['small', 'normal', 'large', 'xlarge'].includes(size) ? size : 'normal';
const normalizeFont = (font) =>
	['sans', 'serif', 'friendly', 'handwriting', 'textbook', 'modern', 'mono'].includes(font)
		? font
		: 'sans';
const normalizeAlignment = (alignment) => (alignment === 'center' ? 'center' : 'left');
const normalizeEmphasis = (emphasis) =>
	['normal', 'bold', 'accent', 'muted'].includes(emphasis) ? emphasis : 'normal';
const normalizeCalloutTone = (tone) =>
	['note', 'info', 'warm'].includes(tone) ? tone : 'note';
const normalizeDividerStyle = (style) => (style === 'dots' ? 'dots' : 'line');
const POLISH_TRANSFER_KEY = 'machaniconico:polish-transfer:v1';

const createPolishTransfer = (entry, savedAt = Date.now()) => {
	const collection = String(entry?.get?.('collection') ?? '');
	if (!['diary', 'blog'].includes(collection)) return null;
	const data = entry?.get?.('data');
	const title = String(data?.get?.('title') ?? '');
	const body = String(data?.get?.('body') ?? '');
	if (!title.trim() && !body.trim()) return null;

	return {
		version: 1,
		source: 'cms',
		title,
		body,
		contentType: collection,
		path: String(entry?.get?.('path') ?? ''),
		savedAt: Number(savedAt) > 0 ? Number(savedAt) : Date.now(),
	};
};

const writePolishTransfer = (storage, transfer) => {
	if (!storage || !transfer) return false;
	try {
		storage.setItem(POLISH_TRANSFER_KEY, JSON.stringify(transfer));
		return true;
	} catch {
		return false;
	}
};

const summarizeBody = (body = '') => {
	const summary = decodeHtml(
		String(body)
			.replace(/<figure[\s\S]*?<figcaption>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/gi, ' $1 ')
			.replace(/<[^>]+>/g, ' ')
			.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
			.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
			.replace(/^#{1,6}\s+/gm, '')
			.replace(/[*_`~>|-]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim(),
	);

	return summary.slice(0, 120);
};

const formatPreviewDate = (value) => {
	const date = new Date(value);

	return Number.isNaN(date.valueOf())
		? '今日の日記'
		: new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long' }).format(date);
};

CMS.registerPreviewStyle('/admin/preview.css');

if (!window.location.hash) {
	window.location.hash = '#/collections/diary';
}

CMS.registerEditorComponent({
	id: 'photo',
	label: '説明つき写真',
	icon: 'add_photo_alternate',
	mode: 'dialog',
	summary: '{{alt}}',
	fields: [
		{
			name: 'image',
			label: '写真を選ぶ',
			widget: 'image',
		},
		{
			name: 'alt',
			label: '写真の内容（読み上げ用）',
			widget: 'string',
			hint: '例：夕焼け空と電線。写っているものを短く入力します',
		},
		{
			name: 'caption',
			label: '写真の下に表示する一言',
			widget: 'string',
			required: false,
		},
		{
			name: 'layout',
			label: '写真の幅',
			widget: 'select',
			default: 'normal',
			options: [
				{ label: '本文に合わせる（おすすめ）', value: 'normal' },
				{ label: '本文より広く見せる', value: 'wide' },
			],
		},
	],
	pattern:
		/<figure class="post-photo post-photo--(?<layout>normal|wide)">\s*<img src="(?<image>[^"]*)" alt="(?<alt>[^"]*)" loading="lazy" decoding="async">\s*<figcaption>(?<caption>[\s\S]*?)<\/figcaption>\s*<\/figure>/m,
	fromBlock: (match) => ({
		image: decodeHtml(match.groups?.image ?? ''),
		alt: decodeHtml(match.groups?.alt ?? ''),
		caption: decodeHtml(match.groups?.caption ?? ''),
		layout: match.groups?.layout ?? 'normal',
	}),
	toBlock: ({ image = '', alt = '', caption = '', layout = 'normal' }) =>
		`<figure class="post-photo post-photo--${normalizePhotoLayout(layout)}">\n<img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">\n<figcaption>${escapeHtml(caption)}</figcaption>\n</figure>`,
	toPreview: ({ image = '', alt = '', caption = '', layout = 'normal' }) =>
		`<figure class="post-photo post-photo--${normalizePhotoLayout(layout)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}"><figcaption>${escapeHtml(caption)}</figcaption></figure>`,
});

CMS.registerEditorComponent({
	id: 'styled-text',
	label: '文字スタイル',
	icon: 'format_size',
	mode: 'dialog',
	summary: '{{text}}',
	fields: [
		{
			name: 'text',
			label: '文章',
			widget: 'text',
		},
		{
			name: 'size',
			label: '文字サイズ',
			widget: 'select',
			default: 'normal',
			options: [
				{ label: '小さな補足', value: 'small' },
				{ label: '標準', value: 'normal' },
				{ label: '大きな一文', value: 'large' },
				{ label: '見出し級', value: 'xlarge' },
			],
		},
		{
			name: 'font',
			label: 'フォント',
			widget: 'select',
			default: 'sans',
			hint: '本文は標準、長文は明朝、短いひとことは手書き風がおすすめです。',
			options: [
				{ label: '標準ゴシック（本文向け）', value: 'sans' },
				{ label: '明朝（落ち着いた長文）', value: 'serif' },
				{ label: '丸ゴシック（やわらかい）', value: 'friendly' },
				{ label: '手書き風（ひとこと）', value: 'handwriting' },
				{ label: '教科書体（丁寧）', value: 'textbook' },
				{ label: 'モダン（すっきり）', value: 'modern' },
				{ label: '等幅（メモ・コード）', value: 'mono' },
			],
		},
		{
			name: 'emphasis',
			label: '強調',
			widget: 'select',
			default: 'normal',
			options: [
				{ label: '標準', value: 'normal' },
				{ label: 'しっかり太字', value: 'bold' },
				{ label: '青で強調', value: 'accent' },
				{ label: '控えめな補足', value: 'muted' },
			],
		},
		{
			name: 'alignment',
			label: '文字揃え',
			widget: 'select',
			default: 'left',
			options: [
				{ label: '左揃え', value: 'left' },
				{ label: '中央揃え', value: 'center' },
			],
		},
	],
	pattern:
		/<p class="styled-text text-(?<size>small|normal|large|xlarge) font-(?<font>sans|serif|friendly|handwriting|textbook|modern|mono)(?: align-(?<alignment>left|center))?(?: emphasis-(?<emphasis>normal|bold|accent|muted))?">(?<text>[\s\S]*?)<\/p>/m,
	fromBlock: (match) => ({
		size: match.groups?.size ?? 'normal',
		font: match.groups?.font ?? 'sans',
		alignment: match.groups?.alignment ?? 'left',
		emphasis: match.groups?.emphasis ?? 'normal',
		text: decodeHtml(match.groups?.text ?? ''),
	}),
	toBlock: ({ text, size = 'normal', font = 'sans', alignment = 'left', emphasis = 'normal' }) =>
		`<p class="styled-text text-${normalizeTextSize(size)} font-${normalizeFont(font)} align-${normalizeAlignment(alignment)} emphasis-${normalizeEmphasis(emphasis)}">${escapeHtml(text)}</p>`,
	toPreview: ({ text, size = 'normal', font = 'sans', alignment = 'left', emphasis = 'normal' }) =>
		`<p class="styled-text text-${normalizeTextSize(size)} font-${normalizeFont(font)} align-${normalizeAlignment(alignment)} emphasis-${normalizeEmphasis(emphasis)}">${escapeHtml(text)}</p>`,
});

CMS.registerEditorComponent({
	id: 'callout',
	label: '囲み',
	icon: 'note_alt',
	mode: 'dialog',
	summary: '{{title}} — {{text}}',
	fields: [
		{
			name: 'title',
			label: '見出し',
			widget: 'string',
			required: false,
		},
		{
			name: 'text',
			label: '文章',
			widget: 'text',
		},
		{
			name: 'tone',
			label: '見た目',
			widget: 'select',
			default: 'note',
			options: [
				{ label: 'メモ', value: 'note' },
				{ label: '情報', value: 'info' },
				{ label: 'やわらかい強調', value: 'warm' },
			],
		},
	],
	pattern:
		/<aside class="post-callout post-callout--(?<tone>note|info|warm)">\s*<p class="post-callout__title">(?<title>[\s\S]*?)<\/p>\s*<p class="post-callout__body">(?<text>[\s\S]*?)<\/p>\s*<\/aside>/m,
	fromBlock: (match) => ({
		tone: match.groups?.tone ?? 'note',
		title: decodeHtml(match.groups?.title ?? ''),
		text: decodeHtml(match.groups?.text ?? ''),
	}),
	toBlock: ({ title = '', text = '', tone = 'note' }) =>
		`<aside class="post-callout post-callout--${normalizeCalloutTone(tone)}">\n<p class="post-callout__title">${escapeHtml(title)}</p>\n<p class="post-callout__body">${escapeHtml(text)}</p>\n</aside>`,
	toPreview: ({ title = '', text = '', tone = 'note' }) =>
		`<aside class="post-callout post-callout--${normalizeCalloutTone(tone)}"><p class="post-callout__title">${escapeHtml(title)}</p><p class="post-callout__body">${escapeHtml(text)}</p></aside>`,
});

CMS.registerEditorComponent({
	id: 'divider',
	label: '区切り',
	icon: 'horizontal_rule',
	mode: 'dialog',
	summary: '{{style}}',
	fields: [
		{
			name: 'style',
			label: '見た目',
			widget: 'select',
			default: 'line',
			options: [
				{ label: '罫線', value: 'line' },
				{ label: '三点', value: 'dots' },
			],
		},
	],
	pattern: /<hr class="post-divider post-divider--(?<style>line|dots)">/m,
	fromBlock: (match) => ({ style: match.groups?.style ?? 'line' }),
	toBlock: ({ style = 'line' }) =>
		`<hr class="post-divider post-divider--${normalizeDividerStyle(style)}">`,
	toPreview: ({ style = 'line' }) =>
		`<hr class="post-divider post-divider--${normalizeDividerStyle(style)}">`,
});

CMS.registerEditorComponent({
	id: 'details',
	label: '折りたたみ',
	icon: 'expand_circle_down',
	mode: 'dialog',
	summary: '{{summary}}',
	fields: [
		{
			name: 'summary',
			label: '閉じている時の見出し',
			widget: 'string',
		},
		{
			name: 'text',
			label: '開いた時に見せる文章',
			widget: 'text',
		},
	],
	pattern:
		/<details class="post-details">\s*<summary>(?<summary>[\s\S]*?)<\/summary>\s*<div class="post-details__body">(?<text>[\s\S]*?)<\/div>\s*<\/details>/m,
	fromBlock: (match) => ({
		summary: decodeHtml(match.groups?.summary ?? ''),
		text: decodeHtml(match.groups?.text ?? ''),
	}),
	toBlock: ({ summary = '', text = '' }) =>
		`<details class="post-details">\n<summary>${escapeHtml(summary)}</summary>\n<div class="post-details__body">${escapeHtml(text)}</div>\n</details>`,
	toPreview: ({ summary = '', text = '' }) =>
		`<details class="post-details"><summary>${escapeHtml(summary)}</summary><div class="post-details__body">${escapeHtml(text)}</div></details>`,
});

CMS.registerEventListener({
	name: 'preSave',
	handler: ({ entry }) => {
		const collection = entry.get('collection');
		if (!['diary', 'blog'].includes(collection)) {
			return entry;
		}

		const data = entry.get('data');
		const currentDescription = String(data.get('description') ?? '').trim();
		const description =
			collection === 'blog' && currentDescription
				? currentDescription
				: summarizeBody(data.get('body')) ||
					data.get('title') ||
					(collection === 'diary' ? '日常の記録' : 'ブログ記事');

		return data.set('description', description);
	},
});

CMS.registerEventListener({
	name: 'postSave',
	handler: ({ entry }) => {
		const transfer = createPolishTransfer(entry);
		let storage = null;
		try {
			storage = window.localStorage;
		} catch {
			storage = null;
		}
		writePolishTransfer(storage, transfer);
	},
});

window.CmsPolishTransfer = {
	POLISH_TRANSFER_KEY,
	createPolishTransfer,
	writePolishTransfer,
};

const DiaryPreview = createClass({
	render() {
		const title = this.props.entry.getIn(['data', 'title']) || '無題の日記';
		const pubDate = this.props.entry.getIn(['data', 'pubDate']);

		return h(
			'article',
			{ className: 'diary-preview' },
			h(
				'header',
				{ className: 'diary-preview__header' },
				h('p', { className: 'diary-preview__eyebrow' }, 'Daily Life'),
				h('time', { className: 'diary-preview__date' }, formatPreviewDate(pubDate)),
				h('h1', {}, title),
			),
			h('div', { className: 'diary-preview__body' }, this.props.widgetFor('body')),
		);
	},
});

CMS.registerPreviewTemplate('diary', DiaryPreview);
