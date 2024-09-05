import { createApp } from 'vue';

import { configureVf } from '@/config';

import DemoRoot from './components/demo-root.vue';

const app = createApp(DemoRoot);
configureVf({});

app.mount(document.body);
