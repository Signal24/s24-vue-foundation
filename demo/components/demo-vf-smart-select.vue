<template>
    <div id="demo-vf-smart-select">
        <VfSmartSelect v-model="selectedOption" :options="options" label-field="label" />
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import VfSmartSelect from '@/components/vf-smart-select.vue';

const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
    { value: '4', label: 'Option 4' },
    { value: '5', label: 'Option 5' },
    { value: '6', label: 'Option 6' },
    { value: '7', label: 'Option 7' },
    { value: '8', label: 'Option 8' },
    { value: '9', label: 'Option 9' },
    { value: '10', label: 'Option 10' }
];

const selectedOption = ref<(typeof options)[number] | null>(null);
</script>

<style lang="scss" scoped></style>
