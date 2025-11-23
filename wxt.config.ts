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
    version: '4.0.0',
    author: { email: 'work@akawa.ink' },
    permissions: [
      'notifications',
      'bookmarks',
      'tabs',
      'storage',
      'unlimitedStorage',
    ],
    host_permissions: [
      'https://www.google-analytics.com/*',
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
  },
  modules: ['@wxt-dev/module-react'],
});
