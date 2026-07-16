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
const normalizeFont = (font) => (font === 'serif' ? 'serif' : 'sans');

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
	label: '写真（説明・表示幅つき）',
	icon: 'add_photo_alternate',
	mode: 'dialog',
	summary: '{{alt}}',
	fields: [
		{
			name: 'image',
			label: '画像',
			widget: 'image',
		},
		{
			name: 'alt',
			label: '画像の説明',
			widget: 'string',
			hint: '画像が表示できないときや読み上げで使われます',
		},
		{
			name: 'caption',
			label: 'キャプション',
			widget: 'string',
			required: false,
		},
		{
			name: 'layout',
			label: '表示幅',
			widget: 'select',
			default: 'normal',
			options: [
				{ label: '本文幅', value: 'normal' },
				{ label: 'ワイド', value: 'wide' },
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
	summary: '{{size}} / {{font}} — {{text}}',
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
				{ label: '小さめ', value: 'small' },
				{ label: '標準', value: 'normal' },
				{ label: '大きめ', value: 'large' },
				{ label: '特大', value: 'xlarge' },
			],
		},
		{
			name: 'font',
			label: 'フォント',
			widget: 'select',
			default: 'sans',
			options: [
				{ label: '読みやすいゴシック', value: 'sans' },
				{ label: '落ち着いた明朝', value: 'serif' },
			],
		},
	],
	pattern:
		/<p class="styled-text text-(?<size>small|normal|large|xlarge) font-(?<font>sans|serif)">(?<text>[\s\S]*?)<\/p>/m,
	fromBlock: (match) => ({
		size: match.groups?.size ?? 'normal',
		font: match.groups?.font ?? 'sans',
		text: decodeHtml(match.groups?.text ?? ''),
	}),
	toBlock: ({ text, size = 'normal', font = 'sans' }) =>
		`<p class="styled-text text-${normalizeTextSize(size)} font-${normalizeFont(font)}">${escapeHtml(text)}</p>`,
	toPreview: ({ text, size = 'normal', font = 'sans' }) =>
		`<p class="styled-text text-${normalizeTextSize(size)} font-${normalizeFont(font)}">${escapeHtml(text)}</p>`,
});

CMS.registerEventListener({
	name: 'preSave',
	handler: ({ entry }) => {
		if (entry.get('collection') !== 'diary') {
			return entry;
		}

		const data = entry.get('data');
		const description = summarizeBody(data.get('body')) || data.get('title') || '日常の記録';

		return data.set('description', description);
	},
});

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
