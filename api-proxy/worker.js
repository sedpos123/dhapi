export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 将 /api/* 请求代理到 Fly.io
    const targetUrl = 'https://llm-nav-api.fly.dev' + url.pathname + url.search;

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const response = await fetch(proxyRequest);

    // 复制响应并添加 CORS 头
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', 'https://yoursite.com');
    newResponse.headers.set('Access-Control-Allow-Credentials', 'true');

    return newResponse;
  },
};
