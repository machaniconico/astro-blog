import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../public/admin/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/admin/admin-shell.css', import.meta.url), 'utf8');
const source = await readFile(new URL('../public/admin/admin-shell.js', import.meta.url), 'utf8');

const createHarness = () => {
	const listeners = new Map();
	const openButton = { addEventListener: (name, handler) => listeners.set(`open:${name}`, handler) };
	const closeButton = { addEventListener: (name, handler) => listeners.set(`close:${name}`, handler) };
	const dialog = {
		open: false,
		addEventListener: (name, handler) => listeners.set(`dialog:${name}`, handler),
		showModal() {
			this.open = true;
		},
		close() {
			this.open = false;
		},
	};
	const document = {
		querySelector: (selector) => ({ '#font-guide': dialog, '[data-font-guide-open]': openButton })[selector],
		querySelectorAll: (selector) => (selector === '[data-font-guide-close]' ? [closeButton] : []),
	};
	return { closeButton, dialog, document, listeners, openButton };
};

test('管理バーからラベル付きの書体見本ダイアログを開ける', () => {
	assert.match(html, /aria-controls="font-guide"/);
	assert.match(html, /<dialog class="font-guide" id="font-guide" aria-labelledby="font-guide-title">/);
	assert.match(html, /src="\/admin\/admin-shell\.js"/);
	assert.equal((html.match(/font-guide__sample font-guide__font-/g) ?? []).length, 7);
	for (const font of ['sans', 'serif', 'friendly', 'handwriting', 'textbook', 'modern', 'mono']) {
		assert.match(css, new RegExp(`font-guide__font-${font}`));
	}
	assert.doesNotMatch(css, /https?:\/\//);
});

test('書体見本は開く・閉じる・背景タップで閉じる操作を備える', () => {
	const harness = createHarness();
	const sandbox = { Array, document: harness.document, window: {} };
	vm.runInNewContext(source, sandbox);

	assert.equal(sandbox.window.AdminShell.initFontGuide(harness.document), true);
	harness.listeners.get('open:click')();
	assert.equal(harness.dialog.open, true);
	harness.listeners.get('close:click')();
	assert.equal(harness.dialog.open, false);
	harness.listeners.get('open:click')();
	harness.listeners.get('dialog:click')({ target: harness.dialog });
	assert.equal(harness.dialog.open, false);
});

test('書体見本の操作対象がない画面でも初期化に失敗しない', () => {
	const sandbox = { Array, window: {} };
	vm.runInNewContext(source, sandbox);
	assert.equal(sandbox.window.AdminShell.initFontGuide({ querySelector: () => null }), false);
});
