import Vue from 'vue';
import Vuex from 'vuex';
import VuexPersistence from 'vuex-persist';

import * as getters from './getters';
import mutations from './mutations';
import * as actions from './actions';

Vue.use(Vuex);

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
});

export default new Vuex.Store({
  state: {
    config: {
      status: true, // 是否开启扩展
      mini: true, // Mini模式: true
      random: true, // 随机展示
      frequency: 15, // mini 模式展示频度
      currentNotifyLocation: 'top-right', // 当前 Mini 提醒框位置
    },
    frequencyCounter: 0, // mini模式展示频度计数器
    waitingBookmarks: [], // 所有待提醒书签
    blockedBookmarks: [], // 屏蔽掉的书签
    notifyLocationList: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
  },
  getters,
  mutations,
  actions,
  plugins: [vuexLocal.plugin],
});
