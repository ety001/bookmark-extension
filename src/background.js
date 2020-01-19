import store from './store';
import * as types from './store/mutation-types';
import * as BookmarkLib from './libs/BookmarkLib';
import { Breadcrumb } from 'element-ui';

global.browser = require('webextension-polyfill');

//清空之前版本的数据
if (window.localStorage.curt_index === undefined) {
  window.localStorage.clear();
  indexedDB.deleteDatabase('bookmarks');
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url === 'chrome://newtab/') {
    if (store.getters.config.mini === true) {
      chrome.tabs.update(tabId, { url: 'chrome-search://local-ntp/local-ntp.html' });
    }
  }
});

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
        port.postMessage({ ctype: ctype, cdata: bmForFull });
        break;
      case 'getbookmark_from_mini':
        if (store.getters.config.mini === false) {
          console.log('mini model closed');
          return;
        }
        const bmForMini = BookmarkLib.getBookmark();
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
              return port.postMessage({
                ctype,
                cdata: {
                  bookmark: bm,
                  action: cdata.action,
                },
              });
            });
          } else {
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
          port.postMessage({ ctype, cdata: menu });
        });
        break;
      case 'getbookmark_children':
        BookmarkLib.getBookmarkChildren(cdata, bookmarks => {
          port.postMessage({ ctype, cdata: bookmarks });
        });
        break;
      case 'block':
        BookmarkLib.addBlockedBookmark(cdata);
        port.postMessage({ ctype, cdata: true });
        break;
      case 'cancel_block':
        BookmarkLib.removeBlockedBookmark(cdata);
        port.postMessage({ ctype, cdata: true });
        break;
      case 'remove_bookmark':
        // 从 chrome 删除
        BookmarkLib.removeBookmark(cdata, () => {
          port.postMessage({ ctype, cdata: true });
        });
        break;
      case 'update_bookmark':
        BookmarkLib.updateBookmark(cdata, () => {
          port.postMessage({ ctype, cdata: true });
        });
        break;
      case 'get_config':
        port.postMessage({ ctype, cdata: store.getters.config });
        break;
      case 'save_config':
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
