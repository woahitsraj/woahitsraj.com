<script lang="ts">
	interface Props {
		items: string[];
	}

	let { items }: Props = $props();
</script>

{#if items.length > 0}
	<ul class="detail-list">
		{#each items as item (item)}
			<li data-baffle>{item}</li>
		{/each}
	</ul>
{/if}

<style>
	.detail-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-12);
		max-width: 40rem;
	}

	.detail-list li {
		font-size: var(--text-body);
		line-height: 1.6;
		color: var(--site-text);
	}
</style>
