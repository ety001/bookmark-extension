import store from '../store';
import * as types from '../store/mutation-types';

let tmpBookmarks = [];

// 初始化
export const init = () => {
  const bookmarks = store.getters.waitingBookmarks;
  if (bookmarks.length === 0) {
    getBookmarksFromChrome();
  }
};

// 获取一个书签
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

// 重置屏蔽书签列表
export const resetBlockedBookmarks = () => {
  store.commit(types.UPDATE_BLOCKED_BOOKMARKS, []);
};

// 添加待读书签
export const addWaitingBookmark = bm => {
  store.commit(types.ADD_WAITING_BOOKMARK, bm);
};

// 移除待读书签
export const removeWaitingBookmark = bm => {
  const bookmarks = store.getters.waitingBookmarks;
  const i = bookmarks.findIndex(b => {
    return bm.id === b.id;
  });
  bookmarks.splice(i, 1);
  store.commit(types.UPDATE_WAITING_BOOKMARKS, bookmarks);
};

// 添加屏蔽书签
export const addBlockedBookmark = bm => {
  store.commit(types.ADD_BLOCKED_BOOKMARK, bm);
};

// 移除屏蔽书签
export const removeBlockedBookmark = bm => {
  const bookmarks = store.getters.blockedBookmarks;
  const i = bookmarks.findIndex(b => {
    return bm.id === b.id;
  });
  bookmarks.splice(i, 1);
  store.commit(types.UPDATE_BLOCKED_BOOKMARKS, bookmarks);
};

// 把书签信息存入localStorage
export const getBookmarksFromChrome = () => {
  chrome.bookmarks.getTree(bookmarks => {
    console.log('getBookmarksTree');
    changeTreeNodeToList(bookmarks);
    store.commit(types.UPDATE_WAITING_BOOKMARKS, tmpBookmarks);
    tmpBookmarks = [];
  });
};

// 把树形数据转成列表数据
const changeTreeNodeToList = nodes => {
  for (let i in nodes) {
    if (nodes[i].children !== undefined) {
      changeTreeNodeToList(nodes[i].children);
    } else {
      if (typeof nodes[i] === 'object') {
        tmpBookmarks.push(nodes[i]);
      }
    }
  }
};
