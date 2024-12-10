<!-- eslint-disable vue/no-v-html -->
<template>
    <div ref="el" class="vf-smart-select" :class="{ disabled: effectiveDisabled, open: shouldDisplayOptions }">
        <input
            ref="searchField"
            v-model="searchText"
            type="text"
            :disabled="effectiveDisabled"
            :class="{ nullable: !!nullTitle }"
            :placeholder="effectivePlaceholder"
            :required="required"
            data-1p-ignore
            @keydown="handleKeyDown"
            @focus="handleInputFocused"
            @blur="handleInputBlurred"
        />
        <div v-if="shouldDisplayOptions" ref="optionsContainer" class="vf-smart-select-options">
            <div v-if="!isLoaded" class="no-results">Loading...</div>
            <template v-else>
                <div
                    v-for="option in effectiveOptions"
                    :key="String(option.key)"
                    class="option"
                    :class="{
                        highlighted: highlightedOptionKey === option.key
                    }"
                    @mousemove="handleOptionHover(option)"
                    @mousedown="selectOption(option)"
                >
                    <div class="title" v-html="option.title" />
                    <div v-if="option.subtitle" class="subtitle" v-html="option.subtitle" />
                </div>
                <div v-if="!effectiveOptions.length && searchText" class="no-results">
                    {{ effectiveNoResultsText }}
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup generic="T, V = T">
import { debounce, isEqual } from 'lodash';
import { computed, onMounted, type Ref, ref, watch } from 'vue';

import { escapeHtml } from '../helpers/string';

const NullSymbol = Symbol('null');
const CreateSymbol = Symbol('create');

const VALID_KEYS = `\`1234567890-=[]\\;',./~!@#$%^&*()_+{}|:"<>?qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM`;

interface OptionDescriptor {
    key: string | symbol;
    title: string;
    subtitle?: string | null;
    searchContent?: string;
    ref?: T;
}

const props = defineProps<{
    modelValue: V | null;
    loadOptions?: (searchText: string | null) => Promise<T[]>;
    options?: T[];
    prependOptions?: T[];
    appendOptions?: T[];
    onCreateItem?: (searchText: string) => void;
    preload?: boolean;
    remoteSearch?: boolean;
    searchFields?: (keyof T)[];
    placeholder?: string;
    keyField?: keyof T;
    keyExtractor?: (option: T) => string | symbol;
    valueField?: keyof T;
    valueExtractor?: (option: T) => V;
    labelField?: keyof T;
    formatter?: (option: T) => string;
    subtitleFormatter?: (option: T) => string;
    nullTitle?: string;
    noResultsText?: string;
    disabled?: boolean;
    optionsListId?: string;
    debug?: boolean;
    required?: boolean;
    showCreateTextOnNewItem?: boolean;
}>();

const emit = defineEmits<{
    optionsLoaded: [T[]];
    'update:modelValue': [V];
}>();

defineExpose({
    addRemoteOption
});

const el = ref<HTMLDivElement>();
const searchField = ref<HTMLInputElement>();
const optionsContainer = ref<HTMLDivElement>();

const isLoading = ref(false);
const isLoaded = ref(false);
const loadedOptions = ref<T[]>([]) as Ref<T[]>;
const isSearching = ref(false);
const searchText = ref('');
const selectedOption = ref<T | null>(null);
const selectedOptionTitle = ref<string | null>(null);
const shouldDisplayOptions = ref(false);
const highlightedOptionKey = ref<string | symbol | null>(null);
const shouldShowCreateOption = ref(false);
const shouldShowCreateTextOnNewItem = computed(() => props.showCreateTextOnNewItem ?? true);

const effectivePrependOptions = computed(() => props.prependOptions ?? []);
const effectiveAppendOptions = computed(() => props.appendOptions ?? []);
const effectiveDisabled = computed(() => !!props.disabled);
const effectivePlaceholder = computed(() => {
    if (!isLoaded.value && props.preload) return 'Loading...';
    if (props.nullTitle) return props.nullTitle;
    return props.placeholder || '';
});
const effectiveNoResultsText = computed(() => props.noResultsText || 'No options match your search.');

