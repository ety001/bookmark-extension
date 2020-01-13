import Vue from 'vue';
import App from './App';
import ElementUI from 'element-ui';
import '../element-variables.scss';

global.browser = require('webextension-polyfill');

Vue.prototype.$browser = global.browser;
Vue.use(ElementUI);

/* eslint-disable no-new */
new Vue({
  el: '#app',
  render: h => h(App),
});
