import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 配置接口
 */
export interface Config {
  status: boolean; // 是否开启扩展
  mini: boolean; // Mini模式: true
  random: boolean; // 随机展示
  frequency: number; // mini 模式展示频度
  currentNotifyLocation: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'; // 当前 Mini 提醒框位置
  ga: boolean; // Google Analytics Status
  autoClose: boolean; // 是否自动关闭弹层
  autoCloseDelay: number; // 自动关闭延迟秒数
}

/**
 * 书签接口
 */
export interface Bookmark {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  index?: number;
  children?: Bookmark[];
}

/**
 * Store 状态接口
 */
interface StoreState {
  config: Config;
  frequencyCounter: number;
  waitingBookmarks: Bookmark[];
  blockedBookmarks: Bookmark[];
  notifyLocationList: string[];
  
  // Actions
  updateConfig: (config: Partial<Config>) => void;
  updateFrequencyCounter: () => void;
  updateWaitingBookmarks: (bookmarks: Bookmark[]) => void;
  updateBlockedBookmarks: (bookmarks: Bookmark[]) => void;
  addWaitingBookmark: (bookmark: Bookmark) => void;
  addBlockedBookmark: (bookmark: Bookmark) => void;
  removeWaitingBookmark: (bookmark: Bookmark) => void;
  removeBlockedBookmark: (bookmark: Bookmark) => void;
  resetBlockedBookmarks: () => void;
}

/**
 * 默认配置
 */
const defaultConfig: Config = {
  status: true,
  mini: false,
  random: true,
  frequency: 5,
  currentNotifyLocation: 'top-right',
  ga: false,
  autoClose: false,
  autoCloseDelay: 30,
};

/**
 * 从 localStorage 迁移旧数据
 * 只在浏览器环境中执行
 */
function migrateOldData(): Partial<StoreState> | null {
  // 检查是否在浏览器环境中
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  
  try {
    const oldData = localStorage.getItem('vuex');
    if (!oldData) return null;
    
    const parsed = JSON.parse(oldData);
    if (!parsed || !parsed.state) return null;
    
    const oldState = parsed.state;
    return {
      config: oldState.config || defaultConfig,
      frequencyCounter: oldState.frequencyCounter || 0,
      waitingBookmarks: oldState.waitingBookmarks || [],
      blockedBookmarks: oldState.blockedBookmarks || [],
      notifyLocationList: oldState.notifyLocationList || ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
    };
  } catch (error) {
    console.error('迁移旧数据失败:', error);
    return null;
  }
}

/**
 * 创建 Zustand Store
 */
export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      // 尝试迁移旧数据
      const migratedData = migrateOldData();
      
      return {
        config: migratedData?.config || defaultConfig,
        frequencyCounter: migratedData?.frequencyCounter || 0,
        waitingBookmarks: migratedData?.waitingBookmarks || [],
        blockedBookmarks: migratedData?.blockedBookmarks || [],
        notifyLocationList: migratedData?.notifyLocationList || ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
        
        updateConfig: (newConfig) =>
          set((state) => ({
            config: { ...state.config, ...newConfig },
          })),
        
        updateFrequencyCounter: () =>
          set((state) => {
            const config = state.config;
            const newCounter =
              state.frequencyCounter >= config.frequency - 1
                ? 0
                : state.frequencyCounter + 1;
            return { frequencyCounter: newCounter };
          }),
        
        updateWaitingBookmarks: (bookmarks) =>
          set({ waitingBookmarks: bookmarks }),
        
        updateBlockedBookmarks: (bookmarks) =>
          set({ blockedBookmarks: bookmarks }),
        
        addWaitingBookmark: (bookmark) =>
          set((state) => ({
            waitingBookmarks: [...state.waitingBookmarks, bookmark],
          })),
        
        addBlockedBookmark: (bookmark) =>
          set((state) => ({
            blockedBookmarks: [...state.blockedBookmarks, bookmark],
          })),
        
        removeWaitingBookmark: (bookmark) =>
          set((state) => ({
            waitingBookmarks: state.waitingBookmarks.filter(
              (b) => b.id !== bookmark.id
            ),
          })),
        
        removeBlockedBookmark: (bookmark) =>
          set((state) => ({
            blockedBookmarks: state.blockedBookmarks.filter(
              (b) => b.id !== bookmark.id
            ),
          })),
        
        resetBlockedBookmarks: () => set({ blockedBookmarks: [] }),
      };
    },
    {
      name: 'bookmark-extension-storage',
      storage: {
        getItem: (name: string): Promise<string | null> => {
          // 在 Service Worker 中使用 chrome.storage.local
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve) => {
              chrome.storage.local.get(name, (result) => {
                resolve(result[name] || null);
              });
            });
          }
          // 浏览器环境使用 localStorage
          if (typeof localStorage !== 'undefined') {
            return Promise.resolve(localStorage.getItem(name));
          }
          // 降级到内存存储（仅用于构建时）
          return Promise.resolve(null);
        },
        setItem: (name: string, value: string): Promise<void> => {
          // 在 Service Worker 中使用 chrome.storage.local
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve) => {
              chrome.storage.local.set({ [name]: value }, () => {
                resolve();
              });
            });
          }
          // 浏览器环境使用 localStorage
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(name, value);
            return Promise.resolve();
          }
          // 降级到内存存储（仅用于构建时）
          return Promise.resolve();
        },
        removeItem: (name: string): Promise<void> => {
          // 在 Service Worker 中使用 chrome.storage.local
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve) => {
              chrome.storage.local.remove(name, () => {
                resolve();
              });
            });
          }
          // 浏览器环境使用 localStorage
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(name);
            return Promise.resolve();
          }
          // 降级到内存存储（仅用于构建时）
          return Promise.resolve();
        },
      },
    }
  )
);

