<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { onDestroy, onMount, tick } from 'svelte';
	import { baseLocale, extractLocaleFromUrl, setLocale } from '$lib/paraglide/runtime.js';
	import type baffleImport from 'baffle';
	import { createWebHaptics } from 'web-haptics/svelte';

	type BaffleFn = typeof baffleImport;

	const BAFFLE_SELECTOR = '[data-baffle]';
	const LOCALE_TRANSITION_ATTR = 'data-locale-transition';
	const PAGE_TRANSITION_ATTR = 'data-page-transition';
	const LOCALE_OPTION_SELECTOR = '.language-selector__option';
	const BAFFLE_OPTIONS = {
		characters:
			'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンÅåÄäÖöÁáÉéÍíÓóÚúÜüÑñAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz~!@#$%^&*()-+=[]{}|;:,./<>?',
		speed: 50
	};
	const PRE_NAVIGATION_REVEAL_DELAY = 0;
	const PRE_NAVIGATION_REVEAL_DURATION = 180;
	const POST_NAVIGATION_REVEAL_DELAY = 90;
	const POST_NAVIGATION_REVEAL_DURATION = 520;
	const LOCALE_TRANSITION_HAPTIC_DURATION =
		PRE_NAVIGATION_REVEAL_DURATION + POST_NAVIGATION_REVEAL_DELAY + POST_NAVIGATION_REVEAL_DURATION;
	const LOCALE_TRANSITION_HAPTIC = [{ duration: LOCALE_TRANSITION_HAPTIC_DURATION, intensity: 1 }];

	let baffle: BaffleFn | undefined;
	let localeHapticArmed = false;
	const { trigger, cancel, destroy } = createWebHaptics();

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

	function triggerButtonHaptic() {
		void trigger('medium');
	}

	function triggerLocaleTransitionHaptic() {
		localeHapticArmed = true;
		void trigger(LOCALE_TRANSITION_HAPTIC);
	}

	function cancelLocaleTransitionHaptic() {
		localeHapticArmed = false;
		cancel();
	}

	async function ensureBaffle() {
		if (baffle) return baffle;

		const module = await import('baffle');
		baffle = module.default;

		return baffle;
	}

	async function runLocaleBaffle({ preNavigation }: { preNavigation: boolean }) {
		const baffleLib = await ensureBaffle();

		const targets = getTargets();

		if (targets.length === 0) return;

		const instance = baffleLib(targets, BAFFLE_OPTIONS).start();
		const revealDelay = preNavigation ? PRE_NAVIGATION_REVEAL_DELAY : POST_NAVIGATION_REVEAL_DELAY;
		const revealDuration = preNavigation
			? PRE_NAVIGATION_REVEAL_DURATION
			: POST_NAVIGATION_REVEAL_DURATION;

		if (revealDelay > 0) {
			await new Promise((resolve) => window.setTimeout(resolve, revealDelay));
		}

		instance.reveal(revealDuration);
		await new Promise((resolve) => window.setTimeout(resolve, revealDuration));
	}

	function handleDocumentClick(event: MouseEvent) {
		const target = event.target;

		if (!(target instanceof Element)) return;

		const localeOption = target.closest<HTMLAnchorElement>(LOCALE_OPTION_SELECTOR);

		if (localeOption) {
			const currentLocale = getLocale(new URL(window.location.href));
			const nextLocale = getLocale(new URL(localeOption.href));

			if (currentLocale !== nextLocale) {
				triggerLocaleTransitionHaptic();
			}

			return;
		}

		if (!target.closest('button')) return;

		triggerButtonHaptic();
	}

	onDestroy(destroy);

	onMount(() => {
		document.addEventListener('click', handleDocumentClick, true);

		return () => {
			document.removeEventListener('click', handleDocumentClick, true);
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

			try {
				if (!localeHapticArmed) {
					triggerLocaleTransitionHaptic();
				}

				await runLocaleBaffle({ preNavigation: true });
				await setLocale(toLocale, { reload: false });
			} catch (error) {
				setLocaleTransitionState(false);
				cancelLocaleTransitionHaptic();
				throw error;
			}

			return () => {
				void (async () => {
					try {
						await tick();
						await runLocaleBaffle({ preNavigation: false });
					} finally {
						setLocaleTransitionState(false);
						cancelLocaleTransitionHaptic();
					}
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
