import Vue from 'vue';
import App from './App';
import store from '../store';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

global.browser = require('webextension-polyfill');

Vue.prototype.$browser = global.browser;
Vue.use(ElementUI);

/* eslint-disable no-new */
new Vue({
  el: '#review-bookmark',
  store,
  render: h => h(App),
});
