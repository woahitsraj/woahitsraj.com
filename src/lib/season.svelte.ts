// The site follows the season in Gothenburg. A season picked by hand lasts for the visit.
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export function seasonNow(): Season {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- read once, never tracked
	const month = new Date().getMonth();
	return (['winter', 'spring', 'summer', 'autumn'] as const)[Math.floor(((month + 1) % 12) / 3)];
}

const initial = (): Season => {
	if (typeof document === 'undefined') return 'summer';
	const set = document.documentElement.dataset.season as Season | undefined;
	return set && SEASONS.includes(set) ? set : seasonNow();
};

export const season = $state({ current: initial() });

export function pickSeason(name: Season) {
	season.current = name;
	document.documentElement.dataset.season = name;
	try {
		sessionStorage.setItem('site-season', name);
	} catch {
		// Storage is blocked: the choice lasts for this page only.
	}
}

// The colours the canvases draw with come from CSS, so the stylesheet is the one source.
export function palette() {
	const css = getComputedStyle(document.documentElement);
	const read = (name: string) => css.getPropertyValue(name).trim();
	return {
		dark: css.colorScheme === 'dark',
		front: read('--site-accent'),
		back: read('--site-accent-2'),
		shade: read('--site-shade')
	};
}

// Runs the callback when the theme or the season changes.
export function onPaletteChange(run: () => void) {
	const watch = new MutationObserver(run);
	watch.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme', 'data-season']
	});
	const scheme = matchMedia('(prefers-color-scheme: dark)');
	scheme.addEventListener('change', run);
	return () => {
		watch.disconnect();
		scheme.removeEventListener('change', run);
	};
}
