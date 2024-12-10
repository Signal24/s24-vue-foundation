<template>
    <Modal :class="['vf-alert', ...(classes ?? [])]">
        <template v-if="title" #header>
            {{ title }}
        </template>

        <div v-if="isHtml" :innerHtml="message" class="user-message"></div>
        <div v-else :innerText="textMessage"></div>

        <template v-if="!isBare" #footer>
            <template v-if="shouldConfirm">
                <button v-autofocus class="primary" @click="() => callback(true)">Confirm</button>
                <button class="default" @click="() => callback(false)">Cancel</button>
            </template>
            <button v-else v-autofocus class="default" @click="() => callback(true)">OK</button>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { formatError } from '../helpers/error';
import Modal from './vf-modal.vue';

const props = defineProps<{
    isBare?: boolean;
    isHtml?: boolean;
    classes?: string[];
    title?: string;
    message: string | Error;
    shouldConfirm?: boolean;
    callback: (ok: boolean) => void;
}>();

const textMessage = computed(() => {
    if (props.message instanceof Error) {
        return formatError(props.message);
    }

    return props.message;
});
</script>

<style lang="scss">
.vf-modal-wrap.vf-alert {
    .vf-modal {
        max-width: 800px;

        > .vf-modal-content {
            padding: 12px;
        }
    }

    &.wait {
        .vf-modal-content {
            text-align: center;
        }
    }

    &.destructive {
        button.primary {
            color: red;
        }
    }
}
</style>
