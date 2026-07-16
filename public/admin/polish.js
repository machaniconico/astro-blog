(function () {
	'use strict';

	const fillerWords = ['とても', 'すごく', 'かなり', 'なんとなく', 'という', 'ことが'];
	const DRAFT_KEY = 'machaniconico:polish-draft:v1';
	const TRANSFER_KEY = 'machaniconico:polish-transfer:v1';
	const suggestionActionLabels = {
		title: 'タイトルを直す',
		body: '本文を直す',
		format: '整形結果を見る',
	};
	const isAdminLaunch = (search = '') => /(?:^|[?&])from=admin(?:&|$)/.test(String(search));
	const getSuggestionActionLabel = (action = '', customLabel = '') =>
		String(customLabel).trim() || suggestionActionLabels[action] || '';
	const getReturnCopyAriaLabel = (label = '内容') => `コピーした${label}を投稿画面へ戻って貼り付ける`;
	const getOverwriteConfirmMessage = (draft = {}) => draft.deleted === true
		? '別のタブで消去された状態を取り消し、現在の内容を保存しますか？'
		: '別のタブの新しい下書きを、現在の内容で置き換えますか？';
	const shouldMoveToResults = ({ automated = false, isMobile = false } = {}) => !automated && isMobile;
	const getSelectionRange = (value = '', target = {}) => {
		const length = String(value).length;
		const startValue = Number(target?.start);
		const endValue = Number(target?.end);
		const start = Math.max(0, Math.min(length, Number.isFinite(startValue) ? startValue : 0));
		const end = Math.max(start, Math.min(length, Number.isFinite(endValue) ? endValue : start));
		return { start, end };
	};
	const copyTextSafely = async (text, { clipboard, fallback } = {}) => {
		try {
			if (typeof clipboard?.writeText !== 'function') throw new Error('Clipboard API is unavailable');
			await clipboard.writeText(String(text));
			return 'clipboard';
		} catch {
			try {
				return fallback?.(String(text)) ? 'fallback' : 'failed';
			} catch {
				return 'failed';
			}
		}
	};
	const isCopyRequestCurrent = ({ requestId, activeRequestId, expectedText, currentText } = {}) =>
		requestId === activeRequestId && String(expectedText) === String(currentText);
	const getCopyFeedback = ({
		label = '本文',
		copied = false,
		launchedFromAdmin = false,
		closeFailed = false,
		stale = false,
	} = {}) => {
		const destination = label === 'タイトル' ? 'タイトル欄' : '本文欄';
		if (stale) return `${label}がコピー中に変わりました。もう一度コピーしてください。`;
		if (!copied) return `コピーできませんでした。${label}から端末のコピー操作を使ってください。`;
		if (launchedFromAdmin && closeFailed) {
			return `${label}をコピー済みです。このタブを閉じ、元の投稿タブの${destination}へ貼り付けてください。`;
		}
		return launchedFromAdmin
			? `${label}をコピーしました。上の「戻って貼り付け」から投稿画面へ戻り、${destination}に貼り付けてください。`
			: `${label}をコピーしました。投稿画面の${destination}へ貼り付けてください。`;
	};

	const normalizeDraft = (value = {}) => {
		const savedAt = Number(value.savedAt);
		const editedAt = Number(value.editedAt);
		return {
			title: String(value.title ?? ''),
			body: String(value.body ?? ''),
			contentType: value.contentType === 'blog' ? 'blog' : 'diary',
			writerId: String(value.writerId ?? ''),
			deleted: value.deleted === true,
			editedAt: Number.isFinite(editedAt) && editedAt > 0 ? editedAt : 0,
			savedAt: Number.isFinite(savedAt) && savedAt > 0 ? savedAt : 0,
		};
	};

	const normalizeCmsTransfer = (value = {}) => {
		value = value && typeof value === 'object' ? value : {};
		const savedAt = Number(value.savedAt);
		const transfer = {
			title: String(value.title ?? ''),
			body: String(value.body ?? ''),
			contentType: value.contentType === 'blog' ? 'blog' : 'diary',
			path: String(value.path ?? ''),
			source: String(value.source ?? ''),
			savedAt: Number.isFinite(savedAt) && savedAt > 0 ? savedAt : 0,
		};
		return transfer.source === 'cms'
			&& transfer.savedAt > 0
			&& (transfer.title.trim() || transfer.body.trim())
			? transfer
			: null;
	};

	const readCmsTransfer = (storage) => {
		if (!storage) return null;
		try {
			const stored = storage.getItem(TRANSFER_KEY);
			return stored ? normalizeCmsTransfer(JSON.parse(stored)) : null;
		} catch {
			return null;
		}
	};

	const clearCmsTransfer = (storage) => {
		if (!storage) return false;
		try {
			storage.removeItem(TRANSFER_KEY);
			return true;
		} catch {
			return false;
		}
	};

	const areCmsTransfersEqual = (left, right) => {
		const normalizedLeft = normalizeCmsTransfer(left);
		const normalizedRight = normalizeCmsTransfer(right);
		if (!normalizedLeft || !normalizedRight) return false;
		return ['title', 'body', 'contentType', 'path', 'source', 'savedAt']
			.every((key) => normalizedLeft[key] === normalizedRight[key]);
	};

	const clearCmsTransferIfCurrent = (storage, expectedTransfer) => {
		const current = readCmsTransfer(storage);
		if (!current) return { cleared: true, current: null };
		if (!areCmsTransfersEqual(current, expectedTransfer)) {
			return { cleared: false, current };
		}
		return clearCmsTransfer(storage)
			? { cleared: true, current: null }
			: { cleared: false, current };
	};

	const getCmsTransferAction = (transfer, draft) => {
		const normalizedTransfer = normalizeCmsTransfer(transfer);
		if (!normalizedTransfer) return 'none';
		const normalizedDraft = normalizeDraft(draft ?? {});
		const sameContent = !normalizedDraft.deleted
			&& normalizedDraft.title === normalizedTransfer.title
			&& normalizedDraft.body === normalizedTransfer.body
			&& normalizedDraft.contentType === normalizedTransfer.contentType;
		if (sameContent || normalizedTransfer.savedAt <= normalizedDraft.savedAt) return 'discard';
		return 'offer';
	};

	const getCmsTransferPresentation = (transfer, hasCurrentContent = false) => {
		const title = String(transfer?.title ?? '').trim() || '無題の投稿';
		return hasCurrentContent
			? {
				detail: `CMSで保存した「${title}」があります。現在の確認用下書きと入れ替わります。`,
				loadLabel: '保存した投稿と入れ替える',
				dismissLabel: '今の下書きを残す',
			}
			: {
				detail: `CMSで保存した「${title}」をタイトル・本文ごと読み込めます。`,
				loadLabel: '保存した投稿を開く',
				dismissLabel: '今回は使わない',
			};
	};

	const readLocalDraftRecord = (storage) => {
		if (!storage) return null;

		try {
			const stored = storage.getItem(DRAFT_KEY);
			if (!stored) return null;
			const draft = normalizeDraft(JSON.parse(stored));
			return draft.deleted || draft.title.trim() || draft.body.trim() ? draft : null;
		} catch {
			return null;
		}
	};

	const readLocalDraft = (storage) => {
		const record = readLocalDraftRecord(storage);
		return record && !record.deleted ? record : null;
	};

	const writeLocalDraft = (storage, value) => {
		if (!storage) return false;

		try {
			const draft = normalizeDraft(value);
			const hasContent = Boolean(draft.title.trim() || draft.body.trim());
			storage.setItem(DRAFT_KEY, JSON.stringify({
				...draft,
				deleted: draft.deleted || !hasContent,
			}));
			return true;
		} catch {
			return false;
		}
	};

	const writeLocalDraftSafely = (storage, value, { knownSavedAt = 0, writerId = '' } = {}) => {
		const currentDraft = readLocalDraftRecord(storage);
		const expectedSavedAt = Number.isFinite(Number(knownSavedAt)) ? Number(knownSavedAt) : 0;
		const currentWriterId = String(writerId);
		if (
			currentDraft
			&& currentDraft.writerId !== currentWriterId
			&& currentDraft.savedAt > expectedSavedAt
		) {
			return { ok: false, conflict: true, currentDraft };
		}

		const draft = normalizeDraft(value);
		const hasContent = Boolean(draft.title.trim() || draft.body.trim());
		const storedDraft = { ...draft, deleted: draft.deleted || !hasContent };
		const ok = writeLocalDraft(storage, storedDraft);
		return {
			ok,
			conflict: false,
			currentDraft,
			draft: ok ? storedDraft : null,
		};
	};

	const clearLocalDraft = (storage, value = {}) => {
		if (!storage) return false;
		return writeLocalDraft(storage, {
			...value,
			title: '',
			body: '',
			deleted: true,
			savedAt: Number(value.savedAt) > 0 ? Number(value.savedAt) : Date.now(),
		});
	};

	const replaceMappedItems = (items, pattern, replacement) => {
		const text = items.map(({ char }) => char).join('');
		const output = [];
		let cursor = 0;
		for (const match of text.matchAll(pattern)) {
			const start = match.index;
			const end = start + match[0].length;
			output.push(...items.slice(cursor, start));
			output.push(...replacement(match, items.slice(start, end)));
			cursor = end;
		}
		output.push(...items.slice(cursor));
		return output;
	};

	const mappedSpace = (items) => items.length > 0
		? [{ char: ' ', start: items[0].start, end: items.at(-1).end }]
		: [];
	const htmlVoidElements = new Set([
		'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
		'param', 'source', 'track', 'wbr',
	]);
	const htmlHiddenContentElements = new Set(['script', 'style', 'template']);

	const getHtmlMarkupEnd = (source, start, limit) => {
		let quote = '';
		for (let index = start; index < limit; index += 1) {
			const character = source[index];
			if (quote) {
				if (character === quote) quote = '';
				continue;
			}
			if (character === '"' || character === "'") quote = character;
			else if (character === '>') return index + 1;
		}
		return -1;
	};

	const parseHtmlMarkupAt = (source, start, limit = source.length) => {
		if (source[start] !== '<') return null;
		if (source.startsWith('<!--', start)) {
			const close = source.indexOf('-->', start + 4);
			return {
				type: 'markup',
				start,
				end: close >= 0 && close < limit ? close + 3 : limit,
			};
		}

		let cursor = start + 1;
		if (source[cursor] === '!' || source[cursor] === '?') {
			const end = getHtmlMarkupEnd(source, cursor + 1, limit);
			if (end < 0) return null;
			return {
				type: 'markup',
				start,
				end,
			};
		}

		let closing = false;
		if (source[cursor] === '/') {
			closing = true;
			cursor += 1;
		}
		const name = source.slice(cursor, limit).match(/^[a-z][\w:-]*/i)?.[0];
		if (!name) return null;
		const end = getHtmlMarkupEnd(source, cursor + name.length, limit);
		if (end < 0) return null;
		const tag = name.toLowerCase();
		const raw = source.slice(start, end);
		return {
			type: 'tag',
			tag,
			start,
			end,
			closing,
			selfClosing: /\/\s*>$/.test(raw) || htmlVoidElements.has(tag),
		};
	};

	const findHiddenContentClosingMarkup = (text, opening, end) => {
		const lowerText = text.toLowerCase();
		if (opening.tag !== 'template') {
			let searchStart = opening.end;
			while (searchStart < end) {
				const candidate = lowerText.indexOf(`</${opening.tag}`, searchStart);
				if (candidate < 0 || candidate >= end) return null;
				const boundary = text[candidate + opening.tag.length + 2] ?? '';
				if (boundary && !/[\s>]/.test(boundary)) {
					searchStart = candidate + 2;
					continue;
				}
				const parsed = parseHtmlMarkupAt(text, candidate, end);
				if (parsed?.type === 'tag' && parsed.closing && parsed.tag === opening.tag) return parsed;
				searchStart = candidate + 2;
			}
			return null;
		}

		let depth = 1;
		let searchStart = opening.end;
		while (searchStart < end) {
			const candidate = text.indexOf('<', searchStart);
			if (candidate < 0 || candidate >= end) return null;
			const parsed = parseHtmlMarkupAt(text, candidate, end);
			if (!parsed) {
				searchStart = candidate + 1;
				continue;
			}
			if (
				parsed.type === 'tag'
				&& !parsed.closing
				&& !parsed.selfClosing
				&& (parsed.tag === 'script' || parsed.tag === 'style')
			) {
				const rawClose = findHiddenContentClosingMarkup(text, parsed, end);
				searchStart = rawClose?.end ?? end;
				continue;
			}
			if (parsed.type === 'tag' && parsed.tag === opening.tag && !parsed.selfClosing) {
				depth += parsed.closing ? -1 : 1;
				if (depth === 0) return parsed;
			}
			searchStart = Math.max(parsed.end, candidate + 1);
		}
		return null;
	};

	const scanHtmlMarkup = (source, start = 0, end = String(source).length) => {
		const text = String(source);
		const tokens = [];
		const hiddenRanges = [];
		let cursor = start;

		while (cursor < end) {
			const markupStart = text.indexOf('<', cursor);
			if (markupStart < 0 || markupStart >= end) break;
			const markup = parseHtmlMarkupAt(text, markupStart, end);
			if (!markup) {
				cursor = markupStart + 1;
				continue;
			}

			if (markup.type !== 'tag') {
				hiddenRanges.push({ start: markup.start, end: markup.end });
				cursor = Math.max(markup.end, markupStart + 1);
				continue;
			}

			tokens.push(markup);
			if (!markup.closing && !markup.selfClosing && htmlHiddenContentElements.has(markup.tag)) {
				const closingMarkup = findHiddenContentClosingMarkup(text, markup, end);
				if (closingMarkup) tokens.push(closingMarkup);
				const hiddenEnd = closingMarkup?.end ?? end;
				hiddenRanges.push({ start: markup.start, end: hiddenEnd });
				cursor = hiddenEnd;
				continue;
			}

			hiddenRanges.push({ start: markup.start, end: markup.end });
			cursor = Math.max(markup.end, markupStart + 1);
		}

		return { tokens, hiddenRanges };
	};

	const mergeSourceRanges = (ranges, length) => {
		const merged = [];
		for (const range of ranges
			.map(({ start, end }) => ({
				start: Math.max(0, Math.min(length, Number(start) || 0)),
				end: Math.max(0, Math.min(length, Number(end) || 0)),
			}))
			.filter(({ start, end }) => end > start)
			.sort((left, right) => left.start - right.start || left.end - right.end)) {
			const previous = merged.at(-1);
			if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
			else merged.push(range);
		}
		return merged;
	};

	const getFencedCodeRanges = (source) => {
		const ranges = [];
		let cursor = 0;
		while (cursor < source.length) {
			const start = source.indexOf('```', cursor);
			if (start < 0) break;
			const close = source.indexOf('```', start + 3);
			const end = close >= 0 ? close + 3 : source.length;
			ranges.push({ start, end });
			cursor = end;
		}
		return ranges;
	};

	const normalizeReferenceLabel = (value = '') =>
		String(value)
			.replace(/\\([\\[\]])/g, '$1')
			.trim()
			.replace(/\s+/g, ' ')
			.toLowerCase();

	const getMarkdownReferenceDefinitions = (source) => {
		const ranges = [];
		const labels = new Set();
		for (const match of source.matchAll(/^[ \t]{0,3}\[([^\]\r\n]+)\]:[^\r\n]*(?:\r?\n|$)/gm)) {
			const label = normalizeReferenceLabel(match[1]);
			if (!label) continue;
			labels.add(label);
			ranges.push({ start: match.index, end: match.index + match[0].length });
		}
		return { labels, ranges };
	};

	const findBalancedDelimiter = (source, start, opening, closing) => {
		let depth = 0;
		let quote = '';
		for (let index = start; index < source.length; index += 1) {
			const character = source[index];
			if (character === '\\') {
				index += 1;
				continue;
			}
			if (quote) {
				if (character === quote) quote = '';
				continue;
			}
			if (
				opening === '('
				&& depth === 1
				&& /\s/.test(source[index - 1] ?? '')
				&& (character === '"' || character === "'")
			) {
				quote = character;
				continue;
			}
			if (character === opening) depth += 1;
			else if (character === closing) {
				depth -= 1;
				if (depth === 0) return index;
			}
		}
		return -1;
	};

	const getMarkdownLinkRanges = (source, excludedRanges = [], referenceLabels = new Set()) => {
		const ranges = [];
		const excluded = mergeSourceRanges(excludedRanges, source.length);
		let excludedIndex = 0;
		let cursor = 0;

		while (cursor < source.length) {
			while (excluded[excludedIndex]?.end <= cursor) excludedIndex += 1;
			const blocked = excluded[excludedIndex];
			if (blocked && cursor >= blocked.start && cursor < blocked.end) {
				cursor = blocked.end;
				continue;
			}

			const image = source[cursor] === '!' && source[cursor + 1] === '[';
			const labelStart = image ? cursor + 1 : cursor;
			if (source[labelStart] !== '[') {
				cursor += 1;
				continue;
			}
			const labelEnd = findBalancedDelimiter(source, labelStart, '[', ']');
			if (labelEnd < 0) {
				cursor += 1;
				continue;
			}
			let destinationStart = labelEnd + 1;
			while (/[ \t]/.test(source[destinationStart] ?? '')) destinationStart += 1;
			if (source[destinationStart] === '(') {
				const destinationEnd = findBalancedDelimiter(source, destinationStart, '(', ')');
				if (destinationEnd < 0) {
					cursor = labelEnd + 1;
					continue;
				}

				if (image) ranges.push({ start: cursor, end: destinationEnd + 1 });
				else {
					ranges.push({ start: labelStart, end: labelStart + 1 });
					ranges.push({ start: labelEnd, end: destinationEnd + 1 });
				}
				cursor = destinationEnd + 1;
				continue;
			}

			if (source[destinationStart] === '[') {
				const referenceEnd = findBalancedDelimiter(source, destinationStart, '[', ']');
				const explicitLabel = referenceEnd >= 0
					? source.slice(destinationStart + 1, referenceEnd)
					: '';
				const referenceLabel = normalizeReferenceLabel(
					explicitLabel || source.slice(labelStart + 1, labelEnd),
				);
				if (referenceEnd >= 0 && referenceLabels.has(referenceLabel)) {
					if (image) ranges.push({ start: cursor, end: referenceEnd + 1 });
					else {
						ranges.push({ start: labelStart, end: labelStart + 1 });
						ranges.push({ start: labelEnd, end: referenceEnd + 1 });
					}
					cursor = referenceEnd + 1;
					continue;
				}
			}

			const shortcutLabel = normalizeReferenceLabel(source.slice(labelStart + 1, labelEnd));
			if (referenceLabels.has(shortcutLabel)) {
				if (image) ranges.push({ start: cursor, end: labelEnd + 1 });
				else {
					ranges.push({ start: labelStart, end: labelStart + 1 });
					ranges.push({ start: labelEnd, end: labelEnd + 1 });
				}
			}
			cursor = labelEnd + 1;
		}

		return ranges;
	};

	const maskMappedRanges = (items, ranges) => {
		const output = [];
		let cursor = 0;
		for (const range of mergeSourceRanges(ranges, items.length)) {
			output.push(...items.slice(cursor, range.start));
			output.push(...mappedSpace(items.slice(range.start, range.end)));
			cursor = range.end;
		}
		output.push(...items.slice(cursor));
		return output;
	};

	const getVisibleTextMap = (value = '', offset = 0) => {
		const source = String(value);
		let items = source.split('').map((char, index) => ({
			char,
			start: offset + index,
			end: offset + index + 1,
		}));
		const html = scanHtmlMarkup(source);
		const references = getMarkdownReferenceDefinitions(source);
		const excludedRanges = mergeSourceRanges([
			...getFencedCodeRanges(source),
			...html.hiddenRanges,
			...references.ranges,
		], source.length);
		items = maskMappedRanges(items, [
			...excludedRanges,
			...getMarkdownLinkRanges(source, excludedRanges, references.labels),
		]);
		items = replaceMappedItems(items, /^#{1,6}\s+/gm, () => []);
		items = replaceMappedItems(items, /[*_`~>|]/g, () => []);
		items = replaceMappedItems(items, /\s+/g, (_match, segment) => mappedSpace(segment));
		while (items[0]?.char === ' ') items.shift();
		while (items.at(-1)?.char === ' ') items.pop();
		return {
			text: items.map(({ char }) => char).join(''),
			items,
		};
	};

	const stripMarkdown = (value = '') => getVisibleTextMap(value).text;
	const graphemeSegmenter = (() => {
		try {
			return typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
				? new Intl.Segmenter('ja', { granularity: 'grapheme' })
				: null;
		} catch {
			return null;
		}
	})();
	const isGraphemeExtension = (codePoint) =>
		(codePoint >= 0x0300 && codePoint <= 0x036f)
		|| (codePoint >= 0x1ab0 && codePoint <= 0x1aff)
		|| (codePoint >= 0x1dc0 && codePoint <= 0x1dff)
		|| (codePoint >= 0x20d0 && codePoint <= 0x20ff)
		|| (codePoint >= 0x3099 && codePoint <= 0x309a)
		|| (codePoint >= 0xfe00 && codePoint <= 0xfe0f)
		|| (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
		|| (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
		|| (codePoint >= 0xe0020 && codePoint <= 0xe007f)
		|| (codePoint >= 0xe0100 && codePoint <= 0xe01ef);
	const countVisibleCharactersFallback = (text) => {
		const characters = Array.from(text.normalize?.('NFC') ?? text);
		let count = 0;
		let joinNext = false;
		let regionalRun = 0;

		for (const character of characters) {
			const codePoint = character.codePointAt(0) ?? 0;
			if (codePoint === 0x200d) {
				joinNext = true;
				continue;
			}
			if (isGraphemeExtension(codePoint)) {
				if (count === 0) count = 1;
				continue;
			}

			const isRegionalIndicator = codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
			if (isRegionalIndicator) {
				if (joinNext) {
					joinNext = false;
				} else if (regionalRun % 2 === 0) {
					count += 1;
				}
				regionalRun += 1;
				continue;
			}

			regionalRun = 0;
			if (joinNext) {
				joinNext = false;
				continue;
			}
			count += 1;
		}

		return count;
	};
	const countVisibleCharacters = (value = '', segmenter = graphemeSegmenter) => {
		const text = String(value);
		if (segmenter) return Array.from(segmenter.segment(text)).length;
		return countVisibleCharactersFallback(text);
	};
	const getBodyCountPresentation = (value = '') => {
		const characters = countVisibleCharacters(stripMarkdown(value));
		const readingMinutes = characters ? Math.max(1, Math.ceil(characters / 500)) : 0;
		return {
			characters,
			readingMinutes,
			text: characters ? `${characters.toLocaleString('ja-JP')}文字・約${readingMinutes}分` : '0文字',
			ariaLabel: characters ? `本文${characters.toLocaleString('ja-JP')}文字、読了約${readingMinutes}分` : '本文0文字',
		};
	};

	const getParagraphs = (body = '') =>
		String(body)
			.split(/\n\s*\n/)
			.map((paragraph) => stripMarkdown(paragraph))
			.filter(Boolean);

	const getSentences = (body = '') =>
		getParagraphs(body).flatMap((paragraph) =>
			(paragraph.match(/[^。！？!?]+[。！？!?]?/g) ?? [])
				.map((sentence) => sentence.trim())
				.filter(Boolean),
		);

	const getHtmlTagTokens = (source, start = 0, end = String(source).length) => {
		return scanHtmlMarkup(String(source), start, end).tokens;
	};

	const getHtmlBalance = (source, start, end) => {
		const stack = [];
		const unmatchedClosings = [];
		for (const token of getHtmlTagTokens(source, start, end)) {
			if (token.selfClosing) continue;
			if (token.closing) {
				if (stack.at(-1)?.tag === token.tag) stack.pop();
				else unmatchedClosings.push(token);
			} else {
				stack.push(token);
			}
		}
		return { unmatchedClosings, unmatchedOpenings: stack };
	};

	const hasBalancedHtmlTags = (source, start = 0, end = String(source).length) => {
		const balance = getHtmlBalance(source, start, end);
		return balance.unmatchedClosings.length === 0 && balance.unmatchedOpenings.length === 0;
	};

	const balanceMappedRange = (source, initialStart, initialEnd, limitStart = 0, limitEnd = String(source).length) => {
		let start = Math.max(limitStart, initialStart);
		let end = Math.min(limitEnd, initialEnd);
		for (let attempt = 0; attempt < 12; attempt += 1) {
			const balance = getHtmlBalance(source, start, end);
			if (balance.unmatchedClosings.length === 0 && balance.unmatchedOpenings.length === 0) {
				return { start, end };
			}

			let nextStart = start;
			let nextEnd = end;
			const activeBefore = [];
			for (const token of getHtmlTagTokens(source, limitStart, start)) {
				if (token.selfClosing) continue;
				if (token.closing) {
					const matchIndex = activeBefore.map(({ tag }) => tag).lastIndexOf(token.tag);
					if (matchIndex >= 0) activeBefore.splice(matchIndex);
				} else {
					activeBefore.push(token);
				}
			}
			const availableBefore = [...activeBefore];
			for (const closing of balance.unmatchedClosings) {
				const matchIndex = availableBefore.map(({ tag }) => tag).lastIndexOf(closing.tag);
				if (matchIndex < 0) continue;
				nextStart = Math.min(nextStart, availableBefore[matchIndex].start);
				availableBefore.splice(matchIndex, 1);
			}

			const availableAfter = getHtmlTagTokens(source, end, limitEnd)
				.filter((token) => token.closing && !token.selfClosing);
			for (const opening of [...balance.unmatchedOpenings].reverse()) {
				const matchIndex = availableAfter.findIndex(({ tag }) => tag === opening.tag);
				if (matchIndex < 0) continue;
				nextEnd = Math.max(nextEnd, availableAfter[matchIndex].end);
				availableAfter.splice(matchIndex, 1);
			}

			if (nextStart === start && nextEnd === end) break;
			start = nextStart;
			end = nextEnd;
		}

		if (hasBalancedHtmlTags(source, start, end)) return { start, end };
		const nextTag = String(source).indexOf('<', initialStart);
		const safeEnd = nextTag >= initialStart && nextTag < initialEnd ? nextTag : initialEnd;
		return { start: initialStart, end: Math.max(initialStart, safeEnd) };
	};

	const getRangeFromMappedItems = (
		source,
		items,
		text,
		limitStart = 0,
		limitEnd = String(source).length,
	) => {
		if (!items.length) return null;
		const range = balanceMappedRange(source, items[0].start, items.at(-1).end, limitStart, limitEnd);
		return { ...range, text };
	};

	const getParagraphRanges = (body = '') => {
		const source = String(body);
		const ranges = [];
		const separator = /\r?\n[ \t]*\r?\n/g;
		let start = 0;
		const addRange = (end) => {
			const visible = getVisibleTextMap(source.slice(start, end), start);
			const range = getRangeFromMappedItems(source, visible.items, visible.text, start, end);
			if (range) ranges.push({ ...range, rawStart: start, rawEnd: end });
		};

		for (const match of source.matchAll(separator)) {
			addRange(match.index);
			start = match.index + match[0].length;
		}
		addRange(source.length);
		return ranges;
	};

	const getSentenceRanges = (body = '') => {
		const source = String(body);
		const ranges = [];
		for (const paragraph of getParagraphRanges(source)) {
			const visible = getVisibleTextMap(
				source.slice(paragraph.rawStart, paragraph.rawEnd),
				paragraph.rawStart,
			);
			for (const match of visible.text.matchAll(/[^。！？!?]+[。！？!?]?/g)) {
				const text = match[0].trim();
				if (!text) continue;
				let start = match.index;
				let end = match.index + match[0].length;
				while (visible.items[start]?.char === ' ') start += 1;
				while (visible.items[end - 1]?.char === ' ') end -= 1;
				const sourceStart = visible.items[start]?.start;
				const sourceEnd = visible.items[end - 1]?.end;
				const range = getRangeFromMappedItems(
					source,
					visible.items.slice(start, end),
					text,
					paragraph.rawStart,
					paragraph.rawEnd,
				);
				if (range) ranges.push({ ...range, sourceStart, sourceEnd });
			}
		}
		return ranges;
	};

	const findVisibleTextRange = (source, visible, search, fromEnd = false) => {
		const needle = String(search);
		const index = fromEnd ? visible.text.lastIndexOf(needle) : visible.text.indexOf(needle);
		if (index < 0) return null;
		return getRangeFromMappedItems(
			source,
			visible.items.slice(index, index + needle.length),
			needle,
		);
	};

	const createSelectionTarget = (field, start, end) => ({
		field,
		start: Math.max(0, Number(start) || 0),
		end: Math.max(0, Number(end) || 0),
	});

	const countMatches = (value, pattern) => (String(value).match(pattern) ?? []).length;

	const findRepeatedEnding = (sentences) => {
		const endings = sentences.map((sentence) => {
			const normalized = sentence.replace(/[。！？!?\s]+$/g, '');
			return normalized.match(/(でした|ました|です|ます|だった|である|だ)$/)?.[1] ?? '';
		});

		for (let index = 2; index < endings.length; index += 1) {
			if (endings[index] && endings[index] === endings[index - 1] && endings[index] === endings[index - 2]) {
				return { ending: endings[index], sentenceIndex: index };
			}
		}

		return null;
	};

	const addIssue = (
		issues,
		penalty,
		title,
		detail,
		{ tone = 'warning', action = 'body', actionLabel = '', target = null } = {},
	) => {
		const issue = { title, detail, tone, action };
		if (actionLabel) issue.actionLabel = actionLabel;
		if (target) issue.target = target;
		issues.push(issue);
		return penalty;
	};

	const analyzeText = ({ title = '', body = '', contentType = 'diary' } = {}) => {
		const sourceTitle = String(title);
		const sourceBody = String(body);
		const cleanTitle = sourceTitle.trim();
		const cleanBody = sourceBody.trim();
		const visibleBody = getVisibleTextMap(sourceBody);
		const plainBody = visibleBody.text;
		const bodyCount = getBodyCountPresentation(cleanBody);
		const titleLength = countVisibleCharacters(cleanTitle);
		const paragraphs = getParagraphs(cleanBody);
		const sentences = getSentences(cleanBody);
		const paragraphRanges = getParagraphRanges(sourceBody);
		const sentenceRanges = getSentenceRanges(sourceBody);
		const cleanTitleStart = cleanTitle ? sourceTitle.indexOf(cleanTitle) : 0;
		const titleTarget = createSelectionTarget(
			'title',
			cleanTitleStart,
			cleanTitleStart + cleanTitle.length,
		);
		const issues = [];
		let penalty = 0;

		if (!cleanTitle) {
			penalty += addIssue(
				issues,
				14,
				'タイトルを付ける',
				'内容が伝わる短いタイトルがあると、一覧から選びやすくなります。',
				{ action: 'title', actionLabel: 'タイトルを書く', target: titleTarget },
			);
		} else if (titleLength < 5) {
			penalty += addIssue(
				issues,
				6,
				'タイトルが短めです',
				'もう少し具体的な言葉を足すと、内容が伝わりやすくなります。',
				{ action: 'title', actionLabel: 'タイトルに言葉を足す', target: titleTarget },
			);
		} else if (titleLength > 40) {
			penalty += addIssue(
				issues,
				6,
				'タイトルを少し短くする',
				`現在${titleLength}文字です。40文字以内を目安に要点を前へ出してみましょう。`,
				{ action: 'title', actionLabel: 'タイトル全体を見直す', target: titleTarget },
			);
		}

		if (!plainBody) {
			penalty += addIssue(
				issues,
				30,
				'本文を入力する',
				'診断する文章がまだありません。',
				{
					actionLabel: '本文を書く',
					target: createSelectionTarget('body', 0, 0),
				},
			);
		}

		const longParagraphs = paragraphs.filter((paragraph) => countVisibleCharacters(paragraph) > 180);
		if (longParagraphs.length > 0) {
			const firstLongParagraph = paragraphRanges.find(({ text }) => countVisibleCharacters(text) > 180);
			penalty += addIssue(
				issues,
				Math.min(15, longParagraphs.length * 5),
				'長い段落を分ける',
				`${longParagraphs.length}個の段落が180文字を超えています。話題が変わるところで改行すると読みやすくなります。`,
				{
					actionLabel: '最初の長い段落を直す',
					target: createSelectionTarget(
						'body',
						firstLongParagraph?.start ?? 0,
						firstLongParagraph?.end ?? sourceBody.length,
					),
				},
			);
		}

		const longSentences = sentences.filter((sentence) => countVisibleCharacters(sentence) > 90);
		if (longSentences.length > 0) {
			const firstLongSentence = sentenceRanges.find(({ text }) => countVisibleCharacters(text) > 90);
			penalty += addIssue(
				issues,
				Math.min(12, longSentences.length * 4),
				'長い文を短くする',
				`${longSentences.length}文が90文字を超えています。「、」が多い文を二つに分けてみましょう。`,
				{
					actionLabel: '最初の長い文を直す',
					target: createSelectionTarget(
						'body',
						firstLongSentence?.start ?? 0,
						firstLongSentence?.end ?? sourceBody.length,
					),
				},
			);
		}

		const repeatedEndingMatch = findRepeatedEnding(sentences);
		if (repeatedEndingMatch) {
			const { ending: repeatedEnding, sentenceIndex } = repeatedEndingMatch;
			const repeatedSentenceRange = sentenceRanges[sentenceIndex];
			const repeatedSentenceVisible = repeatedSentenceRange
				? getVisibleTextMap(
					sourceBody.slice(repeatedSentenceRange.sourceStart, repeatedSentenceRange.sourceEnd),
					repeatedSentenceRange.sourceStart,
				)
				: visibleBody;
			const repeatedEndingRange = findVisibleTextRange(
				sourceBody,
				repeatedSentenceVisible,
				repeatedEnding,
				true,
			);
			penalty += addIssue(
				issues,
				7,
				'文末に変化を付ける',
				`「${repeatedEnding}」が3回以上続いています。体言止めや別の言い回しを混ぜると自然です。`,
				{
					actionLabel: `最後の「${repeatedEnding}」を直す`,
					target: createSelectionTarget(
						'body',
						repeatedEndingRange?.start ?? 0,
						repeatedEndingRange?.end ?? repeatedEnding.length,
					),
				},
			);
		}

		const usedFillers = fillerWords
			.map((word) => ({ word, count: countMatches(plainBody, new RegExp(word, 'g')) }))
			.filter(({ count }) => count >= 3);
		if (usedFillers.length > 0) {
			const detail = usedFillers.map(({ word, count }) => `「${word}」${count}回`).join('、');
			const firstFiller = usedFillers[0].word;
			const fillerRange = findVisibleTextRange(sourceBody, visibleBody, firstFiller);
			penalty += addIssue(
				issues,
				Math.min(10, usedFillers.length * 3),
				'繰り返し表現を見直す',
				`${detail}使われています。必要な箇所だけ残すと文章が締まります。`,
				{
					actionLabel: `最初の「${firstFiller}」を直す`,
					target: createSelectionTarget(
						'body',
						fillerRange?.start ?? 0,
						fillerRange?.end ?? firstFiller.length,
					),
				},
			);
		}

		const excessiveBlankLines = countMatches(cleanBody, /\n\s*\n\s*\n/g);
		const trailingSpaces = countMatches(cleanBody, /[ \t]+$/gm);
		if (excessiveBlankLines > 0 || trailingSpaces > 0) {
			penalty += addIssue(
				issues,
				3,
				'空白と改行を整える',
				'「安全に整形」で余分な空白と改行だけを整理できます。',
				{ action: 'format' },
			);
		}

		if (contentType === 'blog' && bodyCount.characters >= 500 && !/^#{2,3}\s+/m.test(cleanBody)) {
			const firstParagraph = paragraphRanges[0];
			const headingInsertion = firstParagraph?.rawStart ?? 0;
			penalty += addIssue(
				issues,
				8,
				'見出しを追加する',
				'長めの記事です。話題ごとに見出しを付けると、内容を追いやすくなります。',
				{
					actionLabel: '本文の先頭に見出しを足す',
					target: createSelectionTarget('body', headingInsertion, headingInsertion),
				},
			);
		}

		if (contentType === 'blog' && bodyCount.characters > 0 && bodyCount.characters < 300) {
			penalty += addIssue(
				issues,
				5,
				'具体例を少し足す',
				'ブログ記事としては短めです。体験・理由・具体例のどれかを足すと説得力が上がります。',
				{
					actionLabel: '本文の末尾に具体例を足す',
					target: createSelectionTarget('body', sourceBody.length, sourceBody.length),
				},
			);
		}

		if (issues.length === 0 && plainBody) {
			issues.push({
				title: '大きな問題は見つかりませんでした',
				detail: '段落と文の長さが整っています。最後に声に出して読むと、さらに違和感を見つけやすくなります。',
				tone: 'good',
			});
		}

		const score = Math.max(0, Math.min(100, 100 - penalty));
		return {
			score,
			issues,
			stats: {
				characters: bodyCount.characters,
				paragraphs: paragraphs.length,
				sentences: sentences.length,
				readingMinutes: bodyCount.readingMinutes,
			},
		};
	};

	const formatSafely = (value = '') => {
		const normalized = String(value).replace(/\r\n?/g, '\n');
		const segments = normalized.split(/(```[\s\S]*?```)/g);
		const cleanLineEnding = (line) => {
			const trailingWhitespace = line.match(/[ \t]+$/)?.[0] ?? '';
			if (!trailingWhitespace) return line;

			const content = line.slice(0, -trailingWhitespace.length);
			return / {2,}$/.test(trailingWhitespace) ? `${content}  ` : content;
		};

		return segments
			.map((segment, index) => {
				if (index % 2 === 1) return segment;

				return segment
					.split('\n')
					.map(cleanLineEnding)
					.join('\n')
					.replace(/\n{3,}/g, '\n\n');
			})
			.join('')
			.trim();
	};

	const getScoreText = (score) => {
		if (score >= 90) return ['とても読みやすい', 'このまま公開できる品質です。'];
		if (score >= 75) return ['読みやすい', 'いくつか整えると、さらに伝わりやすくなります。'];
		if (score >= 55) return ['もうひと磨き', '改善ポイントを順番に確認してみましょう。'];
		return ['見直しがおすすめ', 'まず長い文と段落から整えると効果的です。'];
	};
	const getIssuePresentation = (issues = []) => {
		const actionableCount = Array.isArray(issues)
			? issues.filter(({ tone } = {}) => tone !== 'good').length
			: 0;
		return actionableCount === 0
			? { title: '確認結果', count: '問題なし', state: 'good' }
			: { title: '改善ポイント', count: `${actionableCount}件`, state: 'issues' };
	};
	const getTitleCountPresentation = (value = '') => {
		const length = countVisibleCharacters(String(value).trim());
		if (length === 0) return { length, text: '0 / 40文字', state: 'empty', ariaLabel: 'タイトル0文字' };
		if (length < 5) return { length, text: `${length} / 40文字・短め`, state: 'short', ariaLabel: `タイトル${length}文字、5文字以上がおすすめ` };
		if (length <= 40) return { length, text: `${length} / 40文字・目安内`, state: 'good', ariaLabel: `タイトル${length}文字、目安内` };
		return { length, text: `${length} / 40文字・長め`, state: 'long', ariaLabel: `タイトル${length}文字、40文字以内がおすすめ` };
	};
	const getEditorActionPresentation = (value = '') => {
		const ready = Boolean(String(value).trim());
		return ready
			? {
				ready,
				analyzeLabel: '文章を診断',
				analyzeAriaLabel: '文章を診断',
				formatLabel: '安全に整形',
				formatAriaLabel: '本文の空白と改行を安全に整形',
			}
			: {
				ready,
				analyzeLabel: '本文入力後に診断',
				analyzeAriaLabel: '本文を入力すると診断できます',
				formatLabel: '本文入力後に整形',
				formatAriaLabel: '本文を入力すると整形できます',
			};
	};
	const getMobileAnalysisActionPresentation = ({
		hasBody = false,
		hasResults = false,
		analysisState = 'idle',
		resultSummary = '',
	} = {}) => {
		if (!hasBody) {
			return {
				action: 'analyze',
				state: 'empty',
				disabled: true,
				label: '本文入力後に診断',
				ariaLabel: '本文を入力すると診断できます',
			};
		}
		if (hasResults && analysisState === 'current') {
			const summary = String(resultSummary).trim();
			return {
				action: 'view-results',
				state: 'current',
				disabled: false,
				label: '診断結果を見る',
				ariaLabel: `診断結果を見る${summary ? `、${summary}` : ''}`,
			};
		}
		if (analysisState === 'pending') {
			return {
				action: 'analyze',
				state: 'pending',
				disabled: false,
				label: hasResults ? '今すぐ診断を更新' : '今すぐ診断',
				ariaLabel: hasResults ? '待たずに診断結果を更新' : '待たずに文章を診断',
			};
		}
		return {
			action: 'analyze',
			state: 'ready',
			disabled: false,
			label: '文章を診断',
			ariaLabel: '文章を診断',
		};
	};
	const getScoreProgressPresentation = ({
		currentScore,
		baselineScore,
		isBaseline = false,
	} = {}) => {
		const current = Number(currentScore);
		const baseline = Number(baselineScore);
		if (
			currentScore == null
			|| baselineScore == null
			|| !Number.isFinite(current)
			|| !Number.isFinite(baseline)
		) {
			return { state: 'baseline', text: '初回診断', ariaLabel: '初回診断' };
		}
		if (isBaseline) {
			return {
				state: 'baseline',
				text: '初回診断',
				ariaLabel: `初回診断、${Math.round(current)}点`,
			};
		}
		const delta = Math.round(current - baseline);
		if (delta > 0) {
			return {
				state: 'improved',
				text: `初回比 +${delta}`,
				ariaLabel: `初回診断から${delta}点改善`,
			};
		}
		if (delta < 0) {
			return {
				state: 'declined',
				text: `初回比 −${Math.abs(delta)}`,
				ariaLabel: `初回診断から${Math.abs(delta)}点低下`,
			};
		}
		return {
			state: 'unchanged',
			text: '初回比 変化なし',
			ariaLabel: '初回診断からスコアの変化なし',
		};
	};
	const getResultPrimaryAction = (issueState) => issueState === 'good' ? 'copy-body' : 'edit-body';

	const initialize = () => {
		const elements = {
			returnToEditor: document.querySelector('#return-to-editor'),
			returnLabel: document.querySelector('#return-label'),
			title: document.querySelector('#title'),
			titleCount: document.querySelector('#title-count'),
			body: document.querySelector('#body'),
			liveCount: document.querySelector('#live-count'),
			draftStatus: document.querySelector('#draft-status'),
			draftStatusText: document.querySelector('#draft-status-text'),
			clearDraft: document.querySelector('#clear-draft'),
			cmsTransfer: document.querySelector('#cms-transfer'),
			cmsTransferMessage: document.querySelector('#cms-transfer-message'),
			loadCmsTransfer: document.querySelector('#load-cms-transfer'),
			dismissCmsTransfer: document.querySelector('#dismiss-cms-transfer'),
			draftConflict: document.querySelector('#draft-conflict'),
			draftConflictTitle: document.querySelector('#draft-conflict-title'),
			draftConflictMessage: document.querySelector('#draft-conflict-message'),
			loadNewerDraft: document.querySelector('#load-newer-draft'),
			overwriteDraft: document.querySelector('#overwrite-draft'),
			analyze: document.querySelector('#analyze'),
			analyzeMobile: document.querySelector('#analyze-mobile'),
			format: document.querySelector('#format'),
			inputError: document.querySelector('#input-error'),
			analysisStatus: document.querySelector('#analysis-status'),
			resultPane: document.querySelector('#result-pane'),
			resultTitle: document.querySelector('#result-title'),
			emptyState: document.querySelector('#empty-state'),
			emptyStateMessage: document.querySelector('#empty-state-message'),
			results: document.querySelector('#results'),
			scoreVisual: document.querySelector('#score'),
			score: document.querySelector('#score strong'),
			scoreLabel: document.querySelector('#score-label'),
			scoreProgress: document.querySelector('#score-progress'),
			scoreSummary: document.querySelector('#score-summary'),
			characters: document.querySelector('#stat-characters'),
			paragraphs: document.querySelector('#stat-paragraphs'),
			sentences: document.querySelector('#stat-sentences'),
			reading: document.querySelector('#stat-reading'),
			suggestionHeading: document.querySelector('#suggestion-heading'),
			suggestionTitle: document.querySelector('#suggestion-title'),
			issueCount: document.querySelector('#issue-count'),
			suggestions: document.querySelector('#suggestions'),
			resultWorkflowHint: document.querySelector('#result-workflow-hint'),
			editBody: document.querySelector('#edit-body'),
			copyTitle: document.querySelector('#copy-title'),
			copyBody: document.querySelector('#copy-body'),
			resultCopyStatus: document.querySelector('#result-copy-status'),
			formattedSection: document.querySelector('#formatted-section'),
			formattedTitle: document.querySelector('#formatted-title'),
			formatted: document.querySelector('#formatted'),
			copy: document.querySelector('#copy'),
			copyStatus: document.querySelector('#copy-status'),
		};
		const contentTypeInputs = [...document.querySelectorAll('input[name="contentType"]')];
		const launchedFromAdmin = isAdminLaunch(window.location.search);
		const writerId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		let saveTimer = 0;
		let analysisTimer = 0;
		let draftDirty = false;
		let autoAnalyzeEnabled = false;
		let knownSavedAt = 0;
		let latestEditAt = Date.now();
		let conflictDraft = null;
		let pendingCmsTransfer = null;
		let copyRequestId = 0;
		let activeResultCopyLabel = '';
		let baselineScore = null;
		const copyStatusTimers = new WeakMap();
		let storage = null;
		try {
			storage = window.localStorage;
		} catch {
			storage = null;
		}

		const getContentType = () => document.querySelector('input[name="contentType"]:checked')?.value ?? 'diary';
		const hasContent = () => Boolean(elements.title.value.trim() || elements.body.value.trim());
		const updateMobileAnalysisAction = () => {
			const presentation = getMobileAnalysisActionPresentation({
				hasBody: Boolean(elements.body.value.trim()),
				hasResults: !elements.results.hidden,
				analysisState: elements.analysisStatus.dataset.state,
				resultSummary: elements.issueCount.textContent,
			});
			elements.analyzeMobile.disabled = presentation.disabled;
			elements.analyzeMobile.textContent = presentation.label;
			elements.analyzeMobile.dataset.action = presentation.action;
			elements.analyzeMobile.dataset.state = presentation.state;
			elements.analyzeMobile.setAttribute('aria-label', presentation.ariaLabel);
			elements.analyzeMobile.title = presentation.disabled ? presentation.ariaLabel : '';
		};
		const updateCount = () => {
			const presentation = getBodyCountPresentation(elements.body.value);
			elements.liveCount.textContent = presentation.text;
			elements.liveCount.setAttribute('aria-label', presentation.ariaLabel);
			const actionPresentation = getEditorActionPresentation(elements.body.value);
			elements.analyze.disabled = !actionPresentation.ready;
			elements.analyze.textContent = actionPresentation.analyzeLabel;
			elements.analyze.setAttribute('aria-label', actionPresentation.analyzeAriaLabel);
			elements.analyze.title = actionPresentation.ready ? '' : actionPresentation.analyzeAriaLabel;
			updateMobileAnalysisAction();
			elements.format.disabled = !actionPresentation.ready;
			elements.format.textContent = actionPresentation.formatLabel;
			elements.format.setAttribute('aria-label', actionPresentation.formatAriaLabel);
			elements.format.title = actionPresentation.ready ? '' : actionPresentation.formatAriaLabel;
		};
		const updateTitleCount = () => {
			const presentation = getTitleCountPresentation(elements.title.value);
			elements.titleCount.textContent = presentation.text;
			elements.titleCount.dataset.state = presentation.state;
			elements.titleCount.setAttribute('aria-label', presentation.ariaLabel);
		};
		const setDraftStatus = (message, state = 'idle') => {
			if (elements.draftStatusText.textContent !== message) elements.draftStatusText.textContent = message;
			if (elements.draftStatus.dataset.state !== state) elements.draftStatus.dataset.state = state;
		};
		const updateClearAction = () => {
			elements.clearDraft.hidden = !hasContent() || Boolean(conflictDraft);
		};
		const setAnalysisStatus = (message, state = 'idle') => {
			if (elements.analysisStatus.textContent !== message) elements.analysisStatus.textContent = message;
			if (elements.analysisStatus.dataset.state !== state) elements.analysisStatus.dataset.state = state;
			const updating = state === 'pending';
			elements.suggestions.querySelectorAll('.suggestion-action').forEach((button) => {
				button.disabled = updating;
				button.title = updating ? '診断結果を更新しています' : '';
			});
			updateMobileAnalysisAction();
		};
		const setCopyStatus = (element, message = '', state = 'idle') => {
			const pendingTimer = copyStatusTimers.get(element);
			if (pendingTimer) {
				window.clearTimeout(pendingTimer);
				copyStatusTimers.delete(element);
			}
			if (element.textContent !== message) element.textContent = message;
			if (element.dataset.state !== state) element.dataset.state = state;
			element.setAttribute('aria-busy', state === 'pending' ? 'true' : 'false');
		};
		const announceCopyStatus = (element, message, state) => {
			setCopyStatus(element);
			const timer = window.setTimeout(() => {
				copyStatusTimers.delete(element);
				element.textContent = message;
				element.dataset.state = state;
			}, 20);
			copyStatusTimers.set(element, timer);
		};
		const getScrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
		const moveToResults = () => {
			window.requestAnimationFrame(() => {
				elements.resultTitle.focus({ preventScroll: true });
				elements.resultPane.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
			});
		};
		const focusEditorField = (field, target = null) => {
			field.focus({ preventScroll: true });
			if (target && typeof field.setSelectionRange === 'function') {
				const range = getSelectionRange(field.value, target);
				field.setSelectionRange(range.start, range.end);
			}
			field.scrollIntoView({ behavior: getScrollBehavior(), block: 'center' });
		};
		const closeFailed = () => elements.returnToEditor.dataset.closeFailed === 'true';
		const resetReturnCopyState = () => {
			delete elements.returnToEditor.dataset.copyReady;
			if (!closeFailed()) {
				elements.returnLabel.textContent = '投稿画面へ戻る';
				elements.returnToEditor.setAttribute('aria-label', '日記の投稿画面へ戻る');
			}
		};
		const updateCopyTitleAction = () => {
			const hasTitle = Boolean(elements.title.value.trim());
			elements.copyTitle.disabled = !hasTitle;
			elements.copyTitle.title = hasTitle ? '' : 'タイトルを入力するとコピーできます';
			elements.copyTitle.setAttribute(
				'aria-label',
				hasTitle ? 'タイトルをコピー' : 'タイトルを入力するとコピーできます',
			);
			elements.resultWorkflowHint.textContent = hasTitle
				? '本文を直すと診断は自動更新。タイトルと本文は別々にコピーできます。'
				: 'タイトルを入力すると、タイトルと本文を別々にコピーできます。';
		};
		const invalidateResultCopy = (label) => {
			if (activeResultCopyLabel !== label) return;
			activeResultCopyLabel = '';
			setCopyStatus(elements.resultCopyStatus);
			resetReturnCopyState();
		};
		const markReturnCopyReady = (label) => {
			if (closeFailed()) return;
			elements.returnToEditor.dataset.copyReady = 'true';
			elements.returnLabel.textContent = '戻って貼り付け';
			elements.returnToEditor.setAttribute('aria-label', getReturnCopyAriaLabel(label));
		};
		const copyViaDocument = (text) => {
			const activeElement = document.activeElement;
			const helper = document.createElement('textarea');
			helper.value = text;
			helper.readOnly = true;
			helper.setAttribute('aria-hidden', 'true');
			helper.style.cssText = 'position:fixed;inset:0 auto auto -9999px;opacity:0;pointer-events:none;';
			try {
				document.body.append(helper);
				helper.select();
				return document.execCommand('copy');
			} finally {
				try {
					helper.remove();
				} catch {
					// The temporary control must never block focus recovery.
				}
				try {
					activeElement?.focus?.({ preventScroll: true });
				} catch {
					// Keep copy failure contained when the previous element disappeared.
				}
			}
		};
		const copyEditorText = async ({ text, getCurrentText, label, statusElement, otherStatusElement }) => {
			const requestId = ++copyRequestId;
			const expectedText = String(text);
			if (otherStatusElement) setCopyStatus(otherStatusElement);
			resetReturnCopyState();
			setCopyStatus(statusElement, `${label}をコピー中…`, 'pending');
			let clipboard = null;
			try {
				clipboard = navigator.clipboard;
			} catch {
				clipboard = null;
			}
			const method = await copyTextSafely(expectedText, { clipboard, fallback: copyViaDocument });
			if (requestId !== copyRequestId) return false;
			let currentText = '';
			try {
				currentText = getCurrentText();
			} catch {
				currentText = '';
			}
			if (!isCopyRequestCurrent({ requestId, activeRequestId: copyRequestId, expectedText, currentText })) {
				resetReturnCopyState();
				announceCopyStatus(
					statusElement,
					getCopyFeedback({ label, stale: true }),
					'error',
				);
				return false;
			}
			const copied = method !== 'failed';
			if (copied) markReturnCopyReady(label);
			else resetReturnCopyState();
			announceCopyStatus(
				statusElement,
				getCopyFeedback({ label, copied, launchedFromAdmin, closeFailed: closeFailed() }),
				copied ? 'success' : 'error',
			);
			return copied;
		};
		const showDraftConflict = (draft) => {
			conflictDraft = draft;
			const wasDeleted = draft?.deleted === true;
			elements.draftConflictTitle.textContent = wasDeleted
				? '別のタブで入力が消去されました'
				: '別のタブに新しい下書きがあります';
			elements.draftConflictMessage.textContent = wasDeleted
				? '自動保存を止めています。消去を反映するか、現在の内容を残すか選んでください。'
				: '自動保存を止めています。残す内容を選んでください。';
			elements.loadNewerDraft.textContent = wasDeleted ? '消去を反映' : '新しい方を開く';
			elements.draftConflict.hidden = false;
			updateClearAction();
			setDraftStatus('自動保存を停止しました', 'error');
		};
		const hideCmsTransfer = () => {
			pendingCmsTransfer = null;
			elements.cmsTransfer.hidden = true;
		};
		const showCmsTransfer = (transfer) => {
			const currentDraft = normalizeDraft({
				title: elements.title.value,
				body: elements.body.value,
				contentType: getContentType(),
				deleted: !hasContent(),
				savedAt: knownSavedAt,
			});
			if (getCmsTransferAction(transfer, currentDraft) !== 'offer') {
				const clearResult = clearCmsTransferIfCurrent(storage, transfer);
				if (clearResult.current && !areCmsTransfersEqual(clearResult.current, transfer)) {
					return showCmsTransfer(clearResult.current);
				}
				hideCmsTransfer();
				return false;
			}

			pendingCmsTransfer = normalizeCmsTransfer(transfer);
			const presentation = getCmsTransferPresentation(pendingCmsTransfer, hasContent());
			elements.cmsTransferMessage.textContent = presentation.detail;
			elements.loadCmsTransfer.textContent = presentation.loadLabel;
			elements.dismissCmsTransfer.textContent = presentation.dismissLabel;
			elements.cmsTransfer.hidden = false;
			return true;
		};
		const refreshPendingCmsTransfer = () => {
			const expectedTransfer = pendingCmsTransfer;
			const currentTransfer = readCmsTransfer(storage);
			if (areCmsTransfersEqual(currentTransfer, expectedTransfer)) return expectedTransfer;

			if (currentTransfer && showCmsTransfer(currentTransfer)) {
				setDraftStatus('CMSでさらに新しく保存された投稿があります', 'restored');
				elements.loadCmsTransfer.focus();
			} else {
				hideCmsTransfer();
				setDraftStatus('保存した投稿の候補が別タブで更新されました', 'idle');
				elements.title.focus();
			}
			return null;
		};
		const hideDraftConflict = () => {
			conflictDraft = null;
			elements.draftConflict.hidden = true;
			updateClearAction();
		};
		const saveDraftNow = ({ announce = true } = {}) => {
			if (saveTimer) {
				window.clearTimeout(saveTimer);
				saveTimer = 0;
			}

			const result = writeLocalDraftSafely(storage, {
				title: elements.title.value,
				body: elements.body.value,
				contentType: getContentType(),
				writerId,
				editedAt: latestEditAt,
				savedAt: Math.max(Date.now(), knownSavedAt + 1),
			}, { knownSavedAt, writerId });
			if (result.conflict) {
				if (announce) showDraftConflict(result.currentDraft);
				return false;
			}
			if (result.ok) {
				knownSavedAt = result.draft?.savedAt ?? 0;
				draftDirty = false;
			}
			if (announce) {
				if (!storage || !result.ok) {
					setDraftStatus('自動保存を利用できません', 'error');
				} else if (hasContent()) {
					setDraftStatus('この端末に保存しました', 'saved');
				} else {
					setDraftStatus('入力すると、この端末に自動保存されます', 'idle');
				}
			}
			return result.ok;
		};
		const scheduleDraftSave = () => {
			draftDirty = true;
			updateClearAction();
			if (conflictDraft) {
				setDraftStatus('自動保存を停止しました', 'error');
				return;
			}
			if (!storage) {
				setDraftStatus('自動保存を利用できません', 'error');
				return;
			}
			setDraftStatus(hasContent() ? '保存中…' : '入力をクリアしました', hasContent() ? 'saving' : 'idle');
			if (saveTimer) window.clearTimeout(saveTimer);
			saveTimer = window.setTimeout(() => saveDraftNow(), 450);
		};

		const validateBody = () => {
			const valid = elements.body.value.trim().length > 0;
			elements.inputError.hidden = valid;
			elements.inputError.textContent = valid ? '' : '本文を入力してください。';
			if (!valid) elements.body.focus();
			return valid;
		};

		if (launchedFromAdmin) {
			elements.returnToEditor.title = '投稿画面を残したタブへ戻ります';
			elements.returnToEditor.addEventListener('click', (event) => {
				event.preventDefault();
				window.close();
				window.setTimeout(() => {
					elements.returnLabel.textContent = 'このタブを閉じて戻る';
					elements.returnToEditor.dataset.closeFailed = 'true';
					delete elements.returnToEditor.dataset.copyReady;
					elements.returnToEditor.setAttribute('aria-label', 'このタブを閉じると元の投稿画面へ戻ります');
					elements.returnToEditor.title = '元の投稿画面は別のタブに残っています';
					if (elements.resultCopyStatus.dataset.state === 'success') {
						announceCopyStatus(
							elements.resultCopyStatus,
							getCopyFeedback({ label: activeResultCopyLabel || '本文', copied: true, launchedFromAdmin: true, closeFailed: true }),
							'success',
						);
					}
					if (elements.copyStatus.dataset.state === 'success') {
						announceCopyStatus(
							elements.copyStatus,
							getCopyFeedback({ label: '整形結果', copied: true, launchedFromAdmin: true, closeFailed: true }),
							'success',
						);
					}
				}, 160);
			});
		}

		const renderResult = (result, { isBaseline = false } = {}) => {
			const [label, summary] = getScoreText(result.score);
			const issuePresentation = getIssuePresentation(result.issues);
			const progressPresentation = getScoreProgressPresentation({
				currentScore: result.score,
				baselineScore,
				isBaseline,
			});
			const primaryAction = getResultPrimaryAction(issuePresentation.state);
			elements.emptyState.hidden = true;
			elements.results.hidden = false;
			elements.results.setAttribute('aria-busy', 'false');
			elements.score.textContent = String(result.score);
			elements.scoreVisual.dataset.state = issuePresentation.state;
			elements.scoreVisual.setAttribute('aria-valuenow', String(result.score));
			elements.scoreVisual.setAttribute('aria-valuetext', `${result.score}点、${issuePresentation.count}`);
			elements.scoreLabel.textContent = label;
			elements.scoreProgress.textContent = progressPresentation.text;
			elements.scoreProgress.dataset.state = progressPresentation.state;
			elements.scoreProgress.setAttribute('aria-label', progressPresentation.ariaLabel);
			elements.scoreSummary.textContent = summary;
			elements.characters.textContent = result.stats.characters.toLocaleString('ja-JP');
			elements.paragraphs.textContent = String(result.stats.paragraphs);
			elements.sentences.textContent = String(result.stats.sentences);
			elements.reading.textContent = `${result.stats.readingMinutes}分`;
			elements.suggestionHeading.dataset.state = issuePresentation.state;
			elements.suggestionTitle.textContent = issuePresentation.title;
			elements.issueCount.textContent = issuePresentation.count;
			elements.issueCount.dataset.state = issuePresentation.state;
			elements.editBody.classList.toggle('button-primary', primaryAction === 'edit-body');
			elements.editBody.classList.toggle('button-secondary', primaryAction !== 'edit-body');
			elements.copyBody.classList.toggle('button-primary', primaryAction === 'copy-body');
			elements.copyBody.classList.toggle('button-secondary', primaryAction !== 'copy-body');
			elements.suggestions.replaceChildren(
				...result.issues.map((issue) => {
					const item = document.createElement('li');
					const title = document.createElement('strong');
					const detail = document.createElement('span');
					const actionLabel = getSuggestionActionLabel(issue.action, issue.actionLabel);
					item.className = `suggestion suggestion--${issue.tone}`;
					title.textContent = issue.title;
					detail.textContent = issue.detail;
					item.append(title, detail);
					if (actionLabel) {
						const action = document.createElement('button');
						action.type = 'button';
						action.className = 'suggestion-action';
						action.dataset.suggestionAction = issue.action;
						if (issue.target) {
							action.dataset.targetField = issue.target.field;
							action.dataset.targetStart = String(issue.target.start);
							action.dataset.targetEnd = String(issue.target.end);
						}
						action.textContent = actionLabel;
						action.setAttribute(
							'aria-label',
							`${issue.title}：${actionLabel}${issue.target ? '。該当箇所を選択します' : ''}`,
						);
						action.setAttribute('aria-describedby', 'analysis-status');
						item.append(action);
					}
					return item;
				}),
			);
		};
		const showFormattedResult = () => {
			if (!validateBody()) return false;
			elements.formatted.value = formatSafely(elements.body.value);
			elements.formattedSection.hidden = false;
			setCopyStatus(elements.copyStatus);
			window.requestAnimationFrame(() => {
				elements.formattedTitle.focus({ preventScroll: true });
				elements.formattedSection.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
			});
			return true;
		};
		const getAnalysisInput = () => ({
			title: elements.title.value,
			body: elements.body.value,
			contentType: getContentType(),
		});
		const runAnalysis = ({ automated = false } = {}) => {
			if (analysisTimer) {
				window.clearTimeout(analysisTimer);
				analysisTimer = 0;
			}
			if (!elements.body.value.trim()) {
				baselineScore = null;
				elements.results.hidden = true;
				elements.results.setAttribute('aria-busy', 'false');
				elements.emptyState.hidden = false;
				elements.emptyStateMessage.textContent = '本文を入力すると診断結果を更新します。';
				setAnalysisStatus(autoAnalyzeEnabled ? '入力待ち' : '未診断', 'idle');
				return false;
			}

			const result = analyzeText(getAnalysisInput());
			const isBaseline = baselineScore === null;
			if (isBaseline) baselineScore = result.score;
			renderResult(result, { isBaseline });
			setAnalysisStatus(automated ? '自動更新' : '診断済み', 'current');
			if (shouldMoveToResults({
				automated,
				isMobile: window.matchMedia('(max-width: 820px)').matches,
			})) {
				moveToResults();
			}
			return true;
		};
		const scheduleAutoAnalysis = () => {
			if (!autoAnalyzeEnabled) return;
			if (analysisTimer) window.clearTimeout(analysisTimer);
			if (!elements.body.value.trim()) {
				analysisTimer = 0;
				baselineScore = null;
				elements.results.hidden = true;
				elements.results.setAttribute('aria-busy', 'false');
				elements.emptyState.hidden = false;
				elements.emptyStateMessage.textContent = '本文を入力すると診断結果を更新します。';
				setAnalysisStatus('入力待ち', 'idle');
				return;
			}

			setAnalysisStatus('更新中…', 'pending');
			elements.results.setAttribute('aria-busy', 'true');
			analysisTimer = window.setTimeout(() => runAnalysis({ automated: true }), 500);
		};
		const handleContentChange = () => {
			latestEditAt = Date.now();
			if (elements.body.value.trim()) {
				elements.inputError.hidden = true;
				elements.inputError.textContent = '';
			}
			scheduleDraftSave();
			scheduleAutoAnalysis();
		};

		const restoredRecord = readLocalDraftRecord(storage);
		if (restoredRecord) {
			knownSavedAt = restoredRecord.savedAt;
			latestEditAt = restoredRecord.editedAt || restoredRecord.savedAt || Date.now();
			if (!restoredRecord.deleted) {
				elements.title.value = restoredRecord.title;
				elements.body.value = restoredRecord.body;
				const restoredType = contentTypeInputs.find(({ value }) => value === restoredRecord.contentType);
				if (restoredType) restoredType.checked = true;
				setDraftStatus('前回の入力を復元しました', 'restored');
			}
		} else if (!storage) {
			setDraftStatus('自動保存を利用できません', 'error');
		}
		const cmsTransfer = readCmsTransfer(storage);
		if (cmsTransfer) showCmsTransfer(cmsTransfer);
		updateCount();
		updateTitleCount();
		updateClearAction();
		updateCopyTitleAction();

		elements.title.addEventListener('input', () => {
			updateTitleCount();
			updateCopyTitleAction();
			invalidateResultCopy('タイトル');
			handleContentChange();
		});
		elements.body.addEventListener('input', () => {
			updateCount();
			elements.formattedSection.hidden = true;
			elements.formatted.value = '';
			const formattedCopyWasActive = elements.copyStatus.dataset.state === 'pending'
				|| elements.copyStatus.dataset.state === 'success';
			setCopyStatus(elements.copyStatus);
			if (formattedCopyWasActive) resetReturnCopyState();
			invalidateResultCopy('本文');
			handleContentChange();
		});
		contentTypeInputs.forEach((input) => input.addEventListener('change', () => {
			baselineScore = null;
			handleContentChange();
		}));
		window.addEventListener('pagehide', () => {
			if (draftDirty) saveDraftNow({ announce: false });
		});
		window.addEventListener('storage', (event) => {
			if (event.key !== TRANSFER_KEY) return;
			const transfer = readCmsTransfer(storage);
			if (transfer) showCmsTransfer(transfer);
			else hideCmsTransfer();
		});

		elements.loadCmsTransfer.addEventListener('click', () => {
			if (!pendingCmsTransfer) return;
			const transferToLoad = refreshPendingCmsTransfer();
			if (!transferToLoad) return;
			if (saveTimer) window.clearTimeout(saveTimer);
			saveTimer = 0;
			if (analysisTimer) window.clearTimeout(analysisTimer);
			analysisTimer = 0;

			const savedAt = Math.max(Date.now(), knownSavedAt + 1, transferToLoad.savedAt + 1);
			const result = writeLocalDraftSafely(storage, {
				title: transferToLoad.title,
				body: transferToLoad.body,
				contentType: transferToLoad.contentType,
				writerId,
				editedAt: transferToLoad.savedAt,
				savedAt,
			}, { knownSavedAt, writerId });
			if (result.conflict) {
				showDraftConflict(result.currentDraft);
				return;
			}
			if (!result.ok) {
				elements.cmsTransferMessage.textContent = '保存した投稿を読み込めませんでした。現在の下書きは残しています。';
				return;
			}

			const loadedTitle = transferToLoad.title.trim() || '無題の投稿';
			elements.title.value = transferToLoad.title;
			elements.body.value = transferToLoad.body;
			baselineScore = null;
			const loadedType = contentTypeInputs.find(({ value }) => value === transferToLoad.contentType);
			if (loadedType) loadedType.checked = true;
			knownSavedAt = savedAt;
			latestEditAt = transferToLoad.savedAt;
			draftDirty = false;
			elements.inputError.hidden = true;
			elements.inputError.textContent = '';
			elements.formattedSection.hidden = true;
			elements.formatted.value = '';
			copyRequestId += 1;
			activeResultCopyLabel = '';
			setCopyStatus(elements.copyStatus);
			setCopyStatus(elements.resultCopyStatus);
			resetReturnCopyState();
			updateCount();
			updateTitleCount();
			updateClearAction();
			updateCopyTitleAction();
			const clearResult = clearCmsTransferIfCurrent(storage, transferToLoad);
			hideCmsTransfer();
			const replacementTransfer = clearResult.current
				&& !areCmsTransfersEqual(clearResult.current, transferToLoad)
				? clearResult.current
				: null;
			const replacementShown = replacementTransfer && showCmsTransfer(replacementTransfer);
			if (replacementShown) {
				setDraftStatus(
					`CMSで保存した「${loadedTitle}」を読み込みました。さらに新しい保存があります`,
					'restored',
				);
				elements.loadCmsTransfer.focus();
			} else {
				setDraftStatus(`CMSで保存した「${loadedTitle}」を読み込みました`, 'restored');
			}
			if (autoAnalyzeEnabled) {
				scheduleAutoAnalysis();
			} else {
				elements.results.hidden = true;
				elements.results.setAttribute('aria-busy', 'false');
				elements.emptyState.hidden = false;
				elements.emptyStateMessage.textContent = '文章を入力して「文章を診断」を押してください。';
				setAnalysisStatus('未診断', 'idle');
			}
			if (!replacementShown) elements.title.focus();
		});

		elements.dismissCmsTransfer.addEventListener('click', () => {
			if (!pendingCmsTransfer) return;
			const transferToDismiss = refreshPendingCmsTransfer();
			if (!transferToDismiss) return;
			const keptCurrentDraft = hasContent();
			const clearResult = clearCmsTransferIfCurrent(storage, transferToDismiss);
			hideCmsTransfer();
			const replacementTransfer = clearResult.current
				&& !areCmsTransfersEqual(clearResult.current, transferToDismiss)
				? clearResult.current
				: null;
			if (replacementTransfer && showCmsTransfer(replacementTransfer)) {
				setDraftStatus('CMSでさらに新しく保存された投稿があります', 'restored');
				elements.loadCmsTransfer.focus();
			} else {
				setDraftStatus(
					keptCurrentDraft ? '現在の確認用下書きを残しました' : '保存した投稿は読み込みませんでした',
					keptCurrentDraft ? 'saved' : 'idle',
				);
				elements.title.focus();
			}
		});

		elements.loadNewerDraft.addEventListener('click', () => {
			const newerDraft = readLocalDraftRecord(storage);
			if (!newerDraft) {
				hideDraftConflict();
				setDraftStatus('新しい下書きが見つからないため、現在の内容を残しています', 'error');
				return;
			}

			if (saveTimer) window.clearTimeout(saveTimer);
			saveTimer = 0;
			if (analysisTimer) window.clearTimeout(analysisTimer);
			analysisTimer = 0;
			elements.title.value = newerDraft.deleted ? '' : newerDraft.title;
			elements.body.value = newerDraft.deleted ? '' : newerDraft.body;
			baselineScore = null;
			const newerType = contentTypeInputs.find(({ value }) => value === newerDraft.contentType);
			if (newerType) newerType.checked = true;
			knownSavedAt = newerDraft.savedAt;
			latestEditAt = newerDraft.editedAt || newerDraft.savedAt || Date.now();
			draftDirty = false;
			elements.inputError.hidden = true;
			elements.inputError.textContent = '';
			elements.formattedSection.hidden = true;
			elements.formatted.value = '';
			copyRequestId += 1;
			activeResultCopyLabel = '';
			setCopyStatus(elements.copyStatus);
			setCopyStatus(elements.resultCopyStatus);
			resetReturnCopyState();
			updateCount();
			updateTitleCount();
			updateCopyTitleAction();
			hideDraftConflict();
			setDraftStatus(
				newerDraft.deleted ? '別のタブで消去された状態を反映しました' : '別のタブの新しい下書きを読み込みました',
				'restored',
			);
			if (autoAnalyzeEnabled) {
				scheduleAutoAnalysis();
			} else {
				elements.results.hidden = true;
				elements.results.setAttribute('aria-busy', 'false');
				elements.emptyState.hidden = false;
				elements.emptyStateMessage.textContent = '文章を入力して「文章を診断」を押してください。';
				setAnalysisStatus('未診断', 'idle');
			}
		});

		elements.overwriteDraft.addEventListener('click', () => {
			if (!conflictDraft) return;
			if (!window.confirm(getOverwriteConfirmMessage(conflictDraft))) return;

			if (saveTimer) window.clearTimeout(saveTimer);
			saveTimer = 0;
			const savedAt = Math.max(Date.now(), knownSavedAt + 1, conflictDraft.savedAt + 1);
			const saved = writeLocalDraft(storage, {
				title: elements.title.value,
				body: elements.body.value,
				contentType: getContentType(),
				writerId,
				editedAt: latestEditAt,
				savedAt,
			});
			if (!saved) {
				setDraftStatus('現在の内容を保存できませんでした', 'error');
				return;
			}

			knownSavedAt = savedAt;
			draftDirty = false;
			hideDraftConflict();
			setDraftStatus(hasContent() ? '現在の内容をこの端末に保存しました' : '入力をクリアしました', hasContent() ? 'saved' : 'idle');
		});

		elements.clearDraft.addEventListener('click', () => {
			if (!window.confirm('入力中のタイトルと本文を消去します。よろしいですか？')) return;

			const clearResult = writeLocalDraftSafely(storage, {
				title: '',
				body: '',
				contentType: getContentType(),
				writerId,
				editedAt: Date.now(),
				savedAt: Math.max(Date.now(), knownSavedAt + 1),
			}, { knownSavedAt, writerId });
			if (clearResult.conflict) {
				showDraftConflict(clearResult.currentDraft);
				return;
			}
			if (!clearResult.ok) {
				setDraftStatus('入力を消去できませんでした。内容は残しています', 'error');
				return;
			}
			if (saveTimer) window.clearTimeout(saveTimer);
			saveTimer = 0;
			if (analysisTimer) window.clearTimeout(analysisTimer);
			analysisTimer = 0;
			draftDirty = false;
			autoAnalyzeEnabled = false;
			baselineScore = null;
			knownSavedAt = clearResult.draft.savedAt;
			latestEditAt = Date.now();
			hideDraftConflict();
			elements.title.value = '';
			elements.body.value = '';
			const diaryInput = contentTypeInputs.find(({ value }) => value === 'diary');
			if (diaryInput) diaryInput.checked = true;
			elements.inputError.hidden = true;
			elements.inputError.textContent = '';
			elements.results.hidden = true;
			elements.results.setAttribute('aria-busy', 'false');
			elements.emptyState.hidden = false;
			elements.emptyStateMessage.textContent = '文章を入力して「文章を診断」を押してください。';
			elements.formattedSection.hidden = true;
			copyRequestId += 1;
			activeResultCopyLabel = '';
			setCopyStatus(elements.copyStatus);
			setCopyStatus(elements.resultCopyStatus);
			resetReturnCopyState();
			updateCount();
			updateTitleCount();
			updateClearAction();
			updateCopyTitleAction();
			setDraftStatus('入力をクリアしました', 'idle');
			setAnalysisStatus('未診断', 'idle');
			elements.title.focus();
		});

		const handleManualAnalysis = () => {
			if (!validateBody()) return;
			autoAnalyzeEnabled = true;
			runAnalysis();
		};
		elements.analyze.addEventListener('click', handleManualAnalysis);
		elements.analyzeMobile.addEventListener('click', () => {
			if (elements.analyzeMobile.dataset.action === 'view-results') {
				moveToResults();
				return;
			}
			handleManualAnalysis();
		});

		elements.editBody.addEventListener('click', () => {
			focusEditorField(elements.body);
		});

		elements.suggestions.addEventListener('click', (event) => {
			const actionButton = event.target.closest?.('button[data-suggestion-action]');
			if (!actionButton || !elements.suggestions.contains(actionButton)) return;
			const target = actionButton.dataset.targetField
				? {
					field: actionButton.dataset.targetField,
					start: Number(actionButton.dataset.targetStart),
					end: Number(actionButton.dataset.targetEnd),
				}
				: null;

			switch (actionButton.dataset.suggestionAction) {
				case 'title':
					focusEditorField(elements.title, target?.field === 'title' ? target : null);
					break;
				case 'body':
					focusEditorField(elements.body, target?.field === 'body' ? target : null);
					break;
				case 'format':
					showFormattedResult();
					break;
				default:
					break;
			}
		});

		elements.copyTitle.addEventListener('click', async () => {
			const title = elements.title.value.trim();
			if (!title) return;
			activeResultCopyLabel = 'タイトル';
			await copyEditorText({
				text: title,
				getCurrentText: () => elements.title.value.trim(),
				label: 'タイトル',
				statusElement: elements.resultCopyStatus,
				otherStatusElement: elements.copyStatus,
			});
		});

		elements.copyBody.addEventListener('click', async () => {
			if (!validateBody()) return;
			activeResultCopyLabel = '本文';
			await copyEditorText({
				text: elements.body.value,
				getCurrentText: () => elements.body.value,
				label: '本文',
				statusElement: elements.resultCopyStatus,
				otherStatusElement: elements.copyStatus,
			});
		});

		elements.format.addEventListener('click', () => {
			showFormattedResult();
		});

		elements.copy.addEventListener('click', async () => {
			activeResultCopyLabel = '';
			await copyEditorText({
				text: elements.formatted.value,
				getCurrentText: () => elements.formatted.value,
				label: '整形結果',
				statusElement: elements.copyStatus,
				otherStatusElement: elements.resultCopyStatus,
			});
		});
	};

	if (typeof window !== 'undefined') {
		window.PolishTool = {
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
			getCopyFeedback,
			getCmsTransferAction,
			getCmsTransferPresentation,
			getEditorActionPresentation,
			getMobileAnalysisActionPresentation,
			getScoreProgressPresentation,
			getBodyCountPresentation,
			hasBalancedHtmlTags,
			getIssuePresentation,
			getOverwriteConfirmMessage,
			getReturnCopyAriaLabel,
			getResultPrimaryAction,
			getSelectionRange,
			getSuggestionActionLabel,
			getTitleCountPresentation,
			isCopyRequestCurrent,
			isAdminLaunch,
			normalizeCmsTransfer,
			normalizeDraft,
			readCmsTransfer,
			readLocalDraft,
			readLocalDraftRecord,
			shouldMoveToResults,
			stripMarkdown,
			writeLocalDraft,
			writeLocalDraftSafely,
		};
	}

	if (typeof document !== 'undefined') {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', initialize, { once: true });
		} else {
			initialize();
		}
	}
})();
