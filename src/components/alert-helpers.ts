import AlertModal from './alert-modal.vue';
import { createOverlayInjection, presentOverlay, removeOverlayInjection } from './overlay-container';

interface IAlertOptions {
    title?: string;
    message: string | Error;
    classes?: string[];
}

function resolveAlertParams(arg0: string | Error | IAlertOptions, arg1?: string | Error) {
    if (typeof arg0 === 'object' && !(arg0 instanceof Error)) {
        return {
            ...arg0,
            classes: arg0.classes ?? []
        };
    }
    const title = arg1 ? (arg0 as string) : undefined;
    return { title, message: arg1 ?? arg0, classes: [] };
}

export async function showAlert(title: string, message: string | Error): Promise<void>;
export async function showAlert(message: string | Error): Promise<void>;
export async function showAlert(options: IAlertOptions): Promise<void>;
export async function showAlert(arg0: string | Error | IAlertOptions, arg1?: string | Error): Promise<void> {
    await presentOverlay(AlertModal, resolveAlertParams(arg0, arg1));
}

export async function showConfirm(title: string, message: string): Promise<boolean>;
export async function showConfirm(message: string): Promise<boolean>;
export async function showConfirm(options: IAlertOptions): Promise<boolean>;
export async function showConfirm(arg0: string | IAlertOptions, arg1?: string): Promise<boolean> {
    const params = resolveAlertParams(arg0, arg1);
    const result = await presentOverlay(AlertModal, {
        ...params,
        shouldConfirm: true
    });
    return result === true;
}

export async function showConfirmDestroy(title: string, message: string): Promise<boolean>;
export async function showConfirmDestroy(message: string): Promise<boolean>;
export async function showConfirmDestroy(options: IAlertOptions): Promise<boolean>;
export async function showConfirmDestroy(arg0: string | IAlertOptions, arg1?: string): Promise<boolean> {
    const params = resolveAlertParams(arg0, arg1);
    const result = await presentOverlay(AlertModal, {
        ...params,
        shouldConfirm: true,
        classes: ['destructive', ...params.classes]
    });
    return result === true;
}

export function showWait(title: string, message: string): () => void;
export function showWait(message: string): () => void;
export function showWait(options: IAlertOptions): () => void;
export function showWait(arg0: string | IAlertOptions, arg1?: string): () => void {
    const params = resolveAlertParams(arg0, arg1);
    const injection = createOverlayInjection(AlertModal, {
        ...params,
        isBare: true,
        classes: ['wait', ...params.classes],
        callback: () => {}
    });
    return () => removeOverlayInjection(injection);
}
