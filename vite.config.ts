import { fileURLToPath, URL } from 'node:url';

import eslintPlugin from '@nabla/vite-plugin-eslint';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), eslintPlugin()],
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler'
            }
        }
    },
    build: {
        cssCodeSplit: true,
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: 'src/index.ts',
            name: 'VueFoundatation',
            formats: ['es'],
            fileName: format => `vue-foundation.${format}.js`
        },
        rollupOptions: {
            // make sure to externalize deps that should not be bundled
            // into your library
            input: {
                main: path.resolve(__dirname, 'src/index.ts')
            },
            external: ['date-fns', 'lodash', 'vue', '@vue/shared', '@signal24/openapi-client-codegen/browser'],
            output: {
                assetFileNames: assetInfo => {
                    if (assetInfo.name === 'main.css') return 'vue-foundation.css';
                    return assetInfo.name!;
                },
                exports: 'named',
                globals: {
                    vue: 'Vue'
                }
            }
        }
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
});
