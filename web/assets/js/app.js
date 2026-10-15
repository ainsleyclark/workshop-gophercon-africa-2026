/*
 * Progressive enhancement for Nyika. Everything here is optional: the
 * hero's rail, the filters and "load more" are all plain links and forms
 * that work without it.
 *
 * Listeners are delegated from the document and read their state from
 * the DOM, so they keep working after HTMX swaps or restores a page.
 */
(function () {
	"use strict";

	// Hero ---------------------------------------------------------------

	function heroState(hero) {
		var slides = Array.prototype.slice.call(hero.querySelectorAll("[data-slide]"));
		var current = slides.findIndex(function (s) { return !s.hidden; });
		return { slides: slides, current: Math.max(current, 0) };
	}

	function showSlide(hero, index) {
		var state = heroState(hero);
		var n = state.slides.length;
		if (n < 2) return;

		var next = ((index % n) + n) % n;
		if (next === state.current) return;

		state.slides[state.current].hidden = true;
		state.slides[next].hidden = false;

		var thumbs = hero.querySelectorAll("[data-go]");
		thumbs.forEach(function (t, i) {
			if (i === next) t.setAttribute("aria-current", "true");
			else t.removeAttribute("aria-current");
		});
		hero.querySelectorAll("[data-number]").forEach(function (li, i) {
			li.classList.toggle("is-active", i === next);
		});

		// The arrows stay real links to the neighbours, for opening in a tab.
		var prev = hero.querySelector('[data-step="-1"]');
		var after = hero.querySelector('[data-step="1"]');
		if (prev) prev.href = thumbs[(next - 1 + n) % n].href;
		if (after) after.href = thumbs[(next + 1) % n].href;

		var backdrop = document.getElementById("backdrop");
		var photo = state.slides[next].dataset.backdrop;
		if (backdrop && photo) backdrop.src = photo;

		history.replaceState(history.state, "", thumbs[next].getAttribute("href").replace("#hero", ""));
		preload(state.slides[(next + 1) % n]);
	}

	// preload fetches a slide's photo before it's shown, so moving on
	// doesn't wait on the network.
	function preload(slide) {
		var img = slide && slide.querySelector(".hero__media img");
		if (img && img.loading === "lazy") img.loading = "eager";
	}

	document.addEventListener("click", function (e) {
		var hero = e.target.closest("[data-hero]");
		if (!hero || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

		var go = e.target.closest("[data-go]");
		var step = e.target.closest("[data-step]");
		if (!go && !step) return;

		e.preventDefault();
		var index = go ? Number(go.dataset.go) : heroState(hero).current + Number(step.dataset.step);
		showSlide(hero, index);
	});

	// Arrow keys move through the rail, as they would a list of tabs.
	document.addEventListener("keydown", function (e) {
		var rail = e.target.closest && e.target.closest(".rail");
		if (!rail) return;

		var hero = rail.closest("[data-hero]");
		var state = heroState(hero);
		var to = {
			ArrowDown: state.current + 1,
			ArrowRight: state.current + 1,
			ArrowUp: state.current - 1,
			ArrowLeft: state.current - 1,
			Home: 0,
			End: state.slides.length - 1
		}[e.key];
		if (to === undefined) return;

		e.preventDefault();
		showSlide(hero, to);
		var thumbs = hero.querySelectorAll("[data-go]");
		thumbs[heroState(hero).current].focus();
	});

	// Map ----------------------------------------------------------------

	// OpenStreetMap's own tiles need no key; CSS warms them to the palette.
	var TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
	var TILES_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

	// Kenya, for when there's nothing to fit the map to.
	var KENYA = [[-4.9, 33.9], [5.1, 41.9]];

	function initMap(el) {
		if (!window.L || el.classList.contains("is-live")) return;

		var source = document.getElementById(el.dataset.map);
		var points = [];
		try {
			points = JSON.parse(source ? source.textContent : "[]") || [];
		} catch (err) {
			return;
		}

		el.textContent = "";
		el.classList.add("is-live");

		var map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.5 });
		L.tileLayer(TILES, { attribution: TILES_CREDIT, maxZoom: 17 }).addTo(map);

		var bounds = [];
		points.forEach(function (p) {
			var marker = L.circleMarker([p.lat, p.lng], {
				radius: 7,
				weight: 2,
				color: "#2B2622",
				fillColor: "#C99A2E",
				fillOpacity: 0.9
			});
			// Built from text nodes, never markup, since the place names
			// come from the records' publishers.
			var popup = document.createElement("div");
			var title = document.createElement("strong");
			title.textContent = p.place;
			popup.appendChild(title);
			popup.appendChild(document.createTextNode(p.date));
			marker.bindPopup(popup);
			marker.addTo(map);
			bounds.push([p.lat, p.lng]);
		});

		if (bounds.length > 1) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 11 });
		else if (bounds.length === 1) map.setView(bounds[0], 10);
		else map.fitBounds(KENYA);
	}

	function initMaps(root) {
		(root || document).querySelectorAll("[data-map]").forEach(initMap);
	}

	// HTMX ---------------------------------------------------------------

	// A request that never reached the server has no response to swap, so
	// say so in the results rather than leave the old ones looking current.
	document.addEventListener("htmx:sendError", function () {
		var results = document.getElementById("results");
		if (!results) return;
		results.innerHTML =
			'<div class="state state--error" role="alert">' +
			'<h3 class="state__title">Out of signal</h3>' +
			"<p>We couldn't reach the atlas. Check your connection and try again.</p>" +
			"</div>";
	});

	document.addEventListener("htmx:load", function (e) {
		initMaps(e.target);
	});

	function ready() {
		initMaps();
		if (location.hash === "#q") {
			var q = document.getElementById("q");
			if (q) q.focus();
		}
		var hero = document.querySelector("[data-hero]");
		if (hero) {
			var state = heroState(hero);
			preload(state.slides[(state.current + 1) % state.slides.length]);
		}
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
	else ready();
})();
