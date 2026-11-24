<script lang="ts">
	import { page } from '$app/state';
	import {
		siBluesky,
		siGithub,
		siGoodreads,
		siInstagram,
		siLetterboxd,
		siThreads,
		siX
	} from 'simple-icons';
	import { m } from '$lib/paraglide/messages.js';
	import { extractLocaleFromUrl } from '$lib/paraglide/runtime.js';
	import Hero from '$lib/Hero.svelte';
	import SocialLinks from '$lib/SocialLinks.svelte';
	import me from '$lib/assets/me.jpeg';

	// simple-icons has no LinkedIn mark.
	const linkedin = {
		path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
	};
	const socialLinks = [
		{ label: 'GitHub', href: 'https://github.com/woahitsraj', icon: siGithub },
		{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/woahitsraj/', icon: linkedin },
		{ label: 'Bluesky', href: 'https://bsky.app/profile/woahitsraj.com', icon: siBluesky },
		{ label: 'Goodreads', href: 'https://www.goodreads.com/woahitsraj', icon: siGoodreads },
		{ label: 'Letterboxd', href: 'https://letterboxd.com/woahitsraj/', icon: siLetterboxd },
		{ label: 'Instagram', href: 'https://instagram.com/woahitsraj', icon: siInstagram },
		{ label: 'Threads', href: 'https://www.threads.net/@woahitsraj', icon: siThreads },
		{ label: 'Twitter', href: 'https://twitter.com/woahitsraj', icon: siX }
	];

	let currentLocale = $derived(extractLocaleFromUrl(page.url) ?? 'en');
	let nameSuffix = $derived(m.profile_name_last_suffix());
</script>

<svelte:head>
	<title>{m.profile_name()}</title>
</svelte:head>

<Hero eyebrow={m.home_eyebrow()} subtitle={m.home_subtitle()}>
	{#snippet heading()}
		{m.profile_name_first()}<br />{m.profile_name_last()}{nameSuffix}
	{/snippet}
</Hero>

<main lang={currentLocale}>
	<section class="about reveal reveal-2" aria-label={m.home_about_heading()}>
		<img src={me} alt={m.profile_name()} width="576" height="546" decoding="async" />
		<p>
			<span data-baffle>{m.home_about_p1_before()}</span><a href="https://withglide.com/">Glide</a
			><span data-baffle>{m.home_about_p1_after()}</span>
		</p>
		<p data-baffle>{m.home_about_p2()}</p>
		<p data-baffle>{m.home_about_p3()}</p>
		<p data-baffle>{m.home_about_p4()}</p>
	</section>

	<section class="connect reveal reveal-3">
		<h2 data-baffle>{m.home_connect_heading()}</h2>
		<SocialLinks links={socialLinks} />
	</section>
</main>

<style>
	section {
		padding-block: clamp(1.5rem, 3vw, 2.5rem);
		border-top: 1px solid var(--site-rule);
	}

	.about {
		display: flow-root;
	}

	/* The text runs round the portrait. */
	.about img {
		float: left;
		width: clamp(8.5rem, 24vw, 15rem);
		height: auto;
		aspect-ratio: 1;
		margin: 0.3rem clamp(1.25rem, 3vw, 2.25rem) 0.6rem 0;
		border-radius: var(--radius-round);
		shape-outside: circle(50%);
		shape-margin: clamp(0.75rem, 1.6vw, 1.4rem);
		object-fit: cover;
		object-position: 50% 30%;
	}

	.about p {
		margin: 0 0 1em;
		max-width: 52rem;
		font-size: var(--text-body);
		line-height: 1.6;
	}

	.about p:first-of-type {
		font-size: clamp(1.25rem, 1.9vw, 1.5rem);
		line-height: 1.4;
	}

	.about a {
		color: var(--site-accent);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.2em;
	}

	.about a:hover {
		text-decoration-thickness: 2px;
	}

	h2 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--site-accent);
	}

	.connect {
		padding-bottom: 4rem;
	}
</style>
