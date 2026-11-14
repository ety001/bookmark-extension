import { defineConfig } from 'wxt';

// https://wxt.dev/api/config.html
export default defineConfig({
  publicDir: 'public',
  entrypointsDir: 'entrypoints',
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: '__MSG_appname__',
    description: '__MSG_appdesc__',
    default_locale: 'en',
    version: '4.3.1',
    // 修改：author 改为字符串格式（Firefox 要求）
    // 使用类型断言绕过 WXT 的类型检查，因为 Firefox 需要字符串格式
    author: 'work@akawa.ink' as any,
    permissions: ['notifications', 'bookmarks', 'tabs', 'storage', 'unlimitedStorage'],
    host_permissions: ['https://ga-bm.mypi.win/*'],
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
        resources: ['bookmark.html'],
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
    // 添加：Firefox 特定的配置(仅 firefox 目标输出;Chromium 会忽略该字段,
    // 不输出以保证 chrome/edge 产物干净、不受影响)
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: '{e6d65c2b-3748-4962-8e8f-d25891bf1ed0}', // 必须与 AMO 上注册的 ID 匹配
              strict_min_version: '109.0', // Firefox 109+ 支持 Manifest V3
              // Firefox 内置数据收集同意机制(140+ 引入);2025-11-03 起新扩展提交 AMO 必须声明,
              // 否则上传被拒:The "data_collection_permissions" property is missing.
              // 本扩展的 GA 统计默认关闭,仅在用户于 popup 显式开启(ga=true)后才会发送
              // 随机 uid(安装时生成的随机字符串)+ 事件名/扩展内页面路径,
              // 因此 required 声明为 none(默认不收集任何数据),
              // optional 声明为 technicalAndInteraction(用户同意后的用量统计类数据)。
              // 枚举值参考:
              // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
              // https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
              data_collection_permissions: {
                required: ['none'],
                optional: ['technicalAndInteraction'],
              },
            },
          },
        }
      : {}),
  }),
  modules: ['@wxt-dev/module-react'],
});
