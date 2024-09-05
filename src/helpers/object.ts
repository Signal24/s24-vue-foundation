import { cloneDeep } from 'lodash';

export function cloneProp<T>(prop: T | undefined | null, fallback: T): T {
    if (prop !== undefined && prop !== null) {
        return cloneDeep(prop);
    } else {
        return fallback;
    }
}

export function nullifyEmptyInputs<T extends Record<string, unknown>, K extends keyof T>(obj: T, fields: K[]): T {
    const result = { ...obj };
    for (const key of fields) {
        if (result[key] === '') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[key] = null as any;
        }
    }
    return result;
}
