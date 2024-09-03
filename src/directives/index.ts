import type { App } from 'vue';

import { vAutofocus } from './autofocus';
import { vConfirmButton } from './confirm-button';
import { vDateInput } from './date-input';
import { vDatetime } from './datetime';
import { vDisabled } from './disabled';
import { vDuration } from './duration';
import { vHotkey } from './hotkey';
import { vInfiniteScroll } from './infinite-scroll';
import { vReadonly } from './readonly';
import { vTooltip } from './tooltip';

declare module 'vue' {
    export interface ComponentCustomProperties {
        vAutofocus: typeof vAutofocus;
        vConfirmButton: typeof vConfirmButton;
        vDateInput: typeof vDateInput;
        vDatetime: typeof vDatetime;
        vDisabled: typeof vDisabled;
        vDuration: typeof vDuration;
        vHotkey: typeof vHotkey;
        vInfiniteScroll: typeof vInfiniteScroll;
        vReadonly: typeof vReadonly;
        vTooltip: typeof vTooltip;
    }
}

export function registerDirectives(app: App<Element>): void {
    app.directive('autofocus', vAutofocus);
    app.directive('confirm-button', vConfirmButton);
    app.directive('date-input', vDateInput);
    app.directive('datetime', vDatetime);
    app.directive('disabled', vDisabled);
    app.directive('duration', vDuration);
    app.directive('hotkey', vHotkey);
    app.directive('infinite-scroll', vInfiniteScroll);
    app.directive('readonly', vReadonly);
    app.directive('tooltip', vTooltip);
}
