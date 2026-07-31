import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/admin/customizations.js', import.meta.url), 'utf8');
const configYml = await readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8');
const previewCss = await readFile(new URL('../public/admin/preview.css', import.meta.url), 'utf8');
const globalCss = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const registeredComponents = [];
const registeredEvents = [];
const createMemoryStorage = () => {
	const values = new Map();
	return {
		getItem: (key) => values.get(key) ?? null,
		removeItem: (key) => values.delete(key),
		setItem: (key, value) => values.set(key, String(value)),
	};
};
const cmsStorage = createMemoryStorage();
const cmsWindow = { location: { hash: '#/collections/diary' }, localStorage: cmsStorage };

vm.runInNewContext(source, {
	window: cmsWindow,
	h: (...args) => args,
	createClass: (definition) => definition,
	CMS: {
		registerPreviewStyle() {},
		registerEditorComponent(component) {
			registeredComponents.push(component);
		},
		registerEventListener(event) {
			registeredEvents.push(event);
		},
		registerPreviewTemplate() {},
	},
});

const styledText = registeredComponents.find(({ id }) => id === 'styled-text');
const photo = registeredComponents.find(({ id }) => id === 'photo');

test('文字スタイルを再編集してもHTMLエンティティが二重化しない', () => {
	const block = styledText.toBlock({
		text: 'A & B < C > "D"',
		size: 'large',
		font: 'serif',
	});
	const parsed = styledText.fromBlock(block.match(styledText.pattern));

	assert.equal(styledText.toBlock(parsed), block);
	assert.match(block, /A &amp; B &lt; C &gt; &quot;D&quot;/);
});

test('文字スタイルは安全な選択式フォントだけを提供する', () => {
	const fontField = styledText.fields.find(({ name }) => name === 'font');
	const values = fontField.options.map(({ value }) => value);

	assert.deepEqual(Array.from(values), [
		'sans',
		'serif',
		'friendly',
		'handwriting',
		'textbook',
		'modern',
		'mono',
	]);
	assert.deepEqual(
		Array.from(fontField.options, ({ label }) => label),
		[
			'標準ゴシック（本文向け）',
			'明朝（落ち着いた長文）',
			'丸ゴシック（やわらかい）',
			'手書き風（ひとこと）',
			'教科書体（丁寧）',
			'モダン（すっきり）',
			'等幅（メモ・コード）',
		],
	);
	assert.match(fontField.hint, /本文は標準/);
});

