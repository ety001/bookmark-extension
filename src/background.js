import store from './store';
import * as types from './store/mutation-types';
import * as BookmarkLib from './libs/BookmarkLib';
import { GA } from './libs/GA';

global.browser = require('webextension-polyfill');

const isFirefox = navigator.userAgent.toUpperCase().indexOf('Firefox') ? true : false;
const isChrome = window.navigator.userAgent.indexOf('Chrome') !== -1;
const isEdge = navigator.userAgent.indexOf('Edg') !== -1;
const browserType = isFirefox === true ? 'firefox' : isChrome === true ? 'chrome' : isEdge === true ? 'edge' : 'unknown';

//清空之前版本的数据
if (window.localStorage.curt_index === undefined) {
  window.localStorage.clear();
  indexedDB.deleteDatabase('bookmarks');
}

const debug = process.env.NODE_ENV === 'development';

// 检测新标签页，控制迷你和full版本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isChrome) {
    if (changeInfo.status === 'loading') {
      if (tab.url === 'chrome://newtab/') {
        if (store.getters.config.mini === false) {
          const url = chrome.runtime.getURL('tab/tab.html');
          chrome.tabs.update(tabId, { url });
        }
      }
    }
  }
  if (isFirefox) {
    if (tab.url === 'about:newtab') {
      if (store.getters.config.mini === false) {
        const url = chrome.runtime.getURL('tab/tab.html');
        chrome.tabs.update(tabId, { url });
      }
    }
  }
  if (isEdge) {
    if (tab.url === 'edge://newtab/') {
      if (store.getters.config.mini === false) {
        const url = chrome.runtime.getURL('tab/tab.html');
        chrome.tabs.update(tabId, { url });
      }
    }
  }
});

// 生成uid
const RandomStr = function(len) {
  len = len || 32;
  var $chars = 'ABCDEFGHJKLMNPQRSTWXYZabcdefhijklmnoprstwxyz012345678';
  var maxPos = $chars.length;
  var pwd = '';
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
};
const GetUid = {
  get: function() {
    if (window.localStorage.uid) {
      var uid = window.localStorage.uid;
    } else {
      var d = new Date();
      var uid = RandomStr() + d.getSeconds() + d.getMinutes() + d.getMilliseconds();
      window.localStorage.uid = uid;
    }
    return uid;
  },
};
const uid = GetUid.get();

//google analytics
let currentVersion = '3_0_4';
if (isChrome) {
  currentVersion = `chrome_${currentVersion}`;
}
if (isFirefox) {
  currentVersion = `firefox_${currentVersion}`;
}
const gaID = 'UA-64832923-4';
const gaObj = new GA(gaID, uid, debug);
function sendEvent(eventCategory, eventAction, eventLabel = '', eventValue = 1) {
  if (store.getters.config.ga === false) return;
  gaObj.ga('event', eventCategory, eventAction, eventLabel, eventValue);
}
// dh -- Document hostname, dp -- Page, dt -- Title
function sendPageview(dp, dh = '', dt = '') {
  if (store.getters.config.ga === false) return;
  gaObj.ga('pageview', dh, dp, dt);
}

//数据初始化
BookmarkLib.init();

