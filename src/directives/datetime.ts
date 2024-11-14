import { format } from 'date-fns';
import { compact } from 'lodash';
import type { DirectiveBinding, ObjectDirective } from 'vue';

import { VfOptions } from '../config';

export const vDatetime: ObjectDirective<HTMLElement, string> = {
    beforeMount: applyDateTime,
    updated: applyDateTime
};

function applyDateTime(el: HTMLElement, binding: DirectiveBinding<string>) {
    if (binding.value == binding.oldValue && el.innerHTML.length) return;
    el.innerText = getDateTimeValue(el, binding);
}

function getDateTimeValue(el: HTMLElement, binding: DirectiveBinding<string>) {
    if (!binding.value) {
        return el.attributes.getNamedItem('placeholder')?.value ?? '';
    }

    let prefix = '';
    const isoDateStr = binding.value.replace(/ /g, 'T').replace(/\.\d+Z$/, 'Z');
    const tzDateStr = el.attributes.getNamedItem('local') !== null ? isoDateStr.replace(/Z$/, '') : isoDateStr.replace(/(Z|\+00:00)?$/, 'Z');
    const theDate = new Date(tzDateStr);

    if (el.attributes.getNamedItem('display-utc') !== null) {
        theDate.setMinutes(theDate.getMinutes() - theDate.getTimezoneOffset());
    }

    let formatSpec = el.attributes.getNamedItem('format')?.value;
    const isDateOnly = el.attributes.getNamedItem('date-only') !== null;

    if (!formatSpec && el.attributes.getNamedItem('relative-date') !== null) {
        const now = new Date();
        if (now.getFullYear() === theDate.getFullYear() && now.getMonth() === theDate.getMonth() && now.getDate() === theDate.getDate()) {
            prefix = 'at'; // ???
            formatSpec = 'HH:mm';
        }
    }

    if (!formatSpec && el.attributes.getNamedItem('simplified-date') !== null) {
        let dateSpec: string | null = null;
        const now = new Date();
        if (now.getFullYear() === theDate.getFullYear()) {
            if (now.getMonth() !== theDate.getMonth() || now.getDate() !== theDate.getDate()) {
                dateSpec = 'M/d';
            }
        } else {
            dateSpec = 'M/d/YY';
        }

        const timeSpec = isDateOnly ? null : VfOptions.defaultTimeFormat;
        formatSpec = compact([dateSpec, timeSpec]).join(' ');
    }

    if (!formatSpec) {
        if (isDateOnly) {
            formatSpec = VfOptions.defaultDateFormat;
        } else {
            formatSpec = `${VfOptions.defaultDateFormat} ${VfOptions.defaultTimeFormat}`;
        }
    }

    let result = format(theDate, formatSpec);
    if (prefix) result = prefix + ' ' + result;

    return result;
}
