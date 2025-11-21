/**
 * Google Analytics 4 工具类
 */
export class GA {
  private measurementId: string;
  private cid: string;
  private gaApi: string;
  private apiSecret?: string; // 可选，如果使用 API Secret 需要配置

  constructor(measurementId: string, cid: string, debug = false, apiSecret?: string) {
    this.measurementId = measurementId;
    this.cid = cid; // client id
    this.apiSecret = apiSecret;
    
    // GA4 Measurement Protocol API 端点
    if (apiSecret) {
      // 使用 API Secret 的端点（推荐用于服务器端）
      this.gaApi = debug
        ? `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`
        : `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
    } else {
      // 不使用 API Secret 的端点（客户端直接发送）
      this.gaApi = debug
        ? `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}`
        : `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}`;
    }
  }

  /**
   * 发送页面浏览事件
   */
  pageview(pagePath: string, pageTitle: string = '', pageLocation: string = ''): void {
    const payload = {
      client_id: this.cid,
      events: [
        {
          name: 'page_view',
          params: {
            page_path: pagePath,
            page_title: pageTitle || pagePath,
            page_location: pageLocation || pagePath,
          },
        },
      ],
    };

    this.send(payload);
  }

  /**
   * 发送自定义事件
   */
  event(
    eventName: string,
    eventParams: Record<string, string | number> = {}
  ): void {
    const payload = {
      client_id: this.cid,
      events: [
        {
          name: eventName,
          params: eventParams,
        },
      ],
    };

    this.send(payload);
  }

  /**
   * 兼容旧接口的方法（用于平滑迁移）
   */
  ga(t: 'pageview' | 'event', ...items: string[]): void {
    if (t === 'pageview') {
      // pageview: dh (hostname), dp (path), dt (title)
      const [dh = '', dp = '', dt = ''] = items;
      this.pageview(dp || '/', dt, dh);
    } else if (t === 'event') {
      // event: ec (category), ea (action), el (label), ev (value)
      const [ec = '', ea = '', el = '', ev = ''] = items;
      this.event(ea || 'custom_event', {
        event_category: ec,
        event_label: el,
        value: ev ? Number(ev) : undefined,
      });
    }
  }

  /**
   * 发送数据到 GA4
   */
  private send(payload: object): void {
    // Service Worker 中不能使用 XMLHttpRequest，使用 fetch API
    fetch(this.gaApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true, // 确保请求在页面关闭后也能完成
    }).catch((error) => {
      // 静默处理错误，避免影响扩展功能
      if (import.meta.env.DEV) {
        console.warn('GA4 request failed:', error);
      }
    });
  }
}

