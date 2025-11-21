import { useStore, type Bookmark } from '../store';

/**
 * 书签菜单节点接口
 */
export interface BookmarkMenuNode {
  id: string;
  label: string;
  children?: BookmarkMenuNode[];
}

/**
 * 书签更新数据接口
 */
export interface BookmarkUpdateData {
  id: string;
  title: string;
  url?: string;
  parentId?: string | null;
  index?: number;
}

let tmpBookmarks: Bookmark[] = [];
let tmpBreadcrumb: chrome.bookmarks.BookmarkTreeNode[] = [];

/**
 * 初始化书签
 */
export function init(): void {
  // 只在运行时执行，构建时跳过
  try {
    // 检查是否在构建时（通过检查 chrome.bookmarks.getTree 是否可用）
    if (
      typeof chrome === 'undefined' ||
      !chrome.bookmarks ||
      typeof chrome.bookmarks.getTree !== 'function'
    ) {
      return;
    }
    
    const store = useStore.getState();
    const bookmarks = store.waitingBookmarks;
    console.log('init_num:', bookmarks.length);
    if (bookmarks.length === 0) {
      getBookmarksFromChrome();
    }
  } catch (error) {
    // 构建时可能会抛出错误，忽略它
    if (import.meta.env.DEV) {
      console.warn('BookmarkLib.init() skipped in build time:', error);
    }
  }
}

/**
 * 获取一个书签
 */
export function getBookmark(): Bookmark | null {
  const store = useStore.getState();
  const bookmarks = [...store.waitingBookmarks];
  
  if (bookmarks.length === 0) {
    getBookmarksFromChrome();
    return null;
  }
  
  // 判断开关
  if (store.config.status === false) {
    console.log('plugin closed');
    return null;
  }
  
  // 如果是mini模式，则判断频度
  if (store.config.mini === true) {
    const frequencyCounter = store.frequencyCounter;
    if (frequencyCounter !== 0) {
      console.log('frequency not fit');
      useStore.getState().updateFrequencyCounter();
      return null;
    }
  }
  
  // 判断随机还是顺次展示
  let selectedBookmark: Bookmark;
  if (store.config.random === false) {
    selectedBookmark = bookmarks.shift()!;
  } else {
    const min = 0;
    const max = bookmarks.length - 1;
    const num = Math.floor(Math.random() * (max - min + 1) + min);
    selectedBookmark = bookmarks[num];
    bookmarks.splice(num, 1);
  }
  
  useStore.getState().updateWaitingBookmarks(bookmarks);
  useStore.getState().updateFrequencyCounter();
  
  return selectedBookmark;
}

/**
 * 从 chrome 中删除书签
 */
export function removeBookmark(
  bm: Bookmark,
  cb?: (result: chrome.bookmarks.BookmarkTreeNode) => void
): void {
  if (bm.id) {
    chrome.bookmarks.remove(bm.id, cb);
  }
}

/**
 * 重置屏蔽书签列表
 */
export function resetBlockedBookmarks(): void {
  useStore.getState().updateBlockedBookmarks([]);
}

/**
 * 添加待读书签
 */
export function addWaitingBookmark(bm: Bookmark): void {
  useStore.getState().addWaitingBookmark(bm);
}

/**
 * 移除待读书签
 */
export function removeWaitingBookmark(bm: Bookmark): void {
  const store = useStore.getState();
  const bookmarks = [...store.waitingBookmarks];
  const i = bookmarks.findIndex((b) => bm.id === b.id);
  if (i !== -1) {
    bookmarks.splice(i, 1);
    store.updateWaitingBookmarks(bookmarks);
  }
}

/**
 * 添加屏蔽书签
 */
export function addBlockedBookmark(bm: Bookmark): void {
  useStore.getState().addBlockedBookmark(bm);
}

/**
 * 移除屏蔽书签
 */
export function removeBlockedBookmark(bm: Bookmark): void {
  const store = useStore.getState();
  const bookmarks = [...store.blockedBookmarks];
  const i = bookmarks.findIndex((b) => bm.id === b.id);
  if (i !== -1) {
    bookmarks.splice(i, 1);
    store.updateBlockedBookmarks(bookmarks);
  }
}

/**
 * 把书签信息存入localStorage
 */