const effectiveValueExtractor = computed(() => {
    if (props.valueExtractor) return props.valueExtractor;
    if (props.valueField) return (option: T) => option[props.valueField!];
    return null;
});
const effectiveKeyExtractor = computed(() => {
    if (props.keyExtractor) return props.keyExtractor;
    if (props.keyField) return (option: T) => String(option[props.keyField!]);
    if (effectiveValueExtractor.value) return (option: T) => String(effectiveValueExtractor.value!(option));
    return null;
});
const effectiveFormatter = computed(() => {
    if (props.formatter) return props.formatter;
    if (props.labelField) return (option: T) => String(option[props.labelField!]);
    return (option: T) => String(option);
});

const allOptions = computed(() => [...effectivePrependOptions.value, ...loadedOptions.value, ...effectiveAppendOptions.value]);

const optionsDescriptors = computed(() => {
    return allOptions.value.map((option, index) => {
        const title = effectiveFormatter.value(option);
        const subtitle = props.subtitleFormatter?.(option);
        const strippedTitle = title ? title.trim().toLowerCase() : '';
        const strippedSubtitle = subtitle ? subtitle.trim().toLowerCase() : '';

        const searchContent = [];
        if (props.searchFields) {
            props.searchFields.forEach(field => {
                if (option[field]) {
                    searchContent.push(String(option[field]).toLowerCase());
                }
            });
        } else {
            searchContent.push(strippedTitle);
            if (strippedSubtitle) {
                searchContent.push(strippedSubtitle);
            }
        }

        return {
            key: effectiveKeyExtractor.value?.(option) ?? String(index),
            title,
            subtitle,
            searchContent: searchContent.join(''),
            ref: option
        } as OptionDescriptor;
    });
});

const effectiveOptions = computed(() => {
    let options = [...optionsDescriptors.value];

    if (isSearching.value) {
        const strippedSearchText = searchText.value.trim().toLowerCase();

        if (strippedSearchText.length) {
            options = options.filter(option => option.searchContent!.includes(strippedSearchText));

            const escapedSearchText = escapeHtml(searchText.value).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
            const searchRe = new RegExp(`(${escapedSearchText})`, 'ig');

            options = options.map(option => ({
                ...option,
                title: option.title.replace(searchRe, '<mark>$1</mark>'),
                subtitle: option.subtitle?.replace(searchRe, '<mark>$1</mark>')
            }));

            if (shouldShowCreateOption.value) {
                const hasExactMatch = options.find(option => option.searchContent === strippedSearchText) !== undefined;
                if (!hasExactMatch) {
                    options.push({
                        key: CreateSymbol,
                        title: shouldShowCreateTextOnNewItem.value
                            ? 'Create <strong>' + searchText.value.trim() + '</strong>...'
                            : searchText.value.trim()
                    });
                }
            }
        }
    } else if (props.nullTitle) {
        options.unshift({
            key: NullSymbol,
            title: props.nullTitle
        });
    }

    return options;
});

// watch props
watch(() => props.modelValue, handleValueChanged);
watch(
    () => props.options,
    () => {
        loadedOptions.value = props.options ?? [];
        isLoaded.value = true;
    }
);

// watch data

watch(optionsDescriptors, () => {
    if (shouldDisplayOptions.value) {
        setTimeout(highlightInitialOption, 0);
    }
});

watch(searchText, () => {
    // don't disable searching here if it's remote search, as that will need to be done after the fetch
    if (isSearching.value && !props.remoteSearch && !searchText.value.trim().length) {
        isSearching.value = false;
    }
});

