<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { SEASONS, pickSeason, season, type Season } from '$lib/season.svelte';

	const labels: Record<Season, () => string> = {
		spring: m.season_spring,
		summer: m.season_summer,
		autumn: m.season_autumn,
		winter: m.season_winter
	};

	let root: HTMLDivElement | undefined;
	let open = $state(false);
	let currentPath = $derived(page.url.pathname);

	function choose(name: Season) {
		pickSeason(name);
		open = false;
	}

	function handleDocumentClick(event: MouseEvent) {
		if (root && event.target instanceof Node && !root.contains(event.target)) open = false;
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}

	onMount(() => {
		document.addEventListener('click', handleDocumentClick, true);
		document.addEventListener('keydown', handleDocumentKeydown);

		return () => {
			document.removeEventListener('click', handleDocumentClick, true);
			document.removeEventListener('keydown', handleDocumentKeydown);
		};
	});

	$effect(() => {
		void currentPath;
		open = false;
	});
</script>

{#snippet icon(name: Season)}
	<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		{#if name === 'spring'}
			<circle cx="12" cy="12" r="1.6" />
			<path
				d="M12 10.4c-2.6-1.6-2.6-5.4 0-7 2.6 1.6 2.6 5.4 0 7Zm1.5 1.1c.7-3 4.3-4.2 6.7-2.2-.7 3-4.3 4.2-6.7 2.2Zm-.6 1.8c3-.3 5.4 2.7 4.1 5.5-3 .3-5.4-2.7-4.1-5.5Zm-1.8 0c1.3 2.8-1.1 5.800-4.100 5.500-1.300-2.800 1.100-5.800 4.100-5.500Zm-.6-1.800c-2.400 2-6 .8-6.700-2.200 2.400-2 6-.8 6.700 2.200Z"
			/>
		{:else if name === 'summer'}
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300 7 7M17 17l1.700 1.700M5.300 18.700 7 17M17 7l1.700-1.700"
			/>
		{:else if name === 'autumn'}
			<path
				d="M12 2l1.600 4.200 2.900-1.200-.7 4 4.200-.8-1.800 3.400 2.800 1.400-4.400 2.200.6 2.800-4.400-1.200h-1.600l-4.400 1.200.6-2.800L3 13l2.800-1.400L4 8.200l4.200.8-.7-4 2.900 1.200L12 2Zm0 14.800V22"
			/>
		{:else}
			<path
				d="M12 2v20M3.300 7l17.400 10M3.300 17 20.700 7M9.500 3.500 12 6l2.500-2.500M9.500 20.500 12 18l2.500 2.500M3.200 10.200l3.400-.9-.9-3.400M20.800 13.800l-3.400.9.9 3.400M3.200 13.800l3.400.9-.9 3.400M20.800 10.200l-3.400-.9.9-3.400"
			/>
		{/if}
	</svg>
{/snippet}

<div class="season-selector" class:is-open={open} bind:this={root}>
	<button
		type="button"
		class="season-selector__trigger"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={`${m.season_selector_aria()}: ${labels[season.current]()}`}
		onclick={() => (open = !open)}
	>
		{@render icon(season.current)}
		<span class="season-selector__chevron" aria-hidden="true"></span>
	</button>

	<div class="season-selector__menu" class:open>
		<div class="season-selector__panel" role="menu" aria-label={m.season_selector_aria()}>
			{#each SEASONS as name (name)}
				<button
					type="button"
					class="season-selector__option"
					class:active={season.current === name}
					role="menuitemradio"
					aria-checked={season.current === name}
					aria-label={labels[name]()}
					title={labels[name]()}
					onclick={() => choose(name)}
				>
					{@render icon(name)}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.season-selector {
		position: relative;
		display: none;
	}

	:global(html.js) .season-selector {
		display: block;
	}

	.season-selector__trigger {
		height: 2rem;
		padding: 0 0.55rem 0 0.6rem;
		border: 1px solid var(--site-rule);
		border-radius: var(--radius-pill);
		background: none;
		color: var(--site-text-muted);
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		transition:
			border-color 0.45s ease,
			color 0.45s ease;
	}

	.season-selector__trigger:hover,
	.season-selector.is-open .season-selector__trigger {
		border-color: var(--site-accent);
		color: var(--site-accent);
	}

	.season-selector__trigger:focus-visible,
	.season-selector__option:focus-visible {
		outline: 2px solid var(--site-accent);
		outline-offset: 3px;
	}

	svg {
		width: 1.05rem;
		height: 1.05rem;
		display: block;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.season-selector__chevron {
		width: 0.42rem;
		height: 0.42rem;
		margin-top: -0.12rem;
		border-right: 1px solid currentColor;
		border-bottom: 1px solid currentColor;
		transform: rotate(45deg);
		transition: transform 0.24s ease;
	}

	.season-selector.is-open .season-selector__chevron {
		transform: rotate(-135deg) translateY(-0.04rem);
	}

	.season-selector__menu {
		position: absolute;
		top: calc(100% + 0.45rem);
		right: 0;
		z-index: 21;
		opacity: 0;
		visibility: hidden;
		transform: translateY(-0.2rem);
		pointer-events: none;
		transition:
			opacity 0.2s ease,
			visibility 0.2s ease,
			transform 0.2s ease;
	}

	.season-selector__menu.open {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
		pointer-events: auto;
	}

	.season-selector__panel {
		display: grid;
		gap: 0.15rem;
		padding: 0.25rem;
		border: 1px solid var(--site-rule);
		border-radius: 12px;
		background: var(--site-bg);
		box-shadow: 0 12px 28px -16px var(--site-shadow);
	}

	.season-selector__option {
		width: 2.5rem;
		height: 2.25rem;
		padding: 0;
		border: 0;
		border-radius: 9px;
		background: none;
		color: var(--site-text-muted);
		display: grid;
		place-items: center;
		cursor: pointer;
	}

	.season-selector__option:hover,
	.season-selector__option.active {
		background: var(--site-accent-soft);
		color: var(--site-accent);
	}
</style>
