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

	const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

	// A photo that won't load is hidden rather than shown broken.
	document.addEventListener(
		'error',
		function (e) {
			if (e.target.tagName === 'IMG') e.target.classList.add('is-broken');
		},
		true,
	);

	// The hero's backdrop: a different animal every 5 seconds, the featured card in step.
	const backdrop = document.querySelector('[data-slides]');
	if (backdrop && !still) {
		const slides = Array.from(backdrop.querySelectorAll('img'));
		const card = document.querySelector('[data-featured]');
		let at = 0;
		setInterval(function () {
			if (document.hidden || slides.length < 2) return;
			for (let step = 1; step < slides.length; step++) {
				const next = slides[(at + step) % slides.length];
				if (!next.complete || !next.naturalWidth) continue;
				slides[at].classList.remove('is-shown');
				next.classList.add('is-shown');
				at = slides.indexOf(next);
				if (card) {
					card.classList.add('is-changing');
					setTimeout(function () {
						card.href = next.dataset.href;
						card.querySelector('[data-featured-img]').src = next.src;
						card.querySelector('[data-featured-name]').textContent = next.dataset.name;
						card.querySelector('[data-featured-place]').textContent = next.dataset.place;
						card.classList.remove('is-changing');
					}, 300);
				}
				return;
			}
		}, 5000);
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

	// The country dropdown: type to narrow it, arrows and Enter to choose.
	const panel = document.querySelector('[data-combo-panel]');
	const toggleList = document.querySelector('[data-combo-toggle]');
	const none = document.querySelector('[data-combo-none]');
	const options = panel ? Array.from(panel.querySelectorAll('[role="option"]'), function (el) {
		const name = el.querySelector('.combo__name');
		return { el: el, name: name, value: el.dataset.value };
	}) : [];
	let active = -1;

	function shown() {
		return options.filter(function (o) { return !o.el.hidden; });
	}

	function highlight(o, q) {
		const at = q ? o.value.toLowerCase().indexOf(q) : -1;
		o.name.textContent = '';
		if (at < 0) {
			o.name.textContent = o.value;
			return;
		}
		const mark = document.createElement('mark');
		mark.textContent = o.value.slice(at, at + q.length);
		o.name.append(o.value.slice(0, at), mark, o.value.slice(at + q.length));
	}

	function refine() {
		const q = input.value.trim().toLowerCase();
		options.forEach(function (o) {
			o.el.hidden = q !== '' && !o.value.toLowerCase().includes(q);
			o.el.setAttribute('aria-selected', String(o.value.toLowerCase() === q));
			highlight(o, q);
		});
		if (none) none.hidden = shown().length > 0;
		setActive(-1);
	}

	function setActive(i) {
		const vis = shown();
		options.forEach(function (o) { o.el.classList.remove('is-active'); });
		active = vis.length ? (i + vis.length) % vis.length : -1;
		if (i < 0 || active < 0) {
			active = -1;
			input.removeAttribute('aria-activedescendant');
			return;
		}
		vis[active].el.classList.add('is-active');
		vis[active].el.scrollIntoView({ block: 'nearest' });
		input.setAttribute('aria-activedescendant', vis[active].el.id);
	}

	function open() {
		if (!panel || !panel.hidden) return;
		refine();
		panel.hidden = false;
		input.setAttribute('aria-expanded', 'true');
	}

	function close() {
		if (!panel || panel.hidden) return;
		panel.hidden = true;
		input.setAttribute('aria-expanded', 'false');
		setActive(-1);
	}

	function choose(value) {
		input.value = value;
		close();
		byCountry(value);
	}

	let frame = 0;
	if (form) {
		input.addEventListener('focus', open);
		input.addEventListener('click', open);
		input.addEventListener('input', function () {
			open();
			refine();
			if (!frame) frame = requestAnimationFrame(function () { frame = 0; byCountry(input.value); });
		});
		input.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				open();
				setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
			} else if (e.key === 'Enter' && active >= 0) {
				e.preventDefault();
				choose(shown()[active].value);
			} else if (e.key === 'Escape') {
				if (panel && !panel.hidden) close();
				else if (input.value) choose('');
			} else if (e.key === 'Tab') {
				close();
			}
		});
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			close();
			byCountry(input.value);
			jump();
		});
	}

	if (panel) {
		// mousedown, so the input keeps focus and the panel isn't closed under the click.
		panel.addEventListener('mousedown', function (e) {
			e.preventDefault();
			const option = e.target.closest('[role="option"]');
			if (option) choose(option.dataset.value);
		});
		toggleList.addEventListener('click', function () {
			if (panel.hidden) {
				input.focus();
				open();
			} else {
				close();
			}
		});
		document.addEventListener('pointerdown', function (e) {
			if (!e.target.closest('[data-combo]')) close();
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

	// Grid or gallery: the gallery is the same list, one animal at a time.
	const viewButtons = document.querySelectorAll('[data-view]');
	const controls = document.querySelector('[data-carousel-controls]');
	const play = document.querySelector('[data-carousel="play"]');
	const playLabel = document.querySelector('[data-carousel-label]');
	const counter = document.querySelector('[data-carousel-count]');
	let timer = 0;

	function visible() {
		return items.filter(function (i) { return !i.el.hidden; });
	}

	function current() {
		const middle = list.scrollLeft + list.clientWidth / 2;
		let best = 0, gap = Infinity;
		visible().forEach(function (item, i) {
			const d = Math.abs(item.el.offsetLeft + item.el.offsetWidth / 2 - middle);
			if (d < gap) { gap = d; best = i; }
		});
		return best;
	}

	function go(i) {
		const vis = visible();
		if (!vis.length) return;
		const el = vis[(i + vis.length) % vis.length].el;
		list.scrollTo({ left: el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' });
	}

	function count() {
		if (!counter || !list.classList.contains('is-gallery')) return;
		const vis = visible();
		counter.textContent = vis.length ? (current() + 1) + ' of ' + vis.length + ' · ' + vis[current()].data.name : '';
	}

	function setPlaying(on) {
		clearInterval(timer);
		timer = on ? setInterval(function () { if (!document.hidden) go(current() + 1); }, 5000) : 0;
		if (play) play.setAttribute('aria-pressed', String(on));
		if (playLabel) playLabel.textContent = on ? 'Pause' : 'Play';
	}

	function setView(view) {
		const gallery = view === 'gallery';
		list.classList.toggle('is-gallery', gallery);
		viewButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
		if (controls) controls.hidden = !gallery;
		if (gallery) {
			list.tabIndex = 0;
			list.setAttribute('aria-roledescription', 'carousel');
			list.scrollLeft = 0;
		} else {
			list.removeAttribute('tabindex');
			list.removeAttribute('aria-roledescription');
			setPlaying(false);
		}
		count();
		localStorage.setItem('sightings:view', view);
	}

	viewButtons.forEach(function (b) {
		b.addEventListener('click', function () { setView(b.dataset.view); });
	});

	document.querySelectorAll('[data-carousel]').forEach(function (b) {
		b.addEventListener('click', function () {
			const action = b.dataset.carousel;
			if (action === 'play') return setPlaying(!timer);
			go(current() + (action === 'next' ? 1 : -1));
			if (timer) setPlaying(true);
		});
	});

	list.addEventListener('keydown', function (e) {
		if (!list.classList.contains('is-gallery') || e.target !== list) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			go(current() + (e.key === 'ArrowRight' ? 1 : -1));
		}
	});

	// Grabbing the gallery to swipe it stops the play.
	list.addEventListener('pointerdown', function (e) {
		if (timer && !e.target.closest('button, a')) setPlaying(false);
	});

	let counting = 0;
	list.addEventListener('scroll', function () {
		if (!counting) counting = requestAnimationFrame(function () { counting = 0; count(); });
	}, { passive: true });

	document.addEventListener('sightings:filter', function () {
		if (!list.classList.contains('is-gallery')) return;
		list.scrollLeft = 0;
		count();
	});

	// Full screen: one animal at a time, the photo first, then its captions one by one.
	const theatre = document.querySelector('[data-theatre]');
	const openTheatre = document.querySelector('[data-theatre-open]');
	if (theatre && openTheatre) {
		const layers = Array.from(theatre.querySelectorAll('[data-theatre-img]'));
		const fields = {};
		theatre.querySelectorAll('[data-t]').forEach(function (el) { fields[el.dataset.t] = el; });
		const credit = theatre.querySelector('[data-t-credit]');
		const bar = theatre.querySelector('[data-theatre-bar]');
		const tCount = theatre.querySelector('[data-theatre-count]');
		const tPlay = theatre.querySelector('[data-theatre="play"]');
		const HOLD = 8000;
		let reel = [];
		let at = 0;
		let layer = 0;
		let playing = false;
		let advance = 0;
		let reveal = 0;
		let idle = 0;
		let token = 0;

		function caption(item) {
			const d = item.data;
			fields.name.textContent = d.name || '';
			fields.scientific.textContent = d.scientific || '';
			fields.place.textContent = d.place || '';
			fields.date.textContent = d.date || '';
			fields.credit.textContent = d.credit || '';
			credit.hidden = !d.credit;
			tCount.textContent = (at + 1) + ' / ' + reel.length;
		}

		function schedule() {
			clearTimeout(advance);
			bar.classList.remove('is-running');
			void bar.offsetWidth;
			if (!playing) return;
			bar.classList.add('is-running');
			advance = setTimeout(function () { show(at + 1); }, HOLD);
		}

		function show(i) {
			if (!reel.length) return;
			at = (i + reel.length) % reel.length;
			const item = reel[at];
			const mine = ++token;
			theatre.classList.remove('is-captioned');
			clearTimeout(reveal);

			const next = layers[1 - layer];
			next.onload = function () {
				if (mine !== token) return;
				token++;
				layers[layer].classList.remove('is-shown');
				next.classList.add('is-shown');
				next.classList.toggle('is-alt', at % 2 === 1);
				layer = 1 - layer;
				// The animal first, the words after it.
				const shown = token;
				reveal = setTimeout(function () {
					if (shown !== token) return;
					caption(item);
					theatre.classList.add('is-captioned');
				}, still ? 0 : 1200);
				schedule();
				const after = reel[(at + 1) % reel.length];
				if (after) new Image().src = after.data.photo;
			};
			next.onerror = function () {
				if (mine === token) show(at + 1);
			};
			next.alt = item.data.name || '';
			next.src = item.data.photo;
			if (next.complete && next.naturalWidth) next.onload();
		}

		function setTheatrePlaying(on) {
			playing = on;
			tPlay.setAttribute('aria-pressed', String(on));
			tPlay.setAttribute('aria-label', on ? 'Pause' : 'Play');
			theatre.classList.toggle('is-paused', !on);
			schedule();
		}

		function wake() {
			theatre.classList.add('is-awake');
			clearTimeout(idle);
			idle = setTimeout(function () { theatre.classList.remove('is-awake'); }, 2500);
		}

		function open() {
			const vis = visible();
			reel = vis.filter(function (i) { return i.data.photo; });
			if (!reel.length) return;
			const here = vis[current()];
			const start = Math.max(0, reel.indexOf(here));
			setPlaying(false);
			theatre.hidden = false;
			document.body.classList.add('has-theatre');
			if (theatre.requestFullscreen) theatre.requestFullscreen().catch(function () {});
			theatre.focus();
			wake();
			setTheatrePlaying(!still);
			show(start);
		}

		function close() {
			if (theatre.hidden) return;
			clearTimeout(advance);
			clearTimeout(reveal);
			token++;
			theatre.hidden = true;
			theatre.classList.remove('is-captioned');
			layers.forEach(function (l) { l.classList.remove('is-shown'); });
			document.body.classList.remove('has-theatre');
			if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
			// Back in the gallery on the animal they stopped at.
			const vis = visible();
			const i = vis.indexOf(reel[at]);
			if (i >= 0) go(i);
			openTheatre.focus();
		}

		openTheatre.addEventListener('click', open);
		document.addEventListener('fullscreenchange', function () {
			if (!document.fullscreenElement) close();
		});

		theatre.addEventListener('click', function (e) {
			const btn = e.target.closest('[data-theatre]');
			if (!btn) return;
			const action = btn.dataset.theatre;
			if (action === 'close') close();
			if (action === 'play') setTheatrePlaying(!playing);
			if (action === 'prev') show(at - 1);
			if (action === 'next') show(at + 1);
		});

		theatre.addEventListener('keydown', function (e) {
			wake();
			if (e.key === 'Escape') close();
			else if (e.key === 'ArrowRight') show(at + 1);
			else if (e.key === 'ArrowLeft') show(at - 1);
			else if (e.key === ' ' && !e.target.closest('button')) {
				e.preventDefault();
				setTheatrePlaying(!playing);
			}
		});
		theatre.addEventListener('pointermove', wake);
		document.addEventListener('visibilitychange', function () {
			if (!theatre.hidden && playing) schedule();
		});
	}

	setView(localStorage.getItem('sightings:view') === 'gallery' ? 'gallery' : 'grid');
})();