watch(shouldDisplayOptions, () => {
    if (shouldDisplayOptions.value) {
        setTimeout(handleOptionsDisplayed, 0);
    } else {
        isSearching.value = false;
        searchText.value = selectedOptionTitle.value || '';

        if (optionsContainer.value) {
            optionsContainer.value.style.visibility = 'hidden';
        }
    }
});

watch(effectiveOptions, () => {
    if (props.modelValue && !selectedOption.value) {
        handleValueChanged();
    }

    if ((highlightedOptionKey.value || isSearching.value) && !effectiveOptions.value.find(option => option.key == highlightedOptionKey.value)) {
        highlightedOptionKey.value = effectiveOptions.value[0]?.key ?? NullSymbol;
    }
});

onMounted(async () => {
    shouldShowCreateOption.value = props.onCreateItem !== undefined;

    if (props.options) {
        loadedOptions.value = [...props.options];
        isLoaded.value = true;
    } else if (props.preload) {
        await loadRemoteOptions();
    }

    handleValueChanged();

    watch(selectedOption, () => {
        if (selectedOption.value !== props.modelValue) {
            emit(
                'update:modelValue',
                selectedOption.value && effectiveValueExtractor.value ? effectiveValueExtractor.value(selectedOption.value) : selectedOption.value
            );
        }
    });

    if (props.remoteSearch) {
        watch(searchText, debounce(reloadOptionsIfSearching, 250));
    }
});

async function loadRemoteOptions() {
    await reloadOptions();
    if (loadedOptions.value) emit('optionsLoaded', loadedOptions.value);
}

async function reloadOptions() {
    const effectiveSearchText = props.remoteSearch && isSearching.value && searchText.value ? searchText.value : null;
    isLoading.value = true;
    loadedOptions.value = (await props.loadOptions?.(effectiveSearchText)) ?? [];
    isLoading.value = false;
    isLoaded.value = true;
}

function reloadOptionsIfSearching() {
    if (isSearching.value) {
        reloadOptions();
        isSearching.value = searchText.value.trim().length > 0;
    }
}

function handleKeyDown(e: KeyboardEvent) {
    if (e.key == 'Escape') {
        e.stopPropagation();
        (e.target as HTMLInputElement).blur();
        focusNextInput();
        return;
    }

    if (e.key == 'ArrowLeft' || e.key == 'ArrowRight') return;
    if (e.key == 'Tab') return;

    if (!isLoaded.value) {
        if (!isSearching.value) e.preventDefault();
        return;
    }

    if (e.key == 'ArrowUp' || e.key == 'ArrowDown') {
        e.preventDefault();
        return incrementHighlightedOption(e.key == 'ArrowUp' ? -1 : 1);
    }

    if (e.key == 'PageUp' || e.key == 'PageDown') {
        e.preventDefault();
        return incrementHighlightedOption(e.key == 'PageUp' ? -10 : 10);
    }

    if (e.key == 'Home' || e.key == 'End') {
        e.preventDefault();
        return incrementHighlightedOption(e.key == 'Home' ? -Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);
    }

    if (e.key == 'Enter') {
        e.preventDefault();
        const highlightedOption = effectiveOptions.value.find(option => option.key == highlightedOptionKey.value);
        if (highlightedOption) return selectOption(highlightedOption);
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (searchText.value.length > 1) {
            isSearching.value = true;
        }
        return;
    }

    if (!e.metaKey && VALID_KEYS.includes(e.key)) {
        isSearching.value = true;
    }
}

function handleInputFocused() {
    setHighlightedOptionKey();
    shouldDisplayOptions.value = true;
    setTimeout(() => searchField.value?.select(), 0);
}

function setHighlightedOptionKey(useFirstItemAsFallback?: boolean) {
    if (selectedOption.value) {
        highlightedOptionKey.value = getOptionKey(selectedOption.value);
    } else if (useFirstItemAsFallback) {
        highlightedOptionKey.value = effectiveOptions.value?.[0].key ?? NullSymbol;
    } else if (props.nullTitle) {
        highlightedOptionKey.value = NullSymbol;
    }
}

