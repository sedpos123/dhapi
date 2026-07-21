// 本地开发服务器：提供 public/ 静态文件，把 /api/* 代理到 Cloudflare Pages
// 路由处理器（经 D1 兼容层）。无需 wrangler。
//
// 注意：直接 import 生产路由 functions/api/[[route]].js，因此拆分该文件后
// 本地仍可正常运行；不要再复制成 _route_dev.mjs。
import Database from 'better-sqlite3';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import createD1 from './tools/d1-shim.cjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 8788);
const DB_PATH = process.env.DEV_DB ? path.resolve(ROOT, process.env.DEV_DB) : path.join(ROOT, '_dev_local.db');

// ---- DB：每次启动重建，载入 schema + 种子 + 测试数据 ----
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
for (const f of ['schema.sql', 'seed.sql', '_seed_test.sql']) {
  sqlite.exec(fs.readFileSync(path.join(ROOT, f), 'utf8'));
}
const DB = createD1(sqlite);

const env = {
  DB,
  LOGOS: null,                 // 本地未配置 R2，logo 上传/读取接口会返回 500
  JWT_SECRET: 'dev-secret',
  ADMIN_PASSWORD: 'dev123',
  JWT_EXPIRES_IN: '24h',
  ALLOWED_ORIGINS: '',
};

// ---- 路由处理器：直接 import 生产路由 ----
const routePath = path.join(ROOT, 'functions/api/[[route]].js');
const { onRequest } = await import(pathToFileURL(routePath).href);

// ---- 静态内容类型 ----
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.txt':'text/plain' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      const init = { method: req.method, headers: req.headers };
      if (hasBody) { init.body = req; init.duplex = 'half'; }   // Node undici 要求 stream body 带 duplex:'half'
      const fetchReq = new Request(`http://localhost:${PORT}${req.url}`, init);
      const r = await onRequest({ request: fetchReq, env });
      const buf = Buffer.from(await r.arrayBuffer());
      res.writeHead(r.status, Object.fromEntries(r.headers.entries()));
      res.end(buf);
      return;
    }
    // 静态文件
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    let file = path.join(PUBLIC, p);
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(PUBLIC, 'index.html');
    }
    const ext = path.extname(file);
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Server error: ' + (e.message || e));
  }
});

server.listen(PORT, () => {
  console.log(`Local dev server running at http://localhost:${PORT}`);
  console.log(`  static: ${PUBLIC}`);
  console.log(`  api:    /api/* -> route handler (D1 shim)`);
});
