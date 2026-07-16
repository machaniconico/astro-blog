import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/admin/polish.js', import.meta.url), 'utf8');
const adminHtml = await readFile(new URL('../public/admin/index.html', import.meta.url), 'utf8');
const polishHtml = await readFile(new URL('../public/admin/polish.html', import.meta.url), 'utf8');
const polishCss = await readFile(new URL('../public/admin/polish.css', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);

const {
	DRAFT_KEY,
	TRANSFER_KEY,
	analyzeText,
	areCmsTransfersEqual,
	clearCmsTransfer,
	clearCmsTransferIfCurrent,
	clearLocalDraft,
	countVisibleCharacters,
	copyTextSafely,
	formatSafely,
	getBodyCountPresentation,
	getCopyFeedback,
	getCmsTransferAction,
	getCmsTransferPresentation,
	getEditorActionPresentation,
	getMobileAnalysisActionPresentation,
	getScoreProgressPresentation,
	getIssuePresentation,
	getOverwriteConfirmMessage,
	getReturnCopyAriaLabel,
	getResultPrimaryAction,
	getSelectionRange,
	getSuggestionActionLabel,
	getTitleCountPresentation,
	hasBalancedHtmlTags,
	isCopyRequestCurrent,
	isAdminLaunch,
	normalizeCmsTransfer,
	readCmsTransfer,
	readLocalDraft,
	readLocalDraftRecord,
	shouldMoveToResults,
	stripMarkdown,
	writeLocalDraft,
	writeLocalDraftSafely,
} = sandbox.window.PolishTool;

const createMemoryStorage = () => {
	const values = new Map();
	return {
		getItem: (key) => values.get(key) ?? null,
		removeItem: (key) => values.delete(key),
		setItem: (key, value) => values.set(key, String(value)),
	};
};

test('文章ブラッシュアップは外部AIやネットワーク通信を使わない', () => {
	assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/);
	assert.doesNotMatch(source, /\b(?:openai|anthropic|gemini)\b/i);
	assert.doesNotMatch(`${polishHtml}\n${polishCss}`, /https?:\/\//);
});

test('Markdown記号を除いて文字数を数えられる', () => {
	assert.equal(stripMarkdown('## 見出し\n\n**大事な文章**です。'), '見出し 大事な文章です。');
});

test('絵文字や結合文字を画面上の1文字として数える', () => {
	assert.equal(countVisibleCharacters('🎆'), 1);
	assert.equal(countVisibleCharacters('👨‍👩‍👧‍👦'), 1);
	assert.equal(countVisibleCharacters('🇯🇵'), 1);
	assert.equal(countVisibleCharacters('e\u0301'), 1);
	assert.equal(countVisibleCharacters('夏祭り🎆'), 4);
});

test('旧ブラウザ向け文字数処理でも主要な合成絵文字を1文字として数える', () => {
	assert.equal(countVisibleCharacters('👨‍👩‍👧‍👦', null), 1);
	assert.equal(countVisibleCharacters('🇯🇵', null), 1);
	assert.equal(countVisibleCharacters('👍🏽', null), 1);
	assert.equal(countVisibleCharacters('e\u0301', null), 1);
	assert.equal(countVisibleCharacters('日記🎆', null), 3);
});

test('文章確認は投稿画面を残したまま別タブで開く', () => {
	const polishLink = adminHtml.match(/<a\s+[^>]*class="admin-tools__polish"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? '';

	assert.match(polishLink, /href="\/admin\/polish\.html\?from=admin"/);
	assert.match(polishLink, /target="_blank"/);
	assert.match(polishLink, /rel="noopener"/);
});

test('CMSで保存した投稿を壊さず読み取り、使用後に消去できる', () => {
	const storage = createMemoryStorage();
	const transfer = {
		source: 'cms',
		title: '保存した日記',
		body: '<p class="styled-text text-large font-serif">本文です。</p>',
		contentType: 'diary',
		path: 'src/content/diary/today.md',
		savedAt: 200,
	};
	storage.setItem(TRANSFER_KEY, JSON.stringify(transfer));

	assert.deepEqual({ ...readCmsTransfer(storage) }, transfer);
	assert.equal(clearCmsTransfer(storage), true);
	assert.equal(readCmsTransfer(storage), null);
	assert.equal(normalizeCmsTransfer({ ...transfer, source: 'unknown' }), null);
	assert.equal(normalizeCmsTransfer({ ...transfer, savedAt: 0 }), null);
});

test('CMSの新しい保存内容だけを読み込み候補として表示する', () => {
	const transfer = {
		source: 'cms',
		title: '保存した日記',
		body: 'CMSの本文',
		contentType: 'diary',
		savedAt: 200,
	};
	const olderDraft = { title: '確認中', body: '古い本文', contentType: 'diary', savedAt: 100 };
	const newerDraft = { title: '確認中', body: '新しい本文', contentType: 'diary', savedAt: 300 };
	const sameDraft = { ...transfer, writerId: 'tool' };

	assert.equal(getCmsTransferAction(transfer, olderDraft), 'offer');
	assert.equal(getCmsTransferAction(transfer, newerDraft), 'discard');
	assert.equal(getCmsTransferAction(transfer, sameDraft), 'discard');
	assert.equal(getCmsTransferAction(null, olderDraft), 'none');
});

test('表示中の候補と違うCMS保存内容は別タブ競合でも消去しない', () => {
	const storage = createMemoryStorage();
	const transferA = {
		source: 'cms',
		title: '保存A',
		body: '本文A',
		contentType: 'diary',
		path: 'src/content/diary/a.md',
		savedAt: 200,
	};
	const transferB = {
		...transferA,
		title: '保存B',
		body: '本文B',
		path: 'src/content/diary/b.md',
		savedAt: 300,
	};

	storage.setItem(TRANSFER_KEY, JSON.stringify(transferB));
	const changedResult = clearCmsTransferIfCurrent(storage, transferA);
	assert.equal(changedResult.cleared, false);
	assert.equal(areCmsTransfersEqual(changedResult.current, transferB), true);
	assert.deepEqual({ ...readCmsTransfer(storage) }, transferB);

	const currentResult = clearCmsTransferIfCurrent(storage, transferB);
	assert.equal(currentResult.cleared, true);
	assert.equal(readCmsTransfer(storage), null);
	assert.match(source, /const transferToLoad = refreshPendingCmsTransfer\(\)/);
	assert.match(source, /clearCmsTransferIfCurrent\(storage, transferToLoad\)/);
	assert.match(source, /const transferToDismiss = refreshPendingCmsTransfer\(\)/);
	assert.match(source, /clearCmsTransferIfCurrent\(storage, transferToDismiss\)/);
});

test('保存済み投稿の読込は現在の確認用下書きへの影響を明示する', () => {
	const transfer = { title: '夏祭りの日記' };
	const empty = getCmsTransferPresentation(transfer, false);
	const existing = getCmsTransferPresentation(transfer, true);

	assert.match(empty.detail, /タイトル・本文ごと読み込めます/);
	assert.equal(empty.loadLabel, '保存した投稿を開く');
	assert.match(existing.detail, /現在の確認用下書きと入れ替わります/);
	assert.equal(existing.loadLabel, '保存した投稿と入れ替える');
	assert.equal(existing.dismissLabel, '今の下書きを残す');
	assert.match(polishHtml, /id="cms-transfer"[^>]*role="region"[^>]*aria-live="polite"[^>]*hidden/);
	assert.match(polishHtml, /id="load-cms-transfer"/);
	assert.match(polishHtml, /id="dismiss-cms-transfer"/);
	assert.match(polishCss, /\.cms-transfer\s*\{[\s\S]*?border-left: 3px solid var\(--accent\)/);
	assert.match(source, /addEventListener\('storage',[\s\S]*?event\.key !== TRANSFER_KEY/);
});

test('投稿画面から開いた文章確認だけを復帰モードとして判定する', () => {
	assert.equal(isAdminLaunch('?from=admin'), true);
	assert.equal(isAdminLaunch('?mode=check&from=admin'), true);
	assert.equal(isAdminLaunch('?from=administrator'), false);
	assert.equal(isAdminLaunch(''), false);
});

test('スマホの手動診断だけ結果へ移動し、自動更新では画面を奪わない', () => {
	assert.equal(shouldMoveToResults({ automated: false, isMobile: true }), true);
	assert.equal(shouldMoveToResults({ automated: true, isMobile: true }), false);
	assert.equal(shouldMoveToResults({ automated: false, isMobile: false }), false);
});

test('スマホでは編集範囲内を追従する診断操作を提供する', () => {
	assert.match(polishHtml, /id="analyze-mobile"[^>]*aria-controls="result-pane"[^>]*data-action="analyze"[^>]*disabled/);
	assert.match(polishHtml, /<textarea id="body"[\s\S]*?<div class="mobile-editor-action">[\s\S]*?id="analyze-mobile"/);
	assert.match(polishCss, /@media \(max-width: 820px\)[\s\S]*?\.mobile-editor-action \{[\s\S]*?position: sticky;[\s\S]*?bottom: max\(8px, env\(safe-area-inset-bottom\)\)/);
	assert.match(polishCss, /@media \(max-width: 820px\)[\s\S]*?#analyze \{[\s\S]*?display: none/);
	assert.match(source, /analyzeMobile\.addEventListener\('click', \(\) => \{[\s\S]*?dataset\.action === 'view-results'[\s\S]*?moveToResults\(\)/);
	assert.match(polishCss, /#analyze-mobile\[data-action="view-results"\]::after[\s\S]*?content: "↓"/);
});

test('本文がない操作は理由を示して無効化し、入力後に有効化する', () => {
	const empty = getEditorActionPresentation('  ');
	const ready = getEditorActionPresentation('本文です。');

	assert.equal(empty.ready, false);
	assert.equal(empty.analyzeLabel, '本文入力後に診断');
	assert.match(empty.analyzeAriaLabel, /本文を入力すると診断できます/);
	assert.equal(ready.ready, true);
	assert.equal(ready.analyzeLabel, '文章を診断');
	assert.equal(ready.formatLabel, '安全に整形');
	assert.match(polishHtml, /id="format"[^>]*disabled/);
});

test('スマホの固定操作は診断状態に応じて役割を切り替える', () => {
	const empty = getMobileAnalysisActionPresentation({ hasBody: false });
	const ready = getMobileAnalysisActionPresentation({ hasBody: true });
	const firstPending = getMobileAnalysisActionPresentation({ hasBody: true, analysisState: 'pending' });
	const updatePending = getMobileAnalysisActionPresentation({
		hasBody: true,
		hasResults: true,
		analysisState: 'pending',
	});
	const current = getMobileAnalysisActionPresentation({
		hasBody: true,
		hasResults: true,
		analysisState: 'current',
		resultSummary: '3件',
	});

	assert.deepEqual(
		{ action: empty.action, state: empty.state, disabled: empty.disabled, label: empty.label },
		{ action: 'analyze', state: 'empty', disabled: true, label: '本文入力後に診断' },
	);
	assert.equal(ready.label, '文章を診断');
	assert.equal(firstPending.label, '今すぐ診断');
	assert.equal(updatePending.label, '今すぐ診断を更新');
	assert.equal(updatePending.disabled, false);
	assert.equal(current.action, 'view-results');
	assert.equal(current.label, '診断結果を見る');
	assert.match(current.ariaLabel, /3件/);
});

test('診断結果から本文へ戻るモバイル操作を提供する', () => {
	assert.match(polishHtml, /id="result-pane"/);
	assert.match(polishHtml, /id="result-title"[^>]*tabindex="-1"/);
	assert.match(polishHtml, /id="edit-body"[^>]*aria-controls="body"/);
	assert.match(polishHtml, /id="copy-title"[^>]*aria-describedby="result-copy-status"/);
	assert.match(polishHtml, /id="copy-body"[^>]*aria-describedby="result-copy-status"/);
	assert.match(polishHtml, /id="result-copy-status"[^>]*role="status"[^>]*aria-live="polite"/);
});

test('診断状態に合わせて投稿前の主要操作を切り替える', () => {
	assert.equal(getResultPrimaryAction('good'), 'copy-body');
	assert.equal(getResultPrimaryAction('issues'), 'edit-body');
	assert.equal(getResultPrimaryAction('unknown'), 'edit-body');
	assert.match(source, /copyTitle\.addEventListener\('click'[\s\S]*?copyEditorText\([\s\S]*?label: 'タイトル'/);
	assert.match(source, /copyBody\.classList\.toggle\('button-primary', primaryAction === 'copy-body'\)/);
	assert.match(polishCss, /\.result-workflow__actions \.button[\s\S]*?white-space: nowrap/);
});

test('編集後のスコアを初回診断との比較で示す', () => {
	const baseline = getScoreProgressPresentation({
		currentScore: 72,
		baselineScore: 72,
		isBaseline: true,
	});
	const improved = getScoreProgressPresentation({ currentScore: 84, baselineScore: 72 });
	const declined = getScoreProgressPresentation({ currentScore: 68, baselineScore: 72 });
	const unchanged = getScoreProgressPresentation({ currentScore: 72, baselineScore: 72 });

	assert.deepEqual(
		{ state: baseline.state, text: baseline.text },
		{ state: 'baseline', text: '初回診断' },
	);
	assert.deepEqual(
		{ state: improved.state, text: improved.text },
		{ state: 'improved', text: '初回比 +12' },
	);
	assert.match(improved.ariaLabel, /12点改善/);
	assert.deepEqual(
		{ state: declined.state, text: declined.text },
		{ state: 'declined', text: '初回比 −4' },
	);
	assert.match(declined.ariaLabel, /4点低下/);
	assert.equal(unchanged.state, 'unchanged');
	assert.match(unchanged.text, /変化なし/);
	assert.match(polishHtml, /id="score-progress"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
	assert.match(polishCss, /\.score-progress\[data-state="improved"\][\s\S]*?color: #166534/);
	assert.match(source, /let baselineScore = null/);
	assert.match(source, /contentTypeInputs\.forEach[\s\S]*?baselineScore = null;[\s\S]*?handleContentChange\(\)/);
});

test('タイトル文字数は診断と同じ5〜40文字を目安として表示する', () => {
	assert.equal(getTitleCountPresentation('   ').state, 'empty');
	assert.equal(getTitleCountPresentation('1234').state, 'short');
	assert.equal(getTitleCountPresentation('12345').state, 'good');
	assert.equal(getTitleCountPresentation('あ'.repeat(40)).state, 'good');
	assert.equal(getTitleCountPresentation('あ'.repeat(41)).state, 'long');
	assert.equal(getTitleCountPresentation(' 12345 ').length, 5);
	assert.match(getTitleCountPresentation('1234').ariaLabel, /5文字以上がおすすめ/);
	assert.match(getTitleCountPresentation('あ'.repeat(41)).ariaLabel, /40文字以内がおすすめ/);
	assert.match(polishHtml, /id="title"[^>]*aria-describedby="title-count"/);
	assert.match(polishCss, /#title-count\[data-state="short"\]/);
	assert.match(polishCss, /#title-count\[data-state="good"\]/);
	assert.match(polishCss, /#title-count\[data-state="long"\]/);
});

test('タイトルの絵文字は表示上の文字数で40文字境界を判定する', () => {
	assert.equal(getTitleCountPresentation('🎆'.repeat(40)).state, 'good');
	assert.equal(getTitleCountPresentation('🎆'.repeat(41)).state, 'long');
	assert.equal(getTitleCountPresentation('夏祭りの夜🎆').length, 6);
	assert.match(analyzeText({ title: '🎆'.repeat(41), body: '本文です。' }).issues[0].detail, /現在41文字/);
});

test('本文文字数と読了時間は診断と同じMarkdown除外後の値を表示する', () => {
	const empty = getBodyCountPresentation('');
	const oneMinute = getBodyCountPresentation('あ'.repeat(500));
	const twoMinutes = getBodyCountPresentation('あ'.repeat(501));
	const markdown = '## 見出し\n\n**本文です。**';
	const presentation = getBodyCountPresentation(markdown);
	const analysis = analyzeText({ title: '確認用タイトル', body: markdown });

	assert.equal(empty.characters, 0);
	assert.equal(empty.readingMinutes, 0);
	assert.equal(empty.text, '0文字');
	assert.equal(oneMinute.readingMinutes, 1);
	assert.equal(twoMinutes.readingMinutes, 2);
	assert.match(twoMinutes.text, /501文字・約2分/);
	assert.equal(presentation.characters, analysis.stats.characters);
	assert.equal(presentation.readingMinutes, analysis.stats.readingMinutes);
	assert.match(presentation.ariaLabel, /本文.+文字、読了約1分/);
	assert.match(polishHtml, /id="body"[^>]*aria-describedby="live-count"/);
	assert.match(polishCss, /#live-count[\s\S]*?min-width: 120px/);
});

test('本文と長文診断も絵文字を表示上の1文字として扱う', () => {
	const familyEmoji = '👨‍👩‍👧‍👦';
	const body = `日記${familyEmoji}`;
	assert.equal(getBodyCountPresentation(body).characters, 3);
	assert.equal(analyzeText({ title: '家族の日記', body }).stats.characters, 3);

	const atSentenceLimit = analyzeText({ title: '絵文字テスト', body: '🎆'.repeat(90) });
	const overSentenceLimit = analyzeText({ title: '絵文字テスト', body: '🎆'.repeat(91) });
	assert.equal(atSentenceLimit.issues.some(({ title }) => title === '長い文を短くする'), false);
	assert.equal(overSentenceLimit.issues.some(({ title }) => title === '長い文を短くする'), true);
});

test('段落とブログ向け提案の境界も表示上の文字数で判定する', () => {
	const analyzeEmojiBody = (length, contentType = 'diary') => analyzeText({
		title: '絵文字の境界テスト',
		body: '🎆'.repeat(length),
		contentType,
	});
	const hasIssue = (analysis, title) => analysis.issues.some((issue) => issue.title === title);

	assert.equal(hasIssue(analyzeEmojiBody(180), '長い段落を分ける'), false);
	assert.equal(hasIssue(analyzeEmojiBody(181), '長い段落を分ける'), true);
	assert.equal(hasIssue(analyzeEmojiBody(299, 'blog'), '具体例を少し足す'), true);
	assert.equal(hasIssue(analyzeEmojiBody(300, 'blog'), '具体例を少し足す'), false);
	assert.equal(hasIssue(analyzeEmojiBody(499, 'blog'), '見出しを追加する'), false);
	assert.equal(hasIssue(analyzeEmojiBody(500, 'blog'), '見出しを追加する'), true);
});

test('本文コピーはClipboard APIを優先する', async () => {
	let copiedText = '';
	let fallbackCalled = false;
	const method = await copyTextSafely('現在の本文', {
		clipboard: { writeText: async (text) => { copiedText = text; } },
		fallback: () => { fallbackCalled = true; return true; },
	});
	assert.equal(method, 'clipboard');
	assert.equal(copiedText, '現在の本文');
	assert.equal(fallbackCalled, false);
});

test('Clipboard APIが使えない場合は端末内フォールバックを使う', async () => {
	const method = await copyTextSafely('本文', {
		clipboard: { writeText: async () => { throw new Error('permission denied'); } },
		fallback: (text) => text === '本文',
	});
	assert.equal(method, 'fallback');
	assert.equal(await copyTextSafely('本文', { fallback: () => false }), 'failed');
	assert.equal(await copyTextSafely('本文', { fallback: () => { throw new Error('copy failed'); } }), 'failed');
});

test('コピー後は対象と投稿画面への戻り方を明示する', () => {
	assert.equal(getReturnCopyAriaLabel('タイトル'), 'コピーしたタイトルを投稿画面へ戻って貼り付ける');
	assert.equal(getReturnCopyAriaLabel('本文'), 'コピーした本文を投稿画面へ戻って貼り付ける');
	assert.equal(getReturnCopyAriaLabel('整形結果'), 'コピーした整形結果を投稿画面へ戻って貼り付ける');
	assert.match(getCopyFeedback({ label: 'タイトル', copied: true, launchedFromAdmin: true }), /タイトルをコピーしました/);
	assert.match(getCopyFeedback({ label: 'タイトル', copied: true, launchedFromAdmin: true }), /タイトル欄に貼り付け/);
	assert.match(getCopyFeedback({ label: '本文', copied: true, launchedFromAdmin: true }), /本文をコピーしました/);
	assert.match(getCopyFeedback({ label: '本文', copied: true, launchedFromAdmin: true }), /本文欄に貼り付け/);
	assert.match(getCopyFeedback({ label: '本文', copied: true, launchedFromAdmin: true }), /戻って貼り付け/);
	assert.match(
		getCopyFeedback({ label: '本文', copied: true, launchedFromAdmin: true, closeFailed: true }),
		/このタブを閉じ、元の投稿タブ/,
	);
	assert.match(getCopyFeedback({ label: '整形結果', copied: false }), /整形結果から端末のコピー操作/);
	assert.match(getCopyFeedback({ label: '本文', stale: true }), /コピー中に変わりました/);
});

test('コピー要求は最新世代かつ対象文字列が変わっていない場合だけ有効', () => {
	assert.equal(isCopyRequestCurrent({ requestId: 2, activeRequestId: 2, expectedText: '本文', currentText: '本文' }), true);
	assert.equal(isCopyRequestCurrent({ requestId: 1, activeRequestId: 2, expectedText: '本文', currentText: '本文' }), false);
	assert.equal(isCopyRequestCurrent({ requestId: 2, activeRequestId: 2, expectedText: 'コピー前', currentText: 'コピー後' }), false);
});

test('削除競合の上書き確認は消去状態を取り消す操作だと伝える', () => {
	assert.match(getOverwriteConfirmMessage({ deleted: true }), /消去された状態を取り消し/);
	assert.match(getOverwriteConfirmMessage({ deleted: false }), /新しい下書き/);
});

test('長い段落と長い文を改善点として検出する', () => {
	const longSentence = `${'とても長い文章です、'.repeat(24)}終わりです。`;
	const result = analyzeText({ title: '長文テスト', body: longSentence, contentType: 'diary' });

	assert.ok(result.score < 100);
	assert.ok(result.issues.some(({ title }) => title === '長い段落を分ける'));
	assert.ok(result.issues.some(({ title }) => title === '長い文を短くする'));
});

test('改善ポイントから直す場所へ直接移動できる情報を返す', () => {
	const titleResult = analyzeText({ title: '  短い  ', body: '本文は入力されています。', contentType: 'diary' });
	const longSentence = `${'長い文章です、'.repeat(30)}終わりです。`;
	const decoratedBody = `<p class="styled-text text-large font-serif">${longSentence}</p>\n\n短い段落です。`;
	const complexInner = `<strong>${'装飾された長い文章です、'.repeat(16)}</strong>${'続きの文章です、'.repeat(12)}終わりです。`;
	const complexBody = `<p class="styled-text text-large font-serif">${complexInner}</p>`;
	const bodyResult = analyzeText({
		title: '長文テスト',
		body: decoratedBody,
		contentType: 'diary',
	});
	const fillerBody = '<p>とても楽しいです。とても明るいです。とても良い日です。</p>';
	const fillerResult = analyzeText({ title: '繰り返しテスト', body: fillerBody, contentType: 'diary' });
	const complexResult = analyzeText({ title: '装飾テスト', body: complexBody, contentType: 'diary' });
	const formatResult = analyzeText({
		title: '整形テスト',
		body: '1段落です。   \n\n\n2段落です。',
		contentType: 'diary',
	});

	const titleIssue = titleResult.issues.find(({ title }) => title === 'タイトルが短めです');
	const paragraphIssue = bodyResult.issues.find(({ title }) => title === '長い段落を分ける');
	const sentenceIssue = bodyResult.issues.find(({ title }) => title === '長い文を短くする');
	const fillerIssue = fillerResult.issues.find(({ title }) => title === '繰り返し表現を見直す');

	assert.equal(titleIssue?.action, 'title');
	assert.deepEqual({ ...titleIssue?.target }, { field: 'title', start: 2, end: 4 });
	assert.equal(titleIssue?.actionLabel, 'タイトルに言葉を足す');
	assert.equal(paragraphIssue?.action, 'body');
	assert.equal(decoratedBody.slice(paragraphIssue.target.start, paragraphIssue.target.end), longSentence);
	assert.equal(paragraphIssue.actionLabel, '最初の長い段落を直す');
	assert.equal(decoratedBody.slice(sentenceIssue.target.start, sentenceIssue.target.end), longSentence);
	assert.equal(sentenceIssue.actionLabel, '最初の長い文を直す');
	const complexSentenceIssue = complexResult.issues.find(({ title }) => title === '長い文を短くする');
	assert.equal(complexBody.slice(complexSentenceIssue.target.start, complexSentenceIssue.target.end), complexInner);
	assert.equal(fillerBody.slice(fillerIssue.target.start, fillerIssue.target.end), 'とても');
	assert.equal(fillerIssue.actionLabel, '最初の「とても」を直す');
	assert.equal(formatResult.issues.find(({ title }) => title === '空白と改行を整える')?.action, 'format');
	assert.equal(getSuggestionActionLabel('title'), 'タイトルを直す');
	assert.equal(getSuggestionActionLabel('body', 'この文を直す'), 'この文を直す');
	assert.equal(getSuggestionActionLabel('body'), '本文を直す');
	assert.equal(getSuggestionActionLabel('format'), '整形結果を見る');
	assert.equal(getSuggestionActionLabel('unknown'), '');
	assert.deepEqual({ ...getSelectionRange('12345', { start: -5, end: 99 }) }, { start: 0, end: 5 });
	assert.deepEqual({ ...getSelectionRange('12345', { start: 4, end: 2 }) }, { start: 4, end: 4 });
	assert.match(source, /action\.dataset\.targetStart = String\(issue\.target\.start\)/);
	assert.match(source, /field\.setSelectionRange\(range\.start, range\.end\)/);
	assert.match(source, /const updating = state === 'pending'[\s\S]*?button\.disabled = updating/);
	assert.match(source, /action\.setAttribute\('aria-describedby', 'analysis-status'\)/);
	assert.match(polishCss, /\.suggestion-action:disabled\s*{[\s\S]*?cursor: wait/);
});

test('文末・見出し・追記の提案も直す位置を具体的に示す', () => {
	const endingsBody = '朝に散歩しました。昼に買い物しました。夜に料理しました。';
	const endingsResult = analyzeText({ title: '一日の記録', body: endingsBody, contentType: 'diary' });
	const endingIssue = endingsResult.issues.find(({ title }) => title === '文末に変化を付ける');
	assert.equal(endingsBody.slice(endingIssue.target.start, endingIssue.target.end), 'ました');
	assert.equal(endingIssue.target.start, endingsBody.lastIndexOf('ました'));
	assert.equal(endingIssue.actionLabel, '最後の「ました」を直す');

	const shortBlogBody = '短いブログ本文です。';
	const shortBlogResult = analyzeText({ title: '短いブログ', body: shortBlogBody, contentType: 'blog' });
	const exampleIssue = shortBlogResult.issues.find(({ title }) => title === '具体例を少し足す');
	assert.deepEqual(
		{ ...exampleIssue.target },
		{ field: 'body', start: shortBlogBody.length, end: shortBlogBody.length },
	);
	assert.equal(exampleIssue.actionLabel, '本文の末尾に具体例を足す');

	const longBlogBody = `\n\n${'長いブログの内容です。'.repeat(80)}`;
	const longBlogResult = analyzeText({ title: '長いブログ', body: longBlogBody, contentType: 'blog' });
	const headingIssue = longBlogResult.issues.find(({ title }) => title === '見出しを追加する');
	assert.equal(headingIssue.target.field, 'body');
	assert.equal(longBlogBody.slice(headingIssue.target.start, headingIssue.target.start + 2), '長い');
	assert.equal(headingIssue.target.start, headingIssue.target.end);
	assert.equal(headingIssue.actionLabel, '本文の先頭に見出しを足す');
});

test('装飾コンテナ・HTML属性・Markdown URLを本文の修正位置と誤認しない', () => {
	const wrappedBody = `<div class="wrap">\n<p><strong>${'前半です、'.repeat(20)}</strong>${'後半です、'.repeat(20)}終わりです。</p>\n\n<p>次です。</p>\n</div>`;
	const wrappedResult = analyzeText({ title: '装飾コンテナ', body: wrappedBody, contentType: 'diary' });
	const wrappedIssue = wrappedResult.issues.find(({ title }) => title === '長い文を短くする');
	const wrappedSelection = wrappedBody.slice(wrappedIssue.target.start, wrappedIssue.target.end);
	assert.equal(hasBalancedHtmlTags(wrappedSelection), true);
	assert.match(wrappedSelection, /^<strong>/);
	assert.match(wrappedSelection, /<\/strong>/);
	assert.doesNotMatch(wrappedSelection, /<\/?div/);
	assert.doesNotMatch(wrappedSelection, /<\/p>/);

	const fillerBody = '<p data-note="とても">普通です。</p>\n\n<p>とても楽しいです。とても明るいです。とても良い日です。</p>';
	const fillerResult = analyzeText({ title: '属性を除外', body: fillerBody, contentType: 'diary' });
	const fillerIssue = fillerResult.issues.find(({ title }) => title === '繰り返し表現を見直す');
	assert.equal(fillerBody.slice(fillerIssue.target.start, fillerIssue.target.end), 'とても');
	assert.equal(fillerIssue.target.start, fillerBody.indexOf('とても楽しい'));

	const endingsBody = '朝に撮影しました。昼に編集しました。夜に公開しました。\n<img src="photo.jpg" alt="撮影しました">';
	const endingsResult = analyzeText({ title: '属性内の文末を除外', body: endingsBody, contentType: 'diary' });
	const endingIssue = endingsResult.issues.find(({ title }) => title === '文末に変化を付ける');
	const thirdEnding = endingsBody.indexOf('ました', endingsBody.indexOf('ました', endingsBody.indexOf('ました') + 1) + 1);
	assert.equal(endingIssue.target.start, thirdEnding);
	assert.equal(endingsBody.slice(endingIssue.target.start, endingIssue.target.end), 'ました');

	const visibleLongSentence = `${'画面に見える長い文章です、'.repeat(14)}終わりです。`;
	const markdownBody = `[説明](https://example.com/search?query=${'長い'.repeat(60)})\n\n${visibleLongSentence}`;
	const markdownResult = analyzeText({ title: 'URLを除外', body: markdownBody, contentType: 'diary' });
	const markdownIssue = markdownResult.issues.find(({ title }) => title === '長い文を短くする');
	const markdownSelection = markdownBody.slice(markdownIssue.target.start, markdownIssue.target.end);
	assert.equal(markdownSelection, visibleLongSentence);
	assert.doesNotMatch(markdownSelection, /https?:|query=/);

	const scriptBody = `<script>${'const note = "とても";'.repeat(3)}</script>\n\n<p>普通の日です。</p>`;
	const styleBody = `<style>${'.x::after{content:"とても";}'.repeat(3)}</style>\n\n<p>普通の日です。</p>`;
	const templateBody = `<template>${'<p>とても</p>'.repeat(3)}</template>\n\n<p>普通の日です。</p>`;
	const nestedTemplateBody = `<template><template><p>内側です。</p></template>${'<p>とても</p>'.repeat(3)}</template>\n\n<p>普通の日です。</p>`;
	const templateScriptBody = '<template><script>const sample = "<template>";</script></template>\n\n<p>普通の日です。</p>';
	const quotedGtBody = '<p data-note="隠し > とても とても とても">普通の日です。</p>';
	for (const body of [scriptBody, styleBody, templateBody, nestedTemplateBody, templateScriptBody, quotedGtBody]) {
		const result = analyzeText({ title: '不可視HTMLを除外', body, contentType: 'diary' });
		assert.equal(
			result.issues.some(({ title }) => title === '繰り返し表現を見直す'),
			false,
		);
	}

	const urlParenBody = `[説明](https://example.com/a(${'long'.repeat(40)})${'tail'.repeat(30)})\n\n${visibleLongSentence}`;
	const urlParenResult = analyzeText({ title: '丸括弧URLを除外', body: urlParenBody, contentType: 'diary' });
	const urlParenIssue = urlParenResult.issues.find(({ title }) => title === '長い文を短くする');
	const urlParenSelection = urlParenBody.slice(urlParenIssue.target.start, urlParenIssue.target.end);
	assert.equal(urlParenSelection, visibleLongSentence);
	assert.doesNotMatch(urlParenSelection, /https?:|long|tail/);

	const apostropheUrlBody = `[説明](https://example.com/O'Reilly)\n\n${visibleLongSentence}`;
	const apostropheUrlResult = analyzeText({ title: '引用符URLを除外', body: apostropheUrlBody, contentType: 'diary' });
	const apostropheUrlIssue = apostropheUrlResult.issues.find(({ title }) => title === '長い文を短くする');
	assert.equal(
		apostropheUrlBody.slice(apostropheUrlIssue.target.start, apostropheUrlIssue.target.end),
		visibleLongSentence,
	);

	const referenceBody = `[説明][ref]\n\n[ref]: https://example.com/${'long'.repeat(60)}\n\n${visibleLongSentence}`;
	assert.equal(stripMarkdown(referenceBody).startsWith(`説明 ${visibleLongSentence}`), true);
	const referenceResult = analyzeText({ title: '参照リンクを除外', body: referenceBody, contentType: 'diary' });
	const referenceIssue = referenceResult.issues.find(({ title }) => title === '長い文を短くする');
	const referenceSelection = referenceBody.slice(referenceIssue.target.start, referenceIssue.target.end);
	assert.equal(referenceSelection, visibleLongSentence);
	assert.doesNotMatch(referenceSelection, /https?:|long|\[ref\]/);
});

test('連続した文末の最後だけを修正位置として示す', () => {
	const body = '朝に散歩しました。昼に買い物しました。夜に料理しました。翌日は休みです。その後また散歩しました。';
	const result = analyzeText({ title: '文末位置の確認', body, contentType: 'diary' });
	const issue = result.issues.find(({ title }) => title === '文末に変化を付ける');
	const expected = body.indexOf('ました', body.indexOf('ました', body.indexOf('ました') + 1) + 1);
	assert.equal(issue.target.start, expected);
	assert.equal(body.slice(issue.target.start, issue.target.end), 'ました');

	const inlineBody = '朝に散歩しました。昼に買い物しました。夜に<em>料理しました。翌日は休みです。その後また散歩しました。</em>';
	const inlineResult = analyzeText({ title: 'インライン装飾の文末位置', body: inlineBody, contentType: 'diary' });
	const inlineIssue = inlineResult.issues.find(({ title }) => title === '文末に変化を付ける');
	const inlineExpected = inlineBody.indexOf('ました', inlineBody.indexOf('ました', inlineBody.indexOf('ました') + 1) + 1);
	assert.equal(inlineIssue.target.start, inlineExpected);
	assert.equal(inlineBody.slice(inlineIssue.target.start, inlineIssue.target.end), 'ました');
});

test('通常文の不等号を未完了HTMLタグとして扱わない', () => {
	const body = '今日は x < y の状態でした。とても良いです。とても嬉しいです。とても楽しいです。';
	assert.equal(stripMarkdown(body), body);
	const result = analyzeText({ title: '比較表現の確認', body, contentType: 'diary' });
	const fillerIssue = result.issues.find(({ title }) => title === '繰り返し表現を見直す');
	assert.equal(body.slice(fillerIssue.target.start, fillerIssue.target.end), 'とても');

	const windowsPathHtml = '<p data-path="C:\\">普通です。</p>\n\n<p>次です。</p>';
	assert.equal(stripMarkdown(windowsPathHtml), '普通です。 次です。');
});

test('問題がない診断は改善件数ではなく成功状態として表示する', () => {
	const good = getIssuePresentation([{ title: '問題なし', tone: 'good' }]);
	const issues = getIssuePresentation([
		{ title: '長い文', tone: 'warning' },
		{ title: '参考情報', tone: 'good' },
	]);

	assert.equal(good.title, '確認結果');
	assert.equal(good.count, '問題なし');
	assert.equal(good.state, 'good');
	assert.equal(issues.title, '改善ポイント');
	assert.equal(issues.count, '1件');
	assert.equal(issues.state, 'issues');
	assert.match(polishHtml, /id="suggestion-title">改善ポイント<\/h3>/);
	assert.match(polishHtml, /id="score"[\s\S]*?role="meter"[\s\S]*?aria-valuemin="0"[\s\S]*?aria-valuemax="100"/);
	assert.match(source, /setAttribute\('aria-valuenow', String\(result\.score\)\)/);
	assert.match(source, /setAttribute\('aria-valuetext', `\$\{result\.score\}点、\$\{issuePresentation\.count\}`\)/);
	assert.match(polishCss, /\.score\[data-state="good"\]/);
	assert.match(polishCss, /#issue-count\[data-state="good"\]/);
});

test('整形結果は見出し移動と読み上げ可能なラベルを備える', () => {
	assert.match(polishHtml, /id="formatted-title"[^>]*tabindex="-1"/);
	assert.match(polishHtml, /id="copy"[^>]*aria-describedby="copy-status"/);
	assert.match(polishHtml, /<label[^>]*for="formatted"[^>]*>整形後の本文<\/label>/);
});

test('ブログの長文に見出しがない場合は提案する', () => {
	const result = analyzeText({
		title: 'ブログ記事',
		body: '具体的な内容です。'.repeat(70),
		contentType: 'blog',
	});

	assert.ok(result.issues.some(({ title }) => title === '見出しを追加する'));
});

test('安全な整形はコードブロックを変えずに余分な空白と改行だけを除く', () => {
	const input = '本文です。   \n\n\n\n```js\nconst value = "  ";   \n```\n';
	const output = formatSafely(input);

	assert.equal(output, '本文です。  \n\n```js\nconst value = "  ";   \n```');
});

test('安全な整形はMarkdownの行末2スペースによる改行を保持する', () => {
	const input = '1行目です。  \n2行目です。\t\n';
	const output = formatSafely(input);

	assert.equal(output, '1行目です。  \n2行目です。');
});

test('端末内の下書きを保存して復元できる', () => {
	const storage = createMemoryStorage();
	const saved = writeLocalDraft(storage, {
		title: '今日の日記',
		body: '本文です。',
		contentType: 'blog',
		savedAt: 123,
	});

	assert.equal(saved, true);
	const restored = readLocalDraft(storage);
	assert.equal(restored.title, '今日の日記');
	assert.equal(restored.body, '本文です。');
	assert.equal(restored.contentType, 'blog');
	assert.equal(restored.savedAt, 123);
});

test('壊れた下書きは復元せず、クリアできる', () => {
	const storage = createMemoryStorage();
	storage.setItem(DRAFT_KEY, '{broken');
	assert.equal(readLocalDraft(storage), null);

	storage.setItem(DRAFT_KEY, JSON.stringify({ title: '残す文章' }));
	assert.equal(clearLocalDraft(storage), true);
	assert.equal(readLocalDraft(storage), null);
});

test('保存領域が削除記録を拒否した場合は失敗として扱う', () => {
	const storage = {
		removeItem: () => {
			throw new Error('storage is locked');
		},
	};

	assert.equal(clearLocalDraft(storage), false);
});

test('保存領域の読み書き例外は画面を壊さず失敗として扱う', () => {
	const unreadableStorage = {
		getItem: () => {
			throw new Error('storage is unavailable');
		},
	};
	const unwritableStorage = {
		setItem: () => {
			throw new Error('storage quota exceeded');
		},
	};

	assert.equal(readLocalDraft(unreadableStorage), null);
	assert.equal(writeLocalDraft(unwritableStorage, { body: '保存したい文章' }), false);
});

test('空の下書きを保存すると復元対象外の削除世代を残す', () => {
	const storage = createMemoryStorage();
	storage.setItem(DRAFT_KEY, JSON.stringify({ body: '以前の文章' }));

	assert.equal(writeLocalDraft(storage, { title: '', body: '' }), true);
	assert.equal(readLocalDraft(storage), null);
	assert.equal(readLocalDraftRecord(storage).deleted, true);
});

test('古いタブは別タブの新しい下書きを上書きしない', () => {
	const storage = createMemoryStorage();
	const first = writeLocalDraftSafely(storage, {
		title: 'タブA',
		body: '先に保存した内容',
		writerId: 'writer-a',
		editedAt: 90,
		savedAt: 100,
	}, { knownSavedAt: 0, writerId: 'writer-a' });
	assert.equal(first.ok, true);

	const staleWrite = writeLocalDraftSafely(storage, {
		title: 'タブB',
		body: '古い基準からの内容',
		writerId: 'writer-b',
		editedAt: 190,
		savedAt: 200,
	}, { knownSavedAt: 0, writerId: 'writer-b' });
	assert.equal(staleWrite.ok, false);
	assert.equal(staleWrite.conflict, true);
	assert.equal(readLocalDraft(storage).body, '先に保存した内容');
});

test('新しい下書きを読み込んだタブだけが次の世代を保存できる', () => {
	const storage = createMemoryStorage();
	writeLocalDraft(storage, {
		body: '第1世代',
		writerId: 'writer-a',
		editedAt: 90,
		savedAt: 100,
	});

	const next = writeLocalDraftSafely(storage, {
		body: '第2世代',
		writerId: 'writer-b',
		editedAt: 190,
		savedAt: 200,
	}, { knownSavedAt: 100, writerId: 'writer-b' });
	assert.equal(next.ok, true);
	assert.equal(readLocalDraft(storage).body, '第2世代');

	const staleClear = writeLocalDraftSafely(storage, {
		title: '',
		body: '',
		writerId: 'writer-a',
		editedAt: 290,
		savedAt: 300,
	}, { knownSavedAt: 100, writerId: 'writer-a' });
	assert.equal(staleClear.ok, false);
	assert.equal(staleClear.conflict, true);
	assert.equal(readLocalDraft(storage).body, '第2世代');
});

test('削除世代より古いタブは通常保存で文章を復活させない', () => {
	const storage = createMemoryStorage();
	writeLocalDraft(storage, {
		body: '第1世代',
		writerId: 'writer-a',
		editedAt: 90,
		savedAt: 100,
	});

	const cleared = writeLocalDraftSafely(storage, {
		title: '',
		body: '',
		writerId: 'writer-b',
		editedAt: 190,
		savedAt: 200,
	}, { knownSavedAt: 100, writerId: 'writer-b' });
	assert.equal(cleared.ok, true);
	assert.equal(cleared.draft.deleted, true);
	assert.equal(readLocalDraft(storage), null);
	assert.equal(readLocalDraftRecord(storage).savedAt, 200);

	const staleSave = writeLocalDraftSafely(storage, {
		body: '古いタブの文章',
		writerId: 'writer-a',
		editedAt: 290,
		savedAt: 300,
	}, { knownSavedAt: 100, writerId: 'writer-a' });
	assert.equal(staleSave.ok, false);
	assert.equal(staleSave.conflict, true);
	assert.equal(staleSave.currentDraft.deleted, true);
	assert.equal(readLocalDraft(storage), null);
});

test('削除世代より古いpagehide相当の保存も文章を復活させない', () => {
	const storage = createMemoryStorage();
	writeLocalDraft(storage, {
		body: '閉じる前の文章',
		writerId: 'writer-a',
		editedAt: 90,
		savedAt: 100,
	});
	writeLocalDraftSafely(storage, {
		title: '',
		body: '',
		writerId: 'writer-b',
		editedAt: 190,
		savedAt: 200,
	}, { knownSavedAt: 100, writerId: 'writer-b' });

	const pagehideSave = writeLocalDraftSafely(storage, {
		body: '古いタブの遅延内容',
		writerId: 'writer-a',
		editedAt: 290,
		savedAt: 300,
	}, { knownSavedAt: 100, writerId: 'writer-a' });
	assert.equal(pagehideSave.ok, false);
	assert.equal(pagehideSave.conflict, true);
	assert.equal(readLocalDraft(storage), null);
	assert.equal(readLocalDraftRecord(storage).savedAt, 200);
});

test('削除後に開いた新しいタブは削除世代を基準に保存できる', () => {
	const storage = createMemoryStorage();
	writeLocalDraft(storage, {
		title: '',
		body: '',
		writerId: 'writer-b',
		deleted: true,
		editedAt: 190,
		savedAt: 200,
	});
	const baseline = readLocalDraftRecord(storage);

	const next = writeLocalDraftSafely(storage, {
		body: '削除後の新しい文章',
		writerId: 'writer-c',
		editedAt: 290,
		savedAt: 300,
	}, { knownSavedAt: baseline.savedAt, writerId: 'writer-c' });
	assert.equal(next.ok, true);
	assert.equal(next.conflict, false);
	assert.equal(readLocalDraft(storage).body, '削除後の新しい文章');
});
