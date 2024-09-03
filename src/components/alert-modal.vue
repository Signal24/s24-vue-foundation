<template>
    <Modal :class="['vf-alert', ...(classes ?? [])]">
        <template v-if="title" v-slot:header>
            <h1>{{ title }}</h1>
        </template>

        <div v-if="isHtml" :innerHtml="message" class="user-message"></div>
        <div v-else :innerText="textMessage"></div>

        <template v-if="!isBare" v-slot:footer>
            <template v-if="shouldConfirm">
                <button class="primary" @click="() => callback(true)" v-autofocus>Confirm</button>
                <button class="default" @click="() => callback(false)">Cancel</button>
            </template>
            <button v-else class="default" @click="() => callback(true)" v-autofocus>OK</button>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { formatError } from '../helpers/error';
import Modal from './modal.vue';

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
