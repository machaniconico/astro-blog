import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/admin/customizations.js', import.meta.url), 'utf8');
const registeredComponents = [];
const registeredEvents = [];

vm.runInNewContext(source, {
	window: { location: { hash: '#/collections/diary' } },
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

	assert.deepEqual(Array.from(values), ['sans', 'serif']);
});

test('写真部品は説明とキャプションを保ったまま再編集できる', () => {
	const photo = registeredComponents.find(({ id }) => id === 'photo');
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

test('写真部品は未知の表示幅を本文幅へ戻す', () => {
	const photo = registeredComponents.find(({ id }) => id === 'photo');
	const block = photo.toBlock({ image: '/image.webp', alt: 'test', layout: 'unknown' });

	assert.match(block, /post-photo--normal/);
	assert.doesNotMatch(block, /unknown/);
});

test('文字スタイルは未知の値を標準表示へ戻す', () => {
	const block = styledText.toBlock({ text: 'test', size: 'unknown', font: 'unknown' });

	assert.match(block, /text-normal font-sans/);
	assert.doesNotMatch(block, /unknown/);
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
