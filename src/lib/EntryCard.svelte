<script lang="ts">
	import DetailList from '$lib/DetailList.svelte';

	interface Props {
		title: string;
		metaParts?: string[];
		details?: string[];
		href?: string;
		embed?: string;
		revealClass?: string;
		metaBaffle?: boolean;
	}

	let {
		title,
		metaParts = [],
		details = [],
		href,
		embed,
		revealClass = 'reveal-2',
		metaBaffle = false
	}: Props = $props();

	function baffleAttributes(enabled: boolean) {
		return enabled ? { 'data-baffle': true } : {};
	}
</script>

<section class={`entry reveal ${revealClass}`.trim()}>
	<p class="entry__meta">
		{#each metaParts as part, index (part)}
			<span
				class:entry__lead={index === 0 && metaParts.length > 1}
				{...baffleAttributes(metaBaffle)}>{part}</span
			>
		{/each}
	</p>
	<div>
		<h2 class="entry__title">
			{#if href}
				<a {href} target="_blank" rel="noopener noreferrer" data-baffle>{title}</a>
			{:else}
				<span data-baffle>{title}</span>
			{/if}
		</h2>
		<DetailList items={details} />
		{#if embed}
			<div class="entry__video">
				<iframe
					src={embed}
					{title}
					loading="lazy"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowfullscreen
				></iframe>
			</div>
		{/if}
	</div>
</section>

<style>
	.entry {
		display: grid;
		grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
		gap: 0.5rem clamp(1.5rem, 5vw, 4.5rem);
		padding-block: clamp(1.5rem, 3.5vw, 2.75rem);
		border-top: 1px solid var(--site-rule);
	}

	.entry__meta {
		margin: 0;
		display: flex;
		flex-direction: column;
		font-size: var(--text-body);
		color: var(--site-text-muted);
	}

	.entry__lead {
		font-weight: 600;
		color: var(--site-text);
	}

	.entry__title {
		margin: 0 0 0.6rem;
		font-size: clamp(1.5rem, 2.4vw, 2rem);
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.02em;
		color: var(--site-text);
	}

	.entry__title a {
		color: inherit;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.16em;
	}

	.entry__title a:hover {
		color: var(--site-accent);
	}

	.entry__video {
		margin-top: var(--space-24);
		max-width: 40rem;
		border: 1px solid var(--site-border);
		overflow: hidden;
	}

	.entry__video iframe {
		display: block;
		width: 100%;
		aspect-ratio: 16 / 9;
		border: 0;
	}

	@media (max-width: 768px) {
		.entry {
			grid-template-columns: 1fr;
		}
	}
</style>
