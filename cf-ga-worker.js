// worker.js
addEventListener('fetch', event => {
  event.respondWith(
    handle(event.request).catch(err => {
      // 全局错误处理
      console.error('Worker error:', err);
      return new Response(
        JSON.stringify({ 
          error: 'internal_server_error', 
          message: err.message || 'Unknown error',
          stack: err.stack 
        }), 
        { 
          status: 500, 
          headers: jsonHeaders() 
        }
      );
    })
  );
});

async function handle(req) {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-extension-key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 只允许 POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed', allowed: ['POST', 'OPTIONS'] }), 
      { 
        status: 405,
        headers: {
          ...jsonHeaders(),
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  // 简单的 auth：扩展必须提供 x-extension-key
  const extKey = req.headers.get('x-extension-key');
  if (!EXTENSION_KEY) {
    console.error('EXTENSION_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'server_misconfigured', detail: 'EXTENSION_KEY not set' }), 
      {
        status: 500,
        headers: {
          ...jsonHeaders(),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  if (!extKey || extKey !== EXTENSION_KEY) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', detail: 'Invalid or missing x-extension-key' }), 
      {
        status: 401,
        headers: {
          ...jsonHeaders(),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 解析 body
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'invalid_json', detail: e.message }), 
      {
        status: 400,
        headers: {
          ...jsonHeaders(),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 必要的 env 检查（在 wrangler secret 里配置）
  if (!GA_API_SECRET || !GA_MEASUREMENT_ID) {
    const missing = [];
    if (!GA_API_SECRET) missing.push('GA_API_SECRET');
    if (!GA_MEASUREMENT_ID) missing.push('GA_MEASUREMENT_ID');
    console.error('Missing environment variables:', missing);
    return new Response(
      JSON.stringify({ 
        error: 'server_misconfigured', 
        detail: `Missing: ${missing.join(', ')}` 
      }), 
      {
        status: 500,
        headers: {
          ...jsonHeaders(),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 如果没有 client_id，则生成（GA4 需要 client_id 或 user_id）
  if (!body.client_id && !body.user_id) {
    // 生成一个 client_id（uuid）或你可替换为更合适的策略
    body.client_id = crypto.randomUUID();
  }

  // 限制：如果用户直接把整个 GA MP payload 发来（包含 events），直接转发
  // 否则我们允许前端传简化格式 { events: [...] } 或单个 event
  let forwardPayload;
  if (body.events) {
    forwardPayload = body;
  } else if (body.event_name) {
    forwardPayload = {
      client_id: body.client_id,
      user_id: body.user_id,
      events: [
        {
          name: body.event_name,
          params: body.event_params || {},
        },
      ],
    };
  } else {
    return new Response(
      JSON.stringify({ 
        error: 'missing_event_payload', 
        detail: 'Request body must contain either "events" array or "event_name" field' 
      }), 
      {
        status: 400,
        headers: {
          ...jsonHeaders(),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // (可选) 在这里加上一些防滥用逻辑：速率限制、来源校验、事件内容白名单等
  // TODO: add rate limiting / validation if desired.

  // 转发到 GA Measurement Protocol
  const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    GA_MEASUREMENT_ID
  )}&api_secret=${encodeURIComponent(GA_API_SECRET)}`;

  let gaResp;
  try {
    gaResp = await fetch(gaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardPayload),
    });
  } catch (err) {
    console.error('GA fetch error:', err);
    return new Response(
      JSON.stringify({ 
        error: 'fetch_failed', 
        detail: err.message || String(err) 
      }), 
      {
        status: 502,
        headers: {
          ...jsonHeaders(),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 检查状态码，某些状态码不能有 body（204, 205, 304 等）
  const noBodyStatuses = [101, 204, 205, 304];
  const hasNoBody = noBodyStatuses.includes(gaResp.status);
  
  let responseBody = null;
  let responseHeaders = {
    // CORS：允许扩展读取响应
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-extension-key',
  };
  
  if (hasNoBody) {
    // 对于无 body 的状态码，返回 null body
    responseBody = null;
  } else {
    // 对于其他状态码，读取并返回 body
    const text = await gaResp.text();
    responseBody = text || JSON.stringify({ status: gaResp.statusText });
    responseHeaders = {
      ...jsonHeaders(),
      ...responseHeaders,
    };
  }
  
  return new Response(responseBody, {
    status: gaResp.status,
    headers: responseHeaders,
  });
}

function jsonHeaders() {
  return { 'Content-Type': 'application/json; charset=utf-8' };
}
