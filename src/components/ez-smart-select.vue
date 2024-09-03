<template>
    <VfSmartSelect v-model="selectedItem" :options="computedOpts" :formatter="ezFormatter" :null-title="nullTitle" />
</template>

<script lang="ts" setup>
import { isEqual } from 'lodash';
import { computed, ref, watch } from 'vue';

import VfSmartSelect from './smart-select.vue';

type GenericObject = { [key: string]: any };

const props = defineProps<{
    modelValue: string | null | undefined;
    nullTitle?: string;
    placeholder?: string;
    options: Record<string, string> | string[];
    formatter?: (value: any) => string;
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
        return (o: GenericObject) => props.formatter?.(o.label);
    }
    return (o: GenericObject) => o.label;
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string | null): void;
}>();

const selectedItem = ref<GenericObject | null>(computedOpts.value.find(o => o.value === props.modelValue) ?? null);
watch(
    () => props.modelValue,
    value => {
        selectedItem.value = computedOpts.value.find(o => o.value === value) ?? null;
    }
);
watch(selectedItem, value => {
    emit('update:modelValue', value ? (computedOpts.value.find(o => isEqual(o, value))?.value ?? null) : null);
});
</script>
