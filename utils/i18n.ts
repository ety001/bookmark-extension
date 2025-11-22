/**
 * 国际化工具函数
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      const message = chrome.i18n.getMessage(key, substitutions);
      if (message) {
        return message;
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('getMessage error:', error, 'key:', key);
    }
  }
  // 如果获取失败，返回 key 作为后备
  return key;
}

export function getUILanguage(): string {
  return chrome.i18n.getUILanguage();
}

