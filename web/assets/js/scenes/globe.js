// A dotted globe of where animals were seen. Drag to spin it, click near a
// glowing dot to pick that country; app.js narrows the sightings to match.

import { mount } from '/assets/js/threejs.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const TOPOJSON = 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';
const RADIUS = 1.6;
const NEAR = Math.cos((12 * Math.PI) / 180);

const data = document.getElementById('globe-data');
const points = data ? JSON.parse(data.textContent) || [] : [];

function toVector(THREE, lat, lng, r) {
	const la = (lat * Math.PI) / 180;
	const ln = (lng * Math.PI) / 180;
	return new THREE.Vector3(r * Math.cos(la) * Math.sin(ln), r * Math.sin(la), r * Math.cos(la) * Math.cos(ln));
}

function dotTexture(THREE) {
	const c = document.createElement('canvas');
	c.width = c.height = 64;
	const g = c.getContext('2d');
	g.beginPath();
	g.arc(32, 32, 28, 0, Math.PI * 2);
	g.fillStyle = '#fff';
	g.fill();
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

function inRing(lng, lat, ring) {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function inPolygon(lng, lat, rings) {
	if (!inRing(lng, lat, rings[0])) return false;
	for (let i = 1; i < rings.length; i++) if (inRing(lng, lat, rings[i])) return false;
	return true;
}

// Each country as polygons with a bounding box, so most tests are skipped cheaply.
function shapes(features) {
	return features.map(function (f) {
		const g = f.geometry || { coordinates: [] };
		const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
		return polys.map(function (rings) {
			let minX = 180, minY = 90, maxX = -180, maxY = -90;
			rings[0].forEach(function ([x, y]) {
				minX = Math.min(minX, x); maxX = Math.max(maxX, x);
				minY = Math.min(minY, y); maxY = Math.max(maxY, y);
			});
			return { name: (f.properties && f.properties.name) || '', rings, minX, minY, maxX, maxY };
		});
	}).flat();
}

function countryAt(polys, lng, lat) {
	for (const p of polys) {
		if (lng < p.minX || lng > p.maxX || lat < p.minY || lat > p.maxY) continue;
		if (inPolygon(lng, lat, p.rings)) return p.name;
	}
	return '';
}

mount('globe', function ({ THREE, scene, camera, renderer, canvas, colour, still }) {
	const sprite = dotTexture(THREE);
	const globe = new THREE.Group();
	scene.add(globe);

	const seaMaterial = new THREE.MeshBasicMaterial({ color: colour('--globe-sea', '#3d4a22') });
	globe.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 64, 64), seaMaterial));

	const glowMaterial = new THREE.MeshBasicMaterial({
		color: colour('--globe-glow', '#a3b567'),
		transparent: true,
		opacity: 0.14,
		side: THREE.BackSide,
	});
	globe.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.08, 48, 48), glowMaterial));

	const landMaterial = new THREE.PointsMaterial({
		color: colour('--globe-land', '#e8e2d4'),
		size: 0.026,
		map: sprite,
		alphaTest: 0.5,
		transparent: true,
	});

	// The sightings, a little above the land so they sit on top.
	const positions = new Float32Array(points.length * 3);
	const colours = new Float32Array(points.length * 3);
	const units = points.map(function (p, i) {
		toVector(THREE, p.lat, p.lng, RADIUS * 1.012).toArray(positions, i * 3);
		return toVector(THREE, p.lat, p.lng, 1);
	});
	const sightGeometry = new THREE.BufferGeometry();
	sightGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	sightGeometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
	const sightMaterial = new THREE.PointsMaterial({
		size: 0.085,
		map: sprite,
		alphaTest: 0.5,
		transparent: true,
		vertexColors: true,
	});
	globe.add(new THREE.Points(sightGeometry, sightMaterial));

	let selected = '';
	let dot = colour('--globe-dot', '#e9f5a8');
	let dim = colour('--globe-dim', '#7d8a55');
	function paint() {
		points.forEach(function (p, i) {
			const on = !selected || (p.country || '').toLowerCase() === selected;
			(on ? dot : dim).toArray(colours, i * 3);
		});
		sightGeometry.attributes.color.needsUpdate = true;
	}
	paint();

	let polys = [];
	Promise.all([import(TOPOJSON), fetch(ATLAS).then((r) => r.json())])
		.then(function ([topojson, atlas]) {
			polys = shapes(topojson.feature(atlas, atlas.objects.countries).features);
			const land = [];
			const step = 1.5;
			for (let lat = -84; lat <= 84; lat += step) {
				const around = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / step));
				for (let k = 0; k < around; k++) {
					const lng = -180 + (k * 360) / around;
					if (countryAt(polys, lng, lat)) land.push(toVector(THREE, lat, lng, RADIUS * 1.003));
				}
			}
			globe.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(land), landMaterial));
			if (still) renderer.render(scene, camera);
		})
		.catch(function (err) {
			console.warn('globe: no coastlines', err);
		});

	let distance = 5.4;
	camera.position.copy(toVector(THREE, 12, 20, distance));
	camera.lookAt(0, 0, 0);

	const controls = new OrbitControls(camera, canvas);
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.enableDamping = true;
	controls.rotateSpeed = 0.5;
	controls.autoRotate = !still;
	controls.autoRotateSpeed = 0.35;

	// Click without dragging: pick the country under the pointer.
	const ray = new THREE.Raycaster();
	const ndc = new THREE.Vector2();
	const sphere = new THREE.Sphere(new THREE.Vector3(), RADIUS);
	let down = null;
	let target = null;

	canvas.addEventListener('pointerdown', function (e) {
		down = { x: e.clientX, y: e.clientY };
		target = null;
	});
	canvas.addEventListener('pointerup', function (e) {
		if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
		const rect = canvas.getBoundingClientRect();
		ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
		ray.setFromCamera(ndc, camera);
		const hit = ray.ray.intersectSphere(sphere, new THREE.Vector3());
		if (!hit) return;

		const unit = hit.clone().normalize();
		const lat = (Math.asin(unit.y) * 180) / Math.PI;
		const lng = (Math.atan2(unit.x, unit.z) * 180) / Math.PI;

		let best = -1, bestDot = NEAR;
		units.forEach(function (u, i) {
			const d = u.dot(unit);
			if (d > bestDot) { bestDot = d; best = i; }
		});
		const country = best >= 0 ? points[best].country : countryAt(polys, lng, lat);
		if (!country) return;

		target = (best >= 0 ? units[best] : unit).clone();
		controls.autoRotate = false;
		syncSpin();
		document.dispatchEvent(new CustomEvent('globe:pick', { detail: { country } }));
	});

	document.addEventListener('sightings:filter', function (e) {
		selected = ((e.detail && e.detail.country) || '').toLowerCase();
		paint();
		// Turn to face the country's sightings, wherever the pick came from.
		const centre = new THREE.Vector3();
		points.forEach(function (p, i) {
			if ((p.country || '').toLowerCase() === selected) centre.add(units[i]);
		});
		if (selected && centre.lengthSq() > 0) {
			target = centre.normalize();
			controls.autoRotate = false;
			syncSpin();
			if (still) {
				camera.position.copy(target).multiplyScalar(distance);
				camera.lookAt(0, 0, 0);
			}
		}
		if (still) renderer.render(scene, camera);
	});

	document.addEventListener('theme:change', function () {
		seaMaterial.color.copy(colour('--globe-sea', '#3d4a22'));
		glowMaterial.color.copy(colour('--globe-glow', '#a3b567'));
		landMaterial.color.copy(colour('--globe-land', '#e8e2d4'));
		dot = colour('--globe-dot', '#e9f5a8');
		dim = colour('--globe-dim', '#7d8a55');
		paint();
		if (still) renderer.render(scene, camera);
	});

	const spin = document.querySelector('[data-globe="spin"]');
	function syncSpin() {
		if (!spin) return;
		spin.setAttribute('aria-pressed', String(!controls.autoRotate));
		spin.setAttribute('aria-label', controls.autoRotate ? 'Pause spinning' : 'Start spinning');
	}
	document.querySelectorAll('[data-globe]').forEach(function (btn) {
		btn.addEventListener('click', function () {
			const action = btn.dataset.globe;
			if (action === 'in') distance = Math.max(3, distance - 0.6);
			if (action === 'out') distance = Math.min(8, distance + 0.6);
			if (action === 'spin') controls.autoRotate = !controls.autoRotate && !still;
			syncSpin();
			if (still) {
				camera.position.setLength(distance);
				renderer.render(scene, camera);
			}
		});
	});

	return function () {
		if (target) {
			const goal = target.clone().multiplyScalar(distance);
			camera.position.lerp(goal, 0.08);
			if (camera.position.distanceTo(goal) < 0.01) target = null;
		}
		camera.position.setLength(THREE.MathUtils.lerp(camera.position.length(), distance, 0.1));
		controls.update();
	};
});
