// A halftone field: plates of dots sampled from pixels, which the pointer can push.
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number) => Math.max(0, Math.min(1, v));

export interface DotLayer {
	color: string;
	angle: number;
	gain: number;
	dx?: number;
	dy?: number;
	split?: number;
}

interface Options {
	source: () => Promise<ImageData>;
	layers: DotLayer[];
	// Dot spacing for a field of the given width, in CSS pixels.
	cell: (width: number) => number;
	blend: GlobalCompositeOperation;
	// Dots left by an earlier field: the new letters form out of them.
	from?: Float32Array[];
	// How long the dots take to come apart and form the new letters, in milliseconds.
	reform?: number;
	// Extra room round the heading, in CSS pixels, so dots that fly out are not cut off.
	pad?: number;
	radius?: number;
	force?: number;
	split?: number;
}

export function dotField(canvas: HTMLCanvasElement, options: Options) {
	const ctx = canvas.getContext('2d')!;
	const dpr = Math.min(2, devicePixelRatio);
	const cfg = {
		pad: 0,
		radius: 120,
		force: 3,
		drag: 0.12,
		spring: 0.07,
		damp: 0.84,
		split: 0,
		...options
	};
	const ptr = { x: -1e5, y: -1e5, vx: 0, vy: 0 };
	const split = { x: 0, y: 0 };
	let plates: Float32Array[] = [];
	let W = 0;
	let H = 0;
	let raf = 0;
	let dead = false;
	// While the dots fly from an old heading to a new one, they follow a timed path, not the spring.
	// For each dot: start x, start y, how far it strays on the way (x, y), start radius.
	let flight: { start: number; ms: number; paths: Float32Array[] } | null = null;
	let loose = false;

	// Each dot: home x, home y, x, y, vx, vy, radius, wanted radius. Ink is read from the alpha channel.
	const STRIDE = 8;
	const build = (src: ImageData, morph: boolean) => {
		const R = Math.hypot(W, H) / 2;
		const cell = cfg.cell(W);
		plates = cfg.layers.map((L, n) => {
			const a = (L.angle * Math.PI) / 180;
			const cos = Math.cos(a);
			const sin = Math.sin(a);
			const homes: number[] = [];
			for (let v = -R; v <= R; v += cell)
				for (let u = -R; u <= R; u += cell) {
					const x = W / 2 + u * cos - v * sin;
					const y = H / 2 + u * sin + v * cos;
					if (x < 0 || y < 0 || x >= W || y >= H) continue;
					const sx = Math.min(src.width - 1, ((x / W) * src.width) | 0);
					const sy = Math.min(src.height - 1, ((y / H) * src.height) | 0);
					const r = Math.sqrt(clamp(src.data[(sy * src.width + sx) * 4 + 3] / 255)) * cell * L.gain;
					if (r >= 0.45) homes.push(x, y, r);
				}
			const count = homes.length / 3;
			const old = morph ? (plates[n] ?? cfg.from?.[n]) : undefined;
			const before = old ? old.length / STRIDE : 0;
			if (!before || !count) {
				const p = new Float32Array(count * STRIDE);
				for (let i = 0; i < count; i++)
					p.set(
						[
							homes[i * 3],
							homes[i * 3 + 1],
							homes[i * 3],
							homes[i * 3 + 1],
							0,
							0,
							homes[i * 3 + 2],
							homes[i * 3 + 2]
						],
						i * STRIDE
					);
				return p;
			}
			// Pair old dots with new places from left to right, so the word flows into the next one.
			// Spare dots shrink away; missing ones split off from a neighbour.
			const byX = (get: (i: number) => number, length: number) =>
				Array.from({ length }, (_, i) => i).sort((i, j) => get(i) - get(j));
			const places = byX((i) => homes[i * 3], count);
			const dots = byX((i) => old![i * STRIDE + 2], before);
			const total = Math.max(count, before);
			const p = new Float32Array(total * STRIDE);
			for (let k = 0; k < total; k++) {
				const place = places[Math.min(count - 1, Math.floor((k * count) / total))] * 3;
				const dot = dots[Math.min(before - 1, Math.floor((k * before) / total))] * STRIDE;
				const spare =
					before > count &&
					k > 0 &&
					Math.floor((k * count) / total) === Math.floor(((k - 1) * count) / total);
				const split =
					count > before &&
					k > 0 &&
					Math.floor((k * before) / total) === Math.floor(((k - 1) * before) / total);
				p.set(
					[
						homes[place],
						homes[place + 1],
						old![dot + 2],
						old![dot + 3],
						old![dot + 4],
						old![dot + 5],
						split ? 0 : old![dot + 6],
						spare ? 0 : homes[place + 2]
					],
					k * STRIDE
				);
			}
			return p;
		});
		if (cfg.from) {
			const stray = Math.max(40, W * 0.09);
			flight = {
				start: performance.now(),
				ms: cfg.reform ?? 790,
				paths: plates.map((p) => {
					const path = new Float32Array((p.length / STRIDE) * 5);
					for (let i = 0, j = 0; i < p.length; i += STRIDE, j += 5) {
						const angle = Math.random() * 6.2832;
						const far = stray * (0.25 + Math.random());
						path.set(
							[p[i + 2], p[i + 3], Math.cos(angle) * far, Math.sin(angle) * far, p[i + 6]],
							j
						);
					}
					return path;
				})
			};
		}
		cfg.from = undefined;
		loose = false;
		wake();
	};

	const frame = () => {
		raf = 0;
		if (dead) return;
		let busy = false;
		const { radius, force, drag, spring, damp } = cfg;
		const r2 = radius * radius;
		ptr.vx *= 0.8;
		ptr.vy *= 0.8;
		split.x += (ptr.vx * cfg.split - split.x) * 0.25;
		split.y += (ptr.vy * cfg.split - split.y) * 0.25;
		if (Math.abs(split.x) + Math.abs(split.y) > 0.05) busy = true;

		ctx.setTransform(dpr, 0, 0, dpr, cfg.pad * dpr, cfg.pad * dpr);
		ctx.clearRect(-cfg.pad, -cfg.pad, W + cfg.pad * 2, H + cfg.pad * 2);
		ctx.globalCompositeOperation = cfg.blend;
		// The flight: every dot leaves its place, strays, and lands on its new place when the time is up.
		const u = flight ? Math.min(1, (performance.now() - flight.start) / flight.ms) : 1;
		const ease = u * u * (3 - 2 * u);
		const out = Math.sin(Math.PI * u);
		plates.forEach((p, n) => {
			const L = cfg.layers[n];
			const path = flight?.paths[n];
			for (let i = 0, j = 0; path && i < p.length; i += STRIDE, j += 5) {
				p[i + 2] = path[j] + (p[i] - path[j]) * ease + path[j + 2] * out;
				p[i + 3] = path[j + 1] + (p[i + 1] - path[j + 1]) * ease + path[j + 3] * out;
				p[i + 4] = p[i + 5] = 0;
				p[i + 6] = path[j + 4] + (p[i + 7] - path[j + 4]) * ease;
			}
			for (let i = 0; !path && i < p.length; i += STRIDE) {
				let x = p[i + 2];
				let y = p[i + 3];
				let vx = p[i + 4];
				let vy = p[i + 5];
				const dx = x - ptr.x;
				const dy = y - ptr.y;
				const d2 = dx * dx + dy * dy;
				if (d2 < r2) {
					const d = Math.sqrt(d2) + 0.01;
					const k = 1 - d / radius;
					vx += (dx / d) * k * k * force + ptr.vx * drag * k;
					vy += (dy / d) * k * k * force + ptr.vy * drag * k;
				}
				// Loose dots drift where they were thrown; the others are pulled home.
				vx = loose ? vx * 0.95 : (vx + (p[i] - x) * spring) * damp;
				vy = loose ? vy * 0.95 : (vy + (p[i + 1] - y) * spring) * damp;
				p[i + 2] = x += vx;
				p[i + 3] = y += vy;
				p[i + 4] = vx;
				p[i + 5] = vy;
				p[i + 6] += (p[i + 7] - p[i + 6]) * 0.16;
				if (
					!busy &&
					Math.abs(vx) +
						Math.abs(vy) +
						Math.abs(p[i] - x) +
						Math.abs(p[i + 1] - y) +
						Math.abs(p[i + 7] - p[i + 6]) >
						0.08
				)
					busy = true;
			}
			const ox = (L.dx ?? 0) + split.x * (L.split ?? 0);
			const oy = (L.dy ?? 0) + split.y * (L.split ?? 0);
			ctx.fillStyle = L.color;
			ctx.beginPath();
			for (let i = 0; i < p.length; i += STRIDE) {
				if (p[i + 6] < 0.3) continue;
				ctx.moveTo(p[i + 2] + ox + p[i + 6], p[i + 3] + oy);
				ctx.arc(p[i + 2] + ox, p[i + 3] + oy, p[i + 6], 0, 6.2832);
			}
			ctx.fill();
		});
		if (flight) {
			busy = true;
			if (u >= 1) flight = null;
		}
		if (busy && !still()) wake();
	};
	const wake = () => {
		if (!dead) raf ||= requestAnimationFrame(frame);
	};

	const rebuild = async () => {
		const w = canvas.clientWidth - cfg.pad * 2;
		const h = canvas.clientHeight - cfg.pad * 2;
		if (w <= 0 || h <= 0 || dead) return;
		// After a resize the old places mean nothing, so the dots are set fresh.
		const resized = W !== 0 && (w !== W || h !== H);
		if (w !== W || h !== H) {
			W = w;
			H = h;
			canvas.width = (W + cfg.pad * 2) * dpr;
			canvas.height = (H + cfg.pad * 2) * dpr;
		}
		const src = await cfg.source();
		if (!dead) build(src, !resized);
	};
	const observer = new ResizeObserver(() => {
		if (canvas.clientWidth - cfg.pad * 2 !== W || canvas.clientHeight - cfg.pad * 2 !== H)
			void rebuild();
	});
	observer.observe(canvas);

	// Dots handed over from the last heading are drawn at once, still drifting, so there is no
	// empty frame while the new heading is read.
	if (cfg.from && canvas.clientWidth > cfg.pad * 2) {
		W = canvas.clientWidth - cfg.pad * 2;
		H = canvas.clientHeight - cfg.pad * 2;
		canvas.width = (W + cfg.pad * 2) * dpr;
		canvas.height = (H + cfg.pad * 2) * dpr;
		plates = cfg.from.map((p) => p.slice());
		loose = true;
		frame();
	}

	const move = (e: PointerEvent) => {
		const b = canvas.getBoundingClientRect();
		const x = e.clientX - b.left - cfg.pad;
		const y = e.clientY - b.top - cfg.pad;
		if (ptr.x > -1e4) {
			ptr.vx = x - ptr.x;
			ptr.vy = y - ptr.y;
		}
		ptr.x = x;
		ptr.y = y;
		if (x > -cfg.radius && y > -cfg.radius && x < W + cfg.radius && y < H + cfg.radius) wake();
	};
	const leave = () => (ptr.x = ptr.y = -1e5);
	if (!still()) {
		addEventListener('pointermove', move);
		document.addEventListener('pointerleave', leave);
	}

	return {
		rebuild,
		restyle(blend: GlobalCompositeOperation, colors: string[]) {
			cfg.blend = blend;
			cfg.layers.forEach((l, i) => (l.color = colors[i]));
			wake();
		},
		// The dots as they are now, without the ones that are shrinking away.
		// Throw every dot off its place. The heading comes apart and stays apart.
		loosen() {
			if (loose || still()) return;
			loose = true;
			const push = Math.max(3, W * 0.006);
			for (const p of plates)
				for (let i = 0; i < p.length; i += STRIDE) {
					p[i + 4] += (Math.random() - 0.5) * push * 2;
					p[i + 5] += (Math.random() - 0.5) * push * 2;
				}
			wake();
		},
		snapshot: () => plates.map((p) => p.filter((_, i) => p[i - (i % STRIDE) + 7] > 0)),
		destroy() {
			dead = true;
			cancelAnimationFrame(raf);
			observer.disconnect();
			removeEventListener('pointermove', move);
			document.removeEventListener('pointerleave', leave);
		}
	};
}
