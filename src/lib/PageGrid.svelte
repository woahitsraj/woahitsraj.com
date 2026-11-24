<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<main class="page-list">
	{@render children?.()}
</main>

<style>
	.page-list {
		padding-bottom: 4rem;
	}
</style>
