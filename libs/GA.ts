/**
 * Google Analytics 工具类
 */
export class GA {
  private ua: string;
  private cid: string;
  private gaApi: string;
  private version: string;

  constructor(ua: string, cid: string, debug = false) {
    this.ua = ua;
    this.cid = cid; // client id
    this.gaApi = debug
      ? 'https://www.google-analytics.com/debug/collect'
      : 'https://www.google-analytics.com/collect';
    this.version = '1';
  }

  ga(t: 'pageview' | 'event', ...items: string[]): void {
    let payload = `v=${this.version}&tid=${this.ua}&cid=${this.cid}`;
    let params: string[] = [];
    switch (t) {
      case 'pageview': // Pageview hit type
        // dh -- Document hostname
        // dp -- Page
        // dt -- Title
        params = ['dh', 'dp', 'dt'];
        break;
      case 'event':
        // ec -- Event Category. Required
        // ea -- Event Action. Required
        // el -- Event label.
        // ev -- Event value.
        params = ['ec', 'ea', 'el', 'ev'];
    }
    if (params.length === 0) return;
    payload = `${payload}&t=${t}`;
    items.forEach((v, i) => {
      payload = `${payload}&${params[i]}=${encodeURIComponent(v)}`;
    });
    const request = new XMLHttpRequest();
    request.open('POST', this.gaApi, true);
    request.send(payload);
  }
}

