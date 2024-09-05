<template>
    <select v-if="!renderOptions" disabled>
        <option>{{ props.loadingText || 'Loading...' }}</option>
    </select>
    <select v-else v-model="selectedItem">
        <option v-if="props.nullText" :value="null">{{ props.nullText }}</option>
        <option v-for="(renderOption, index) in renderOptions" :key="index" :value="options?.[index]">
            {{ renderOption }}
        </option>
    </select>
</template>

<script setup lang="ts" generic="T">
import { computed, defineEmits, defineProps, onMounted, ref, watch } from 'vue';

// todo: make type safe when Vue alpha is released

const props = defineProps<{
    modelValue: T;
    loadFn: () => Promise<T[]>;
    nullText?: string;
    loadingText?: string;
    displayKey?: keyof T;
    preprocesor?: (option: T) => string;
}>();

const emit = defineEmits<{
    'update:modelValue': [T];
}>();

const options = ref<T[] | null>(null);
const renderOptions = computed(() => {
    if (!options.value) {
        return null;
    }

    const result = options.value.map(option => {
        const typedOption = option as T;
        if (props.preprocesor) return props.preprocesor(typedOption);
        if (props.displayKey) return typedOption[props.displayKey];
        return '';
    });

    return result;
});

const selectedItem = ref<T | null>(props.modelValue ?? null);

watch(() => props.loadFn, load);
watch(
    () => props.modelValue,
    () => (selectedItem.value = props.modelValue)
);
watch(selectedItem, () => emit('update:modelValue', selectedItem.value));

async function load() {
    options.value = await props.loadFn();
}

onMounted(load);
</script>
