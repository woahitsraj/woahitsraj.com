import type { PageServerLoad } from './$types';

export const load = (() => ({
	city: 'Gothenburg',
	country: 'Sweden',
	countryCode: 'SE'
})) satisfies PageServerLoad;
