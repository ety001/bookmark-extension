/**
 * Google Analytics 工具（Service Worker 环境）
 * Service Worker 中没有 window 对象，所以使用 GA4 Measurement Protocol API
 * 
 * 注意：对于浏览器环境（popup、tab、bookmark 等页面），请使用 google-analytics-browser.ts
 */

const MEASUREMENT_ID = 'G-QNPZ89L8V9';
const DEBUG = import.meta.env.DEV;

/**
 * 发送事件到 Google Analytics
 * 在 Service Worker 中使用 GA4 Measurement Protocol API
 */
export function gtag(...args: any[]): void {
  if (DEBUG) {
    console.log('[GA] gtag called with args:', args);
  }

  // 在 Service Worker 中，直接发送到 GA4 Measurement Protocol
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
          });
        }
        
        const payload = {
          client_id: uid,
          events: [
            {
              name: eventName,
              params: params,
            },
          ],
        };
        
        const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}`;
        
        if (DEBUG) {
          console.log('[GA] Request URL:', url);
          console.log('[GA] Request payload:', JSON.stringify(payload, null, 2));
        }
        
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
