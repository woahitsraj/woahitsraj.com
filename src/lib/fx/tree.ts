// Shadows of a tree and a window on the page. Four layers of branches sit at growing distance from
// the sheet: the near ones are sharp, the far ones soft. A fast pointer raises a gust of wind.
// The tree follows the season: blossom in spring, full leaf in summer, maple leaves that fall in
// autumn, bare branches and snow in winter.
import type { Season } from '$lib/season.svelte';

interface Kind {
	leaves: number;
	size: [number, number];
	width: [number, number];
	maple?: boolean;
	blossom: number;
	fork: number;
	depth: number;
	falling: number;
	flake?: 'petal' | 'leaf' | 'snow';
}
const KINDS: Record<Season, Kind> = {
	spring: {
		leaves: 0.5,
		size: [0.028, 0.045],
		width: [0.28, 0.4],
		blossom: 0.55,
		fork: 0.34,
		depth: 2,
		falling: 34,
		flake: 'petal'
	},
	summer: {
		leaves: 1,
		size: [0.05, 0.085],
		width: [0.2, 0.34],
		blossom: 0,
		fork: 0.3,
		depth: 2,
		falling: 0
	},
	autumn: {
		leaves: 0.34,
		size: [0.06, 0.095],
		width: [0, 0],
		maple: true,
		blossom: 0,
		fork: 0.3,
		depth: 2,
		falling: 26,
		flake: 'leaf'
	},
	winter: {
		leaves: 0,
		size: [0, 0],
		width: [0, 0],
		blossom: 0,
		fork: 0.5,
		depth: 3,
		falling: 34,
		flake: 'snow'
	}
};

// Half of a maple leaf, stem at the origin, tip at (1, 0). The other half mirrors it.
const HALF: [number, number][] = [
	[1, 0],
	[0.8, 0.07],
	[0.84, 0.16],
	[0.66, 0.13],
	[0.62, 0.19],
	[0.78, 0.46],
	[0.6, 0.4],
	[0.58, 0.5],
	[0.44, 0.3],
	[0.36, 0.52],
	[0.3, 0.4],
	[0.22, 0.44],
	[0.24, 0.1],
	[0.22, 0.015],
	[0, 0.015]
];
const MAPLE = [
	...HALF,
	...HALF.slice(1)
		.reverse()
		.map(([u, v]) => [u, -v] as [number, number])
];
const maple = (path: Path2D, x: number, y: number, a: number, len: number) => {
	const c = Math.cos(a) * len;
	const n = Math.sin(a) * len;
	MAPLE.forEach(([u, v], i) => path[i ? 'lineTo' : 'moveTo'](x + c * u - n * v, y + n * u + c * v));
	path.closePath();
};

// Petals, leaves or snow in the air, kept when the shell is rebuilt so they do not jump.
let kept: {
	season: Season;
	flakes: { x: number; y: number; fall: number; phase: number; size: number; layer: number }[];
} | null = null;

const BLUR = [0.0025, 0.007, 0.016, 0.03];
const ALPHA = [0.6, 0.5, 0.4, 0.32];
const SCALE = 0.4;

