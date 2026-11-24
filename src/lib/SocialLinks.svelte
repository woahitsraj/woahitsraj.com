<script lang="ts">
	import type { SimpleIcon } from 'simple-icons';

	type LinkIcon = Pick<SimpleIcon, 'path'>;

	interface SocialLink {
		label: string;
		href: string;
		icon?: LinkIcon;
	}

	interface Props {
		links: SocialLink[];
	}

	let { links }: Props = $props();
</script>

<div class="social-links">
	{#each links as link (link.href)}
		<a href={link.href} target="_blank" rel="noopener noreferrer" class:text-only={!link.icon}>
			{#if link.icon}
				<span class="social-links__icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" focusable="false">
						<path d={link.icon.path}></path>
					</svg>
				</span>
			{/if}
			<span class="social-links__label" data-baffle>{link.label}</span>
		</a>
	{/each}
</div>

<style>
	.social-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.75rem;
	}

	.social-links a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--site-accent);
		font-size: var(--text-body);
		font-weight: 600;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.2em;
	}

	.social-links a:hover {
		text-decoration-thickness: 2px;
	}

	.social-links__icon {
		display: inline-flex;
	}

	.social-links__icon svg {
		width: 1.15em;
		height: 1.15em;
		display: block;
		fill: currentColor;
	}
</style>
