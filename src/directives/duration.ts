import { remove } from 'lodash';
import type { DirectiveBinding, ObjectDirective } from 'vue';

export const vDuration: ObjectDirective<HTMLElement, number> = {
    beforeMount: applyDuration,
    updated: applyDuration,
    unmounted: removeDuration
};

const DurationState = Symbol('HasAutoFocused');
interface IDurationState {
    startTs: number;
    includeSeconds: boolean;
}
type DurationElement = HTMLElement & { [DurationState]?: IDurationState };

const durationEls: DurationElement[] = [];

function updateDurations() {
    durationEls.forEach(updateDuration);
}
setInterval(updateDurations, 1000);

function applyDuration(el: DurationElement, binding: DirectiveBinding<number>) {
    if (binding.value == binding.oldValue) return;
    if (!binding.value) return removeDuration(el);

    const bindingDate = new Date(binding.value);

    const baseTime = el.attributes.getNamedItem('base-time')?.value;
    const startTs = bindingDate.getTime() - (baseTime ? new Date(baseTime).getTime() - binding.value * 1000 : 0);

    const includeSeconds = el.getAttribute('no-seconds') === null;

    if (!el[DurationState]) {
        durationEls.push(el);
    }

    el[DurationState] = {
        startTs,
        includeSeconds
    };

    updateDuration(el);
}

function updateDuration(el: DurationElement) {
    const state = el[DurationState]!;
    const diff = Math.round((Date.now() - state.startTs) / 1000);
    el.innerText = secondsToString(diff, state.includeSeconds);
}

function removeDuration(el: DurationElement) {
    if (el[DurationState]) {
        remove(durationEls, el);
        delete el[DurationState];
    }

    el.innerText = '-';
}

function secondsToString(seconds: number, shouldSkipSeconds?: boolean) {
    const result = [];
    const days = Math.floor(seconds / 86400);
    if (days) result.push(days + 'd');
    seconds -= days * 86400;
    const hours = Math.floor(seconds / 3600);
    if (days || hours) result.push(hours + 'h');
    seconds -= hours * 3600;
    const minutes = Math.floor(seconds / 60);
    if (days || hours || minutes) result.push(minutes + 'm');
    if (!shouldSkipSeconds) {
        seconds -= minutes * 60;
        result.push(seconds + 's');
    } else if (!result.length) {
        result.push('0m');
    }
    return result.join(' ');
}
