import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // global ignores
    {
        ignores: ['dist/', '.yarn/']
    },

    // presets
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs['flat/recommended'],

    // register parser options
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: ['.vue'],
                projectService: true
            },

            // not sure why some of these TS generics are needed.
            // will circle back when Vue officially updates to ESLint 9
            globals: {
                Omit: false,
                Record: false
            }
        }
    },

    // plugins & configs
    eslintPluginPrettierRecommended,
    {
        plugins: {
            'unused-imports': unusedImports,
            'simple-import-sort': simpleImportSort
        },

        rules: {
            'no-console': 'off',
            'no-debugger': 'off',
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            'prettier/prettier': 'warn',
            'no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'all',
                    argsIgnorePattern: '^_'
                }
            ]
            // 'vue/multi-word-component-names': 'off',
            // 'vue/no-reserved-component-names': 'off'
        }
    }
);
