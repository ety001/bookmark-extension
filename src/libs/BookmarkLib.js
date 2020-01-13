import store from '../store';
import * as types from '../store/mutation-types';

let tmpBookmarks = [];

// 初始化
export const init = () => {
  const bookmarks = store.getters.waitingBookmarks;
  console.log('init_num:', bookmarks.length);
  if (bookmarks.length === 0) {
    getBookmarksFromChrome();
  }
};

// 获取一个书签
export const getBookmark = () => {
  const bookmarks = store.getters.waitingBookmarks;
  if (bookmarks.length === 0) {
    getBookmarksFromChrome();
    return null;
  }
  // 判断开关
  if (store.getters.config.status === false) {
    console.log('plugin closed');
    return null;
  }
  // 如果是mini模式，则判断频度
  if (store.getters.config.mini === true) {
    const frequencyCounter = store.getters.frequencyCounter;
    if (frequencyCounter !== 0) {
      console.log('frequency not fit');
      store.commit(types.UPDATE_FREQUENCY_COUNTER);
      return null;
    }
  }
  // 判断随机还是顺次展示
  if (store.getters.config.random === false) {
    const bm = bookmarks.shift();
    store.commit(types.UPDATE_WAITING_BOOKMARKS, bookmarks);
    store.commit(types.UPDATE_FREQUENCY_COUNTER);
    return bm;
  } else {
    const min = 0;
    const max = bookmarks.length - 1;
    const num = parseInt(Math.random() * (max - min + 1) + min, 10);
    const bm = bookmarks[num];
    bookmarks.splice(num, 1);
    store.commit(types.UPDATE_WAITING_BOOKMARKS, bookmarks);
    store.commit(types.UPDATE_FREQUENCY_COUNTER);
    return bm;
  }
};

// 从 chrome 中删除书签
export const removeBookmark = (bm, cb) => {
  if (bm.id !== undefined) {
    chrome.bookmarks.remove(bm.id, cb);
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
  console.log('addBlockedBookmark', bm);
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

// 获取完整树型书签
export const getAllBookmarks = cb => {
  chrome.bookmarks.getTree(bookmarks => {
    console.log('getAllBookmarks');
    // treeNode(bookmarks);
    cb(bookmarks);
  });
};

const treeNode = nodes => {
  for (let i in nodes) {
    if (nodes[i].children !== undefined) {
      treeNode(nodes[i].children);
    } else {
      if (typeof nodes[i] === 'object') {
      }
    }
  }
};
