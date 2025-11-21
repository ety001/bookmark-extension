/**
 * 国际化工具函数
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

export function getUILanguage(): string {
  return chrome.i18n.getUILanguage();
}

