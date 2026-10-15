// The home page's behaviour: the theme switch, narrowing the sightings by
// country or by "similar", and likes and ratings kept in this browser.

(function () {
	const root = document.documentElement;

	// Theme: the head script has already set it, this only switches it.
	const toggle = document.querySelector('[data-theme-toggle]');
	function labelToggle() {
		if (!toggle) return;
		const dark = root.dataset.theme === 'dark';
		toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
	}
	labelToggle();
	if (toggle) {
		toggle.addEventListener('click', function () {
			root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
			localStorage.setItem('theme', root.dataset.theme);
			labelToggle();
			document.dispatchEvent(new CustomEvent('theme:change'));
		});
	}

	const list = document.getElementById('sightings-list');
	if (!list) return;

	// Read every item once, rather than on every keystroke.
	const items = Array.from(list.children, function (el) {
		return { el: el, data: Object.assign({}, el.dataset) };
	});
	const status = document.querySelector('[data-status]');
	const clear = document.querySelector('[data-clear]');
	const empty = document.querySelector('[data-empty]');
	const form = document.querySelector('[data-search]');
	const input = form && form.querySelector('input');
	const allText = status ? status.textContent : '';

	function show(test, label, country) {
		let shown = 0;
		items.forEach(function (item) {
			const on = !test || test(item.data);
			item.el.hidden = !on;
			if (on) shown++;
		});
		if (status) status.textContent = test ? label(shown) : allText;
		if (clear) clear.hidden = !test;
		if (empty) empty.hidden = shown > 0;
		document.dispatchEvent(new CustomEvent('sightings:filter', { detail: { country: country || '' } }));
	}

	function plural(n) {
		return n === 1 ? '1 sighting' : n + ' sightings';
	}

	function byCountry(text) {
		const q = text.trim().toLowerCase();
		if (!q) return show(null);
		const exact = items.some(function (i) { return i.data.country === q; });
		show(
			function (d) { return exact ? d.country === q : d.country.includes(q); },
			function (n) { return n ? plural(n) + ' in ' + text.trim() : 'No sightings in ' + text.trim() + ' yet'; },
			exact ? q : '',
		);
	}

	function jump() {
		document.getElementById('sightings').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
	}

	let frame = 0;
	if (form) {
		input.addEventListener('input', function () {
			if (!frame) frame = requestAnimationFrame(function () { frame = 0; byCountry(input.value); });
		});
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			byCountry(input.value);
			jump();
		});
	}

	document.querySelectorAll('[data-pick-country]').forEach(function (btn) {
		btn.addEventListener('click', function () {
			if (input) input.value = btn.dataset.pickCountry;
			byCountry(btn.dataset.pickCountry);
			jump();
		});
	});

	document.addEventListener('globe:pick', function (e) {
		if (input) input.value = e.detail.country;
		byCountry(e.detail.country);
	});

	if (clear) {
		clear.addEventListener('click', function () {
			if (input) input.value = '';
			show(null);
		});
	}

	// Similar: the same family, or the same order or class when it's alone in its family.
	list.addEventListener('click', function (e) {
		const btn = e.target.closest('[data-similar]');
		if (!btn) return;
		const me = items.find(function (i) { return i.el.contains(btn); });
		for (const rank of ['family', 'order', 'class']) {
			const value = me.data[rank];
			if (!value) continue;
			const n = items.filter(function (i) { return i.data[rank] === value; }).length;
			if (n < 2 && rank !== 'class') continue;
			if (input) input.value = '';
			show(
				function (d) { return d[rank] === value; },
				function (n) { return plural(n) + ' like the ' + me.data.name + ' (' + value + ')'; },
			);
			jump();
			return;
		}
	});

	// Likes and ratings live in this browser only.
	function load(key) {
		try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { return {}; }
	}
	const likes = load('sightings:likes');
	const ratings = load('sightings:ratings');

	function paintRating(group, n) {
		group.querySelectorAll('button').forEach(function (b) {
			b.setAttribute('aria-pressed', String(Number(b.value) <= n));
		});
	}

	items.forEach(function (item) {
		const id = item.data.id;
		const like = item.el.querySelector('[data-like]');
		if (like && likes[id]) like.setAttribute('aria-pressed', 'true');
		const rating = item.el.querySelector('[data-rating]');
		if (rating && ratings[id]) paintRating(rating, ratings[id]);
	});

	list.addEventListener('click', function (e) {
		const like = e.target.closest('[data-like]');
		const star = e.target.closest('[data-rating] button');
		const id = e.target.closest('li[data-id]') && e.target.closest('li[data-id]').dataset.id;
		if (!id) return;

		if (like) {
			const on = like.getAttribute('aria-pressed') !== 'true';
			like.setAttribute('aria-pressed', String(on));
			if (on) likes[id] = true; else delete likes[id];
			localStorage.setItem('sightings:likes', JSON.stringify(likes));
		}
		if (star) {
			const n = Number(star.value) === ratings[id] ? 0 : Number(star.value);
			if (n) ratings[id] = n; else delete ratings[id];
			paintRating(star.parentElement, n);
			localStorage.setItem('sightings:ratings', JSON.stringify(ratings));
		}
	});
})();
