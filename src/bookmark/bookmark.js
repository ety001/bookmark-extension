import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App';
import ElementUI from 'element-ui';
import '../element-variables.scss';

global.browser = require('webextension-polyfill');

Vue.prototype.$browser = global.browser;
Vue.use(ElementUI);
Vue.use(VueRouter);

const routeList = [{ name: 'index', path: '/', component: App }];

const router = new VueRouter({
  routeList,
});

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  render: h => h(App),
});
