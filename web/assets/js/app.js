(() => {
	const root = document.documentElement;
	const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

	// Theme: the head script set it before paint; this keeps the toggle in step.
	const toggle = document.querySelector('[data-theme-toggle]');
	const label = () => {
		if (!toggle) return;
		const dark = root.dataset.theme === 'dark';
		toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
		toggle.setAttribute('aria-pressed', String(dark));
	};
	label();
	toggle?.addEventListener('click', () => {
		const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
		const swap = () => {
			root.dataset.theme = next;
			localStorage.setItem('theme', next);
			label();
		};
		if (document.startViewTransition && !still) document.startViewTransition(swap);
		else swap();
	});

	// Dialogs.
	document.querySelectorAll('[data-open-dialog]').forEach((button) => {
		const dialog = document.getElementById(button.dataset.openDialog);
		button.addEventListener('click', () => dialog?.showModal());
	});
	document.querySelectorAll('[data-close-dialog]').forEach((button) => {
		button.addEventListener('click', () => button.closest('dialog')?.close());
	});

	// The header turns solid once the page scrolls past the top.
	const header = document.querySelector('.site-header');
	if (header) {
		const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 24);
		onScroll();
		addEventListener('scroll', onScroll, { passive: true });
	}

	// Numbers count up once they come into view.
	const counters = document.querySelectorAll('[data-count]');
	const format = new Intl.NumberFormat('en-GB');
	const run = (el) => {
		const target = Number(el.dataset.count) || 0;
		if (still || target === 0) {
			el.textContent = format.format(target);
			return;
		}
		const start = performance.now();
		const duration = 1400;
		const step = (now) => {
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - t, 4);
			el.textContent = format.format(Math.round(target * eased));
			if (t < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	};
	if ('IntersectionObserver' in window) {
		const seen = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				run(entry.target);
				seen.unobserve(entry.target);
			});
		}, { threshold: 0.4 });
		counters.forEach((el) => seen.observe(el));
	} else {
		counters.forEach(run);
	}

	// Cards tilt towards the pointer. One listener for the whole page.
	if (!still && matchMedia('(hover: hover) and (pointer: fine)').matches) {
		let active = null;
		document.addEventListener('pointermove', (e) => {
			const card = e.target.closest?.('.card');
			if (active && active !== card) {
				active.style.removeProperty('--rx');
				active.style.removeProperty('--ry');
				active = null;
			}
			if (!card) return;
			active = card;
			const box = card.getBoundingClientRect();
			const x = (e.clientX - box.left) / box.width;
			const y = (e.clientY - box.top) / box.height;
			card.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
			card.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
			card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
			card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
		}, { passive: true });
	}

	// The banner's search box hands its words to the collection's filter.
	const heroSearch = document.querySelector('[data-hero-search]');
	const filterSearch = document.querySelector('form[data-filter] input[type="search"]');
	if (heroSearch && filterSearch) {
		heroSearch.addEventListener('submit', (e) => {
			e.preventDefault();
			filterSearch.value = heroSearch.querySelector('input').value;
			filterSearch.dispatchEvent(new Event('input', { bubbles: true }));
			document.getElementById('collection')?.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
		});
	}
})();
