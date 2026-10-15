// Narrows a list in place: a chip ticked or a word typed hides the items
// that don't match and counts those that do. Nothing is removed or
// re-rendered, so the page stays the page that was served. The choice is
// kept in the URL, so a filtered view can be shared or bookmarked.

(function () {
	document.querySelectorAll('form[data-filter]').forEach(function (form) {
		const list = document.getElementById(form.dataset.filter);
		if (!list) return;

		// Read every item once: thousands of dataset reads per keystroke drag.
		const items = Array.from(list.children, function (el, i) {
			return { el: el, data: Object.assign({}, el.dataset), index: i };
		});
		const search = form.querySelector('input[type="search"]');
		const sort = form.querySelector('select[name="sort"]');
		const count = form.querySelector('.filter__count');
		const empty = document.querySelector('[data-filter-empty="' + form.dataset.filter + '"]');
		let frame = 0;

		const sorters = {
			newest: function (a, b) { return a.index - b.index; },
			oldest: function (a, b) { return b.index - a.index; },
			name: function (a, b) { return (a.data.name || '').localeCompare(b.data.name || '') || a.index - b.index; },
		};

		// Fields start from the URL, so a shared link opens on the same view.
		const params = new URLSearchParams(location.search);
		if (search && params.has('q')) search.value = params.get('q');
		if (sort && sorters[params.get('sort')]) sort.value = params.get('sort');
		form.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
			box.checked = params.getAll(box.name).includes(box.value);
		});

		function selected() {
			const groups = {};
			form.querySelectorAll('input:checked').forEach(function (box) {
				(groups[box.name] = groups[box.name] || []).push(box.value);
			});
			return groups;
		}

		function matches(data, groups, query) {
			for (const key in groups) {
				if (!groups[key].includes(data[key])) return false;
			}
			return !query || (data.search || '').includes(query);
		}

		function order() {
			const by = sorters[sort ? sort.value : 'newest'] || sorters.newest;
			const fragment = document.createDocumentFragment();
			items.slice().sort(by).forEach(function (item) {
				fragment.appendChild(item.el);
			});
			list.appendChild(fragment);
		}

		function remember() {
			const next = new URLSearchParams();
			new FormData(form).forEach(function (value, key) {
				if (value === '' || (key === 'sort' && value === 'newest')) return;
				next.append(key, value);
			});
			const query = next.toString();
			history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
		}

		function apply() {
			frame = 0;
			const groups = selected();
			const query = search ? search.value.trim().toLowerCase() : '';
			let shown = 0;
			const links = new Set();
			items.forEach(function (item) {
				const show = matches(item.data, groups, query);
				item.el.hidden = !show;
				if (show) {
					shown++;
					if (item.data.link) links.add(item.data.link);
				}
			});
			document.dispatchEvent(new CustomEvent('filter:change', { detail: { links: links, all: shown === items.length } }));
			if (count) {
				count.textContent = shown === items.length
					? 'Showing all ' + items.length
					: 'Showing ' + shown + ' of ' + items.length;
			}
			form.classList.toggle('is-filtered', shown !== items.length);
			if (empty) empty.hidden = shown !== 0;
			remember();
		}

		// One pass per frame, however fast they type or tick.
		function schedule() {
			if (!frame) frame = requestAnimationFrame(apply);
		}

		form.addEventListener('input', function (e) {
			if (e.target === sort) order();
			schedule();
		});
		// The fields clear after this event fires, so the pass waits for the frame.
		form.addEventListener('reset', function () {
			requestAnimationFrame(function () {
				order();
				schedule();
			});
		});
		form.addEventListener('submit', function (e) {
			e.preventDefault();
		});
		document.querySelectorAll('[data-filter-reset="' + form.dataset.filter + '"]').forEach(function (button) {
			button.addEventListener('click', function () {
				form.reset();
			});
		});

		// Once the bar sticks to the top, the chips fold away behind a button.
		const wrap = form.closest('.filter-wrap');
		const sentinel = wrap && wrap.previousElementSibling;
		const toggle = form.querySelector('[data-filter-toggle]');
		const badge = form.querySelector('[data-filter-badge]');
		const setOpen = function (open) {
			form.classList.toggle('is-open', open);
			if (toggle) toggle.setAttribute('aria-expanded', String(open));
		};
		toggle && toggle.addEventListener('click', function () {
			setOpen(!form.classList.contains('is-open'));
		});
		if (wrap && sentinel && sentinel.classList.contains('filter-sentinel')) {
			// A scroll check rather than an observer: a fast scroll jumps straight past a 1px line.
			let ticking = false;
			const check = function () {
				ticking = false;
				const stuck = sentinel.getBoundingClientRect().top < 90;
				if (stuck !== wrap.classList.contains('is-stuck')) {
					wrap.classList.toggle('is-stuck', stuck);
					if (!stuck) setOpen(false);
				}
			};
			addEventListener('scroll', function () {
				if (!ticking) {
					ticking = true;
					requestAnimationFrame(check);
				}
			}, { passive: true });
			check();
		}
		form.addEventListener('input', function () {
			if (!badge) return;
			const ticked = form.querySelectorAll('input[type="checkbox"]:checked').length;
			badge.textContent = String(ticked);
			badge.hidden = ticked === 0;
		});

		document.addEventListener('map:ready', schedule);

		form.hidden = false;
		form.dispatchEvent(new Event('input'));
		order();
		apply();
	});
})();
