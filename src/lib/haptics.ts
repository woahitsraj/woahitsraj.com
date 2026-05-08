import { browser } from '$app/environment';
import { WebHaptics } from 'web-haptics';

let haptics: WebHaptics | undefined;

function getHaptics() {
	if (!browser) return undefined;

	haptics ??= new WebHaptics();

	return haptics;
}

export function triggerButtonHaptic() {
	void getHaptics()?.trigger('medium');
}

export function triggerBuzzHaptic() {
	void getHaptics()?.trigger('buzz');
}

export function cancelHaptics() {
	getHaptics()?.cancel();
}

export function destroyHaptics() {
	haptics?.destroy();
	haptics = undefined;
}
