import { showAlert } from '../components/alert-helpers';
import { VfOptions } from '../config';

export class UserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserError';
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError(err: any): string {
    if (err instanceof UserError) {
        return err.message;
    }

    const errMessage = toError(err).message;
    return `An application error has occurred:\n\n${errMessage}\n\nPlease refresh the page and try again. If this error persists, ${VfOptions.unhandledErrorSupportText}.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toError(err: any) {
    return err instanceof Error ? err : new Error(String(err));
}

interface IErrorAlertOptions {
    title?: string;
    classes?: string[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleErrorAndAlert(errIn: any, options?: IErrorAlertOptions) {
    const err = toError(errIn);

    if (!(err instanceof UserError)) {
        VfOptions.errorHandler(err);
    }

    return showAlert({
        title: options?.title,
        message: err,
        classes: options?.classes
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleError(errIn: any) {
    const err = toError(errIn);

    if (!(err instanceof UserError)) {
        VfOptions.errorHandler(err);
    }
}
