<template>
    <VfSmartSelect v-model="selectedItem" :options="computedOpts" :formatter="ezFormatter" :null-title="nullTitle" />
</template>

<script lang="ts" setup>
import { isEqual } from 'lodash';
import { computed, ref, watch } from 'vue';

import VfSmartSelect from './vf-smart-select.vue';

interface IComputedOption {
    value: string;
    label: string;
}

const props = defineProps<{
    modelValue: string | null | undefined;
    nullTitle?: string;
    placeholder?: string;
    options: { [K: string]: string } | string[];
    formatter?: (title: string) => string;
}>();

const computedOpts = computed(() => {
    return Array.isArray(props.options)
        ? props.options.map(o => ({ value: o, label: o }))
        : Object.entries(props.options).map(([value, label]) => ({
              value,
              label
          }));
});

const ezFormatter = computed(() => {
    if (props.formatter) {
        return (o: IComputedOption) => props.formatter!(o.label);
    }
    return (o: IComputedOption) => o.label;
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string | null): void;
}>();

const selectedItem = ref<IComputedOption | null>(computedOpts.value.find(o => o.value === props.modelValue) ?? null);
watch(
    () => props.modelValue,
    value => {
        selectedItem.value = computedOpts.value.find(o => o.value === value) ?? null;
    }
);
watch(selectedItem, value => {
    const emitValue = value ? computedOpts.value.find(o => isEqual(o, value))?.value : null;
    emit('update:modelValue', emitValue ?? null);
});
</script>
