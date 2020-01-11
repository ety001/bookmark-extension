import store from '../store';
import * as types from '../store/mutation-types';

export const getBookmark = () => {
  const randomSetting = store.getters.random;
  const bookmarks = store.getters.waitingBookmarks;
  if (bookmarks.length === 0) {
    return null;
  }
  if (randomSetting === false) {
    const bm = bookmarks.shift();
    store.commit(types.UPDATE_WAITING_BOOKMARKS, bookmarks);
    return bm;
  } else {
    const min = 0;
    const max = bookmarks.length - 1;
    const num = parseInt(Math.random() * (max - min + 1) + min, 10);
    const bm = bookmarks[num];
    bookmarks.splice(num, 1);
    store.commit(types.UPDATE_WAITING_BOOKMARKS, bookmarks);
    return bm;
  }
};