export function treeShadows(host: HTMLElement, season: Season, tint: string, seed = 31) {
	const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
	let s = seed;
	const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
	const between = (lo: number, hi: number) => lo + (hi - lo) * rnd();
	let kind = KINDS[season];
	let boughs: {
		layer: number;
		x: number;
		y: number;
		path: Path2D;
		phase: number;
		weight: number;
	}[] = [];
	let flakes: { x: number; y: number; fall: number; phase: number; size: number; layer: number }[] =
		[];
	const maplePath = new Path2D();
	maple(maplePath, -0.5, 0, 0, 1);

	const leaf = (path: Path2D, x: number, y: number, a: number, len: number, wide: number) => {
		if (kind.maple) return maple(path, x, y, a, len * 1.25);
		const w = len * wide;
		const c = Math.cos(a);
		const n = Math.sin(a);
		const at = (u: number, v: number): [number, number] => [x + c * u - n * v, y + n * u + c * v];
		path.moveTo(x, y);
		path.quadraticCurveTo(...at(len * 0.42, -w), ...at(len, 0));
		path.quadraticCurveTo(...at(len * 0.42, w), x, y);
	};
	const blossom = (path: Path2D, x: number, y: number) => {
		const r = between(0.008, 0.012);
		const turn = rnd() * 6.28;
		for (let p = 0; p < 5; p++) {
			const px = x + Math.cos(turn + p * 1.2566) * r * 1.15;
			const py = y + Math.sin(turn + p * 1.2566) * r * 1.15;
			path.moveTo(px + r, py);
			path.arc(px, py, r, 0, 6.2832);
		}
	};
	// A twig wanders, carries alternate leaves or blossom, and may fork.
	const twig = (
		path: Path2D,
		x: number,
		y: number,
		angle: number,
		length: number,
		thick: number,
		depth: number
	) => {
		const segments = Math.max(5, Math.round(length / 0.03));
		const step = length / segments;
		let side = rnd() < 0.5 ? 1 : -1;
		const bend = between(-0.3, 0.3);
		for (let i = 0; i < segments; i++) {
			const nx = x + Math.cos(angle) * step;
			const ny = y + Math.sin(angle) * step;
			const w = thick * (1.1 - (i / segments) * 0.8);
			const px = -Math.sin(angle) * w;
			const py = Math.cos(angle) * w;
			path.moveTo(x - px, y - py);
			path.lineTo(nx - px, ny - py);
			path.lineTo(nx + px, ny + py);
			path.lineTo(x + px, y + py);
			path.closePath();
			x = nx;
			y = ny;
			angle += bend * 0.12 + between(-0.08, 0.08) + 0.5 * step;
			if (i > 0) {
				if (rnd() < kind.leaves)
					leaf(
						path,
						x,
						y,
						angle + side * between(0.55, 1.15),
						between(...kind.size),
						between(...kind.width)
					);
				if (rnd() < kind.blossom) blossom(path, x, y);
				side = -side;
			}
			if (depth > 0 && i > 1 && i < segments - 1 && rnd() < kind.fork)
				twig(
					path,
					x,
					y,
					angle + (rnd() < 0.5 ? -1 : 1) * between(0.5, 0.95),
					length * between(0.4, 0.62),
					thick * 0.7,
					depth - 1
				);
		}
		if (kind.leaves)
			leaf(
				path,
				x,
				y,
				angle + between(-0.3, 0.3),
				between(...kind.size) * 1.1,
				between(...kind.width)
			);
	};
	// Each layer has one bough from the left edge and two from the top, one over each half of the
	// page. Every bough grows from its own seed, so the season changes its leaves, not its place.
	const grow = (name: Season) => {
		kind = KINDS[name];
		boughs = [];
		for (let layer = 0; layer < 4; layer++)
			for (let b = 0; b < 3; b++) {
				s = seed + layer * 97 + b * 31 + 1;
				rnd();
				const fromTop = b > 0;
				const x = fromTop ? (b === 1 ? between(0.1, 0.6) : between(0.7, 1.3)) : -0.03;
				const y = fromTop ? -0.03 : between(0.0, 0.5);
				const angle = fromTop ? between(0.9, 1.9) : between(0.1, 0.9);
				const length = between(0.3, 0.52);
				const phase = rnd() * 6.28;
				const weight = between(0.7, 1.3);
				const path = new Path2D();
				twig(path, 0, 0, angle, length, 0.0045, kind.depth);
				boughs.push({ layer, x, y, path, phase, weight });
			}
		// Things that fall past the window: petals, leaves or snow.
		if (kept?.season === name) return void (flakes = kept.flakes);
		flakes = Array.from({ length: still ? 0 : kind.falling }, () => ({
			x: between(-0.2, 1.6),
			y: between(-0.1, 1.2),
			fall: between(0.025, 0.06) * (kind.flake === 'snow' ? 0.8 : 1),
			phase: rnd() * 6.28,
			size:
				kind.flake === 'snow'
					? between(0.004, 0.008)
					: kind.flake === 'petal'
						? between(0.011, 0.02)
						: between(0.035, 0.06),
			layer: rnd() < 0.6 ? 0 : 1
		}));
		kept = { season: name, flakes };
	};
	grow(season);

	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.className = 'tree-shadows';
	host.append(canvas);
	const ctx = canvas.getContext('2d')!;
	let W = 0;
	let H = 0;
	let gust = 0;
	let last = 0;
	let raf = 0;
	let px: [number, number] | null = null;

	// Leaves move slowly, so about 30 frames a second is plenty.
	const draw = (now: number) => {
		if (!still) raf = requestAnimationFrame(draw);
		if (now - last >= 31 || still) render(now);
	};
	const render = (now: number) => {
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		const t = now / 1000 + 40;
		gust *= 0.97;
		// Size comes from the width alone, so the tree does not rescale when the hero changes height.
		const unit = W * 0.8;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, W, H);
		for (let layer = 3; layer >= 0; layer--) {
			ctx.filter = `blur(${(BLUR[layer] * unit).toFixed(2)}px)`;
			ctx.fillStyle = `rgba(${tint},${ALPHA[layer]})`;
			if (layer === 2) {
				ctx.fillRect(W * 0.61, -20, unit * 0.022, H + 40);
				ctx.fillRect(-20, unit * 0.36, W + 40, unit * 0.018);
			}
			for (const b of boughs) {
				if (b.layer !== layer) continue;
				const sway =
					(Math.sin(t * 0.55 + b.phase) * 0.03 +
						Math.sin(t * 1.9 + b.phase * 2.3) * 0.008 * (1 + gust * 4)) *
					b.weight *
					(1 + gust * 2.2);
				ctx.setTransform(unit, 0, 0, unit, b.x * unit, b.y * unit);
				ctx.rotate(sway);
				ctx.fill(b.path);
			}
			for (const f of flakes) {
				if (f.layer !== layer) continue;
				f.y += f.fall * dt * (1 + gust);
				f.x += (0.012 + Math.sin(t * 0.9 + f.phase) * 0.02 + gust * 0.08) * dt;
				if (f.y > H / unit + 0.05) {
					f.y = -0.05;
					f.x = Math.random() * (W / unit + 0.4) - 0.3;
				}
				ctx.setTransform(unit, 0, 0, unit, f.x * unit, f.y * unit);
				ctx.rotate(t * 0.7 + f.phase);
				// A turning leaf or petal shows more or less of its face.
				const face = kind.flake === 'snow' ? 1 : 0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + f.phase));
				if (kind.flake === 'leaf') {
					ctx.scale(f.size, f.size * face);
					ctx.fill(maplePath);
					continue;
				}
				ctx.beginPath();
				ctx.ellipse(0, 0, f.size, f.size * (kind.flake === 'snow' ? 1 : 0.55 * face), 0, 0, 6.2832);
				ctx.fill();
			}
		}
		ctx.filter = 'none';
	};
	// Size and draw at once, so the shadow is never missing for a frame: not when the shell is
	// rebuilt for a new language, and not when the hero changes height.
	const size = () => {
		const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
		const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
		if (w === W && h === H) return;
		W = canvas.width = w;
		H = canvas.height = h;
		render(performance.now());
	};
	const observer = new ResizeObserver(size);
	size();
	observer.observe(canvas);
	const move = (e: PointerEvent) => {
		if (px) gust = Math.min(1, gust + Math.hypot(e.clientX - px[0], e.clientY - px[1]) / 2500);
		px = [e.clientX, e.clientY];
	};
	if (!still) {
		raf = requestAnimationFrame(draw);
		addEventListener('pointermove', move);
	}

	return {
		canvas,
		restyle(nextSeason: Season, nextTint: string) {
			tint = nextTint;
			if (KINDS[nextSeason] !== kind) grow(nextSeason);
			if (still) draw(0);
		},
		destroy() {
			cancelAnimationFrame(raf);
			observer.disconnect();
			removeEventListener('pointermove', move);
			canvas.remove();
		}
	};
}
