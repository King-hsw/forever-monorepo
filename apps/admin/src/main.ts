/* eslint-disable simple-import-sort/imports */
import { createApp } from 'vue';

import App from './App.vue';
import router from './router';
import { store } from './store';

// TDesign 基础样式（设计变量、滚动条、通用工具类）。
// 具体组件的样式由各组件模块自带，随按需引入带进来，见 vite.config.ts。
import 'tdesign-vue-next/es/style/index.css';
import '@/style/index.less';
import './permission';

const app = createApp(App);

app.use(store);
app.use(router);

app.mount('#app');
