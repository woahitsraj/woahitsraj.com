declare module 'web-haptics/svelte' {
	import type { HapticInput, TriggerOptions, WebHapticsOptions } from 'web-haptics';

	export function createWebHaptics(options?: WebHapticsOptions): {
		trigger: (input?: HapticInput, options?: TriggerOptions) => Promise<void> | undefined;
		cancel: () => void | undefined;
		destroy: () => void | undefined;
		setDebug: (debug: boolean) => void | undefined;
		isSupported: boolean;
	};
}
