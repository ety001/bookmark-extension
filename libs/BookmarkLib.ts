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

// 根节点/书签栏 id 模块级缓存（解析失败不缓存，下次调用重试）
// Chrome/Edge 书签栏 id 为 '1'，Firefox 为 'toolbar_____'
let rootIdCache: string | null = null;
let bookmarkBarIdCache: string | null = null;

/**
 * 从书签树中解析根节点与书签栏并写入缓存
 * 先找 id 为 '1' 或 'toolbar_____' 的子节点，找不到时退回第一个子节点；
 * 解析失败返回 null（不缓存）
 */
function resolveBookmarkBar(tree: chrome.bookmarks.BookmarkTreeNode[]): chrome.bookmarks.BookmarkTreeNode | null {
  const root = tree[0];
  if (!root || !root.id) return null;
  const children = root.children || [];
  const bookmarkBar = children.find(node => node.id === '1' || node.id === 'toolbar_____') || children[0] || null;
  if (!bookmarkBar) return null;
  rootIdCache = root.id;
  bookmarkBarIdCache = bookmarkBar.id;
  return bookmarkBar;
}

/**
 * 确保根节点/书签栏 id 已解析（带缓存，失败不缓存）
 */
function ensureTreeIds(cb: (ok: boolean) => void): void {
  if (rootIdCache && bookmarkBarIdCache) {
    cb(true);
    return;
  }
  if (typeof chrome === 'undefined' || !chrome.bookmarks || typeof chrome.bookmarks.getTree !== 'function') {
    cb(false);
    return;
  }
  chrome.bookmarks.getTree(tree => {
    if (chrome.runtime.lastError) {
      console.error('getTree failed:', chrome.runtime.lastError.message);
      cb(false);
      return;
    }
    cb(resolveBookmarkBar(tree || []) !== null);
  });
}

/**
 * 获取根节点 id（getTree 解析 + 模块级缓存，失败返回 null）
 */
export function getRootId(cb: (rootId: string | null) => void): void {
  ensureTreeIds(ok => cb(ok ? rootIdCache : null));
}

/**
 * 获取书签栏 id（getTree 解析 + 模块级缓存，失败返回 null）
 */
export function getBookmarkBarId(cb: (bookmarkBarId: string | null) => void): void {
  ensureTreeIds(ok => cb(ok ? bookmarkBarIdCache : null));
}

/**
 * 在书签树中 DFS 查找指定 id 的节点
 */
function findNodeInTree(nodes: chrome.bookmarks.BookmarkTreeNode[], id: string): chrome.bookmarks.BookmarkTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 判断书签是否位于书签栏子树内（任意层级）
 * 供 background 的 onCreated 监听使用
 */
export function isInBookmarkBarSubtree(id: string, cb: (inSubtree: boolean) => void): void {
  if (typeof chrome === 'undefined' || !chrome.bookmarks || typeof chrome.bookmarks.getSubTree !== 'function') {
    cb(false);
    return;
  }
  getBookmarkBarId(bookmarkBarId => {
    if (!bookmarkBarId) {
      cb(false);
      return;
    }
    chrome.bookmarks.getSubTree(bookmarkBarId, nodes => {
      if (chrome.runtime.lastError) {
        console.error('isInBookmarkBarSubtree getSubTree failed:', chrome.runtime.lastError.message);
        cb(false);
        return;
      }
      cb(findNodeInTree(nodes || [], id) !== null);
    });
  });
}

/**
 * 初始化书签
 */
