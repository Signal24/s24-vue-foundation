import type { DirectiveBinding, ObjectDirective } from 'vue';

type TooltipValue = string | null | false | undefined;

export const vTooltip: ObjectDirective<TooltipElement, TooltipValue> = {
    mounted: createTip,
    updated: createTip,
    unmounted: destroyTip
};

const TooltipState = Symbol('TooltipState');
interface ITooltipState {
    [TooltipState]?: VfTooltip;
}
type TooltipElement = HTMLElement & ITooltipState;

function createTip(el: TooltipElement, binding: DirectiveBinding<TooltipValue>) {
    let tipText = el.attributes.getNamedItem('tip')?.value ?? binding.value;
    if (!binding.value) tipText = null;

    if (tipText) {
        const config: ITooltipOptions = {
            content: tipText,
            html: el.getAttribute('html') !== null
        };

        if (!el[TooltipState]) {
            el[TooltipState] = new VfTooltip(el, config);
        } else {
            el[TooltipState].configure(config);
        }
    } else {
        destroyTip(el);
    }
}

function destroyTip(el: TooltipElement) {
    el[TooltipState]?.destroy();
    delete el[TooltipState];
}

interface ITooltipOptions {
    content: string;
    title?: string;
    delay?: number;
    html?: boolean;
    class?: string | string[];
}

// todo: improve with mutation observer to see removal of node

class VfTooltip {
    private lastMoveEvt?: MouseEvent;
    private checkInterval?: ReturnType<typeof setInterval>;
    private shouldShow = false;
    private tipEl?: HTMLElement;
    private titleEl?: HTMLElement;
    private contentEl?: HTMLElement;

    private mouseMoveBound = false;
    private handleMouseMoveWithContext = this.handleMouseMove.bind(this);
    private handleTargetMouseEnterWithContext = this.handleTargetMouseEnter.bind(this);
    private handleTargetMouseLeaveWithContext = this.handleTargetMouseLeave.bind(this);

    constructor(
        private el: HTMLElement,
        private config: ITooltipOptions
    ) {
        el.addEventListener('mouseenter', this.handleTargetMouseEnterWithContext);
        el.addEventListener('mouseleave', this.handleTargetMouseLeaveWithContext);
        el.addEventListener('click', this.handleTargetMouseLeaveWithContext);
    }

    configure(config: ITooltipOptions) {
        this.config = config;
    }

    handleTargetMouseEnter(e: MouseEvent) {
        this.shouldShow = true;
        setTimeout(() => this.show(e), this.config.delay ?? 0);
    }

    handleTargetMouseLeave() {
        this.shouldShow = false;
        this.removeTooltip();
    }

    show(e?: MouseEvent) {
        if (!this.shouldShow) return;

        this.renderTooltip();

        if (e) this.handleMouseMove(e);
    }

    renderTooltip() {
        if (!this.tipEl) {
            this.tipEl = document.createElement('div');
            this.tipEl.style.position = 'absolute';
            this.tipEl.style.zIndex = '1000000';
            document.body.appendChild(this.tipEl);
        }

        this.tipEl.className = this.getClasses().join(' ');

        if (this.config.title) {
            if (!this.titleEl) {
                this.titleEl = document.createElement('div');
                this.titleEl.className = 'title';
                this.tipEl.appendChild(this.titleEl);
            }

            this.titleEl.innerText = this.config.title;
        } else if (this.titleEl) {
            this.titleEl.remove();
        }

        if (!this.contentEl) {
            this.contentEl = document.createElement('div');
            this.contentEl.className = 'content';
            this.tipEl.appendChild(this.contentEl);
        }

        this.contentEl[this.config.html ? 'innerHTML' : 'innerText'] = this.config.content;

        if (this.checkInterval) {
            this.checkInterval = setInterval(() => this.checkMoveEvent(), 250);
        }

        if (!this.mouseMoveBound) {
            this.mouseMoveBound = true;
            window.addEventListener('mousemove', this.handleMouseMoveWithContext);
        }
    }

    getClasses() {
        return ['vf-tooltip', ...(Array.isArray(this.config.class) ? this.config.class : this.config.class ? [this.config.class] : [])];
    }

    removeTooltip() {
        if (this.shouldShow) return;
        if (!this.tipEl) return;

        this.tipEl.remove();

        this.tipEl = undefined;
        this.titleEl = undefined;
        this.contentEl = undefined;

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }

        window.removeEventListener('mousemove', this.handleMouseMoveWithContext);
        this.mouseMoveBound = false;
    }

    handleMouseMove(e: MouseEvent) {
        const tipWidth = this.tipEl!.offsetWidth;
        const tipHeight = this.tipEl!.offsetHeight;

        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;

        let tipX = e.pageX + 10,
            tipY = e.pageY + 20;

        if (tipX + tipWidth > viewWidth) tipX = e.pageX - 5 - tipWidth;
        if (tipY + tipHeight > viewHeight) tipY = e.pageY - 5 - tipHeight;

        this.tipEl!.style.left = tipX + 'px';
        this.tipEl!.style.top = tipY + 'px';

        this.lastMoveEvt = e;
    }

    checkMoveEvent() {
        if (!this.lastMoveEvt) return;

        if (this.tipEl !== this.lastMoveEvt.target) {
            if (!this.tipEl?.contains(this.lastMoveEvt.target as Node)) {
                this.handleTargetMouseLeave();
            }
        }
    }

    destroy() {
        this.shouldShow = false;

        this.removeTooltip();

        this.el.removeEventListener('mouseenter', this.handleTargetMouseEnterWithContext);
        this.el.removeEventListener('mouseleave', this.handleTargetMouseLeaveWithContext);
        this.el.removeEventListener('click', this.handleTargetMouseLeaveWithContext);
    }
}
