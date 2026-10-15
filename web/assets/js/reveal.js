// block: reveal — copy to web/assets/js/reveal.js. See reveal.md.
//
// Shows each .reveal once it scrolls into view. The hidden state only
// applies under html.js, which the layout sets before the page paints.

(function () {
	const items = document.querySelectorAll('.reveal');

	// Old browser: show everything rather than leave it hidden.
	if (!('IntersectionObserver' in window)) {
		items.forEach(function (el) {
			el.classList.add('is-visible');
		});
		return;
	}

	const observer = new IntersectionObserver(
		function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;
				// A block taller than the screen may never be 10% visible, so it
				// goes as soon as it peeks in.
				const tall = entry.boundingClientRect.height > window.innerHeight;
				if (entry.intersectionRatio < 0.1 && !tall) return;
				entry.target.classList.add('is-visible');
				// Once is enough: fading out again on the way back up is noise.
				observer.unobserve(entry.target);
			});
		},
		// Thresholds rather than a shrunken root margin, so something at the
		// very bottom of the page still counts once it's on screen.
		{ threshold: [0, 0.1] },
	);

	items.forEach(function (el) {
		observer.observe(el);
	});
})();
