import { defineBackground } from 'wxt/utils/define-background';
import { useStore } from '../../store';
import * as BookmarkLib from '../../libs/BookmarkLib';
import { GA } from '../../libs/GA';

export default defineBackground(() => {

/**
 * 消息类型接口
 */
interface Message {
  ctype: string;
  cdata: any;
}

/**
 * 响应接口
 */
interface Response {
  ctype: string;
  cdata: any;
}

// 清空之前版本的数据（在 Service Worker 中使用 chrome.storage）
// 只在运行时执行，构建时跳过
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get('curt_index', (result) => {
    if (!result.curt_index) {
      chrome.storage.local.clear();
    }
  });
}

const debug = import.meta.env.DEV;

// 获取浏览器类型（使用函数延迟初始化，避免构建时错误）
function getBrowserName(): string {
  try {
    // 在 Service Worker 中，使用 chrome 对象
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      const manifest = chrome.runtime.getManifest();
      // 根据 manifest 或其他方式判断浏览器类型
      // 这里简化处理，默认返回 chrome
      return 'chrome';
    }
    return 'chrome';
  } catch {
    return 'chrome';
  }
}

const isChrome = () => getBrowserName() === 'chrome';
const isFirefox = () => getBrowserName() === 'firefox';
const isEdge = () => getBrowserName() === 'edge';

// 生成uid
function randomStr(len: number = 32): string {
  const chars = 'ABCDEFGHJKLMNPQRSTWXYZabcdefhijklmnoprstwxyz012345678';
  const maxPos = chars.length;
  let pwd = '';
  for (let i = 0; i < len; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

// 获取或创建 UID（使用 chrome.storage）
let uidCache: string | null = null;
async function getUid(): Promise<string> {
  if (uidCache) return uidCache;
  
  return new Promise((resolve) => {
    chrome.storage.local.get('uid', (result) => {
      if (result.uid) {
        uidCache = result.uid;
        resolve(result.uid);
      } else {
        const d = new Date();
        const uid = randomStr() + d.getSeconds() + d.getMinutes() + d.getMilliseconds();
        chrome.storage.local.set({ uid }, () => {
          uidCache = uid;
          resolve(uid);
        });
      }
    });
  });
}

// Google Analytics 4
let currentVersion = '4_0_0';
if (isChrome()) {
  currentVersion = `chrome_${currentVersion}`;
} else if (isFirefox()) {
  currentVersion = `firefox_${currentVersion}`;
} else if (isEdge()) {
  currentVersion = `edge_${currentVersion}`;
}
const gaMeasurementId = 'G-L1CXD1G3GK'; // GA4 测量 ID
// const gaApiSecret = 'your-api-secret'; // 可选：如果使用 API Secret，取消注释并填入
let gaObj: GA | null = null;

// 初始化 GA4
getUid().then((uid) => {
  gaObj = new GA(gaMeasurementId, uid, debug); // 如果使用 API Secret，添加第四个参数
});

function sendEvent(
  eventCategory: string,
  eventAction: string,
  eventLabel: string = '',
  eventValue: number = 1
): void {
  const store = useStore.getState();
  if (store.config.ga === false || !gaObj) return;
  getUid().then((uid) => {
    gaObj?.ga('event', eventCategory, eventAction, eventLabel || uid, String(eventValue));
  });
}

function sendPageview(dp: string, dh: string = '', dt: string = ''): void {
  const store = useStore.getState();
  if (store.config.ga === false || !gaObj) return;
  gaObj.ga('pageview', dh, dp, dt);
}

// 数据初始化
BookmarkLib.init();

// 检测新标签页，控制迷你和full版本
// 只在运行时注册监听器，构建时跳过
if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const store = useStore.getState();
    if (store.config.mini === true) return;

    if (isChrome() && changeInfo.status === 'loading') {
      if (tab.url === 'chrome://newtab/') {
        const url = chrome.runtime.getURL('tab.html');
        chrome.tabs.update(tabId, { url });
      }
    }
    if (isFirefox() && tab.url === 'about:newtab') {
      const url = chrome.runtime.getURL('tab.html');
      chrome.tabs.update(tabId, { url });
    }
    if (isEdge() && tab.url === 'edge://newtab/') {
      const url = chrome.runtime.getURL('tab.html');
      chrome.tabs.update(tabId, { url });
    }
  });
}

