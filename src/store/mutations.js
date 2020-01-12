import * as types from './mutation-types';

export default {
  [types.UPDATE_WAITING_BOOKMARKS](state, bookmarks) {
    state.waitingBookmarks = bookmarks;
  },
  [types.UPDATE_BLOCKED_BOOKMARKS](state, bookmarks) {
    state.blockedBookmarks = bookmarks;
  },
  [types.ADD_BLOCKED_BOOKMARK](state, bookmark) {
    state.blockedBookmarks.push(bookmark);
  },
  [types.ADD_WAITING_BOOKMARK](state, bookmark) {
    state.waitingBookmarks.push(bookmark);
  },
  [types.UPDATE_FREQUENCY_COUNTER](state) {
    const config = state.config;
    if (state.frequencyCounter === config.frequency - 1) {
      state.frequencyCounter = 0;
    } else {
      state.frequencyCounter = state.frequencyCounter + 1;
    }
  },
  [types.UPDATE_STATUS](state, status) {
    const config = state.config;
    config.status = status;
    state.config = config;
  },
  [types.UPDATE_MINI](state, mini) {
    const config = state.config;
    config.mini = mini;
    state.config = config;
  },
  [types.UPDATE_RANDOM](state, random) {
    const config = state.config;
    config.random = random;
    state.config = config;
  },
  [types.UPDATE_FREQUENCY](state, frequency) {
    const config = state.config;
    config.frequency = frequency;
    state.config = config;
  },
  [types.UPDATE_CURRENT_NOTIFY_POSITION](state, position) {
    const config = state.config;
    if (state.notifyLocationList.indexOf(position)) {
      config.currentNotifyLocation = position;
      state.config = config;
    }
  },
  [types.UPDATE_CONFIG](state, config) {
    state.config = config;
  },
};