export function getBookmarksFromChrome(): void {
  // 只在运行时执行，构建时跳过
  try {
    // 检查是否在构建时（通过检查 chrome.bookmarks.getTree 是否可用）
    if (
      typeof chrome === 'undefined' ||
      !chrome.bookmarks ||
      typeof chrome.bookmarks.getTree !== 'function'
    ) {
      return;
    }
    
    chrome.bookmarks.getTree((bookmarks) => {
      changeTreeNodeToList(bookmarks);
      useStore.getState().updateWaitingBookmarks(tmpBookmarks);
      tmpBookmarks = [];
    });
  } catch (error) {
    // 构建时可能会抛出错误，忽略它
    if (import.meta.env.DEV) {
      console.warn('getBookmarksFromChrome() skipped in build time:', error);
    }
  }
}

/**
 * 把树形数据转成列表数据
 */
function changeTreeNodeToList(
  nodes: chrome.bookmarks.BookmarkTreeNode[]
): void {
  for (const node of nodes) {
    if (node.children) {
      changeTreeNodeToList(node.children);
    } else {
      if (node.url) {
        tmpBookmarks.push({
          id: node.id,
          title: node.title,
          url: node.url,
          parentId: node.parentId,
          index: node.index,
        });
      }
    }
  }
}

/**
 * 获取所有书签目录
 */
export function getBookmarkMenu(
  cb: (menu: BookmarkMenuNode[]) => void
): void {
  chrome.bookmarks.getTree((bookmarks) => {
    cb(menuTreeNode(bookmarks));
  });
}

/**
 * 将书签树转换为菜单树
 */
function menuTreeNode(
  nodes: chrome.bookmarks.BookmarkTreeNode[]
): BookmarkMenuNode[] {
  const tmp: BookmarkMenuNode[] = [];
  for (const node of nodes) {
    if (node.children) {
      const tmpBM: BookmarkMenuNode = {
        id: node.id,
        label:
          node.id === '0'
            ? chrome.i18n.getMessage('all_bookmarks')
            : node.title,
        children: menuTreeNode(node.children),
      };
      tmp.push(tmpBM);
    }
  }
  return tmp;
}

/**
 * 获取书签目录下内容
 */
export function getBookmarkChildren(
  id: string,
  cb: (bookmarks: chrome.bookmarks.BookmarkTreeNode[]) => void
): void {
  chrome.bookmarks.getChildren(id, cb);
}

/**
 * 获取书签目录路径
 */
export function getBookmarkBreadcrumb(
  id: string,
  cb: (breadcrumb: chrome.bookmarks.BookmarkTreeNode[]) => void
): void {
  chrome.bookmarks.get(id, (bms) => {
    if (bms.length > 0) {
      tmpBreadcrumb.push(bms[0]);
      if (bms[0].parentId === '0') {
        cb([...tmpBreadcrumb]);
        tmpBreadcrumb = [];
      } else {
        getBookmarkBreadcrumb(bms[0].parentId!, cb);
      }
    }
  });
}

/**
 * 更新书签
 */
export function updateBookmark(
  data: BookmarkUpdateData,
  cb: (result: string) => void
): void {
  chrome.bookmarks.update(
    data.id,
    {
      title: data.title,
      url: data.url,
    },
    () => {
      if (data.parentId !== null && data.parentId !== undefined) {
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
}

/**
 * 根据id获取书签
 */
export function getBookmarkById(
  id: string,
  cb: (bookmark: chrome.bookmarks.BookmarkTreeNode | null) => void
): void {
  chrome.bookmarks.get(id, (bookmarks) => {
    if (bookmarks.length === 0) {
      cb(null);
    } else {
      cb(bookmarks[0]);
    }
  });
}

/**
 * 创建书签
 */
export function createBookmark(
  data: chrome.bookmarks.CreateDetails,
  cb?: (result: chrome.bookmarks.BookmarkTreeNode) => void
): void {
  chrome.bookmarks.create(data, cb);
}

/**
 * 获取屏蔽列表
 */
export function getBlockList(
  cb: (blockedBookmarks: Bookmark[]) => void
): void {
  const store = useStore.getState();
  cb(store.blockedBookmarks);
}

/**
 * 清空屏蔽列表
 */
export function clearBlockList(): void {
  useStore.getState().updateBlockedBookmarks([]);
}

