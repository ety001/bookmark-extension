import Vue from 'vue';
import App from './App';
import store from '../store';
import ElementUI from 'element-ui-custom';
import '../element-variables.scss';

global.browser = require('webextension-polyfill');

Vue.prototype.$browser = global.browser;
Vue.use(ElementUI, { zIndex: 999999999 });

/* eslint-disable no-new */
new Vue({
  el: '#review-bookmark',
  store,
  render: h => h(App),
});
