import Vue from 'vue';
import Vuex from 'vuex';

import * as getters from './getters';
import mutations from './mutations';
import * as actions from './actions';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    random: true, // 随机展示
    status: true, // 是否开启扩展
    waitingBookmarks: [], // 所有待提醒书签
  },
  getters,
  mutations,
  actions,
});