test('追加書体も保存・再編集・プレビューで同じ指定を保つ', () => {
	const fontNames = ['sans', 'serif', 'friendly', 'handwriting', 'textbook', 'modern', 'mono'];

	for (const font of fontNames) {
		const block = styledText.toBlock({ text: `${font}の文章`, size: 'large', font, alignment: 'center' });
		const match = block.match(styledText.pattern);

		assert.ok(match, `${font}のブロックを再編集できる`);
		assert.equal(styledText.fromBlock(match).font, font);
		assert.equal(styledText.toPreview({ text: '確認', font }), '<p class="styled-text text-normal font-' + font + ' align-left emphasis-normal">確認</p>');
	}

	for (const css of [previewCss, globalCss]) {
		for (const font of fontNames) assert.match(css, new RegExp(`font-${font}`));
		assert.doesNotMatch(css, /https?:\/\//);
	}
});

test('未知のフォント指定は外部指定を通さず標準ゴシックへ戻す', () => {
	const block = styledText.toBlock({ text: '安全な本文', font: 'url-font' });

	assert.match(block, /font-sans/);
	assert.doesNotMatch(block, /url-font/);
});

test('配置指定のない既存文字スタイルも再編集できる', () => {
	const legacyBlock = '<p class="styled-text text-large font-serif">以前の装飾</p>';
	const parsed = styledText.fromBlock(legacyBlock.match(styledText.pattern));

	assert.equal(parsed.alignment, 'left');
	assert.equal(parsed.emphasis, 'normal');
	assert.match(styledText.toBlock(parsed), /align-left/);
	assert.match(styledText.toBlock(parsed), /emphasis-normal/);
});

test('文字の強調は安全なプリセットから選び、保存後も再編集できる', () => {
	const emphasisField = styledText.fields.find(({ name }) => name === 'emphasis');
	assert.deepEqual(
		Array.from(emphasisField.options, ({ value }) => value),
		['normal', 'bold', 'accent', 'muted'],
	);
	assert.deepEqual(
		Array.from(emphasisField.options, ({ label }) => label),
		['標準', 'しっかり太字', '青で強調', '控えめな補足'],
	);

	for (const emphasis of ['normal', 'bold', 'accent', 'muted']) {
		const block = styledText.toBlock({ text: `${emphasis}の文章`, emphasis });
		const match = block.match(styledText.pattern);
		assert.ok(match, `${emphasis}のブロックを再編集できる`);
		assert.equal(styledText.fromBlock(match).emphasis, emphasis);
	}

	for (const css of [previewCss, globalCss]) {
		for (const emphasis of ['normal', 'bold', 'accent', 'muted']) {
			assert.match(css, new RegExp(`emphasis-${emphasis}`));
		}
	}
});

test('写真部品は説明とキャプションを保ったまま再編集できる', () => {
	const block = photo.toBlock({
		image: '/images/diary/today.webp',
		alt: '夕暮れの空 & 電線',
		caption: '帰り道の景色 <7月>',
		layout: 'wide',
	});
	const parsed = photo.fromBlock(block.match(photo.pattern));

	assert.equal(photo.toBlock(parsed), block);
	assert.match(block, /post-photo--wide/);
	assert.match(block, /夕暮れの空 &amp; 電線/);
});

test('スマホで迷わない写真入力の名称と選択肢を提供する', () => {
	const fields = Object.fromEntries(photo.fields.map((field) => [field.name, field]));

	assert.equal(photo.label, '説明つき写真');
	assert.equal(fields.image.label, '写真を選ぶ');
	assert.equal(fields.alt.label, '写真の内容（読み上げ用）');
	assert.match(fields.alt.hint, /写っているものを短く/);
	assert.notEqual(fields.alt.required, false);
	assert.equal(fields.caption.label, '写真の下に表示する一言');
	assert.equal(fields.caption.required, false);
	assert.equal(fields.layout.label, '写真の幅');
	assert.deepEqual(
		Array.from(fields.layout.options, ({ label, value }) => ({ label, value })),
		[
			{ label: '本文に合わせる（おすすめ）', value: 'normal' },
			{ label: '本文より広く見せる', value: 'wide' },
		],
	);
	assert.match(configYml, /editor_components: \[image, photo, styled-text, callout, divider, details\]/);
	assert.match(configYml, /写真だけなら画像ボタン。[^\n]+挿入 → 説明つき写真/);
});

test('写真の一言は公開画面とプレビューで読みやすく折り返す', () => {
	assert.match(previewCss, /\.post-photo figcaption\s*{[\s\S]*?color: #475569;[\s\S]*?overflow-wrap: anywhere;/);
	assert.match(globalCss, /\.prose \.post-photo figcaption\s*{[\s\S]*?color: var\(--text-secondary\);[\s\S]*?overflow-wrap: anywhere;/);
});

test('写真部品は未知の表示幅を本文幅へ戻す', () => {
	const block = photo.toBlock({ image: '/image.webp', alt: 'test', layout: 'unknown' });

	assert.match(block, /post-photo--normal/);
	assert.doesNotMatch(block, /unknown/);
});

test('文字スタイルは未知の値を標準表示へ戻す', () => {
	const block = styledText.toBlock({
		text: 'test',
		size: 'unknown',
		font: 'unknown',
		alignment: 'unknown',
		emphasis: 'unknown',
	});

	assert.match(block, /text-normal font-sans align-left emphasis-normal/);
	assert.doesNotMatch(block, /unknown/);
});

test('囲みは文章と見出しを保ったまま再編集できる', () => {
	const callout = registeredComponents.find(({ id }) => id === 'callout');
	const block = callout.toBlock({
		title: '今日のメモ',
		text: '大事なこと & 気づき',
		tone: 'warm',
	});
	const parsed = callout.fromBlock(block.match(callout.pattern));

	assert.equal(callout.toBlock(parsed), block);
	assert.match(block, /post-callout--warm/);
	assert.match(block, /大事なこと &amp; 気づき/);
});

test('囲みと区切りは未知の装飾値を既定値へ戻す', () => {
	const callout = registeredComponents.find(({ id }) => id === 'callout');
	const divider = registeredComponents.find(({ id }) => id === 'divider');

	assert.match(callout.toBlock({ text: 'test', tone: 'unknown' }), /post-callout--note/);
	assert.match(divider.toBlock({ style: 'unknown' }), /post-divider--line/);
});

test('折りたたみは安全なHTMLとして保存し、同じ内容を再編集できる', () => {
	const details = registeredComponents.find(({ id }) => id === 'details');
	const block = details.toBlock({
		summary: '続きを読む & 補足',
		text: '開いた時だけ表示 <script>alert(1)</script>',
	});
	const parsed = details.fromBlock(block.match(details.pattern));

	assert.equal(details.toBlock(parsed), block);
	assert.match(block, /続きを読む &amp; 補足/);
	assert.match(block, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
	assert.doesNotMatch(block, /<script>/);
	for (const css of [previewCss, globalCss]) assert.match(css, /post-details/);
});

test('日記保存時に本文から説明文を自動生成する', () => {
	const event = registeredEvents.find(({ name }) => name === 'preSave');
	const values = new Map([
		['body', '## 今日のこと\n\n夕暮れの空を見た。 **きれい** だった。'],
		['title', '帰り道'],
		['description', '日常の記録'],
	]);
	const data = {
		get: (key) => values.get(key),
		set: (key, value) => {
			values.set(key, value);
			return data;
		},
	};
	const entry = {
		get: (key) => (key === 'collection' ? 'diary' : data),
	};

	event.handler({ entry });

	assert.equal(values.get('description'), '今日のこと 夕暮れの空を見た。 きれい だった。');
});

test('ブログもタイトルと本文だけで説明文を自動生成できる', () => {
	const event = registeredEvents.find(({ name }) => name === 'preSave');
	const values = new Map([
		['title', '夏の開発記録'],
		['body', '## 今日の変更\n\n文字スタイルを使いやすくした。'],
		['description', ''],
	]);
	const data = {
		get: (key) => values.get(key),
		set: (key, value) => {
			values.set(key, value);
			return data;
		},
	};
	const entry = { get: (key) => (key === 'collection' ? 'blog' : data) };

	event.handler({ entry });

	assert.equal(values.get('description'), '今日の変更 文字スタイルを使いやすくした。');
	assert.match(configYml, /name: blog[\s\S]*?name: body\n\s+widget: richtext/);
	assert.match(configYml, /name: blog[\s\S]*?extension: md/);
	assert.match(configYml, /name: blog[\s\S]*?editor_components: \[code-block, image, photo, styled-text, callout, divider, details\]/);
	assert.match(configYml, /name: blog[\s\S]*?modes: \[rich_text\]/);
	assert.match(configYml, /name: blog[\s\S]*?allow_nested_components: false/);
	assert.doesNotMatch(configYml.match(/- name: blog[\s\S]*?(?=\n\s+- name: works)/)?.[0] ?? '', /modes: \[[^\]]*raw/);
	assert.ok(
		configYml.indexOf('      - label: 本文', configYml.indexOf('  - name: blog')) <
			configYml.indexOf('      - label: アイキャッチ画像（任意）', configYml.indexOf('  - name: blog')),
		'ブログではタイトルの次に本文を編集できる',
	);
	assert.match(configYml, /name: blog[\s\S]*?name: description\n\s+widget: hidden/);
	// 公開日時だけは隠さない。未来の日時を選べることが予約投稿の入口になる。
	assert.match(configYml, /name: blog[\s\S]*?name: pubDate\n\s+widget: datetime/);
});

test('既存ブログの手書き説明文は保存時に上書きしない', () => {
	const event = registeredEvents.find(({ name }) => name === 'preSave');
	const values = new Map([
		['title', '既存記事'],
		['body', '新しい本文'],
		['description', '検索結果に表示する手書きの説明'],
	]);
	const data = {
		get: (key) => values.get(key),
		set: (key, value) => {
			values.set(key, value);
			return data;
		},
	};
	const entry = { get: (key) => (key === 'collection' ? 'blog' : data) };

	event.handler({ entry });
	assert.equal(values.get('description'), '検索結果に表示する手書きの説明');
});

test('保存した日記のタイトルと装飾を含む本文を文章確認用に端末内へ渡す', () => {
	const event = registeredEvents.find(({ name }) => name === 'postSave');
	const values = new Map([
		['title', '夏祭りの日記'],
		['body', '<p class="styled-text text-large font-serif">花火を見た。</p>'],
	]);
	const entry = {
		get: (key) => ({
			collection: 'diary',
			data: { get: (field) => values.get(field) },
			path: 'src/content/diary/2026-07-17.md',
		})[key],
	};

	event.handler({ entry });
	const transfer = JSON.parse(cmsStorage.getItem(cmsWindow.CmsPolishTransfer.POLISH_TRANSFER_KEY));
	assert.equal(transfer.source, 'cms');
	assert.equal(transfer.title, '夏祭りの日記');
	assert.equal(transfer.body, '<p class="styled-text text-large font-serif">花火を見た。</p>');
	assert.equal(transfer.contentType, 'diary');
	assert.equal(transfer.path, 'src/content/diary/2026-07-17.md');
	assert.ok(transfer.savedAt > 0);
});

test('対象外コレクションや保存領域エラーでは文章確認用データを書き込まない', () => {
	const { createPolishTransfer, writePolishTransfer } = cmsWindow.CmsPolishTransfer;
	const entry = {
		get: (key) => ({
			collection: 'works',
			data: { get: () => '対象外' },
		})[key],
	};

	assert.equal(createPolishTransfer(entry), null);
	assert.equal(writePolishTransfer({ setItem: () => { throw new Error('denied'); } }, { title: '本文' }), false);
});
