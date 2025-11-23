# Google Analytics 埋点列表

本文档列出了所有 Google Analytics 埋点操作及其触发条件。

## 页面浏览事件 (page_view)

### 1. `/popup`
- **触发位置**: `entrypoints/background/index.ts:331`
- **触发条件**: 当 popup 页面发送 `get_config` 消息时
- **消息来源**: `entrypoints/popup/App.tsx:34`

### 2. `/full_mode_page`
- **触发位置**: `entrypoints/background/index.ts:174`
- **触发条件**: 当 tab 页面发送 `getbookmark_from_full` 消息时
- **消息来源**: `entrypoints/tab/App.tsx:45`

### 3. `/mini_mode_notification`
- **触发位置**: `entrypoints/background/index.ts:203, 228`
- **触发条件**: 当 content script 发送 `getbookmark_from_mini` 消息时
- **消息来源**: `entrypoints/content-script.tsx:94`

### 4. `/bookmark_manager_page`
- **触发位置**: `entrypoints/background/index.ts:277`
- **触发条件**: 当 bookmark 页面发送 `getbookmark_menu` 消息时
- **消息来源**: `entrypoints/bookmark/App.tsx:113`

### 5. `/block_list_page`
- **触发位置**: `entrypoints/background/index.ts:364`
- **触发条件**: 当 block-manager 页面发送 `get_block_list` 消息时
- **消息来源**: `entrypoints/block-manager/App.tsx:45`

## 自定义事件 (event)

### 1. `get_config`
- **触发位置**: `entrypoints/background/index.ts:333`
- **触发条件**: 当 popup 页面发送 `get_config` 消息时
- **消息来源**: `entrypoints/popup/App.tsx:34`

### 2. `save_config`
- **触发位置**: `entrypoints/background/index.ts:340`
- **触发条件**: 当 popup 页面发送 `save_config` 消息时
- **消息来源**: `entrypoints/popup/App.tsx:89, 107`

### 3. `getbookmark_from_full`
- **触发位置**: `entrypoints/background/index.ts:176`
- **触发条件**: 当 tab 页面发送 `getbookmark_from_full` 消息时
- **消息来源**: `entrypoints/tab/App.tsx:45`

### 4. `getbookmark_from_mini`
- **触发位置**: `entrypoints/background/index.ts:205, 230`
- **触发条件**: 当 content script 发送 `getbookmark_from_mini` 消息时
- **消息来源**: `entrypoints/content-script.tsx:94`

### 5. `getbookmark_byid`
- **触发位置**: `entrypoints/background/index.ts:250, 262`
- **触发条件**: 当页面发送 `getbookmark_byid` 消息时
- **消息来源**: 可能在 bookmark 页面中使用

### 6. `getbookmark_menu`
- **触发位置**: `entrypoints/background/index.ts:279`
- **触发条件**: 当 bookmark 页面发送 `getbookmark_menu` 消息时
- **消息来源**: `entrypoints/bookmark/App.tsx:113`

### 7. `getbookmark_children`
- **触发位置**: `entrypoints/background/index.ts:287`
- **触发条件**: 当 bookmark 页面发送 `getbookmark_children` 消息时
- **消息来源**: `entrypoints/bookmark/App.tsx` (需要确认具体位置)

### 8. `block`
- **触发位置**: `entrypoints/background/index.ts:296`
- **触发条件**: 当页面发送 `block` 消息时
- **消息来源**: 
  - `entrypoints/tab/App.tsx:64`
  - `entrypoints/content-script.tsx` (需要确认)

### 9. `cancel_block`
- **触发位置**: `entrypoints/background/index.ts:304`
- **触发条件**: 当页面发送 `cancel_block` 消息时
- **消息来源**: 需要确认

### 10. `remove_bookmark`
- **触发位置**: `entrypoints/background/index.ts:312`
- **触发条件**: 当页面发送 `remove_bookmark` 消息时
- **消息来源**: 
  - `entrypoints/tab/App.tsx:85`
  - `entrypoints/content-script.tsx` (需要确认)
  - `entrypoints/bookmark/App.tsx` (需要确认)

### 11. `update_bookmark`
- **触发位置**: `entrypoints/background/index.ts:321`
- **触发条件**: 当页面发送 `update_bookmark` 消息时
- **消息来源**: `entrypoints/bookmark/App.tsx` (需要确认)

### 12. `get_block_list`
- **触发位置**: `entrypoints/background/index.ts:366`
- **触发条件**: 当 block-manager 页面发送 `get_block_list` 消息时
- **消息来源**: `entrypoints/block-manager/App.tsx:45`

### 13. `create_bookmark_folder`
- **触发位置**: `entrypoints/background/index.ts:375`
- **触发条件**: 当页面发送 `create_bookmark_folder` 消息时
- **消息来源**: 需要确认

### 14. `remove_block_bookmark`
- **触发位置**: `entrypoints/background/index.ts:384`
- **触发条件**: 当 block-manager 页面发送 `remove_block_bookmark` 消息时
- **消息来源**: `entrypoints/block-manager/App.tsx:63`

### 15. `clear_block_list`
- **触发位置**: `entrypoints/background/index.ts:392`
- **触发条件**: 当 block-manager 页面发送 `clear_block_list` 消息时
- **消息来源**: `entrypoints/block-manager/App.tsx:84`

### 16. `update_extension`
- **触发位置**: `entrypoints/background/index.ts:437`
- **触发条件**: 当扩展更新时（`chrome.runtime.onInstalled` 事件，reason === 'update'）

### 17. `install_extension`
- **触发位置**: `entrypoints/background/index.ts:454`
- **触发条件**: 当扩展安装时（`chrome.runtime.onInstalled` 事件，reason === 'install'）

## 注意事项

1. **所有埋点都在 background script 中执行**：所有 GA 事件都是通过 background script 的消息处理函数触发的
2. **需要 GA 开关开启**：所有事件都会检查 `store.config.ga`，如果为 `false` 则不会发送
3. **Service Worker 环境**：background script 运行在 Service Worker 环境中，使用 GA4 Measurement Protocol API 发送事件

## 问题排查

如果某些埋点没有触发，请检查：
1. GA 开关是否已开启（`store.config.ga === true`）
2. 相应的消息是否已发送到 background script
3. background script 是否正确处理了该消息
4. Service Worker 控制台是否有错误信息

