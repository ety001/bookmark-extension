/**
 * Firefox 内置数据同意(data_collection)工具
 *
 * Firefox 140+ 基于 manifest 的 browser_specific_settings.gecko.data_collection_permissions
 * 声明,在安装流程与 about:addons 的"权限和数据"中提供 technicalAndInteraction 开关,
 * 用户可随时开关。该内置开关必须与 GA 实际发送联动:
 * - popup 自建的 GA 开关(ga)是开发者自建同意体验,默认关闭;
 * - 浏览器内置开关作为额外的系统级门控,两者都同意才发送。
 * 否则内置开关关闭时数据照发、官方 UI 显示"不收集",构成声明与行为矛盾(AMO 人审红线)。
 *
 * 参考文档:
 * https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/Permissions
 */

/** 内置同意机制对应的可选数据类型:技术信息与交互数据 */
export const DATA_COLLECTION_TYPE = 'technicalAndInteraction';

/** 含 Firefox data_collection 扩展字段的 permissions 对象(@types/chrome 无此字段) */
interface PermissionsWithDataCollection {
  data_collection?: unknown;
}

/** Firefox 引入内置数据同意机制的最低主版本(桌面端 140+) */
export const BUILTIN_CONSENT_MIN_FF_VERSION = 140;

/**
 * 从 UA 中解析 Firefox 主版本号。
 * 纯函数,便于单测。非 Firefox UA(Chrome/Edge 等)返回 null。
 */
export function parseFirefoxMajorVersion(ua: string): number | null {
  const match = /Firefox\/(\d+)/.exec(ua);
  if (!match) return null;
  const major = parseInt(match[1], 10);
  return Number.isFinite(major) ? major : null;
}

/**
 * 从 permissions.getAll() 结果判定内置数据同意是否已授予。
 * 纯函数,便于单测。
 * - data_collection 字段存在(仅 Firefox 140+ 有):须包含 technicalAndInteraction 才算授予
 * - 字段不存在(旧 Firefox / Chrome / Edge 无此 API 字段):视为授予,由 popup 自建 GA 开关管理
 */
export function isDataCollectionGrantedFromGetAll(result: unknown): boolean {
  const dataCollection = (result as PermissionsWithDataCollection | null | undefined)?.data_collection;
  if (!Array.isArray(dataCollection)) return true;
  return dataCollection.includes(DATA_COLLECTION_TYPE);
}

/**
 * 探测当前浏览器是否提供 Firefox 内置数据同意机制(Firefox 140+)。
 * 同步实现:permissions.request 必须在用户手势的调用栈内触发,若在其前插入
 * await runtime.getBrowserInfo() 这样的异步探测,可能丢失用户手势上下文导致
 * request 直接失败,故采用同步的 UA 判定(runtime.getBrowserInfo 仅 Firefox
 * 提供,与 UA 同为任务允许的探测方式;此处选 UA 以保住手势)。
 * 仅当 permissions.request 存在且 UA 判定为 Firefox 140+ 时返回 true。
 */
export function isBuiltInDataConsentAvailable(): boolean {
  try {
    if (typeof chrome === 'undefined' || typeof chrome.permissions?.request !== 'function') {
      return false;
    }
    const major = parseFirefoxMajorVersion(navigator.userAgent);
    return major !== null && major >= BUILTIN_CONSENT_MIN_FF_VERSION;
  } catch {
    return false;
  }
}

/**
 * 请求 Firefox 内置 technicalAndInteraction 数据同意(须由用户手势触发调用)。
 * 已在 about:addons 授予时 Firefox 直接返回 true,不再重复弹窗。
 * 任何失败(用户拒绝 / runtime.lastError / 异常)一律返回 false,由调用方
 * 阻止开启 GA(fail closed)。
 */
export function requestBuiltInDataConsent(): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    try {
      chrome.permissions.request(
        // Firefox 的 data_collection 扩展字段,@types/chrome 无该类型定义
        { data_collection: [DATA_COLLECTION_TYPE] } as unknown as chrome.permissions.Permissions,
        granted => {
          if (chrome.runtime.lastError) {
            console.error('[ff-data-consent] permissions.request failed:', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }
          resolve(granted === true);
        }
      );
    } catch (error) {
      console.error('[ff-data-consent] permissions.request threw:', error);
      resolve(false);
    }
  });
}
