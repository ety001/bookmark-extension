import { defineConfig } from 'wxt';

// https://wxt.dev/api/config.html
export default defineConfig({
  publicDir: 'public',
  entrypointsDir: 'entrypoints',
  manifestVersion: 3,
  manifest: {
    name: '__MSG_appname__',
    description: '__MSG_appdesc__',
    default_locale: 'en',
    version: '4.0.4',
    // 修改：author 改为字符串格式（Firefox 要求）
    // 使用类型断言绕过 WXT 的类型检查，因为 Firefox 需要字符串格式
    author: 'work@akawa.ink' as any,
    permissions: [
      'notifications',
      'bookmarks',
      'tabs',
      'storage',
      'unlimitedStorage',
    ],
    host_permissions: [
      'https://ga-bm.mypi.win/*',
    ],
    action: {
      default_title: '__MSG_appname__',
      default_popup: 'popup/popup.html',
    },
    background: {
      service_worker: 'background/index.ts',
    },
    content_scripts: [
      {
        matches: ['*://*/*'],
        js: ['content-script.js'],
        css: ['content-script.css'],
        run_at: 'document_end',
      },
    ],
    web_accessible_resources: [
      {
        resources: ['tab.html', 'bookmark.html', 'block-manager.html', 'fonts/*'],
        matches: ['<all_urls>'],
      },
    ],
    icons: {
      '16': 'icons/icon-16.png',
      '19': 'icons/icon-19.png',
      '38': 'icons/icon-38.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    // 添加：Firefox 特定的配置
    browser_specific_settings: {
      gecko: {
        id: '{e6d65c2b-3748-4962-8e8f-d25891bf1ed0}', // 必须与 AMO 上注册的 ID 匹配
        strict_min_version: '109.0', // Firefox 109+ 支持 Manifest V3
      },
    },
  },
  modules: ['@wxt-dev/module-react'],
});
