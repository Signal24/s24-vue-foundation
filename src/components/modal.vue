<template>
    <div :id="id" class="vf-overlay vf-modal-wrap" :class="classList" ref="overlay">
        <form action="." class="vf-modal" :class="{ scrolls }" @submit.prevent="$emit('formSubmit')" ref="form">
            <div v-if="$slots.header" class="vf-modal-header">
                <slot name="header" />
                <i v-if="props.closeX" class="close" @click="closeParent"></i>
            </div>
            <div class="vf-modal-content">
                <slot />
            </div>
            <div v-if="$slots.footer" class="vf-modal-footer">
                <slot name="footer" />
            </div>
        </form>
    </div>
</template>

<script lang="ts" setup>
import { compact } from 'lodash';
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue';

import { maskForm, unmaskForm } from '../helpers/mask';
import { dismissOverlayInjectionByInternalInstance } from './overlay-container';

const instance = getCurrentInstance();

const props = defineProps<{
    id?: string;
    closeOnMaskClick?: boolean;
    scrolls?: boolean;
    closeX?: boolean;
    class?: string | string[];
}>();

defineEmits(['formSubmit']);
defineExpose({ mask, unmask, hide, unhide });

const overlay = ref<HTMLElement>();
const form = ref<HTMLFormElement>();

const isHidden = ref(false);

const classList = computed(() => {
    return compact([...(Array.isArray(props.class) ? props.class : [props.class]), isHidden.value && 'hidden']);
});

onMounted(() => {
    document.body.classList.add('vf-modal-open');

    if (props.closeOnMaskClick) {
        window.addEventListener('keydown', handleEscapeKey);
        overlay.value?.addEventListener('click', handleOverlayClick);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleEscapeKey);

    const areOtherModalsOpen = document.body.querySelectorAll('.vf-modal').length > 0;
    areOtherModalsOpen || document.body.classList.remove('vf-modal-open');
});

function handleOverlayClick(e: MouseEvent) {
    if (e.target == overlay.value) {
        closeParent();
    }
}

function handleEscapeKey(e: KeyboardEvent) {
    if (e.key === 'Esc' || e.key === 'Escape') {
        const modalWraps = document.querySelectorAll('.vf-modal-wrap');
        // make sure we're the topmost modal
        if (modalWraps[modalWraps.length - 1] === overlay.value) {
            closeParent();
        }
    }
}

function closeParent() {
    dismissOverlayInjectionByInternalInstance(instance!);
}

function mask() {
    maskForm(form.value!);
    return () => unmask();
}

function unmask() {
    unmaskForm(form.value!);
}

function hide() {
    isHidden.value = true;
    return () => unhide();
}

function unhide() {
    isHidden.value = false;
}
</script>

<style lang="scss">
.vf-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100;

    &.hidden {
        display: none;
    }
}

.vf-modal-wrap {
    background: rgba(0, 0, 0, 0.25);
    display: flex;
    justify-content: center;
    align-items: center;
}

// TODO: make modal backgrounds not stack, except don't make the top-most modal transparent if there's
// a context menu or dropdown on top of it
// .vf-modal-wrap:not(:last-child) {
//     background: transparent;
// }

.vf-modal {
    background: white;
    box-shadow: 0px 3px 6px 0px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    max-width: 95%;
    max-height: 95%;
    display: flex;
    flex-direction: column;
}

.vf-modal-header {
    flex-shrink: 0;
    position: relative;
}

.vf-modal-footer {
    flex-shrink: 0;
    position: relative;
}

.vf-modal.scrolls > .vf-modal-content {
    overflow: auto;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0%;
}
</style>
