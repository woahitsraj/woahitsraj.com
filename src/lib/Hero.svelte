<script lang="ts" module>
	// The dots of the heading that was last on screen, kept across page and language changes.
	let left: { at: number; dots: Float32Array[]; loose: boolean } | null = null;
	// The text scramble on a language change: 180 ms before the new page, then 90 + 520 ms after it.
	const SCRAMBLE_BEFORE = 180;
	const SCRAMBLE_AFTER = 610;
	// The dot canvas reaches this far past the heading on every side, so flying dots are not cut off.
	const BLEED = 180;
</script>

<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { dotField } from '$lib/fx/dots';
	import { extractLocaleFromUrl } from '$lib/paraglide/runtime.js';
	import { onPaletteChange, palette } from '$lib/season.svelte';

	interface Props {
		eyebrow?: string;
		subtitle: string;
		heading: Snippet;
	}

	let { eyebrow, subtitle, heading }: Props = $props();
	let locale = $derived(extractLocaleFromUrl(page.url) ?? 'en');

	// The heading stays a real <h1>. With HTML-in-canvas, the browser's own rendering of it is read
	// and printed as two plates of dots that the pointer can push. Without it, nothing changes.
	// Two canvases: a small one holds the heading and is only read from, and a second one draws the
	// dots. Chrome moves a canvas to slow software drawing once its pixels are read more than once.
	const dots: Attachment<HTMLElement> = (holder) => {
		const h1 = holder.querySelector('h1');
		const ok =
			h1 &&
			!matchMedia('(prefers-reduced-motion: reduce)').matches &&
			'drawElementImage' in CanvasRenderingContext2D.prototype &&
			'requestPaint' in HTMLCanvasElement.prototype;
		if (!ok) return;

		const reader = document.createElement('canvas') as HTMLCanvasElement & {
			onpaint: (() => void) | null;
			requestPaint(): void;
		};
		reader.setAttribute('content', 'drawable');
		reader.setAttribute('layoutsubtree', '');
		reader.className = 'hero__reader';
		const read = reader.getContext('2d', {
			willReadFrequently: true
		}) as CanvasRenderingContext2D & {
			drawElementImage(el: Element, x: number, y: number): void;
		};
		const ink = document.createElement('canvas');
		ink.className = 'hero__ink';
		ink.setAttribute('aria-hidden', 'true');
		ink.style.cssText = `inset:-${BLEED}px;width:calc(100% + ${BLEED * 2}px);height:calc(100% + ${BLEED * 2}px)`;
		h1.replaceWith(reader);
		h1.setAttribute('drawable', '');
		reader.append(h1);
		holder.append(ink);
		const fit = () => (reader.style.height = h1.offsetHeight + 'px');
		const sizer = new ResizeObserver(fit);
		sizer.observe(h1);
		fit();

		const colours = palette();
		const recent = left && performance.now() - left.at < 1500 ? left : null;
		let waiting: ((pixels: ImageData) => void) | null = null;
		const field = dotField(ink, {
			source: () =>
				new Promise((done) => {
					waiting = done;
					// One pixel for each CSS pixel is enough to place the dots.
					const w = Math.max(1, reader.clientWidth);
					const h = Math.max(1, reader.clientHeight);
					if (reader.width !== w || reader.height !== h) {
						reader.width = w;
						reader.height = h;
					}
					reader.requestPaint();
				}),
			// Spacing follows the width, so a wide heading never gets phone-sized dots.
			cell: (width) => Math.max(4, Math.min(7, width / 200)),
			split: 0.5,
			blend: colours.dark ? 'screen' : 'multiply',
			// Dots left by the last heading, if it went away a moment ago: a page or language change.
			pad: BLEED,
			from: recent?.dots,
			// The dots come apart and form again in the time the text scramble takes. On a language
			// change the first part already ran on the old page.
			reform: recent?.loose ? SCRAMBLE_AFTER : SCRAMBLE_BEFORE + SCRAMBLE_AFTER,
			layers: [
				{ color: colours.back, angle: 75, gain: 0.5, dx: 7, dy: 5, split: 1 },
				{ color: colours.front, angle: 15, gain: 0.52, split: -0.4 }
			]
		});
		// The browser fires "paint" when the heading changes. Read it again, and the dots move to
		// spell the new words.
		reader.onpaint = () => {
			if (!waiting) return void field.rebuild();
			const done = waiting;
			waiting = null;
			read.setTransform(1, 0, 0, 1, 0, 0);
			read.clearRect(0, 0, reader.width, reader.height);
			read.drawElementImage(h1, 0, 0);
			const pixels = read.getImageData(0, 0, reader.width, reader.height);
			read.clearRect(0, 0, reader.width, reader.height);
			done(pixels);
		};
		void document.fonts.ready.then(() => field.rebuild());
		// A language change starts: the heading comes apart while the old text scrambles.
		let loose = false;
		const language = new MutationObserver(() => {
			if (!document.documentElement.hasAttribute('data-locale-transition')) return;
			loose = true;
			field.loosen();
		});
		language.observe(document.documentElement, { attributeFilter: ['data-locale-transition'] });
		const unwatch = onPaletteChange(() => {
			const next = palette();
			field.restyle(next.dark ? 'screen' : 'multiply', [next.back, next.front]);
		});

		return () => {
			left = { at: performance.now(), dots: field.snapshot(), loose };
			language.disconnect();
			unwatch();
			sizer.disconnect();
			reader.onpaint = null;
			field.destroy();
		};
	};
</script>

<header class="hero reveal reveal-1" class:hero--ja={locale === 'ja'} data-hero>
	{#if eyebrow}<p data-baffle>{eyebrow}</p>{/if}
	<div class="hero__name" {@attach dots}>
		<h1>{@render heading()}</h1>
	</div>
	<p data-baffle>{subtitle}</p>
</header>

<style>
	.hero {
		padding-block: clamp(0.75rem, 2vw, 1.5rem) clamp(1.25rem, 2.5vw, 2rem);
	}

	.hero p {
		margin: 0;
		font-size: clamp(1.25rem, 2.2vw, 1.75rem);
		font-weight: 600;
		line-height: 1.2;
	}

	h1 {
		margin: 0 0 0 -0.04em;
		padding: 0.06em 0 0.18em;
		font-size: clamp(4rem, 16vw, 15rem);
		font-weight: 700;
		line-height: 0.8;
		letter-spacing: -0.06em;
		/* Without canvas: plain two-ink type, slightly out of register. */
		color: var(--site-accent);
		text-shadow: 0.03em 0.02em 0 var(--site-accent-2);
	}

	/* Japanese glyphs are a full em wide, so the name needs a smaller size to fit. */
	.hero--ja h1 {
		font-size: clamp(3rem, 14vw, 13rem);
		line-height: 1;
		letter-spacing: -0.04em;
	}

	.hero__name {
		position: relative;
	}

	.hero :global(.hero__reader) {
		display: block;
		width: 100%;
	}

	.hero :global(.hero__ink) {
		position: absolute;
		pointer-events: none;
	}

	/* Inside the canvas the heading is only a source of pixels: solid, with no second ink. */
	.hero :global(h1[drawable]) {
		width: 100%;
		color: #000;
		text-shadow: none;
	}
</style>
