import { last } from 'lodash';
import type { DirectiveBinding, ObjectDirective } from 'vue';

export const vHotkey: ObjectDirective<HTMLButtonElement, string> = {
    mounted: setup,
    updated: reset,
    unmounted: teardown
};

const ElementsByHotkey = new Map<string, HTMLButtonElement[]>();

function setup(el: HTMLButtonElement, binding: DirectiveBinding<string>) {
    if (ElementsByHotkey.size === 0) {
        window.addEventListener('keydown', handleKeydown);
    }

    ElementsByHotkey.set(binding.value.toLowerCase(), [...(ElementsByHotkey.get(binding.value.toLowerCase()) ?? []), el]);
}

function teardown(el: HTMLButtonElement, binding: DirectiveBinding<string>) {
    const elements = ElementsByHotkey.get(binding.value.toLowerCase());
    if (elements) {
        const index = elements.indexOf(el);
        if (index !== -1) {
            elements.splice(index, 1);
        }

        if (elements.length === 0) {
            ElementsByHotkey.delete(binding.value.toLowerCase());
        }
    }

    if (ElementsByHotkey.size === 0) {
        window.removeEventListener('keydown', handleKeydown);
    }
}

function reset(el: HTMLButtonElement, binding: DirectiveBinding<string>) {
    teardown(el, binding);
    setup(el, binding);
}

function handleKeydown(event: KeyboardEvent) {
    const hotkey = event.key.toLowerCase();
    const elements = ElementsByHotkey.get(hotkey);
    if (elements) {
        const element = last(elements);
        element?.click();
        event.preventDefault();
    }
}
