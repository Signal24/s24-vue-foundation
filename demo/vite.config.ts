import { fileURLToPath, URL } from 'node:url';

import eslintPlugin from '@nabla/vite-plugin-eslint';
import { openapiClientGeneratorPlugin } from '@signal24/vue-foundation/vite-plugins';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        sourcemap: true,

        // note we have to use ES2015 to downgrade async/await to Promises so that Zone.js can monkey patch them
        // without that, we lose context tracking through otel and Sentry errors and traces are no longer correlated
        target: 'es2015'
    },
    plugins: [vue(), eslintPlugin(), openapiClientGeneratorPlugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('../src', import.meta.url))
        }
    }
});