export function init(): void {
  // 只在运行时执行，构建时跳过
  try {
    // 检查是否在构建时（通过检查 chrome.bookmarks.getTree 是否可用）
    if (typeof chrome === 'undefined' || !chrome.bookmarks || typeof chrome.bookmarks.getTree !== 'function') {
      return;
    }

    // 预解析根节点/书签栏 id 并缓存（失败不缓存，后续调用自动重试）
    ensureTreeIds(() => {});

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
  // 先按屏蔽列表过滤（防历史数据：旧版本屏蔽时未移出队列），
  // 过滤结果回写时会顺带清理掉队列中残留的被屏蔽书签
  const blockedIds = new Set(store.blockedBookmarks.map(b => b.id));
  const bookmarks = store.waitingBookmarks.filter(b => !blockedIds.has(b.id));

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
 * 目录（无 url）必须用 removeTree，非空目录用 remove 会失败
 * 纵深防御：根节点及其直接子节点（书签栏/其他书签等系统目录）直接拒绝删除，
 * 不调用 remove/removeTree（根 id 从 getTree 结果取，兼容 Firefox 的 GUID 根）
 */
export function removeBookmark(bm: Bookmark, cb?: (success: boolean) => void): void {
  if (!bm.id) {
    cb?.(false);
    return;
  }
  chrome.bookmarks.getTree(tree => {
    if (chrome.runtime.lastError) {
      console.error('removeBookmark getTree failed:', chrome.runtime.lastError.message);
      cb?.(false);
      return;
    }
    const rootId = tree[0]?.id;
    if (rootId && (bm.id === rootId || bm.parentId === rootId)) {
      cb?.(false);
      return;
    }
    const remove = bm.url ? chrome.bookmarks.remove : chrome.bookmarks.removeTree;
    remove(bm.id, () => {
      if (chrome.runtime.lastError) {
        console.error('removeBookmark failed:', chrome.runtime.lastError.message);
        cb?.(false);
        return;
      }
      cb?.(true);
    });
  });
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
  const i = bookmarks.findIndex(b => bm.id === b.id);
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
  const i = bookmarks.findIndex(b => bm.id === b.id);
  if (i !== -1) {
    bookmarks.splice(i, 1);
    store.updateBlockedBookmarks(bookmarks);
  }
}

/**
 * 把书签信息存入localStorage
 * 只获取书签栏（Bookmark Bar）的书签，并过滤屏蔽列表
 */
export function getBookmarksFromChrome(): void {
  // 只在运行时执行，构建时跳过
  try {
    // 检查是否在构建时（通过检查 chrome.bookmarks.getTree 是否可用）
    if (typeof chrome === 'undefined' || !chrome.bookmarks || typeof chrome.bookmarks.getTree !== 'function') {
      return;
    }

    chrome.bookmarks.getTree(bookmarks => {
      if (chrome.runtime.lastError) {
        console.error('getBookmarksFromChrome getTree failed:', chrome.runtime.lastError.message);
        return;
      }
      console.log('getBookmarksFromChrome: 获取书签树', bookmarks);
      // 书签树结构：
      // - 根节点包含所有书签
      // - Chrome/Edge 书签栏 id='1'，Firefox 为 'toolbar_____'（由 resolveBookmarkBar 解析并缓存）
      // 我们只获取书签栏的书签
      if (bookmarks && bookmarks.length > 0 && bookmarks[0].children) {
        console.log(
          '根节点子节点:',
          bookmarks[0].children.map(n => ({ id: n.id, title: n.title }))
        );
        const bookmarkBar = resolveBookmarkBar(bookmarks);
        if (bookmarkBar) {
          console.log('找到书签栏，开始处理:', bookmarkBar);
          // 函数局部列表，经递归参数传递，避免并发调用互相污染
          const tmpBookmarks: Bookmark[] = [];
          changeTreeNodeToList([bookmarkBar], tmpBookmarks);

          // 过滤掉屏蔽列表中的书签
          const store = useStore.getState();
          const blockedIds = new Set(store.blockedBookmarks.map(b => b.id));
          const filteredBookmarks = tmpBookmarks.filter(bm => !blockedIds.has(bm.id));

          console.log(`获取到 ${tmpBookmarks.length} 个书签，过滤后剩余 ${filteredBookmarks.length} 个`);
          if (filteredBookmarks.length > 0) {
            console.log(
              '前3个书签:',
              filteredBookmarks.slice(0, 3).map(b => ({ id: b.id, title: b.title }))
            );
          }
          useStore.getState().updateWaitingBookmarks(filteredBookmarks);
        } else {
          console.warn('书签栏子节点为空');
          useStore.getState().updateWaitingBookmarks([]);
        }
      } else {
        console.warn('书签树为空或格式不正确', bookmarks);
        useStore.getState().updateWaitingBookmarks([]);
      }
    });
  } catch (error) {
    // 构建时可能会抛出错误，忽略它
    if (import.meta.env.DEV) {
      console.warn('getBookmarksFromChrome() skipped in build time:', error);
    }
  }
}

/**
 * 把树形数据转成列表数据（累积到传入的局部列表，避免模块级状态并发污染）
 */
function changeTreeNodeToList(nodes: chrome.bookmarks.BookmarkTreeNode[], list: Bookmark[]): void {
  for (const node of nodes) {
    if (node.children) {
      changeTreeNodeToList(node.children, list);
    } else {
      if (node.url) {
        list.push({
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
export function getBookmarkMenu(cb: (menu: BookmarkMenuNode[]) => void): void {
  chrome.bookmarks.getTree(bookmarks => {
    if (chrome.runtime.lastError) {
      console.error('getBookmarkMenu failed:', chrome.runtime.lastError.message);
      cb([]);
      return;
    }
    cb(menuTreeNode(bookmarks));
  });
}

/**
 * 将书签树转换为菜单树
 */
function menuTreeNode(nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkMenuNode[] {
  const tmp: BookmarkMenuNode[] = [];
  for (const node of nodes) {
    if (node.children) {
      const tmpBM: BookmarkMenuNode = {
        id: node.id,
        label: node.id === '0' ? chrome.i18n.getMessage('all_bookmarks') : node.title,
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
export function getBookmarkChildren(id: string, cb: (bookmarks: chrome.bookmarks.BookmarkTreeNode[]) => void): void {
  chrome.bookmarks.getChildren(id, bookmarks => {
    if (chrome.runtime.lastError) {
      console.error('getBookmarkChildren failed:', chrome.runtime.lastError.message);
      cb([]);
      return;
    }
    cb(bookmarks || []);
  });
}

/**
 * 获取书签目录路径（从指定书签到书签栏顶层的祖先链）
 * 兼容 Firefox：终止条件为 parentId 等于 getTree 解析出的根 id，
 * 而非硬编码 '0'（Firefox 根 id 为 'root________'，恒不命中会导致 sendResponse 挂起）
 */
export function getBookmarkBreadcrumb(id: string, cb: (breadcrumb: chrome.bookmarks.BookmarkTreeNode[]) => void): void {
  getRootId(rootId => {
    collectBreadcrumb(id, rootId, [], cb);
  });
}

/**
 * 递归收集祖先链（局部累积，返回顺序为 子 -> 父，由调用方反转）
 */
function collectBreadcrumb(
  id: string,
  rootId: string | null,
  breadcrumb: chrome.bookmarks.BookmarkTreeNode[],
  cb: (breadcrumb: chrome.bookmarks.BookmarkTreeNode[]) => void
): void {
  chrome.bookmarks.get(id, bms => {
    // 出错或空结果时返回已累积的路径（首次调用即空数组），避免 sendResponse 挂起
    if (chrome.runtime.lastError || !bms || bms.length === 0) {
      if (chrome.runtime.lastError) {
        console.error('getBookmarkBreadcrumb failed:', chrome.runtime.lastError.message);
      }
      cb(breadcrumb);
      return;
    }
    breadcrumb.push(bms[0]);
    const parentId = bms[0].parentId;
    // 到达根的直接子节点（或 parentId 缺失）时终止
    if (!parentId || (rootId !== null && parentId === rootId)) {
      cb(breadcrumb);
      return;
    }
    collectBreadcrumb(parentId, rootId, breadcrumb, cb);
  });
}

/**
 * 更新书签
 */
export function updateBookmark(data: BookmarkUpdateData, cb: (result: string) => void): void {
  // url 为 null/''（文件夹或未填写）时不能传给 bookmarks.update：
  // Chrome 会静默忽略，Firefox 会抛 "Expected string instead of null"
  const changes: chrome.bookmarks.UpdateChanges = { title: data.title };
  if (data.url) {
    changes.url = data.url;
  }
  chrome.bookmarks.update(data.id, changes, () => {
    if (chrome.runtime.lastError) {
      console.error('updateBookmark failed:', chrome.runtime.lastError.message);
      cb('error');
      return;
    }
    if (data.parentId) {
      const destination: chrome.bookmarks.MoveDestination = {
        parentId: data.parentId,
      };
      if (typeof data.index === 'number') {
        destination.index = data.index;
      }
      chrome.bookmarks.move(data.id, destination, () => {
        if (chrome.runtime.lastError) {
          console.error('updateBookmark move failed:', chrome.runtime.lastError.message);
          cb('error');
          return;
        }
        cb('success');
      });
    } else {
      cb('success');
    }
  });
}

/**
 * 根据id获取书签
 */
export function getBookmarkById(id: string, cb: (bookmark: chrome.bookmarks.BookmarkTreeNode | null) => void): void {
  chrome.bookmarks.get(id, bookmarks => {
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
export function createBookmark(data: chrome.bookmarks.CreateDetails, cb?: (result: chrome.bookmarks.BookmarkTreeNode | null) => void): void {
  chrome.bookmarks.create(data, result => {
    if (chrome.runtime.lastError || !result) {
      console.error('createBookmark failed:', chrome.runtime.lastError?.message);
      cb?.(null);
      return;
    }
    cb?.(result);
  });
}

/**
 * 获取屏蔽列表
 */
export function getBlockList(cb: (blockedBookmarks: Bookmark[]) => void): void {
  const store = useStore.getState();
  cb(store.blockedBookmarks);
}

/**
 * 清空屏蔽列表
 */
export function clearBlockList(): void {
  useStore.getState().updateBlockedBookmarks([]);
}
