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

// 获取所有书签目录
export const getBookmarkMenu = cb => {
  chrome.bookmarks.getTree(bookmarks => {
    cb(menuTreeNode(bookmarks));
  });
};
const menuTreeNode = nodes => {
  const tmp = [];
  for (let i in nodes) {
    if (nodes[i].children !== undefined) {
      const tmpBM = {
        id: nodes[i].id,
        label: nodes[i].id === '0' ? chrome.i18n.getMessage('all_bookmarks') : nodes[i].title,
        children: menuTreeNode(nodes[i].children),
      };
      tmp.push(tmpBM);
    }
  }
  return tmp;
};

// 获取书签目录下内容
export const getBookmarkChildren = (id, cb) => {
  chrome.bookmarks.getChildren(id, bookmarks => {
    cb(bookmarks);
  });
};

// 获取书签目录路径
let tmpBreadcrumb = [];
export const getBookmarkBreadcrumb = (id, cb) => {
  chrome.bookmarks.get(id, bms => {
    tmpBreadcrumb.push(bms[0]);
    if (bms[0].parentId === '0') {
      cb(tmpBreadcrumb);
      tmpBreadcrumb = [];
    } else {
      getBookmarkBreadcrumb(bms[0].parentId, cb);
    }
  });
};

// 更新书签
export const updateBookmark = (data, cb) => {
  chrome.bookmarks.update(
    data.id,
    {
      title: data.title,
      url: data.url,
    },
    () => {
      if (data.parentId !== null) {
        chrome.bookmarks.move(
          data.id,
          {
            parentId: data.parentId,
          },
          () => {
            cb('success');
          }
        );
      } else {
        cb('success');
      }
    }
  );
};

// 根据id获取书签
export const getBookmarkById = (id, cb) => {
  chrome.bookmarks.get(id, bookmarks => {
    if (bookmarks.length === 0) {
      cb(null);
    } else {
      cb(bookmarks[0]);
    }
  });
};

// 创建书签
export const createBookmark = (data, cb) => {
  chrome.bookmarks.create(data, cb);
};
