<script lang="ts" module>
	let initialRender = true;
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	function isLocaleTransitionActive() {
		return (
			typeof document !== 'undefined' &&
			document.documentElement.hasAttribute('data-locale-transition')
		);
	}

	function isPageTransitionActive() {
		return (
			typeof document !== 'undefined' &&
			document.documentElement.hasAttribute('data-page-transition')
		);
	}

	let { children }: Props = $props();
	// CSS animates the first render at paint time, before hydration
	const auto = initialRender;
	let visible = $state(isLocaleTransitionActive() || isPageTransitionActive());
	let revealFrame = 0;
	let revealTimeout = 0;

	onMount(() => {
		initialRender = false;
		if (isLocaleTransitionActive() || isPageTransitionActive()) {
			visible = true;
			return;
		}

		revealFrame = requestAnimationFrame(() => {
			revealTimeout = window.setTimeout(() => {
				visible = true;
			}, 50);
		});

		return () => {
			cancelAnimationFrame(revealFrame);
			clearTimeout(revealTimeout);
		};
	});
</script>

<div class="reveal-scope" class:visible class:reveal-auto={auto}>
	{@render children?.()}
</div>