function getOptionKey(option: T): string | symbol {
    if (effectiveKeyExtractor.value) {
        return effectiveKeyExtractor.value(selectedOption.value);
    }

    return getOptionDescriptor(option)?.key ?? '';
}

function getOptionDescriptor(option: T) {
    const matchedRef = effectiveOptions.value.find(o => o.ref === option);
    if (matchedRef) {
        return matchedRef;
    }

    // didn't find an object match, so we'll try a content match. a couple reasons:
    // 1) the initial selection may have come from an owning object and the object as a whole may differ from the full content list
    // 2) for reasons I've yet to determine, the prepend options, although they are wrapped by proxies and have identical content,
    //    are not the same proxy object as selectedOption once assigned -- even though the loaded data *is* the same. I've tried
    //    setting them as reactive using the same method (via data props rather than computed) and it didn't change anything.
    //    therefore, falling back to an isEqual check here when there's no equal object
    const matcher = props.keyExtractor ? (a: T, b: T) => props.keyExtractor!(a) === props.keyExtractor!(b) : isEqual;
    const matchedObj = effectiveOptions.value.find(o => matcher(o.ref!, option));
    if (matchedObj) {
        return matchedObj;
    }

    return null;
}

function handleInputBlurred() {
    if (props.debug) return;

    if (!searchText.value.length && props.nullTitle) {
        selectedOption.value = null;
        selectedOptionTitle.value = null;
    }

    shouldDisplayOptions.value = false;
}

function handleOptionsDisplayed() {
    if (!isLoaded.value) loadRemoteOptions();
    if (props.optionsListId) optionsContainer.value?.setAttribute('id', props.optionsListId);
    teleportOptionsContainer();
}

function teleportOptionsContainer() {
    const elRect = el.value!.getBoundingClientRect();
    const targetTop = elRect.y + elRect.height + 2;
    const targetLeft = elRect.x;

    const optionsEl = optionsContainer.value!;
    const styles = window.getComputedStyle(el.value!);

    for (let key in styles) {
        if (!/^(font|text)/.test(key)) continue;
        optionsEl.style[key] = styles[key];
    }

    optionsEl.style.top = targetTop + 'px';
    optionsEl.style.left = targetLeft + 'px';
    optionsEl.style.minWidth = elRect.width + 'px';

    if (!styles.maxHeight || styles.maxHeight == 'none') {
        const maxHeight = window.innerHeight - targetTop - 12;
        optionsEl.style.maxHeight = maxHeight + 'px';
    }

    optionsEl.style.visibility = 'visible';

    document.body.appendChild(optionsEl);

    setTimeout(highlightInitialOption, 0);
}

function highlightInitialOption() {
    if (!isLoaded.value) return;
    if (!highlightedOptionKey.value) return;
    const highlightedOptionIdx = effectiveOptions.value.findIndex(option => option.key == highlightedOptionKey.value);
    const containerEl = optionsContainer.value!;
    const highlightedOptionEl = containerEl?.querySelectorAll('.option')[highlightedOptionIdx] as HTMLElement;
    if (!highlightedOptionEl) return;
    containerEl.scrollTop = highlightedOptionEl.offsetTop;
}

function handleOptionHover(option: OptionDescriptor) {
    highlightedOptionKey.value = option ? option.key : null;
}

