<template>
    <div class="vf-smart-select" :class="{ disabled: effectiveDisabled, open: shouldDisplayOptions }">
        <input
            v-model="searchText"
            ref="searchField"
            type="text"
            :class="{ nullable: !!nullTitle }"
            @keydown="handleKeyDown"
            :placeholder="effectivePlaceholder"
            v-disabled="effectiveDisabled"
            @focus="handleInputFocused"
            @blur="handleInputBlurred"
            :required="required"
            data-1p-ignore
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

<script lang="ts">
import { debounce, isEqual } from 'lodash';
import type { PropType } from 'vue';

import { escapeHtml } from '../helpers/string';

const NullSymbol = Symbol('null');
const CreateSymbol = Symbol('create');

const VALID_KEYS = `\`1234567890-=[]\\;',./~!@#$%^&*()_+{}|:"<>?qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM`;

// todo: make type safe when Vue alpha is released

export type GenericObject = { [key: string]: any };
export interface OptionDescriptor {
    key: string | Symbol;
    title: string;
    subtitle?: string | null;
    searchContent?: string;
    ref?: GenericObject;
}

export default {
    props: {
        modelValue: {
            type: null as unknown as PropType<any>,
            default: null
        },
        loadOptions: Function as PropType<(searchText: string | null) => Promise<GenericObject[]>>,
        options: Object as PropType<GenericObject[]>,
        prependOptions: Object as PropType<GenericObject[]>,
        appendOptions: Object as PropType<GenericObject[]>,
        onCreateItem: Function as PropType<(searchText: string) => void>,
        preload: Boolean as PropType<boolean>,
        remoteSearch: Boolean as PropType<boolean>,
        searchFields: Object as PropType<string[]>,
        placeholder: String as PropType<string>,
        keyExtractor: Function as PropType<(option: any) => string | symbol>,
        valueExtractor: Function as PropType<(option: any) => any>,
        formatter: {
            type: Function as PropType<(option: any) => string>,
            required: true
        },
        subtitleFormatter: Function as PropType<(option: any) => string>,
        nullTitle: String as PropType<string>,
        noResultsText: String as PropType<string>,
        disabled: Boolean as PropType<boolean>,
        optionsListId: String as PropType<string>,
        debug: Boolean as PropType<boolean>,
        required: Boolean as PropType<boolean>
    },

    emits: {
        optionsLoaded: Object as (options: any[]) => void,
        'update:modelValue': Object as (value: any) => void
    },

    data() {
        return {
            isLoading: false,
            isLoaded: false,
            loadedOptions: [],
            isSearching: false,
            searchText: '',
            selectedOption: null,
            selectedOptionTitle: null,
            shouldDisplayOptions: false,
            highlightedOptionKey: null,
            shouldShowCreateOption: false
        } as {
            isLoading: boolean;
            isLoaded: boolean;
            loadedOptions: GenericObject[];
            isSearching: boolean;
            searchText: string;
            selectedOption: GenericObject | null;
            selectedOptionTitle: string | null;
            shouldDisplayOptions: boolean;
            highlightedOptionKey: string | Symbol | null;
            shouldShowCreateOption: boolean;
        };
    },

    computed: {
        /**
         * EFFECTIVE PROPS
         */
        effectivePrependOptions() {
            return this.prependOptions ?? [];
        },

        effectiveAppendOptions() {
            return this.appendOptions ?? [];
        },

        effectiveDisabled() {
            return !!this.disabled; // there was another condition here but it didn't make sense
        },

        effectivePlaceholder() {
            if (!this.isLoaded && this.preload) return 'Loading...';
            if (this.nullTitle) return this.nullTitle;
            return this.placeholder || '';
        },

        effectiveNoResultsText() {
            return this.noResultsText || 'No options match your search.';
        },

        effectiveKeyExtractor() {
            return this.keyExtractor ?? this.valueExtractor;
        },

        /**
         * OPTIONS GENERATION
         */

        allOptions() {
            return [...this.effectivePrependOptions, ...this.loadedOptions, ...this.effectiveAppendOptions];
        },

        optionsDescriptors() {
            return this.allOptions.map((option, index) => {
                const title = this.formatter!(option);
                const subtitle = this.subtitleFormatter?.(option);
                const strippedTitle = title ? title.trim().toLowerCase() : '';
                const strippedSubtitle = subtitle ? subtitle.trim().toLowerCase() : '';

                const searchContent = [];
                if (this.searchFields) {
                    this.searchFields.forEach(field => {
                        option[field] && searchContent.push(String(option[field]).toLowerCase());
                    });
                } else {
                    searchContent.push(strippedTitle);
                    strippedSubtitle && searchContent.push(strippedSubtitle);
                }

                return {
                    // eslint-disable-next-line vue/no-use-computed-property-like-method
                    key: this.effectiveKeyExtractor?.(option) ?? String(index),
                    title,
                    subtitle,
                    searchContent: searchContent.join(''),
                    ref: option
                } as OptionDescriptor;
            });
        },

        effectiveOptions() {
            let options = [...this.optionsDescriptors];

            if (this.isSearching) {
                const strippedSearchText = this.searchText.trim().toLowerCase();

                if (strippedSearchText.length) {
                    options = options.filter(option => option.searchContent!.includes(strippedSearchText));

                    const escapedSearchText = escapeHtml(this.searchText).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const searchRe = new RegExp(`(${escapedSearchText})`, 'ig');

                    options = options.map(option => ({
                        ...option,
                        title: option.title.replace(searchRe, '<mark>$1</mark>'),
                        subtitle: option.subtitle?.replace(searchRe, '<mark>$1</mark>')
                    }));

                    if (this.shouldShowCreateOption) {
                        const hasExactMatch = options.find(option => option.searchContent === strippedSearchText) !== undefined;
                        if (!hasExactMatch) {
                            options.push({
                                key: CreateSymbol,
                                title: 'Create <strong>' + this.searchText.trim() + '</strong>...'
                            });
                        }
                    }
                }
            } else if (this.nullTitle) {
                options.unshift({
                    key: NullSymbol,
                    title: this.nullTitle
                });
            }

            return options;
        }
    },

    watch: {
        // props

        modelValue() {
            this.handleValueChanged();
        },

        options() {
            this.loadedOptions = this.options ?? [];
            this.isLoaded = true;
        },

        // data

        optionsDescriptors() {
            if (this.shouldDisplayOptions) {
                setTimeout(this.highlightInitialOption, 0);
            }
        },

        searchText() {
            // don't disable searching here if it's remote search, as that will need to be done after the fetch
            if (this.isSearching && !this.remoteSearch && !this.searchText.trim().length) {
                this.isSearching = false;
            }
        },

        shouldDisplayOptions() {
            if (this.shouldDisplayOptions) {
                setTimeout(this.handleOptionsDisplayed, 0);
            } else {
                this.isSearching = false;
                this.searchText = this.selectedOptionTitle || '';

                if (this.$refs.optionsContainer) {
                    (this.$refs.optionsContainer as HTMLElement).style.visibility = 'hidden';
                }
            }
        },

        effectiveOptions() {
            if (this.modelValue && !this.selectedOption) {
                this.handleValueChanged();
            }

            if (this.highlightedOptionKey && !this.effectiveOptions.find(option => option.key == this.highlightedOptionKey)) {
                this.highlightedOptionKey = this.effectiveOptions[0]?.key ?? NullSymbol;
            }
        }
    },

    async mounted() {
        this.shouldShowCreateOption = this.onCreateItem !== undefined;

        if (this.options) {
            this.loadedOptions = this.options;
            this.isLoaded = true;
        } else if (this.preload) {
            await this.loadRemoteOptions();
        }

        this.handleValueChanged();

        this.$watch('selectedOption', () => {
            if (this.selectedOption !== this.modelValue) {
                this.$emit(
                    'update:modelValue',
                    this.selectedOption && this.valueExtractor ? this.valueExtractor(this.selectedOption) : this.selectedOption
                );
            }
        });

        if (this.remoteSearch) {
            this.$watch('searchText', debounce(this.reloadOptionsIfSearching, 250));
        }
    },

    methods: {
        async loadRemoteOptions() {
            await this.reloadOptions();
            this.loadedOptions && this.$emit('optionsLoaded', this.loadedOptions);
        },

        async reloadOptions() {
            const searchText = this.remoteSearch && this.isSearching && this.searchText ? this.searchText : null;
            this.isLoading = true;
            this.loadedOptions = (await this.loadOptions?.(searchText)) ?? [];
            this.isLoading = false;
            this.isLoaded = true;
        },

        reloadOptionsIfSearching() {
            if (this.isSearching) {
                this.reloadOptions();
                this.isSearching = this.searchText.trim().length > 0;
            }
        },

        handleKeyDown(e: KeyboardEvent) {
            if (e.key == 'Escape') {
                e.stopPropagation();
                (e.target as any).blur();
                return;
            }

            if (e.key == 'ArrowLeft' || e.key == 'ArrowRight') return;
            if (e.key == 'Tab') return;

            if (!this.isLoaded) {
                this.isSearching || e.preventDefault();
                return;
            }

            if (e.key == 'ArrowUp' || e.key == 'ArrowDown') {
                e.preventDefault();
                return this.incrementHighlightedOption(e.key == 'ArrowUp' ? -1 : 1);
            }

            if (e.key == 'PageUp' || e.key == 'PageDown') {
                e.preventDefault();
                return this.incrementHighlightedOption(e.key == 'PageUp' ? -10 : 10);
            }

            if (e.key == 'Home' || e.key == 'End') {
                e.preventDefault();
                return this.incrementHighlightedOption(e.key == 'Home' ? -Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);
            }

            if (e.key == 'Enter') {
                e.preventDefault();
                const highlightedOption = this.effectiveOptions.find(option => option.key == this.highlightedOptionKey);
                if (highlightedOption) return this.selectOption(highlightedOption);
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.searchText.length > 1) {
                    this.isSearching = true;
                }
                return;
            }

            if (!e.metaKey && VALID_KEYS.includes(e.key)) {
                this.isSearching = true;
            }
        },

        handleInputFocused() {
            this.setHighlightedOptionKey();
            this.shouldDisplayOptions = true;
        },

        setHighlightedOptionKey(useFirstItemAsFallback?: boolean) {
            if (this.selectedOption) {
                this.highlightedOptionKey = this.getOptionKey(this.selectedOption);
            } else if (useFirstItemAsFallback) {
                this.highlightedOptionKey = this.effectiveOptions?.[0].key ?? NullSymbol;
            } else if (this.nullTitle) {
                this.highlightedOptionKey = NullSymbol;
            }
        },

        getOptionKey(option: GenericObject): string | Symbol {
            if (this.effectiveKeyExtractor) {
                // eslint-disable-next-line vue/no-use-computed-property-like-method
                return this.effectiveKeyExtractor(this.selectedOption)!;
            }

            return this.getOptionDescriptor(option)?.key ?? '';
        },

        getOptionDescriptor(option: GenericObject) {
            const matchedRef = this.effectiveOptions.find(o => o.ref === option);
            if (matchedRef) {
                return matchedRef;
            }

            // didn't find an object match, so we'll try a content match. a couple reasons:
            // 1) the initial selection may have come from an owning object and the object as a whole may differ from the full content list
            // 2) for reasons I've yet to determine, the prepend options, although they are wrapped by proxies and have identical content,
            //    are not the same proxy object as selectedOption once assigned -- even though the loaded data *is* the same. I've tried
            //    setting them as reactive using the same method (via data props rather than computed) and it didn't change anything.
            //    therefore, falling back to an isEqual check here when there's no equal object
            const matcher = this.keyExtractor ? (a: GenericObject, b: GenericObject) => this.keyExtractor!(a) === this.keyExtractor!(b) : isEqual;
            const matchedObj = this.effectiveOptions.find(o => matcher(o.ref!, option));
            if (matchedObj) {
                return matchedObj;
            }

            return null;
        },

        handleInputBlurred() {
            if (this.debug) return;

            if (!this.searchText.length && this.nullTitle) {
                this.selectedOption = null;
                this.selectedOptionTitle = null;
            }

            this.shouldDisplayOptions = false;
        },

        handleOptionsDisplayed() {
            this.isLoaded || this.loadRemoteOptions();
            this.optionsListId && (this.$refs.optionsContainer as HTMLElement).setAttribute('id', this.optionsListId);
            this.teleportOptionsContainer();
        },

        teleportOptionsContainer() {
            const elRect = this.$el.getBoundingClientRect();
            const targetTop = elRect.y + elRect.height + 2;
            const targetLeft = elRect.x;

            const optionsEl = this.$refs.optionsContainer as HTMLElement;
            const styles = window.getComputedStyle(this.$el);

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

            setTimeout(this.highlightInitialOption, 0);
        },

        highlightInitialOption() {
            if (!this.isLoaded) return;
            if (!this.highlightedOptionKey) return;
            const highlightedOptionIdx = this.effectiveOptions.findIndex(option => option.key == this.highlightedOptionKey);
            const containerEl = this.$refs.optionsContainer as HTMLElement;
            const highlightedOptionEl = containerEl.querySelectorAll('.option')[highlightedOptionIdx] as HTMLElement;
            containerEl.scrollTop = highlightedOptionEl.offsetTop;
        },

        handleOptionHover(option: OptionDescriptor) {
            this.highlightedOptionKey = option ? option.key : null;
        },

        incrementHighlightedOption(increment: number) {
            const highlightedOptionIdx = this.effectiveOptions.findIndex(option => option.key == this.highlightedOptionKey);
            let targetOptionIdx = highlightedOptionIdx + increment;

            if (targetOptionIdx < 0) targetOptionIdx = 0;
            else if (targetOptionIdx >= this.effectiveOptions.length) targetOptionIdx = this.effectiveOptions.length - 1;

            if (highlightedOptionIdx == targetOptionIdx) return;

            this.highlightedOptionKey = this.effectiveOptions[targetOptionIdx].key;

            const containerEl = this.$refs.optionsContainer as HTMLElement;
            const targetOptionEl = containerEl.querySelectorAll('.option')[targetOptionIdx] as HTMLElement;

            if (targetOptionEl.offsetTop < containerEl.scrollTop) {
                containerEl.scrollTop = targetOptionEl.offsetTop;
            } else if (targetOptionEl.offsetTop + targetOptionEl.offsetHeight > containerEl.scrollTop + containerEl.clientHeight) {
                containerEl.scrollTop = targetOptionEl.offsetTop + targetOptionEl.offsetHeight - containerEl.clientHeight;
            }
        },

        selectOption(option: OptionDescriptor) {
            this.isSearching = false;

            if (option.key == NullSymbol) {
                this.searchText = '';
                this.selectedOption = null;
                this.selectedOptionTitle = null;
            } else if (option.key === CreateSymbol) {
                const createText = this.searchText.trim();
                this.searchText = '';
                this.selectedOption = null;
                this.selectedOptionTitle = null;
                this.onCreateItem?.(createText);
            } else {
                const selectedDecoratedOption = this.optionsDescriptors.find(decoratedOption => decoratedOption.key == option.key);
                const realOption = selectedDecoratedOption!.ref;
                this.selectedOption = realOption!;
                this.selectedOptionTitle = this.formatter!(realOption!);
                this.searchText = this.selectedOptionTitle || '';
            }

            (this.$refs.searchField as HTMLElement).blur();
        },

        handleValueChanged() {
            if (this.modelValue) {
                this.selectedOption = this.valueExtractor ? this.allOptions.find(o => this.modelValue === this.valueExtractor!(o)) : this.modelValue;
                this.selectedOptionTitle = this.selectedOption ? this.formatter!(this.selectedOption) : null;
                this.searchText = this.selectedOptionTitle || '';
            } else {
                this.selectedOption = null;
                this.selectedOptionTitle = null;
                this.searchText = '';
            }
        },

        addRemoteOption(option: GenericObject) {
            this.loadedOptions.unshift(option);
        }
    }
};
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
