// block: lightbox — copy to web/assets/js/lightbox.js. See lightbox.md.
//
// One click listener for the whole page opens any a[data-lightbox] in the
// layout's #lightbox dialog. Without this script the links still open the
// photo on its own.

(function () {
	const dialog = document.getElementById('lightbox');
	if (!dialog || typeof dialog.showModal !== 'function') return;

	const img = dialog.querySelector('.lightbox__image');
	const caption = dialog.querySelector('.lightbox__caption');

	document.addEventListener('click', function (e) {
		const link = e.target.closest('a[data-lightbox]');
		// Let new-tab clicks through, and only show web images: the URL is GBIF's.
		if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		if (!/^https?:$/.test(new URL(link.href, location.href).protocol)) return;
		e.preventDefault();

		const thumb = link.querySelector('img');
		img.src = link.href;
		img.alt = thumb ? thumb.alt : '';
		// textContent, never innerHTML: captions are untrusted GBIF text.
		caption.textContent = link.dataset.caption || '';
		caption.hidden = caption.textContent === '';
		dialog.showModal();
	});

	// A click on the backdrop lands on the dialog itself; one on the photo doesn't.
	dialog.addEventListener('click', function (e) {
		if (e.target === dialog) dialog.close();
	});

	dialog.addEventListener('close', function () {
		img.removeAttribute('src');
	});
})();