// 与前端页面通讯 - 使用 onMessage 替代 onConnect
// 只在运行时注册监听器，构建时跳过
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener(
  (
    message: Message,
    sender,
    sendResponse: (response: Response) => void
  ): boolean => {
    const { ctype, cdata } = message;
    const store = useStore.getState();

    switch (ctype) {
      case 'getbookmark_from_full':
        if (store.config.mini === true) {
          console.log('full model closed');
          sendResponse({ ctype, cdata: null });
          return false;
        }
        const bmForFull = BookmarkLib.getBookmark();
        sendPageview('/full_mode_page');
        getUid().then((uid) => {
          sendEvent(currentVersion, 'getbookmark_from_full', uid);
        });
        sendResponse({ ctype, cdata: bmForFull });
        return false;

      case 'getbookmark_from_mini':
        // 确保 store 已初始化
        const currentStore = useStore.getState();
        if (currentStore.config.mini === false) {
          console.log('mini model closed');
          sendResponse({ ctype, cdata: null });
          return false;
        }
        
        // 如果书签列表为空，先尝试获取
        if (currentStore.waitingBookmarks.length === 0) {
          console.log('书签列表为空，尝试重新获取');
          BookmarkLib.getBookmarksFromChrome();
          // 等待书签加载完成（使用轮询方式检查）
          let attempts = 0;
          const maxAttempts = 10; // 最多尝试 10 次，每次 100ms
          const checkBookmarks = () => {
            attempts++;
            const store = useStore.getState();
            if (store.waitingBookmarks.length > 0 || attempts >= maxAttempts) {
              const bmForMini = BookmarkLib.getBookmark();
              if (!bmForMini) {
                console.log('no bookmark available after refresh');
                sendResponse({ ctype, cdata: null });
              } else {
                sendPageview('/mini_mode_notification');
                getUid().then((uid) => {
                  sendEvent(currentVersion, 'getbookmark_from_mini', uid);
                });
                sendResponse({
                  ctype,
                  cdata: {
                    bookmark: bmForMini,
                    config: store.config,
                  },
                });
              }
            } else {
              setTimeout(checkBookmarks, 100);
            }
          };
          setTimeout(checkBookmarks, 100);
          return true; // 异步响应
        }
        
        const bmForMini = BookmarkLib.getBookmark();
        if (!bmForMini) {
          console.log('no bookmark available, waitingBookmarks:', currentStore.waitingBookmarks.length);
          sendResponse({ ctype, cdata: null });
          return false;
        }
        sendPageview('/mini_mode_notification');
        getUid().then((uid) => {
          sendEvent(currentVersion, 'getbookmark_from_mini', uid);
        });
        sendResponse({
          ctype,
          cdata: {
            bookmark: bmForMini,
            config: currentStore.config,
          },
        });
        return false;

      case 'getbookmark_byid':
        BookmarkLib.getBookmarkById(cdata.id, (bm) => {
          if (bm) {
            BookmarkLib.getBookmarkById(bm.parentId!, (parentBm) => {
              const bookmarkWithParent = {
                ...bm,
                parent: parentBm,
              };
              getUid().then((uid) => {
                sendEvent(currentVersion, 'getbookmark_byid', uid);
              });
              sendResponse({
                ctype,
                cdata: {
                  bookmark: bookmarkWithParent,
                  action: cdata.action,
                },
              });
            });
          } else {
            getUid().then((uid) => {
              sendEvent(currentVersion, 'getbookmark_byid', uid);
            });
            sendResponse({
              ctype,
              cdata: {
                bookmark: bm,
                action: cdata.action,
              },
            });
          }
        });
        return true; // 异步响应

      case 'getbookmark_menu':
        BookmarkLib.getBookmarkMenu((menu) => {
          sendPageview('/bookmark_manager_page');
          getUid().then((uid) => {
            sendEvent(currentVersion, 'getbookmark_menu', uid);
          });
          sendResponse({ ctype, cdata: menu });
        });
        return true;

      case 'getbookmark_children':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'getbookmark_children', uid);
        });
        BookmarkLib.getBookmarkChildren(cdata, (bookmarks) => {
          sendResponse({ ctype, cdata: bookmarks });
        });
        return true;

      case 'block':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'block', uid);
        });
        BookmarkLib.addBlockedBookmark(cdata);
        sendResponse({ ctype, cdata: true });
        return false;

      case 'cancel_block':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'cancel_block', uid);
        });
        BookmarkLib.removeBlockedBookmark(cdata);
        sendResponse({ ctype, cdata: true });
        return false;

      case 'remove_bookmark':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'remove_bookmark', uid);
        });
        BookmarkLib.removeBookmark(cdata, () => {
          sendResponse({ ctype, cdata: true });
        });
        return true;

      case 'update_bookmark':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'update_bookmark', uid);
        });
        BookmarkLib.updateBookmark(cdata, () => {
          sendResponse({ ctype, cdata: true });
        });
        return true;

      case 'get_config':
        // 确保 store 已初始化
        const configStore = useStore.getState();
        sendPageview('/popup');
        getUid().then((uid) => {
          sendEvent(currentVersion, 'get_config', uid);
        });
        sendResponse({ ctype, cdata: configStore.config });
        return false;

      case 'save_config':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'save_config', uid);
        });
        store.updateConfig({
          status: cdata.status,
          mini: cdata.mini,
          random: cdata.random,
          frequency: cdata.frequency,
          currentNotifyLocation: cdata.currentNotifyLocation,
          ga: cdata.ga,
        });
        sendResponse({ ctype, cdata: true });
        return false;

      case 'getbookmark_breadcrumb':
        if (cdata === '0') {
          sendResponse({ ctype, cdata: [] });
          return false;
        }
        BookmarkLib.getBookmarkBreadcrumb(cdata, (breadcrumb) => {
          sendResponse({ ctype, cdata: breadcrumb.reverse() });
        });
        return true;

      case 'get_block_list':
        sendPageview('/block_list_page');
        getUid().then((uid) => {
          sendEvent(currentVersion, 'get_block_list', uid);
        });
        BookmarkLib.getBlockList((blockedBookmarks) => {
          sendResponse({ ctype, cdata: blockedBookmarks });
        });
        return true;

      case 'create_bookmark_folder':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'create_bookmark_folder', uid);
        });
        BookmarkLib.createBookmark(cdata, () => {
          sendResponse({ ctype, cdata: true });
        });
        return true;

      case 'remove_block_bookmark':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'remove_block_bookmark', uid);
        });
        BookmarkLib.removeBlockedBookmark(cdata);
        sendResponse({ ctype, cdata: true });
        return false;

      case 'clear_block_list':
        getUid().then((uid) => {
          sendEvent(currentVersion, 'clear_block_list', uid);
        });
        BookmarkLib.clearBlockList();
        sendResponse({ ctype, cdata: true });
        return false;

      default:
        return false;
    }
  }
  );
}

