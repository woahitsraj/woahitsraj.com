<script lang="ts">
	import Hero from '$lib/Hero.svelte';

	interface Props {
		heading: string;
		subtitle: string;
	}

	let { heading: title, subtitle }: Props = $props();
</script>

<Hero {subtitle}>
	{#snippet heading()}
		{title}
	{/snippet}
</Hero>
