import type { Writable } from 'type-fest';
import {
    type AllowedComponentProps,
    type ComponentInternalInstance,
    type ComponentPublicInstance,
    type ComputedOptions,
    defineComponent,
    h,
    markRaw,
    type MethodOptions,
    type Raw,
    reactive,
    renderList,
    Teleport,
    type VNode,
    type VNodeProps
} from 'vue';

import OverlayAnchor from './overlay-anchor.vue';
import type { OverlayAnchorOptions } from './overlay-types';

interface OverlayOptions<C extends OverlayComponent, R extends ComponentReturn<C>> {
    anchor?: OverlayAnchorOptions;
    onCallback?: (result: R) => void | Promise<boolean>;
}

export interface OverlayInjection<C extends OverlayComponent, R extends ComponentReturn<C>> {
    id: string;
    component: OverlayComponentUnwrapped<C>;
    props: OverlayComponentProps<C>;
    options: OverlayOptions<C, R>;
    vnode: VNode;
    wrapperVnode?: VNode;
}

let overlayCount = 0;
const OverlayInjections: OverlayInjection<any, any>[] = reactive([]);

export const OverlayContainer = defineComponent({
    setup() {
        return () =>
            h('div', [
                renderList(OverlayInjections, injection => {
                    return h(Teleport, { key: injection.id, to: '#vf-overlay-target' }, [injection.wrapperVnode ?? injection.vnode]);
                })
            ]);
    }
});

// copied in from Vue since it's not exported
// tood: it may be a lot easier than this. see the docs for props passed to "h"
export type Vue__ComponentPublicInstanceConstructor<
    T extends ComponentPublicInstance<Props, RawBindings, D, C, M> = ComponentPublicInstance<any>,
    Props = any,
    RawBindings = any,
    D = any,
    C extends ComputedOptions = ComputedOptions,
    M extends MethodOptions = MethodOptions
> = {
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
    new (...args: any[]): T;
};

export type ObjectComponentConfig<T extends Vue__ComponentPublicInstanceConstructor> =
    T extends Vue__ComponentPublicInstanceConstructor<infer P> ? P : never;
export type ObjectComponentProps<T extends Vue__ComponentPublicInstanceConstructor> = Writable<
    Omit<ObjectComponentConfig<T>['$props'], keyof VNodeProps | keyof AllowedComponentProps>
>;

type ObjectOrDefault<T> = T extends object ? T : PropsWithCallback<{}>;
export type OverlayComponent = Vue__ComponentPublicInstanceConstructor | ((props: any) => any);
export type OverlayComponentConfig<T> = T extends Vue__ComponentPublicInstanceConstructor
    ? {
          props: ObjectComponentProps<T>;
          component: Raw<T>;
      }
    : T extends (props: infer P) => any
      ? {
            props: Omit<ObjectOrDefault<P>, keyof VNodeProps | keyof AllowedComponentProps>;
            component: T;
        }
      : never;
export type OverlayComponentUnwrapped<T extends OverlayComponent> = OverlayComponentConfig<T>['component'];
export type OverlayComponentProps<T extends OverlayComponent> = OverlayComponentConfig<T>['props'];

interface PropsWithCallback<T> {
    callback?: (result: T) => void;
}
type ComponentReturn<M extends OverlayComponent> = OverlayComponentProps<M> extends PropsWithCallback<infer R> ? R : never;

export type AnyComponentPublicInstance = { $?: ComponentInternalInstance };

export function createOverlayInjection<C extends OverlayComponent, R extends ComponentReturn<C>>(
    component: C,
    props: OverlayComponentProps<C>,
    options?: OverlayOptions<C, R>
): OverlayInjection<C, R> {
    // create or reconfigure the existing overlay target
    // re-injecting every time keeps the overlay container at the very end of the DOM
    const targetEl = document.getElementById('vf-overlay-target') ?? document.createElement('div');
    targetEl.id = 'vf-overlay-target';
    targetEl.removeAttribute('inert');
    document.body.appendChild(targetEl);

    const overlayId = String(++overlayCount);
    const rawComponent = markRaw(component);
    const vnode = h(rawComponent, props);
    const wrapperVnode = options?.anchor ? h(OverlayAnchor, { overlayId, anchor: options.anchor }, () => [vnode]) : undefined;

    // todo: dunno what's going on with types here
    const injection: OverlayInjection<C, R> = {
        id: overlayId,
        component: rawComponent as any,
        props,
        options: options ?? {},
        vnode,
        wrapperVnode
    };
    OverlayInjections.push(injection);

    return injection;
}

export function dismissOverlayInjectionByInstance(instance: AnyComponentPublicInstance) {
    instance.$ && dismissOverlayInjectionByInternalInstance(instance.$);
}

export function dismissOverlayInjectionByInternalInstance(instance: ComponentInternalInstance) {
    let targetInstance: ComponentInternalInstance | null = instance;
    while (targetInstance && !dismissOverlayInjectionByVnode(targetInstance.vnode)) {
        targetInstance = targetInstance.parent;
    }
}

export function dismissOverlayInjectionByVnode(vnode: VNode) {
    const injectionIdx = OverlayInjections.findIndex(i => i.vnode.component === vnode.component);
    if (injectionIdx >= 0) {
        OverlayInjections[injectionIdx].props.callback();
        return true;
    }
    return false;
}

export function dismissOverlayInjectionById(id: string) {
    const injectionIdx = OverlayInjections.findIndex(i => i.id === id);
    if (injectionIdx >= 0) {
        OverlayInjections[injectionIdx].props.callback();
        return true;
    }
    return false;
}

export function removeOverlayInjection(injection: OverlayInjection<any, any>) {
    const index = OverlayInjections.indexOf(injection);
    if (index >= 0) {
        OverlayInjections.splice(index, 1);
    }
}

export async function presentOverlay<C extends OverlayComponent, R extends ComponentReturn<C>>(
    component: C,
    props: Omit<OverlayComponentProps<C>, 'callback'>,
    options?: OverlayOptions<C, R>
): Promise<R | undefined> {
    return new Promise<R>(resolve => {
        let overlayInjection: OverlayInjection<C, R> | null = null;
        const callback = async (result: R) => {
            if (options?.onCallback) {
                const hookResult = options.onCallback(result);
                if (typeof hookResult === 'object' && 'then' in hookResult && typeof hookResult.then === 'function') {
                    // ^ hack for ZoneAwarePromise
                    const hookResultValue = await hookResult;
                    if (hookResultValue === false) {
                        return;
                    }
                }
            }

            removeOverlayInjection(overlayInjection!);
            resolve(result);
        };
        const resolvedProps = { ...props, callback } as OverlayComponentProps<C>;
        overlayInjection = createOverlayInjection(component, resolvedProps, options);
    });
}
