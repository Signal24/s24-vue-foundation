import { createOverlayInjection, type OverlayInjection, removeOverlayInjection } from './overlay-container';
import Toast, { type IToastOptions } from './toast.vue';

export function showToast(options: IToastOptions) {
    const injection: OverlayInjection<typeof Toast, unknown> = createOverlayInjection(Toast, {
        ...options,
        callback: () => removeOverlayInjection(injection)
    });
    return () => removeOverlayInjection(injection);
}
