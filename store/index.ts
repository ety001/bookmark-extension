import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

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
  gaPrompted: boolean; // GA 征询是否已回答（三态标记：区分"从未询问"与"拒绝过"，false 表示尚未征询）
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
  gaPrompted: false,
  autoClose: false,
  autoCloseDelay: 30,
};

/**
 * Store 恢复（rehydration）就绪 Promise
 * 在 Service Worker 中，persist 从 chrome.storage.local 的恢复是异步的，
 * 冷启动后首个事件若直接读 useStore.getState() 只能拿到默认值
 * （mini=false/status=true），会误判开关状态。
 * 该 Promise 在 persist 的 onRehydrateStorage 完成回调中 resolve：
 * 有存储数据、无存储数据（首次安装）、恢复出错三种情况都会 resolve，
 * 否则冷启动时调用方会永久挂起。
 */
let resolveStoreRehydration: () => void;
export const storeRehydrationPromise: Promise<void> = new Promise<void>(resolve => {
  resolveStoreRehydration = resolve;
});

/**
 * 等待 Store 恢复完成
 * 在 Service Worker 中，persist 的恢复是异步的，需要等待恢复完成
 * 加 5 秒超时兜底（Promise.race）：极端情况下 storage 回调可能永不返回，
 * 不加兜底会导致所有等待方（消息处理/新标签页接管）永久挂起
 */
export async function waitForStoreRehydration(): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      storeRehydrationPromise,
      new Promise<void>(resolve => {
        timeoutId = setTimeout(resolve, 5000);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/**
 * 底层字符串存储适配器（zustand StateStorage 协议：字符串进出）
 * 三级优先：chrome.storage.local（Service Worker / 扩展页面）→ localStorage（普通浏览器环境）→ 内存直通（仅构建期兜底）
 *
 * 注意：本适配器实现的是 StateStorage 协议，不能直接传给 persist 的 storage 选项
 * （persist 期望的是 PersistStorage：getItem/setItem 交换的是 {state, version} 反序列化对象）。
 * 必须用 createJSONStorage 包装，由其负责 JSON.parse/JSON.stringify；
 * 此前直接把本适配器传给 storage（v4.0.0 起），persist 会把含 action 函数的
 * {state, version} 原始对象交给 setItem → chrome.storage.local.set 结构化克隆
 * 抛 DataCloneError，导致每次写入都失败、重启后全部状态丢失。
 */
const storageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // 在 Service Worker 中使用 chrome.storage.local
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(name, result => {
            if (chrome.runtime.lastError) {
              console.error('[Store] Error getting storage:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              const value = result[name] || null;
              // 防御 + 历史数据迁移：该 key 下若存在非字符串值,说明是
              // 修复前(persist 未包 createJSONStorage)在 Chromium 上写入的
              // {state, version} 原始对象(Chrome 的 storage 序列化器会静默
              // 剥离函数,侥幸落盘)。该对象本身就是 StorageValue 的反序列化
              // 形态,序列化为 JSON 字符串返回即可无损迁移;下次状态更新时
              // 会以标准字符串格式覆盖写回。Firefox 上历史写入全部失败、
              // 无旧数据,不会走到该分支
              if (value !== null && typeof value === 'object') {
                console.warn('[Store] Legacy non-string value in storage, migrating to JSON string:', name);
                resolve(JSON.stringify(value));
                return;
              }
              if (value !== null && typeof value !== 'string') {
                console.warn('[Store] Non-string value in storage, treating as empty:', name, typeof value);
                resolve(null);
                return;
              }
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
};

/**
 * 创建 Zustand Store
 */
export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      return {
        config: defaultConfig,
        frequencyCounter: 0,
        waitingBookmarks: [],
        blockedBookmarks: [],
        notifyLocationList: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],

        updateConfig: newConfig =>
          set(state => ({
            config: { ...state.config, ...newConfig },
          })),

        updateFrequencyCounter: () =>
          set(state => {
            const config = state.config;
            const newCounter = state.frequencyCounter >= config.frequency - 1 ? 0 : state.frequencyCounter + 1;
            return { frequencyCounter: newCounter };
          }),

        updateWaitingBookmarks: bookmarks => set({ waitingBookmarks: bookmarks }),

        updateBlockedBookmarks: bookmarks => set({ blockedBookmarks: bookmarks }),

        addWaitingBookmark: bookmark =>
          set(state => ({
            // 按 id 去重（与 addBlockedBookmark 同款守卫）：
            // onCreated 异步入队与防抖全量重拉交错时避免重复入队
            waitingBookmarks: state.waitingBookmarks.some(b => b.id === bookmark.id) ? state.waitingBookmarks : [...state.waitingBookmarks, bookmark],
          })),

        addBlockedBookmark: bookmark =>
          set(state => ({
            // 按 id 去重：重复屏蔽同一条不再重复入列
            // （避免 block-manager 列表重复行与 React key 冲突）
            blockedBookmarks: state.blockedBookmarks.some(b => b.id === bookmark.id) ? state.blockedBookmarks : [...state.blockedBookmarks, bookmark],
          })),

        removeWaitingBookmark: bookmark =>
          set(state => ({
            waitingBookmarks: state.waitingBookmarks.filter(b => b.id !== bookmark.id),
          })),

        removeBlockedBookmark: bookmark =>
          set(state => ({
            blockedBookmarks: state.blockedBookmarks.filter(b => b.id !== bookmark.id),
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
        // 无论有/无存储数据、成功/失败，都标记 rehydration 完成，
        // 让 waitForStoreRehydration 的等待方继续执行（出错时使用默认值）
        resolveStoreRehydration();
      },
      // 必须经 createJSONStorage 把 StateStorage 适配器包装成 PersistStorage：
      // 由其负责 {state, version} 对象与 JSON 字符串间的序列化转换
      storage: createJSONStorage<StoreState>(() => storageAdapter),
    }
  )
);
