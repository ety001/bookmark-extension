/**
 * Google Analytics 工具（Service Worker 环境）
 * Service Worker 中没有 window 对象，所以使用 GA4 Measurement Protocol API
 * 通过 Cloudflare Workers 中转服务发送事件，避免暴露 API Secret
 */

const MEASUREMENT_ID = 'G-QNPZ89L8V9';
const GA_WORKER_URL = 'https://ga-bm.mypi.win';
// EXTENSION_KEY 用于认证 Cloudflare Worker
// 可以通过环境变量 EXTENSION_KEY 设置，或直接在这里配置
const EXTENSION_KEY = 'a9d830ce5e7c4b049d395af2b68c1c32';
const DEBUG = import.meta.env.DEV;

/**
 * 发送事件到 Google Analytics
 * 通过 Cloudflare Workers 中转服务发送，Worker 会添加 API Secret 并转发到 GA
 */
export function gtag(...args: any[]): void {
  if (DEBUG) {
    console.log('[GA] gtag called with args:', args);
  }

  // 在 Service Worker 中，通过 Cloudflare Worker 中转发送
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get('uid', (result) => {
      const uid = result.uid || 'unknown';
      
      if (DEBUG) {
        console.log('[GA] UID:', uid);
      }
      
      // 解析 gtag 参数
      if (args[0] === 'event') {
        // gtag('event', eventName, params)
        const eventName = args[1];
        const params = args[2] || {};
        
        if (DEBUG) {
          console.log('[GA] Sending event:', {
            eventName,
            params,
            uid,
            measurementId: MEASUREMENT_ID,
            workerUrl: GA_WORKER_URL,
          });
        }
        
        // 构建符合 GA4 Measurement Protocol 的 payload
        // Worker 会接受这个格式并转发
        const payload = {
          client_id: uid,
          events: [
            {
              name: eventName,
              params: params,
            },
          ],
        };
        
        if (DEBUG) {
          console.log('[GA] Request URL:', GA_WORKER_URL);
          console.log('[GA] Request payload:', JSON.stringify(payload, null, 2));
        }
        
        // 检查是否有 EXTENSION_KEY
        if (!EXTENSION_KEY) {
          if (DEBUG) {
            console.warn('[GA] EXTENSION_KEY not set, request may fail');
          }
        }
        
        fetch(GA_WORKER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-extension-key': EXTENSION_KEY,
          },
          body: JSON.stringify(payload),
          keepalive: true,
        })
          .then((response) => {
            if (DEBUG) {
              console.log('[GA] Response status:', response.status, response.statusText);
              console.log('[GA] Response headers:', Object.fromEntries(response.headers.entries()));
            }
            if (!response.ok) {
              if (DEBUG) {
                console.warn('[GA] Request failed with status:', response.status);
                // 尝试读取错误信息
                response.text().then((text) => {
                  if (DEBUG && text) {
                    console.warn('[GA] Error response:', text);
                  }
                });
              }
            } else {
              if (DEBUG) {
                console.log('[GA] Event sent successfully:', eventName);
              }
            }
            return response.text();
          })
          .then((text) => {
            if (DEBUG && text) {
              console.log('[GA] Response body:', text);
            }
          })
          .catch((error) => {
            if (DEBUG) {
              console.error('[GA] Request error:', error);
            }
          });
      } else if (args[0] === 'config') {
        // gtag('config', measurementId, config)
        // Service Worker 中不需要配置，跳过
        if (DEBUG) {
          console.log('[GA] Config call ignored in Service Worker:', args);
        }
      } else if (args[0] === 'js') {
        // gtag('js', date)
        // Service Worker 中不需要，跳过
        if (DEBUG) {
          console.log('[GA] JS call ignored in Service Worker:', args);
        }
      } else {
        if (DEBUG) {
          console.warn('[GA] Unknown gtag command:', args[0], args);
        }
      }
    });
  } else {
    if (DEBUG) {
      console.warn('[GA] chrome.storage not available');
    }
  }
}