// 绑定书签事件
// 只在运行时注册监听器，构建时跳过
if (typeof chrome !== 'undefined' && chrome.bookmarks) {
  chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    console.log('Bookmark created:', id, bookmark);
    // 只添加书签栏的书签（parentId === '1'），且必须有 URL（不是文件夹）
    if (bookmark.url && bookmark.parentId === '1') {
      const store = useStore.getState();
      // 检查是否在屏蔽列表中
      const isBlocked = store.blockedBookmarks.some((b) => b.id === bookmark.id);
      if (!isBlocked) {
        BookmarkLib.addWaitingBookmark(bookmark as any);
      }
    }
  });

  chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    console.log('Bookmark removed:', id, removeInfo);
    // 从缓存中删除
    if (removeInfo.node) {
      BookmarkLib.removeWaitingBookmark(removeInfo.node as any);
      BookmarkLib.removeBlockedBookmark(removeInfo.node as any);
    }
  });
}

// 安装/升级检测
// 只在运行时注册监听器，构建时跳过
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onInstalled.addListener((detail) => {
    if (detail.reason === 'update') {
      getUid().then((uid) => {
        sendEvent(currentVersion, 'update_extension', uid, 1);
      });
      // TODO: 推广页面已不存在，暂时注释掉
      // window.open('https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324');
      return;
      // chrome.notifications.create(
      //   {
      //     type: 'basic',
      //     iconUrl: 'icons/icon-128.png',
      //     title: chrome.i18n.getMessage('appname'),
      //     message: chrome.i18n.getMessage('update_ok'),
      //   },
      //   function(notification_id) {}
      // );
    }
    if (detail.reason === 'install') {
      getUid().then((uid) => {
        sendEvent(currentVersion, 'install_extension', uid, 1);
      });
      console.log('installed');
      // 初始化数据
      BookmarkLib.init();
      // TODO: 推广页面已不存在，暂时注释掉
      // window.open('https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324');
    }
  });
}

// 升级提醒
// 只在运行时注册监听器，构建时跳过
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onUpdateAvailable.addListener((detail) => {
    console.log('Avaliable update:', detail.version);
    notifications(detail.version ? 'v' + detail.version : 'New version');
  });
}

function notifications(version: string): void {
  if (typeof chrome === 'undefined' || !chrome.notifications) {
    return;
  }
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: chrome.i18n.getMessage('appname'),
    message: version + chrome.i18n.getMessage('update_reminder'),
    buttons: [{ title: chrome.i18n.getMessage('update_button') }],
  });
  
  chrome.notifications.onButtonClicked.addListener(() => {
    chrome.runtime.reload();
  });
}
});
