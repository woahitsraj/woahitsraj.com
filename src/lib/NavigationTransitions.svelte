<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import {
		cancelHaptics,
		destroyHaptics,
		triggerButtonHaptic,
		triggerBuzzHaptic
	} from '$lib/haptics';
	import { baseLocale, extractLocaleFromUrl, setLocale } from '$lib/paraglide/runtime.js';
	import type baffleImport from 'baffle';

	type BaffleFn = typeof baffleImport;

	const BAFFLE_SELECTOR = '[data-baffle]';
	const LOCALE_TRANSITION_ATTR = 'data-locale-transition';
	const PAGE_TRANSITION_ATTR = 'data-page-transition';
	const BAFFLE_OPTIONS = {
		characters:
			'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンÅåÄäÖöÁáÉéÍíÓóÚúÜüÑñAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz~!@#$%^&*()-+=[]{}|;:,./<>?',
		speed: 50
	};

	let baffle: BaffleFn | undefined;

	function getLocale(url: URL) {
		return extractLocaleFromUrl(url) ?? baseLocale;
	}

	function getTargets() {
		return Array.from(document.querySelectorAll<HTMLElement>(BAFFLE_SELECTOR)).filter((element) =>
			element.textContent?.trim()
		);
	}

	function setLocaleTransitionState(active: boolean) {
		document.documentElement.toggleAttribute(LOCALE_TRANSITION_ATTR, active);
	}

	function setPageTransitionState(active: boolean) {
		document.documentElement.toggleAttribute(PAGE_TRANSITION_ATTR, active);
	}

	async function ensureBaffle() {
		if (baffle) return baffle;

		const module = await import('baffle');
		baffle = module.default;

		return baffle;
	}

	async function runLocaleBaffle({ preNavigation }: { preNavigation: boolean }) {
		// Trigger haptics before the first async boundary so the initial language change
		// still runs inside the originating user interaction.
		triggerBuzzHaptic();

		const baffleLib = await ensureBaffle();

		const targets = getTargets();

		if (targets.length === 0) return;

		try {
			const instance = baffleLib(targets, BAFFLE_OPTIONS).start();
			const revealDelay = preNavigation ? 0 : 90;
			const revealDuration = preNavigation ? 180 : 520;

			if (revealDelay > 0) {
				await new Promise((resolve) => window.setTimeout(resolve, revealDelay));
			}

			instance.reveal(revealDuration);
			await new Promise((resolve) => window.setTimeout(resolve, revealDuration));
		} finally {
			cancelHaptics();
		}
	}

	function handleDocumentClick(event: MouseEvent) {
		const target = event.target;

		if (!(target instanceof Element) || !target.closest('button')) return;

		triggerButtonHaptic();
	}

	onMount(() => {
		document.addEventListener('click', handleDocumentClick, true);

		return () => {
			document.removeEventListener('click', handleDocumentClick, true);
			destroyHaptics();
		};
	});

	onNavigate(async (navigation) => {
		if (!navigation.to?.url) return;

		const fromUrl = navigation.from?.url ?? new URL(window.location.href);
		const fromLocale = getLocale(fromUrl);
		const toLocale = getLocale(navigation.to.url);
		const isLocaleChange = fromLocale !== toLocale;

		if (isLocaleChange) {
			setLocaleTransitionState(true);
			await runLocaleBaffle({ preNavigation: true });
			await setLocale(toLocale, { reload: false });

			return () => {
				void (async () => {
					await tick();
					await runLocaleBaffle({ preNavigation: false });
					setLocaleTransitionState(false);
				})();
			};
		}

		if (!document.startViewTransition) return;

		return new Promise<void>((resolve) => {
			setPageTransitionState(true);

			document.startViewTransition(async () => {
				resolve();
				try {
					await navigation.complete;
				} finally {
					await tick();
					setPageTransitionState(false);
				}
			});
		});
	});
</script>
