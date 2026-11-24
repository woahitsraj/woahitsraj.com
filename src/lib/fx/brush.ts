// Selected text gets a stroke of paint, not a box. One smooth stroke for each line of text.
const noise = (i: number, seed: number) => {
	const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
	return v - Math.floor(v) - 0.5;
};
// Smooth noise: neighbouring values blend, so edges curve and never step.
const wave = (x: number, seed: number) => {
	const i = Math.floor(x);
	const f = x - i;
	const u = f * f * (3 - 2 * f);
	return noise(i, seed) * (1 - u) + noise(i + 1, seed) * u;
};

export function brushSelection() {
	const root = document.documentElement;
	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.className = 'brush';
	document.body.append(canvas);
	const bx = canvas.getContext('2d')!;
	let queued = 0;

	const paint = () => {
		queued = 0;
		const dpr = Math.min(2, devicePixelRatio);
		const W = innerWidth;
		const H = innerHeight;
		if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
			canvas.width = W * dpr;
			canvas.height = H * dpr;
		}
		bx.setTransform(dpr, 0, 0, dpr, 0, 0);
		bx.clearRect(0, 0, W, H);
		const sel = getSelection();
		if (!sel?.rangeCount || sel.isCollapsed) return;
		// Ask each text node for its boxes: a range also reports the full-width boxes of whole elements.
		const range = sel.getRangeAt(0);
		const rects: DOMRect[] = [];
		const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
		for (
			let n = (
				walker.currentNode.nodeType === 3 ? walker.currentNode : walker.nextNode()
			) as Text | null;
			n;
			n = walker.nextNode() as Text | null
		) {
			if (!range.intersectsNode(n) || !n.data.trim()) continue;
			const part = new Range();
			part.setStart(n, n === range.startContainer ? range.startOffset : 0);
			part.setEnd(n, n === range.endContainer ? range.endOffset : n.length);
			rects.push(...part.getClientRects());
		}
		const lines: { mid: number; left: number; right: number; h: number }[] = [];
		for (const r of rects) {
			if (r.width < 2 || r.height < 6 || r.bottom < 0 || r.top > H) continue;
			const line = lines.find((l) => Math.abs(l.mid - (r.top + r.height / 2)) < r.height * 0.4);
			if (line) {
				line.left = Math.min(line.left, r.left);
				line.right = Math.max(line.right, r.right);
				line.h = Math.max(line.h, r.height);
			} else lines.push({ mid: r.top + r.height / 2, left: r.left, right: r.right, h: r.height });
		}
		bx.fillStyle = getComputedStyle(root).getPropertyValue('--site-accent-2').trim();
		for (const l of lines) {
			// Display type gets a narrower swipe through its middle; body text is covered.
			const big = l.h > 70;
			const seed = Math.round(l.mid + scrollY);
			const half = l.h * (big ? 0.2 : 0.47);
			const capIn = l.h * (big ? 0.1 : 0.3);
			const capOut = l.h * (big ? 0.35 : 0.7);
			const x0 = l.left - capIn * 0.8;
			const x1 = l.right + capOut * 0.75;
			const tilt = noise(1, seed) * l.h * (big ? 0.04 : 0.1);
			const mid = (x: number) =>
				l.mid +
				l.h * (big ? 0.1 : 0.05) +
				(tilt * (x - x0)) / (x1 - x0) +
				wave(x / (l.h * 3), seed) * l.h * 0.07;
			// Pressure: the brush lands, runs, and lifts off. The edges breathe a little on the way.
			const press = (x: number) =>
				Math.sqrt(Math.min(1, Math.max(0, (x - x0) / capIn))) *
				Math.min(1, Math.max(0, (x1 - x) / capOut)) ** 0.55 *
				(1 + wave(x / (l.h * 1.6), seed + 2) * 0.22);
			bx.beginPath();
			bx.moveTo(x0, mid(x0));
			for (let x = x0; x <= x1; x += 3)
				bx.lineTo(x, mid(x) - half * press(x) + wave(x / (l.h * 0.7), seed + 3) * l.h * 0.035);
			for (let x = x1; x >= x0; x -= 3)
				bx.lineTo(x, mid(x) + half * press(x) + wave(x / (l.h * 0.7), seed + 4) * l.h * 0.035);
			bx.closePath();
			// A few loose hairs trail off where the brush lifts.
			for (let h = 0; h < 4; h++) {
				const from = x1 - capOut * (0.9 + (noise(h, seed + 5) + 0.5) * 0.5);
				const len = capOut * (0.9 + (noise(h, seed + 6) + 0.5) * 1.1);
				const y = mid(from) + (noise(h, seed + 7) * 1.5 + (h - 1.5) * 0.3) * half * 0.75;
				const w = half * (0.07 + (noise(h, seed + 8) + 0.5) * 0.1);
				const lift = noise(h, seed + 9) * l.h * 0.12;
				bx.moveTo(from, y - w);
				bx.quadraticCurveTo(from + len * 0.5, y - w * 0.9 + lift * 0.4, from + len, y + lift);
				bx.quadraticCurveTo(from + len * 0.5, y + w * 0.9 + lift * 0.4, from, y + w);
				bx.closePath();
			}
			bx.fill('nonzero');
		}
	};
	const queue = () => (queued ||= requestAnimationFrame(paint));
	const watch = new MutationObserver(queue);
	watch.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-season'] });
	root.classList.add('brushed');
	document.addEventListener('selectionchange', queue);
	addEventListener('scroll', queue, { passive: true });
	addEventListener('resize', queue);

	return () => {
		cancelAnimationFrame(queued);
		watch.disconnect();
		root.classList.remove('brushed');
		document.removeEventListener('selectionchange', queue);
		removeEventListener('scroll', queue);
		removeEventListener('resize', queue);
		canvas.remove();
	};
}
