# Edge 商店提交文案（隐私相关）— 英文版

> 用途：提交/更新 Microsoft Edge Add-ons 时，在"隐私声明"相关字段中直接复制粘贴对应英文内容。
> 每次发布新版本前，请根据实际代码行为复核以下描述是否仍然准确。

---

## 1. Single purpose description（单一用途描述）

Review Bookmarks is a bookmark management extension that helps you review, organize, and clean up your bookmarks. Every time you open a new tab, it presents one bookmark from your bookmark bar so you can revisit it and decide whether to keep or remove it, and it provides a quick popup for saving the current page as a bookmark. All functionality is limited to bookmark management and display; the extension does not collect your browsing history or personal information.

---

## 2. Permission justifications（权限理由）

### notifications

The "notifications" permission is used solely to display a system notification when a new version of the extension is available for download. The notification contains an "Update" button that reloads the extension to complete the update. No other notifications are ever sent, and notification content contains no personal data.

### bookmarks

The "bookmarks" permission is required for the extension's core functionality, because this extension is a bookmark manager. It reads the user's bookmark tree to display and review bookmarks on the new tab page, and lets the user create, update, move, or remove bookmarks through the extension's own UI. It also listens to bookmark changes (created/removed) so the interface always stays in sync with the browser. All operations are initiated by the user through the extension UI, and bookmark data is never transmitted outside the device.

### tabs

The "tabs" permission is used only to detect when the user opens a new tab (chrome.tabs.onUpdated) so that, when the user has enabled the customizable new-tab feature, the extension can redirect that tab to its own bundled new tab page (chrome.tabs.update). The tab URL is read only to identify the browser's built-in new tab page (e.g., chrome://newtab, about:newtab, edge://newtab). The extension does not read or collect the content or history of any other tabs.

### storage

The "storage" permission is used with chrome.storage.local to persist the user's settings and preferences (for example, mini/full mode, notification position, auto-close behavior, and the analytics opt-in), the waiting-bookmark and blocked-bookmark lists, and a locally generated anonymous identifier. All of this data is stored locally on the user's device. Nothing is uploaded to any server except the optional, opt-in anonymous analytics described under Host permissions below.

### unlimitedStorage

The "unlimitedStorage" permission removes the default quota limit on chrome.storage.local so that the user's preferences and the bookmark lists managed by the extension (waiting bookmarks, blocked bookmarks) can grow over time without hitting the storage quota. It is only used for local data on the user's device; no cloud storage or synchronization is involved.

### Host permissions（https://ga-bm.mypi.win/*）

This host permission is used solely for optional, anonymous usage statistics. When the user has enabled analytics in the extension settings, the extension sends a small anonymized event (for example, "extension installed", "extension updated", or "feature used") to the developer's Cloudflare Worker endpoint (ga-bm.mypi.win), which forwards it to Google Analytics 4. No bookmarks, page content, or browsing history is ever transmitted — only the event name and an anonymous identifier generated on the device. Analytics is disabled by default, and users can turn it off at any time in the extension's settings.

---

## 3. Remote code（远程代码）

### Does your extension use remote code?

No. All code executed by the extension is bundled inside the extension package and is reviewed as part of the store submission. The extension never downloads or executes remote scripts or updates from the network. The only network communication is the optional, opt-in anonymous analytics beacon described under Host permissions above, which carries event data only and never executable code.

---

## 附：填写对照表（Edge 后台字段 → 上面哪一段）

| Edge 后台字段                                        | 使用上面的内容             |
| ---------------------------------------------------- | -------------------------- |
| Single purpose description                           | 第 1 节                    |
| Permission justification - notifications             | 第 2 节 notifications      |
| Permission justification - bookmarks                 | 第 2 节 bookmarks          |
| Permission justification - tabs                      | 第 2 节 tabs               |
| Permission justification - storage                   | 第 2 节 storage            |
| Permission justification - unlimitedStorage          | 第 2 节 unlimitedStorage   |
| Permission justification - host permissions          | 第 2 节 Host permissions   |
| Remote code - "Does your extension use remote code?" | 第 3 节（选 No，粘贴该段） |