function incrementHighlightedOption(increment: number) {
    const highlightedOptionIdx = effectiveOptions.value.findIndex(option => option.key == highlightedOptionKey.value);
    let targetOptionIdx = highlightedOptionIdx + increment;

    if (targetOptionIdx < 0) targetOptionIdx = 0;
    else if (targetOptionIdx >= effectiveOptions.value.length) targetOptionIdx = effectiveOptions.value.length - 1;

    if (highlightedOptionIdx == targetOptionIdx) return;

    highlightedOptionKey.value = effectiveOptions.value[targetOptionIdx].key;

    const containerEl = optionsContainer.value!;
    const targetOptionEl = containerEl?.querySelectorAll('.option')[targetOptionIdx] as HTMLElement;
    if (!targetOptionEl) return;

    if (targetOptionEl.offsetTop < containerEl.scrollTop) {
        containerEl.scrollTop = targetOptionEl.offsetTop;
    } else if (targetOptionEl.offsetTop + targetOptionEl.offsetHeight > containerEl.scrollTop + containerEl.clientHeight) {
        containerEl.scrollTop = targetOptionEl.offsetTop + targetOptionEl.offsetHeight - containerEl.clientHeight;
    }
}

function selectOption(option: OptionDescriptor) {
    isSearching.value = false;

    if (option.key == NullSymbol) {
        searchText.value = '';
        selectedOption.value = null;
        selectedOptionTitle.value = null;
    } else if (option.key === CreateSymbol) {
        const createText = searchText.value.trim();
        searchText.value = '';
        selectedOption.value = null;
        selectedOptionTitle.value = null;
        props.onCreateItem?.(createText);
    } else {
        const selectedDecoratedOption = optionsDescriptors.value.find(decoratedOption => decoratedOption.key == option.key);
        const realOption = selectedDecoratedOption!.ref;
        selectedOption.value = realOption!;
        selectedOptionTitle.value = effectiveFormatter.value(realOption!);
        searchText.value = selectedOptionTitle.value || '';
    }

    searchField.value?.blur();
    focusNextInput();
}

function handleValueChanged() {
    if (props.modelValue) {
        selectedOption.value = effectiveValueExtractor.value
            ? allOptions.value.find(o => props.modelValue === effectiveValueExtractor.value!(o))
            : props.modelValue;
        selectedOptionTitle.value = selectedOption.value ? effectiveFormatter.value(selectedOption.value) : null;
        searchText.value = selectedOptionTitle.value || '';
    } else {
        selectedOption.value = null;
        selectedOptionTitle.value = null;
        searchText.value = '';
    }
}

function addRemoteOption(option: T) {
    loadedOptions.value.unshift(option);
}

function focusNextInput() {
    let parent = el.value?.parentElement;
    while (parent && parent.tagName !== 'FORM' && parent.tagName !== 'BODY') {
        parent = parent.parentElement;
    }
    if (!parent) return;

    const allFocusableElements = parent.querySelectorAll('input, button, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (!allFocusableElements) return;

    const currentInputIndex = Array.from(allFocusableElements).findIndex(el => el === searchField.value);
    const nextInput = allFocusableElements[currentInputIndex + 1] as HTMLElement;
    if (nextInput) setTimeout(() => nextInput.focus(), 0);
}
</script>

<style lang="scss">
.vf-smart-select {
    position: relative;

    input {
        width: 100%;
        padding-right: 24px !important;

        &.nullable::placeholder {
            color: #000;
        }
    }

    &:after {
        content: ' ';
        display: block;
        position: absolute;
        top: 50%;
        right: 8px;
        margin-top: -3px;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 5px 5px 0 5px;
        border-color: #333333 transparent transparent transparent;
        pointer-events: none;
    }

    &.open:after {
        margin-top: -4px;
        border-width: 0 5px 5px 5px;
        border-color: transparent transparent #333333 transparent;
    }

    &:not(.disabled) {
        input {
            cursor: pointer;
        }
    }

    &.disabled:after {
        opacity: 0.4;
    }
}

.vf-smart-select-options {
    visibility: hidden;
    position: absolute;
    min-height: 20px;
    border: 1px solid #e8e8e8;
    background: white;
    overflow: auto;
    z-index: 101;

    .option,
    .no-results {
        padding: 5px 8px;
    }

    .option {
        cursor: pointer;

        &.highlighted {
            background-color: #f5f5f5;
        }
    }
}
</style>
