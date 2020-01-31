import store from './store';
import * as types from './store/mutation-types';
import * as BookmarkLib from './libs/BookmarkLib';

global.browser = require('webextension-polyfill');

//清空之前版本的数据
if (window.localStorage.curt_index === undefined) {
  window.localStorage.clear();
  indexedDB.deleteDatabase('bookmarks');
}

// 检测新标签页，控制迷你和full版本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    if (tab.url === 'chrome://newtab/') {
      if (store.getters.config.mini === false) {
        const url = chrome.runtime.getURL('tab/tab.html');
        chrome.tabs.update(tabId, { url });
      }
    }
  }
});

//google analytics
const currentVersion = '3_0_1';
const gaID = 'UA-64832923-4';
(function(i, s, o, g, r, a, m) {
  i['GoogleAnalyticsObject'] = r;
  (i[r] =
    i[r] ||
    function() {
      (i[r].q = i[r].q || []).push(arguments);
    }),
    (i[r].l = 1 * new Date());
  (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');
ga('create', gaID, 'auto');
ga('set', 'checkProtocolTask', function() {});
ga('require', 'displayfeatures');
function sendEvent(eventCategory, eventAction, eventLabel = '', eventValue = '') {
  ga('send', 'event', eventCategory, eventAction, eventLabel, eventValue);
}

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
      sendEvent(currentVersion, 'create_user', uid);
    }
    return uid;
  },
};
const uid = GetUid.get();

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
        sendEvent(currentVersion, 'getbookmark_from_full', 'get_bookmark_' + uid, JSON.stringify({ uid, bmForFull }));
        port.postMessage({ ctype: ctype, cdata: bmForFull });
        break;
      case 'getbookmark_from_mini':
        if (store.getters.config.mini === false) {
          console.log('mini model closed');
          return;
        }
        const bmForMini = BookmarkLib.getBookmark();
        sendEvent(currentVersion, 'getbookmark_from_mini', 'get_bookmark_' + uid, JSON.stringify({ uid, bmForMini }));
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
              sendEvent(currentVersion, 'getbookmark_byid', 'get_bookmark_' + uid, JSON.stringify({ uid, bm }));
              return port.postMessage({
                ctype,
                cdata: {
                  bookmark: bm,
                  action: cdata.action,
                },
              });
            });
          } else {
            sendEvent(currentVersion, 'getbookmark_byid', 'get_bookmark_' + uid, JSON.stringify({ uid, bm }));
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
          sendEvent(currentVersion, 'getbookmark_menu', 'getbookmark_menu_' + uid, JSON.stringify({ uid }));
          port.postMessage({ ctype, cdata: menu });
        });
        break;
      case 'getbookmark_children':
        sendEvent(currentVersion, 'getbookmark_children', 'getbookmark_children_' + uid, JSON.stringify({ uid }));
        BookmarkLib.getBookmarkChildren(cdata, bookmarks => {
          port.postMessage({ ctype, cdata: bookmarks });
        });
        break;
      case 'block':
        sendEvent(currentVersion, 'block', 'block_' + uid, JSON.stringify({ uid }));
        BookmarkLib.addBlockedBookmark(cdata);
        port.postMessage({ ctype, cdata: true });
        break;
      case 'cancel_block':
        sendEvent(currentVersion, 'cancel_block', 'cancel_block_' + uid, JSON.stringify({ uid }));
        BookmarkLib.removeBlockedBookmark(cdata);
        port.postMessage({ ctype, cdata: true });
        break;
      case 'remove_bookmark':
        sendEvent(currentVersion, 'remove_bookmark', 'remove_bookmark_' + uid, JSON.stringify({ uid }));
        // 从 chrome 删除
        BookmarkLib.removeBookmark(cdata, () => {
          port.postMessage({ ctype, cdata: true });
        });
        break;
      case 'update_bookmark':
        sendEvent(currentVersion, 'update_bookmark', 'update_bookmark_' + uid, JSON.stringify({ uid }));
        BookmarkLib.updateBookmark(cdata, () => {
          port.postMessage({ ctype, cdata: true });
        });
        break;
      case 'get_config':
        sendEvent(currentVersion, 'get_config', 'get_config_' + uid, JSON.stringify({ uid, config: store.getters.config }));
        port.postMessage({ ctype, cdata: store.getters.config });
        break;
      case 'save_config':
        sendEvent(currentVersion, 'save_config', 'save_config_' + uid, JSON.stringify({ uid }));
        store.commit(types.UPDATE_CONFIG, {
          status: cdata.status,
          mini: cdata.mini,
          random: cdata.random,
          frequency: cdata.frequency,
          currentNotifyLocation: cdata.currentNotifyLocation,
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
        sendEvent(currentVersion, 'get_block_list', 'get_block_list_' + uid, JSON.stringify({ uid }));
        BookmarkLib.getBlockList(blockedBookmarks => {
          port.postMessage({ ctype, cdata: blockedBookmarks });
        });
        break;
      case 'create_bookmark_folder':
        sendEvent(currentVersion, 'create_bookmark_folder', 'create_bookmark_folder_' + uid, JSON.stringify({ uid }));
        BookmarkLib.createBookmark(cdata, () => {
          port.postMessage({ ctype, cdata: true });
        });
        break;
      case 'remove_block_bookmark':
        sendEvent(currentVersion, 'remove_block_bookmark', 'remove_block_bookmark_' + uid, JSON.stringify({ uid }));
        BookmarkLib.removeBlockedBookmark(cdata);
        port.postMessage({ ctype, cdata: true });
        break;
      case 'clear_block_list':
        sendEvent(currentVersion, 'clear_block_list', 'clear_block_list_' + uid, JSON.stringify({ uid }));
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
    sendEvent(currentVersion, 'update_extension', uid, '');
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
    sendEvent(currentVersion, 'install_extension', uid, '');
    console.log('installed');
    // 初始化数据
    BookmarkLib.init();
    // 弹出推广页面
    // TODO
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
