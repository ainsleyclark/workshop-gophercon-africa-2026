// block: map — copy to web/assets/js/map.js. See map.md.
//
// Draws every [data-map] on the page with Leaflet, reading its points from
// the JSON the component wrote out. Markers always go on a canvas, since
// the home page has thousands; clusters and heat are opt-in per map and
// used only when their plugin loaded. Without Leaflet the fallback shows.

(function () {
	const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
	const CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
	const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function points(id) {
		const el = document.getElementById(id);
		try {
			return (el && JSON.parse(el.textContent)) || [];
		} catch (err) {
			return [];
		}
	}

	// Built from nodes, never an HTML string: every field here is GBIF's text.
	function popup(point) {
		const root = document.createElement('div');
		root.className = 'map__popup';
		root.appendChild(document.createElement('strong')).textContent = point.title;
		root.appendChild(document.createElement('span')).textContent =
			[point.date, point.place, point.count].filter(Boolean).join(' · ');
		if (point.link && point.link.startsWith('/sightings/')) {
			const link = root.appendChild(document.createElement('a'));
			link.href = point.link;
			link.textContent = 'Open sighting →';
		}
		return root;
	}

	// Colours come from the element's CSS, so the palette lives in one place.
	function colour(el, prop, fallback) {
		return getComputedStyle(el).getPropertyValue(prop).trim() || fallback;
	}

	function init(el) {
		const data = points(el.dataset.map);
		if (!data.length || typeof L === 'undefined') {
			el.classList.add('is-unavailable');
			return;
		}

		const map = L.map(el, {
			preferCanvas: true,
			scrollWheelZoom: false,
			zoomAnimation: !still,
			fadeAnimation: !still,
			markerZoomAnimation: !still,
			worldCopyJump: true,
		});
		L.tileLayer(el.dataset.tiles || TILES, {
			attribution: el.dataset.attribution || CREDIT,
			maxZoom: 18,
			minZoom: 1,
		}).addTo(map);

		const fill = colour(el, '--map-marker', '#c2410c');
		const stroke = colour(el, '--map-marker-stroke', '#fff');
		let layer = null;

		// Draws the given points, replacing whatever was drawn before.
		function draw(shown, fit) {
			if (layer) map.removeLayer(layer);
			layer = 'cluster' in el.dataset && typeof L.markerClusterGroup === 'function'
				? L.markerClusterGroup({ chunkedLoading: true, showCoverageOnHover: false, maxClusterRadius: 50 })
				: L.featureGroup();
			shown.forEach((p) => {
				L.circleMarker([p.lat, p.lng], { radius: 7, weight: 2, color: stroke, fillColor: fill, fillOpacity: 0.9 })
					// A function, so the popup is only built when it opens.
					.bindPopup(() => popup(p))
					.addTo(layer);
			});
			layer.addTo(map);
			if (fit && shown.length) {
				map.fitBounds(L.latLngBounds(shown.map((p) => [p.lat, p.lng])), {
					padding: [32, 32],
					animate: !still,
					maxZoom: Number(el.dataset.maxZoom) || 12,
				});
			}
		}

		draw(data, false);
		map.fitBounds(L.latLngBounds(data.map((p) => [p.lat, p.lng])), {
			padding: [24, 24],
			animate: false,
			maxZoom: Number(el.dataset.maxZoom) || 12,
		});

		// The list's filter tells the map which sightings are showing.
		document.addEventListener('filter:change', (e) => {
			const links = e.detail && e.detail.links;
			if (!links) return;
			draw(links.size === 0 ? [] : data.filter((p) => links.has(p.link)), true);
		});

		// The filter may have run first; ask it to say again what's showing.
		document.dispatchEvent(new CustomEvent('map:ready'));

		// Wheel zoom waits for a click or focus, so the page scrolls past freely.
		map.on('focus', () => map.scrollWheelZoom.enable());
		map.on('blur', () => map.scrollWheelZoom.disable());
	}

	document.querySelectorAll('[data-map]').forEach(init);
})();
