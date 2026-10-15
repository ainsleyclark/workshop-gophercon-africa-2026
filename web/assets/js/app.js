(() => {
	const root = document.documentElement;
	const toggle = document.querySelector('[data-theme-toggle]');

	const label = () => {
		if (!toggle) return;
		const dark = root.dataset.theme === 'dark';
		toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
		toggle.setAttribute('aria-pressed', String(dark));
	};

	label();
	toggle?.addEventListener('click', () => {
		root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
		localStorage.setItem('theme', root.dataset.theme);
		label();
	});

	document.querySelectorAll('[data-open-dialog]').forEach((button) => {
		const dialog = document.getElementById(button.dataset.openDialog);
		button.addEventListener('click', () => dialog?.showModal());
	});

	document.querySelectorAll('[data-close-dialog]').forEach((button) => {
		button.addEventListener('click', () => button.closest('dialog')?.close());
	});
})();
