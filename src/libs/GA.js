export class GA {
  constructor(ua, cid) {
    this.ua = ua;
    this.cid = cid; // client id
    this.gaApi = 'https://www.google-analytics.com/collect';
    this.version = '1';
  }
  ga(t, ...items) {
    let payload = `v=${this.version}&tid=${this.ua}&cid=${this.cid}`;
    let params = [];
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
    if (params === []) return;
    payload = `${payload}&t=${t}`;
    items.forEach((v, i) => {
      payload = `${payload}&${params[i]}=${encodeURIComponent(v)}`;
    });
    const request = new XMLHttpRequest();
    request.open('POST', this.gaApi, true);
    request.send(payload);
  }
}
