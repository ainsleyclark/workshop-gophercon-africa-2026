// block: threejs — copy to web/assets/js/threejs.js. See threejs.md.
//
// The plumbing every scene shares: a renderer, a camera, sizing, a loop that
// pauses off screen, reduced motion and a fallback. It draws nothing itself.
// A scene calls mount(name, setup) and builds what it likes in setup.

import * as THREE from 'three';

export { THREE };

const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Shared by every scene: -1 to 1 across the window, 0 in the middle.
const pointer = { x: 0, y: 0 };

window.addEventListener(
	'pointermove',
	function (e) {
		pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
		pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
	},
	{ passive: true },
);

export function mount(name, setup) {
	document.querySelectorAll('canvas.three-scene[data-scene="' + name + '"]').forEach(function (canvas) {
		try {
			start(canvas, setup);
		} catch (err) {
			// No WebGL, or the scene threw: the parent's CSS background stays.
			console.warn('threejs: ' + name + ' not shown', err);
		}
	});
}

function start(canvas, setup) {
	const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
	renderer.setClearColor(0x000000, 0);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
	camera.position.z = 5;

	const frame = setup({ THREE, scene, camera, renderer, canvas, pointer, colour, still }) || function () {};

	function colour(prop, fallback) {
		const value = getComputedStyle(canvas).getPropertyValue(prop).trim();
		return new THREE.Color(value || fallback || '#ffffff');
	}

	function draw(time, delta) {
		frame(time, delta);
		renderer.render(scene, camera);
	}

	function resize() {
		const parent = canvas.parentElement;
		const width = parent.clientWidth;
		const height = parent.clientHeight;
		if (!width || !height) return;

		// Capped: past 1.5 the extra pixels cost more than they show.
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		if (still) draw(0, 0);
	}

	new ResizeObserver(resize).observe(canvas.parentElement);
	resize();

	if (still) {
		draw(0, 0);
		canvas.classList.add('is-live');
		return;
	}

	let visible = true;
	new IntersectionObserver(function (entries) {
		visible = entries[0].isIntersecting;
	}).observe(canvas);

	const timer = new THREE.Timer();
	renderer.setAnimationLoop(function (timestamp) {
		timer.update(timestamp);
		if (visible) draw(timer.getElapsed(), timer.getDelta());
	});

	canvas.classList.add('is-live');
}
