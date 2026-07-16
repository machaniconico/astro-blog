const getFontGuideElements = (doc) => ({
	dialog: doc?.querySelector?.('#font-guide') ?? null,
	openButton: doc?.querySelector?.('[data-font-guide-open]') ?? null,
	closeButtons: Array.from(doc?.querySelectorAll?.('[data-font-guide-close]') ?? []),
});

const openFontGuide = (dialog) => {
	if (!dialog || dialog.open) return false;
	if (typeof dialog.showModal === 'function') dialog.showModal();
	else dialog.setAttribute?.('open', '');
	return true;
};

const closeFontGuide = (dialog) => {
	if (!dialog || !dialog.open) return false;
	if (typeof dialog.close === 'function') dialog.close();
	else dialog.removeAttribute?.('open');
	return true;
};

const initFontGuide = (doc) => {
	const { dialog, openButton, closeButtons } = getFontGuideElements(doc);
	if (!dialog || !openButton || closeButtons.length === 0) return false;

	openButton.addEventListener('click', () => openFontGuide(dialog));
	for (const button of closeButtons) {
		button.addEventListener('click', () => closeFontGuide(dialog));
	}
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) closeFontGuide(dialog);
	});
	return true;
};

window.AdminShell = { closeFontGuide, getFontGuideElements, initFontGuide, openFontGuide };

if (typeof document !== 'undefined') initFontGuide(document);
