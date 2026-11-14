import { defineBackground } from 'wxt/utils/define-background';
import { useStore, waitForStoreRehydration, type Bookmark } from '../../store';
import * as BookmarkLib from '../../libs/BookmarkLib';
import { gtag } from '../../utils/google-analytics';
import { isDataCollectionGrantedFromGetAll } from '../../utils/ff-data-consent';

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

  const debug = import.meta.env.DEV;

  // 获取浏览器类型（Service Worker 中通过 UserAgent 判断）
  // 修复：v4.0.0 重构后此函数始终返回 'chrome'，导致 Edge 上
  // isEdge() 永远为 false，edge://newtab/ 新标签页接管失效
  function getBrowserName(): string {
    try {
      if (typeof navigator === 'undefined') return 'chrome';
      const ua = navigator.userAgent;
      if (ua.includes('Firefox')) return 'firefox';
      if (ua.includes('Edg/')) return 'edge'; // Edge UA 含 "Edg/157.0.0.0"，需在 Chrome 判断之前
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

    return new Promise(resolve => {
      chrome.storage.local.get('uid', result => {
        if (result.uid && typeof result.uid === 'string') {
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
  // 版本号从 manifest 读取，避免硬编码过时（此前停留在 4_0_3）
  function getVersionFromManifest(): string {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        return chrome.runtime.getManifest().version.replace(/\./g, '_');
      }
    } catch {
      // 构建时等场景下忽略
    }
    return 'unknown';
  }
  let currentVersion = getVersionFromManifest();
  if (isChrome()) {
    currentVersion = `chrome_${currentVersion}`;
  } else if (isFirefox()) {
    currentVersion = `firefox_${currentVersion}`;
  } else if (isEdge()) {
    currentVersion = `edge_${currentVersion}`;
  }

  // ===== Firefox 内置数据同意门控 =====
  // Firefox 140+ 基于 manifest 的 data_collection_permissions 声明,在安装流程与
  // about:addons 的"权限和数据"中提供 technicalAndInteraction 开关,用户可随时开关。
  // 该开关必须与 GA 实际发送联动:popup 自建的 GA 开关(ga)是开发者自建同意体验,
  // 浏览器内置开关是额外的系统级门控,两者都同意才发送。否则内置开关关闭时数据照发、
  // 官方 UI 显示"不收集",构成声明与行为矛盾(AMO 人审红线)。
  // 探测方式为纯字段特性探测:permissions.getAll() 结果含 data_collection 字段即代表
  // 内置机制存在(仅 Firefox 140+;Chrome/Edge 无该 API 字段),字段不存在视为授予,
  // 维持现状由 popup 自建开关管理,Chrome/Edge 行为不变。
  let dataCollectionConsentCache: boolean | null = null; // null = 尚未探测完成

  // 实际查询一次内置同意状态并写入缓存(getAll 回调含 data_collection 字段时按
  // 是否包含 technicalAndInteraction 判定;查询失败视为授予,与字段不存在同策略)
  function queryDataCollectionConsent(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      try {
        if (typeof chrome === 'undefined' || !chrome.permissions || typeof chrome.permissions.getAll !== 'function') {
          resolve(true);
          return;
        }
        chrome.permissions.getAll(result => {
          if (chrome.runtime.lastError) {
            console.error('[Background] permissions.getAll failed:', chrome.runtime.lastError.message);
            resolve(true);
            return;
          }
          resolve(isDataCollectionGrantedFromGetAll(result));
        });
      } catch (error) {
        console.error('[Background] queryDataCollectionConsent failed:', error);
        resolve(true);
      }
    }).then(granted => {
      dataCollectionConsentCache = granted;
      return granted;
    });
  }

  function isDataCollectionConsentGranted(): Promise<boolean> {
    // 缓存命中直接返回,sendEvent/sendPageview 的同步入口不增加额外延迟;
    // 未命中(冷启动首批事件)时实际查询一次,结果写入缓存
    if (dataCollectionConsentCache !== null) {
      return Promise.resolve(dataCollectionConsentCache);
    }
    return queryDataCollectionConsent();
  }

  // 内置开关随时可能变化:监听权限增删事件刷新缓存。
  // 仅当事件负载携带 data_collection 字段时才刷新(普通 api/origin 权限变化与此无关);
  // 刷新走重新 getAll 而非直接采信事件负载,保证缓存与真实状态一致
  if (typeof chrome !== 'undefined' && chrome.permissions) {
    const onConsentPermissionChanged = (permissions: chrome.permissions.Permissions): void => {
      const hasDataCollection = !!permissions && Array.isArray((permissions as unknown as { data_collection?: unknown }).data_collection);
      if (hasDataCollection) {
        queryDataCollectionConsent();
      }
    };
    chrome.permissions.onAdded.addListener(onConsentPermissionChanged);
    chrome.permissions.onRemoved.addListener(onConsentPermissionChanged);
    // 启动即预热缓存,尽量缩小冷启动下"缓存尚未就绪"的窗口
    queryDataCollectionConsent();
  }

  // DEV-only 计数器:供 E2E(Playwright --load-extension 的开发构建)在
  // Service Worker 内注入断言门控行为;生产构建 debug=false 常量折叠后不生效
  const gaDebug = {
    counters: {
      eventAttempts: 0,
      eventSent: 0,
      eventBlockedByConsent: 0,
      pageviewAttempts: 0,
      pageviewSent: 0,
      pageviewBlockedByConsent: 0,
    },
  };

  function sendEvent(eventCategory: string, eventAction: string, eventLabel: string = '', eventValue: number = 1): void {
    const store = useStore.getState();
    // !== true 而非 === false:fail closed,undefined 等异常值一律不发,
    // 与 manifest 声明的 required ['none'] 承诺一致
    if (store.config.ga !== true) return;
    if (debug) gaDebug.counters.eventAttempts++;

    // ga=true 之外,还需 Firefox 内置数据同意开启才发送(见上方门控说明)
    isDataCollectionConsentGranted().then(consentGranted => {
      if (!consentGranted) {
        if (debug) gaDebug.counters.eventBlockedByConsent++;
        return;
      }
      if (debug) gaDebug.counters.eventSent++;
      getUid().then(uid => {
        gtag('event', eventAction, {
          event_category: eventCategory,
          event_label: eventLabel || uid,
          value: eventValue,
        });
      });
    });
  }

  function sendPageview(dp: string, dh: string = '', dt: string = ''): void {
    const store = useStore.getState();
    if (store.config.ga !== true) return;
    if (debug) gaDebug.counters.pageviewAttempts++;

    isDataCollectionConsentGranted().then(consentGranted => {
      if (!consentGranted) {
        if (debug) gaDebug.counters.pageviewBlockedByConsent++;
        return;
      }
      if (debug) gaDebug.counters.pageviewSent++;
      gtag('event', 'page_view', {
        page_path: dp || '/',
        page_title: dt || dp || '/',
        page_location: dh || dp || '/',
      });
    });
  }

  // 等待 Store 恢复完成后再初始化
  // 只在运行时执行，构建时跳过
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    waitForStoreRehydration()
      .then(() => {
        console.log('[Background] Store rehydration complete, initializing...');
        // 数据初始化
        BookmarkLib.init();
      })
      .catch(error => {
        console.error('[Background] Error waiting for store rehydration:', error);
        // 即使出错也继续初始化
        BookmarkLib.init();
      });
  } else {
    // 构建时直接初始化
    BookmarkLib.init();
  }

  // 检测新标签页，控制迷你和full版本
  // 只在运行时注册监听器，构建时跳过
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    // 各浏览器新标签页地址（Chrome/Firefox/Edge），按 URL 统一匹配
    const newTabUrls = new Set(['chrome://newtab/', 'edge://newtab/', 'about:newtab']);
    // 已认领（重定向处理中/已处理）的 tab 集合：一次新标签页打开会触发多轮
    // onUpdated，逐轮 tabs.update 会产生冗余导航/闪烁与极端竞态。
    // 注意不能用 status:'loading' 门去重：Firefox 默认预载 about:newtab
    // （browser.newtab.preload），Ctrl+T 换入的是已加载浏览器、无新导航，
    // 永不触发 loading 事件，loading 门会使 Firefox 的 NTP 接管完全失效
    const redirectedTabs = new Set<number>();
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      // URL 门：Firefox 的 onUpdated 不提供 tab.pendingUrl，
      // 取本轮变化的 changeInfo.url（优先，用户已导航离开时能拿到新 URL 而跳过）
      // 或事件时快照 tab.url；不在目标集合内直接跳过
      const targetUrl = changeInfo.url || tab.url;
      if (!targetUrl || !newTabUrls.has(targetUrl)) return;
      // 去重：首个命中的轮次同步认领该 tab（必须在任何 await 之前），
      // 后续轮次（含 rehydration 等待窗口内到达的）直接跳过
      if (redirectedTabs.has(tabId)) return;
      redirectedTabs.add(tabId);

      // SW 冷启动时 persist rehydration 是异步的，先等恢复完成再读配置，
      // 否则拿到默认值（mini=false/status=true）会误重定向 mini 用户的新标签页
      await waitForStoreRehydration();
      const store = useStore.getState();
      // mini 模式不接管；总开关 status 关闭时也不接管（避免重定向到 tab.html 后只看到"暂无书签"）
      if (store.config.mini === true || store.config.status === false) return;

      // 等待窗口内用户可能已手动导航离开新标签页（tab 参数是事件时快照，
      // 不可复用），重定向前用 tabs.get 复核当前 URL 仍是要接管的新标签页
      chrome.tabs.get(tabId, currentTab => {
        if (chrome.runtime.lastError) {
          console.error('[Background] tabs.get failed:', chrome.runtime.lastError.message);
          return;
        }
        if (!currentTab || !currentTab.url || !newTabUrls.has(currentTab.url)) return;
        chrome.tabs.update(tabId, { url: chrome.runtime.getURL('tab.html') });
      });
    });
    // tab 关闭时清理去重集合，避免驻留 SW 内存缓慢增长
    chrome.tabs.onRemoved.addListener(tabId => {
      redirectedTabs.delete(tabId);
    });
  }

  // SW 冷启动时 BookmarkLib.init 的全量加载可能尚未完成（waitingBookmarks 还是空的），
  // 有限轮询等待就绪（10 次 × 100ms），超时后放弃等待，由调用方按空数据处理
  function waitForBookmarksLoaded(maxAttempts: number = 10, intervalMs: number = 100): Promise<void> {
    return new Promise(resolve => {
      let attempts = 0;
      const check = () => {
        attempts++;
        const store = useStore.getState();
        if (store.waitingBookmarks.length > 0 || attempts >= maxAttempts) {
          resolve();
        } else {
          setTimeout(check, intervalMs);
        }
      };
      setTimeout(check, intervalMs);
    });
  }

  // getbookmark_from_full：full 模式页面取书签
  // SW 冷启动竞态：先等 rehydration 再读 config，否则可能拿到默认值误判 mini 开关；
  // 书签未加载完时做有限重试，避免冷启动时直接回 null 导致 tab.html 显示"暂无书签"
  async function handleGetBookmarkFromFull(ctype: string): Promise<Response> {
    await waitForStoreRehydration();
    const store = useStore.getState();
    if (store.config.mini === true) {
      console.log('full model closed');
      return { ctype, cdata: null };
    }

    if (store.waitingBookmarks.length === 0) {
      BookmarkLib.getBookmarksFromChrome();
      await waitForBookmarksLoaded();
    }

    const bmForFull = BookmarkLib.getBookmark();
    sendPageview('/full_mode_page');
    getUid().then(uid => {
      sendEvent(currentVersion, 'getbookmark_from_full', uid);
    });
    return { ctype, cdata: bmForFull };
  }

  // getbookmark_from_mini：mini 模式通知取书签
  // SW 冷启动竞态：先等 rehydration 再读 config；书签未加载完时有限重试等待
  async function handleGetBookmarkFromMini(ctype: string): Promise<Response> {
    await waitForStoreRehydration();
    const currentStore = useStore.getState();
    if (currentStore.config.mini === false) {
      return { ctype, cdata: null };
    }

    if (currentStore.waitingBookmarks.length === 0) {
      BookmarkLib.getBookmarksFromChrome();
      await waitForBookmarksLoaded();
    }

    const bmForMini = BookmarkLib.getBookmark();
    if (!bmForMini) {
      return { ctype, cdata: null };
    }
    sendPageview('/mini_mode_notification');
    getUid().then(uid => {
      sendEvent(currentVersion, 'getbookmark_from_mini', uid);
    });
    return {
      ctype,
      cdata: {
        bookmark: bmForMini,
        config: useStore.getState().config,
      },
    };
  }

  // get_config：popup 读取配置
  // SW 冷启动竞态：先等 rehydration 再读，否则 popup 可能短暂拿到默认配置
  async function handleGetConfig(ctype: string): Promise<Response> {
    await waitForStoreRehydration();
    sendPageview('/popup');
    getUid().then(uid => {
      sendEvent(currentVersion, 'get_config', uid);
    });
    return { ctype, cdata: useStore.getState().config };
  }

  // save_config：popup 保存配置
  // 必须等 rehydration 完成后再写入：SW 因 popup 消息冷启动时，若 save_config
  // 先于 hydrate 完成，updateConfig 写入的新状态会被 hydrate 随后的
  // set(stateFromStorage) 整体覆盖，造成配置丢失
  async function handleSaveConfig(ctype: string, cdata: any): Promise<Response> {
    await waitForStoreRehydration();
    getUid().then(uid => {
      sendEvent(currentVersion, 'save_config', uid);
    });
    useStore.getState().updateConfig({
      status: cdata.status,
      mini: cdata.mini,
      random: cdata.random,
      frequency: cdata.frequency,
      currentNotifyLocation: cdata.currentNotifyLocation,
      ga: cdata.ga,
      gaPrompted: cdata.gaPrompted,
      autoClose: cdata.autoClose,
      autoCloseDelay: cdata.autoCloseDelay,
    });
    return { ctype, cdata: true };
  }

  // reset_config：popup 重置配置（同样需在 rehydration 后写入，避免被 hydrate 覆盖）
  async function handleResetConfig(ctype: string): Promise<Response> {
    await waitForStoreRehydration();
    getUid().then(uid => {
      sendEvent(currentVersion, 'reset_config', uid);
    });
    // 重置配置为默认值
    useStore.getState().updateConfig({
      status: true,
      mini: false,
      random: true,
      frequency: 5,
      currentNotifyLocation: 'top-right',
      ga: false,
      // 重置后重新征询 GA
      gaPrompted: false,
      autoClose: false,
      autoCloseDelay: 30,
    });
    // 重置频度计数器
    useStore.setState({ frequencyCounter: 0 });
    return { ctype, cdata: true };
  }

  // 与前端页面通讯 - 使用 onMessage 替代 onConnect
  // 只在运行时注册监听器，构建时跳过
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse: (response: Response) => void): boolean => {
      const { ctype, cdata } = message;

      switch (ctype) {
        case 'getbookmark_from_full':
          handleGetBookmarkFromFull(ctype)
            .then(sendResponse)
            .catch(error => {
              console.error('[Background] getbookmark_from_full failed:', error);
              sendResponse({ ctype, cdata: null });
            });
          return true; // 异步响应

        case 'getbookmark_from_mini':
          handleGetBookmarkFromMini(ctype)
            .then(sendResponse)
            .catch(error => {
              console.error('[Background] getbookmark_from_mini failed:', error);
              sendResponse({ ctype, cdata: null });
            });
          return true; // 异步响应

        case 'getbookmark_byid':
          BookmarkLib.getBookmarkById(cdata.id, bm => {
            if (bm) {
              BookmarkLib.getBookmarkById(bm.parentId!, parentBm => {
                const bookmarkWithParent = {
                  ...bm,
                  parent: parentBm,
                };
                getUid().then(uid => {
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
              getUid().then(uid => {
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
          BookmarkLib.getBookmarkMenu(menu => {
            sendPageview('/bookmark_manager_page');
            getUid().then(uid => {
              sendEvent(currentVersion, 'getbookmark_menu', uid);
            });
            sendResponse({ ctype, cdata: menu });
          });
          return true;

        case 'getbookmark_children':
          getUid().then(uid => {
            sendEvent(currentVersion, 'getbookmark_children', uid);
          });
          BookmarkLib.getBookmarkChildren(cdata, bookmarks => {
            sendResponse({ ctype, cdata: bookmarks });
          });
          return true;

        case 'block':
          getUid().then(uid => {
            sendEvent(currentVersion, 'block', uid);
          });
          BookmarkLib.addBlockedBookmark(cdata);
          // 同步移出待读队列，避免被屏蔽书签在队列耗尽前仍被推送
          BookmarkLib.removeWaitingBookmark(cdata);
          sendResponse({ ctype, cdata: true });
          return false;

        case 'remove_bookmark':
          getUid().then(uid => {
            sendEvent(currentVersion, 'remove_bookmark', uid);
          });
          BookmarkLib.removeBookmark(cdata, success => {
            if (success) {
              // 删除成功即同步移出队列，保证响应前队列即时一致，不依赖 500ms 防抖重拉
              BookmarkLib.removeWaitingBookmark(cdata);
            }
            sendResponse({ ctype, cdata: success });
          });
          return true;

        case 'update_bookmark':
          getUid().then(uid => {
            sendEvent(currentVersion, 'update_bookmark', uid);
          });
          BookmarkLib.updateBookmark(cdata, result => {
            sendResponse({ ctype, cdata: result === 'success' });
          });
          return true;

        case 'get_config':
          handleGetConfig(ctype)
            .then(sendResponse)
            .catch(error => {
              console.error('[Background] get_config failed:', error);
              sendResponse({ ctype, cdata: null });
            });
          return true; // 异步响应

        case 'save_config':
          handleSaveConfig(ctype, cdata)
            .then(sendResponse)
            .catch(error => {
              console.error('[Background] save_config failed:', error);
              sendResponse({ ctype, cdata: null });
            });
          return true; // 异步响应

        case 'reset_config':
          handleResetConfig(ctype)
            .then(sendResponse)
            .catch(error => {
              console.error('[Background] reset_config failed:', error);
              sendResponse({ ctype, cdata: null });
            });
          return true; // 异步响应

        case 'getbookmark_breadcrumb':
          if (cdata === '0') {
            sendResponse({ ctype, cdata: [] });
            return false;
          }
          BookmarkLib.getBookmarkBreadcrumb(cdata, breadcrumb => {
            sendResponse({ ctype, cdata: breadcrumb.reverse() });
          });
          return true;

        case 'get_block_list':
          sendPageview('/block_list_page');
          getUid().then(uid => {
            sendEvent(currentVersion, 'get_block_list', uid);
          });
          BookmarkLib.getBlockList(blockedBookmarks => {
            sendResponse({ ctype, cdata: blockedBookmarks });
          });
          return true;

        case 'create_bookmark_folder':
          getUid().then(uid => {
            sendEvent(currentVersion, 'create_bookmark_folder', uid);
          });
          BookmarkLib.createBookmark(cdata, result => {
            sendResponse({ ctype, cdata: !!result });
          });
          return true;

        case 'remove_block_bookmark':
          getUid().then(uid => {
            sendEvent(currentVersion, 'remove_block_bookmark', uid);
          });
          BookmarkLib.removeBlockedBookmark(cdata);
          sendResponse({ ctype, cdata: true });
          return false;

        case 'clear_block_list':
          getUid().then(uid => {
            sendEvent(currentVersion, 'clear_block_list', uid);
          });
          BookmarkLib.clearBlockList();
          sendResponse({ ctype, cdata: true });
          return false;

        default:
          return false;
      }
    });
  }

  // 绑定书签事件
  // 只在运行时注册监听器，构建时跳过
  if (typeof chrome !== 'undefined' && chrome.bookmarks) {
    chrome.bookmarks.onCreated.addListener((id, bookmark) => {
      console.log('Bookmark created:', id, bookmark);
      // 必须有 URL（不是文件夹）
      if (!bookmark.url) {
        return;
      }
      // 检查是否在屏蔽列表中
      const store = useStore.getState();
      const isBlocked = store.blockedBookmarks.some(b => b.id === bookmark.id);
      if (isBlocked) {
        return;
      }
      // 位于书签栏子树内（任意层级，与全量加载逻辑一致）才入队。
      // 书签栏 id 由 getTree 解析（Chrome/Edge 为 '1'，Firefox 为 'toolbar_____'），
      // 不能硬编码 parentId === '1'（Firefox 恒不命中）
      BookmarkLib.isInBookmarkBarSubtree(bookmark.id, inBookmarkBar => {
        if (inBookmarkBar) {
          BookmarkLib.addWaitingBookmark(bookmark as any);
        }
      });
    });

    // Firefox 与 Chrome 48+/Edge（Chromium 内核）的 RemoveInfo 均提供 node，可按节点精确清理；
    // 无 node 的 else 分支仅作防御性兜底（全量重拉待读队列）；
    // 防抖：短时间连续删多个书签时合并为一次重拉
    let queueRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleQueueRefresh = () => {
      if (queueRefreshTimer !== null) {
        clearTimeout(queueRefreshTimer);
      }
      queueRefreshTimer = setTimeout(() => {
        queueRefreshTimer = null;
        BookmarkLib.getBookmarksFromChrome();
      }, 500);
    };

    chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
      console.log('Bookmark removed:', id, removeInfo);
      // 从缓存中删除
      if (removeInfo.node) {
        BookmarkLib.removeWaitingBookmark(removeInfo.node as any);
        BookmarkLib.removeBlockedBookmark(removeInfo.node as any);
        // 删除的是文件夹时，按节点清理只删自身，其子书签仍可能残留在队列中，追加兜底重拉。
        // Firefox 的 node 无 children 字段，两引擎文件夹节点均无 url，故以 url 判定为主、children 为辅
        if (!removeInfo.node.url || (removeInfo.node.children?.length ?? 0) > 0) {
          scheduleQueueRefresh();
        }
      } else {
        scheduleQueueRefresh();
      }
    });
  }

  // 安装/升级检测
  // 只在运行时注册监听器，构建时跳过
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onInstalled.addListener(detail => {
      if (detail.reason === 'update') {
        getUid().then(uid => {
          sendEvent(currentVersion, 'update_extension', uid, 1);
        });
        // v3→v4 存储迁移已删除：v3 的 localStorage('vuex') 迁移因 SW 冷启动
        // 竞态自 v4 发布起就已失效，改为升级后一次性告知老用户
        // 偏好与屏蔽列表可能需要重新设置
        showV3UpgradeNoticeOnce();
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
        getUid().then(uid => {
          sendEvent(currentVersion, 'install_extension', uid, 1);
        });
        console.log('installed');
        // 初始化数据
        // 必须等 persist rehydration 完成后再加载：onInstalled 触发的 init 若先于
        // 恢复执行，getBookmarksFromChrome 的异步回包可能晚于 rehydration 落地，
        // 把刚从 chrome.storage 恢复的待读队列整体覆盖回全量书签
        // （--load-extension 环境每次启动都会触发 install，竞态稳定可复现；
        // persist 落盘修复前存储里本就没有可覆盖的数据，该竞态随之显形）
        waitForStoreRehydration()
          .then(() => {
            BookmarkLib.init();
          })
          .catch(error => {
            console.error('[Background] Error waiting for store rehydration (install):', error);
            // 即使出错也继续初始化
            BookmarkLib.init();
          });
        // TODO: 推广页面已不存在，暂时注释掉
        // window.open('https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324');
      }
    });
  }

  // 升级提醒
  // 只在运行时注册监听器，构建时跳过
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onUpdateAvailable.addListener(detail => {
      console.log('Avaliable update:', detail.version);
      notifications(detail.version ? 'v' + detail.version : 'New version');
    });
  }

  // 升级提醒按钮监听器在模块顶层只注册一次，
  // 避免每次 onUpdateAvailable 触发 notifications() 都叠加新监听器，导致一次点击多次 reload
  if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.onButtonClicked) {
    chrome.notifications.onButtonClicked.addListener(() => {
      chrome.runtime.reload();
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
  }

  // v3 → v4 升级说明通知（仅弹一次）
  // v3 数据存 localStorage('vuex')，v4 起改用 chrome.storage.local，
  // 旧迁移逻辑已删除，用 storage 标志位保证只提示一次
  function showV3UpgradeNoticeOnce(): void {
    if (typeof chrome === 'undefined' || !chrome.notifications || !chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get('v3-upgrade-notice-shown', result => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Error checking v3 upgrade notice flag:', chrome.runtime.lastError);
        return;
      }
      if (result['v3-upgrade-notice-shown']) return;
      chrome.notifications.create(
        {
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          // 用专用 title key 而非 appname：让用户在通知中心一眼看出
          // 这是升级相关提示而非日常书签推送
          title: chrome.i18n.getMessage('v3_upgrade_notice_title'),
          message: chrome.i18n.getMessage('v3_upgrade_notice_message'),
        },
        notificationId => {
          if (chrome.runtime.lastError) {
            // 创建失败（如 OS 层禁用通知）时不写标志，下次扩展更新可重试，
            // 避免一次性提示被临时性失败静默吞掉
            console.error('[Background] Error creating v3 upgrade notice:', chrome.runtime.lastError);
            return;
          }
          chrome.storage.local.set({ 'v3-upgrade-notice-shown': true }, () => {
            if (chrome.runtime.lastError) {
              console.error('[Background] Error setting v3 upgrade notice flag:', chrome.runtime.lastError);
            }
          });
        }
      );
    });
  }

  // DEV-only 验证钩子:E2E 测试(Playwright --load-extension 加载开发构建)在
  // Service Worker 上下文注入执行,断言内置同意门控的缓存与计数行为。
  // 生产构建 debug=false,常量折叠后不会暴露任何全局
  if (debug && typeof globalThis !== 'undefined') {
    (globalThis as unknown as { __gaConsentDebug?: object }).__gaConsentDebug = {
      getCache: () => dataCollectionConsentCache,
      refresh: queryDataCollectionConsent,
      setCache: (value: boolean) => {
        dataCollectionConsentCache = value;
      },
      counters: gaDebug.counters,
    };
  }
});
