import * as types from './mutation-types';

export default {
  [types.UPDATE_STATUS](state, status) {
    state.status = status;
  },
  [types.UPDATE_WAITING_BOOKMARKS](state, bookmarks) {
    state.waitingBookmarks = bookmarks;
  },
};