//与前端页面通讯
chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == 'bookmark_manager_ety001');
  port.onMessage.addListener(function(msg) {
    const ctype = msg.ctype;
    const cdata = msg.cdata;
    switch (ctype) {
      case 'getbookmark_from_full':
        if (store.getters.config.mini === true) {
          console.log('full model closed');
          return;
        }
        const bmForFull = BookmarkLib.getBookmark();
        sendPageview('/full_mode_page');
        sendEvent(currentVersion, 'getbookmark_from_full', uid);
        port.postMessage({ ctype: ctype, cdata: bmForFull });
        break;
      case 'getbookmark_from_mini':
        if (store.getters.config.mini === false) {
          console.log('mini model closed');
          return;
        }
        const bmForMini = BookmarkLib.getBookmark();
        sendPageview('/mini_mode_notification');
        sendEvent(currentVersion, 'getbookmark_from_mini', uid);
        port.postMessage({
          ctype,
          cdata: {
            bookmark: bmForMini,
            config: store.getters.config,
          },
        });
        break;
      case 'getbookmark_byid':
        BookmarkLib.getBookmarkById(msg.cdata.id, bm => {
          if (bm) {
            BookmarkLib.getBookmarkById(bm.parentId, parentBm => {
              bm.parent = parentBm;
              sendEvent(currentVersion, 'getbookmark_byid', uid);
              return port.postMessage({
                ctype,
                cdata: {
                  bookmark: bm,
                  action: cdata.action,
                },
              });
            });
          } else {
            sendEvent(currentVersion, 'getbookmark_byid', uid);
            return port.postMessage({
              ctype,
              cdata: {
                bookmark: bm,
                action: cdata.action,
              },
            });
          }
        });
        break;
      case 'getbookmark_menu':
        BookmarkLib.getBookmarkMenu(menu => {
          sendPageview('/bookmark_manager_page');
          sendEvent(currentVersion, 'getbookmark_menu', uid);
          port.postMessage({ ctype, cdata: menu });
        });
        break;
      case 'getbookmark_children':
        sendEvent(currentVersion, 'getbookmark_children', uid);
        BookmarkLib.getBookmarkChildren(cdata, bookmarks => {
          port.postMessage({ ctype, cdata: bookmarks });
        });
        break;
      case 'block':
        sendEvent(currentVersion, 'block', uid);
        BookmarkLib.addBlockedBookmark(cdata);
        port.postMessage({ ctype, cdata: true });
        break;
      case 'cancel_block':
        sendEvent(currentVersion, 'cancel_block', uid);
        BookmarkLib.removeBlockedBookmark(cdata);
        port.postMessage({ ctype, cdata: true });
        break;
      case 'remove_bookmark':
        sendEvent(currentVersion, 'remove_bookmark', uid);
        // 从 chrome 删除
        BookmarkLib.removeBookmark(cdata, () => {
          port.postMessage({ ctype, cdata: true });
        });
        break;
      case 'update_bookmark':
        sendEvent(currentVersion, 'update_bookmark', uid);
        BookmarkLib.updateBookmark(cdata, () => {
          port.postMessage({ ctype, cdata: true });
        });
        break;
      case 'get_config':
        sendPageview('/popup');
        sendEvent(currentVersion, 'get_config', uid);
        port.postMessage({ ctype, cdata: store.getters.config });
        break;
      case 'save_config':
        sendEvent(currentVersion, 'save_config', uid);
        store.commit(types.UPDATE_CONFIG, {
          status: cdata.status,
          mini: cdata.mini,
          random: cdata.random,
          frequency: cdata.frequency,
          currentNotifyLocation: cdata.currentNotifyLocation,
          ga: cdata.ga,
        });
        port.postMessage({ ctype, cdata: true });
        break;
      case 'getbookmark_breadcrumb':
        if (cdata === '0') {
          port.postMessage({ ctype, cdata: [] });
        }
        BookmarkLib.getBookmarkBreadcrumb(cdata, breadcrumb => {
          port.postMessage({ ctype, cdata: breadcrumb.reverse() });
        });
        break;
      case 'get_block_list':
        sendPageview('/block_list_page');
        sendEvent(currentVersion, 'get_block_list', uid);
        BookmarkLib.getBlockList(blockedBookmarks => {
          port.postMessage({ ctype, cdata: blockedBookmarks });
        });
        break;
      case 'create_bookmark_folder':
        sendEvent(currentVersion, 'create_bookmark_folder', uid);
        BookmarkLib.createBookmark(cdata, () => {
          port.postMessage({ ctype, cdata: true });
        });
        break;
      case 'remove_block_bookmark':
        sendEvent(currentVersion, 'remove_block_bookmark', uid);
        BookmarkLib.removeBlockedBookmark(cdata);
        port.postMessage({ ctype, cdata: true });
        break;
      case 'clear_block_list':
        sendEvent(currentVersion, 'clear_block_list', uid);
        BookmarkLib.clearBlockList();
        port.postMessage({ ctype, cdata: true });
        break;
    }
  });
});

// 绑定书签事件
chrome.bookmarks.onCreated.addListener((id, bm) => {
  console.log('ONcreated', id, bm);
  // 加入缓存
  BookmarkLib.addWaitingBookmark(bm);
});
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('ONremoved', id, removeInfo);
  // 从缓存中删除
  BookmarkLib.removeWaitingBookmark(removeInfo.node);
  BookmarkLib.removeBlockedBookmark(removeInfo.node);
});

// 安装/升级检测
chrome.runtime.onInstalled.addListener(detail => {
  if (detail.reason == 'update') {
    sendEvent(currentVersion, 'update_extension', `${browserType}#${uid}`, 1);
    // 弹出推广页面
    window.open('https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324');
    return;
    chrome.notifications.create(
      {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: chrome.i18n.getMessage('appname'),
        message: chrome.i18n.getMessage('update_ok'),
      },
      function(notification_id) {}
    );
  }
  if (detail.reason === 'install') {
    sendEvent(currentVersion, 'install_extension', `${browserType}#${uid}`, 1);
    console.log('installed');
    // 初始化数据
    BookmarkLib.init();
    // 弹出推广页面
    window.open('https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324');
  }
});

// 升级提醒
chrome.runtime.onUpdateAvailable.addListener(function(detail) {
  console.log('Avaliable update:', detail.version);
  notifications(detail.version ? 'v' + detail.version : 'New version');
});
function notifications(version) {
  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: chrome.i18n.getMessage('appname'),
      message: version + chrome.i18n.getMessage('update_reminder'),
      buttons: [{ title: chrome.i18n.getMessage('update_button') }],
    },
    function() {
      chrome.notifications.onButtonClicked.addListener(function(buttonIndex) {
        chrome.runtime.reload();
      });
    }
  );
}
