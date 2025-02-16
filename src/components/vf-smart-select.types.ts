export interface VfSmartSelectOptionDescriptor<T> {
    key: string | symbol;
    title: string;
    subtitle?: string | null;
    searchContent?: string;
    ref?: T;
}
