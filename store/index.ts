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
 * 等待 Store 恢复完成
 * 在 Service Worker 中，persist 的恢复是异步的，需要等待恢复完成
 */
export async function waitForStoreRehydration(): Promise<void> {
  // 在 Service Worker 中，直接检查 chrome.storage.local 是否有数据
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get('bookmark-extension-storage', (result) => {
        if (chrome.runtime.lastError) {
          console.error('[Store] Error checking storage:', chrome.runtime.lastError);
          resolve(); // 即使出错也继续，使用默认值
        } else {
          // 如果有存储的数据，等待一小段时间让 persist 恢复
          if (result['bookmark-extension-storage']) {
            console.log('[Store] Found stored data, waiting for rehydration...');
            // 等待最多 1 秒让 persist 恢复
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
              const state = useStore.getState();
              // 检查配置是否已恢复（不是默认值，或者有书签数据）
              if (state.config.autoClose !== undefined || state.waitingBookmarks.length > 0 || Date.now() - startTime > 1000) {
                clearInterval(checkInterval);
                console.log('[Store] Rehydration check complete');
                resolve();
              }
            }, 50);
          } else {
            console.log('[Store] No stored data found');
            resolve();
          }
        }
      });
    });
  }
  // 非 Service Worker 环境，直接返回
  return Promise.resolve();
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
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[Store] Failed to rehydrate store:', error);
        } else if (state) {
          console.log('[Store] Store rehydrated successfully:', {
            config: state.config,
            hasBookmarks: state.waitingBookmarks.length > 0,
            hasBlocked: state.blockedBookmarks.length > 0,
          });
        } else {
          console.log('[Store] No stored state found, using defaults');
        }
      },
      storage: {
        getItem: async (name: string): Promise<string | null> => {
          // 在 Service Worker 中使用 chrome.storage.local
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve, reject) => {
              try {
                chrome.storage.local.get(name, (result) => {
                  if (chrome.runtime.lastError) {
                    console.error('[Store] Error getting storage:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                  } else {
                    const value = result[name] || null;
                    console.log('[Store] Retrieved from storage:', name, value ? 'has data' : 'empty');
                    resolve(value as string | null);
                  }
                });
              } catch (error) {
                console.error('[Store] Exception getting storage:', error);
                reject(error);
              }
            });
          }
          // 浏览器环境使用 localStorage
          if (typeof localStorage !== 'undefined') {
            const value = localStorage.getItem(name);
            console.log('[Store] Retrieved from localStorage:', name, value ? 'has data' : 'empty');
            return Promise.resolve(value);
          }
          // 降级到内存存储（仅用于构建时）
          return Promise.resolve(null);
        },
        setItem: async (name: string, value: string): Promise<void> => {
          // 在 Service Worker 中使用 chrome.storage.local
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve, reject) => {
              try {
                chrome.storage.local.set({ [name]: value }, () => {
                  if (chrome.runtime.lastError) {
                    console.error('[Store] Error setting storage:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                  } else {
                    console.log('[Store] Saved to storage:', name, 'size:', value.length);
                    resolve();
                  }
                });
              } catch (error) {
                console.error('[Store] Exception setting storage:', error);
                reject(error);
              }
            });
          }
          // 浏览器环境使用 localStorage
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(name, value);
            console.log('[Store] Saved to localStorage:', name, 'size:', value.length);
            return Promise.resolve();
          }
          // 降级到内存存储（仅用于构建时）
          return Promise.resolve();
        },
        removeItem: async (name: string): Promise<void> => {
          // 在 Service Worker 中使用 chrome.storage.local
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve, reject) => {
              try {
                chrome.storage.local.remove(name, () => {
                  if (chrome.runtime.lastError) {
                    console.error('[Store] Error removing storage:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                  } else {
                    console.log('[Store] Removed from storage:', name);
                    resolve();
                  }
                });
              } catch (error) {
                console.error('[Store] Exception removing storage:', error);
                reject(error);
              }
            });
          }
          // 浏览器环境使用 localStorage
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(name);
            console.log('[Store] Removed from localStorage:', name);
            return Promise.resolve();
          }
          // 降级到内存存储（仅用于构建时）
          return Promise.resolve();
        },
      } as any,
    }
  )
);

