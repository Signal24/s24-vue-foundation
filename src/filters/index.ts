import { startCase as _startCase, upperFirst as _upperFirst } from 'lodash';

import { desnakeCase, formatNumber, formatPhone, formatUSCurrency } from '..';

function bytes(value: number) {
    const p = Math.floor(Math.log(value) / Math.log(1024));
    const numericResult = value / Math.pow(1024, p);
    const stringResult = numericResult.toFixed(2);
    const unit = ['B', 'KB', 'MB', 'GB', 'TB'][p];
    return `${stringResult} ${unit}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dash(value: any) {
    return value !== null && value !== undefined && String(value).length ? value : '-';
}

function dashZeros(value: number | null) {
    return value ? value : '-';
}

function number(value: string | number | null) {
    if (value === null) return value;
    if (typeof value === 'string' && !/^\d+$/.test(value)) return value;
    return formatNumber(Number(value));
}

function phone(value: string | null) {
    if (!value) return value;
    return formatPhone(value);
}

function upperFirst(value: null): null;
function upperFirst(value: string): string;
function upperFirst(value: string | null): null | string {
    return value ? _upperFirst(value) : null;
}

function startCase(value: null): null;
function startCase(value: string): string;
function startCase(value: string | null) {
    return value ? _startCase(value) : null;
}

function upperCase(value: null): null;
function upperCase(value: string): string;
function upperCase(value: string | null) {
    return value ? value.toUpperCase() : null;
}

function desnake(value: null): null;
function desnake(value: string): string;
function desnake(value: string | null) {
    return value ? desnakeCase(value) : null;
}

function usCurrency(value: string | number, divisor = 1) {
    return formatUSCurrency(value, divisor);
}

const FilterFns = {
    bytes,
    dash,
    dashZeros,
    number,
    phone,
    upperFirst,
    startCase,
    upperCase,
    desnake,
    usCurrency
};

// type FilterFn = (value: any, ...unknown: any[]) => any;
export const createFilters = <T>(factory: (baseFilters: typeof FilterFns) => T): typeof FilterFns & T => {
    return {
        ...FilterFns,
        ...factory(FilterFns)
    };
};
