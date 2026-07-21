// Express 兼容入口：实际复用 Cloudflare Pages 路由处理器 + better-sqlite3 D1 兼容层。
// 让 npm run dev / PM2 / Render 跑的就是生产路由 functions/api/[[route]].js，
// 单一数据源，不再维护独立的手写 Express 路由。
//
// CJS 顶层不支持 await，用 async IIFE 包裹动态 import 生产路由。
require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { pathToFileURL } = require('url');
const createD1 = require('../tools/d1-shim.cjs');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);

for (const name of ['ADMIN_PASSWORD', 'JWT_SECRET']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

// DB 路径：支持 DATABASE_URL(file:...) 与 DB_PATH
const DB_PATH = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/^file:/, '')
  : (process.env.DB_PATH || path.join(ROOT, 'data', 'llm-nav.db'));
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
// 幂等建表 + 种子：schema.sql 用 CREATE TABLE IF NOT EXISTS，seed.sql 用 INSERT OR IGNORE
sqlite.exec(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8'));
sqlite.exec(fs.readFileSync(path.join(ROOT, 'seed.sql'), 'utf8'));
const DB = createD1(sqlite);

const env = {
  DB,
  LOGOS: null,                 // 本地/旧部署未配置 R2，logo 上传/读取接口会返回 500
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
};

const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.txt':'text/plain' };
const PUBLIC = path.join(ROOT, 'public');
const SERVE_STATIC = process.env.SERVE_STATIC !== 'false';

(async () => {
  // 动态加载生产路由（ESM）
  const { onRequest } = await import(pathToFileURL(path.join(ROOT, 'functions/api/[[route]].js')).href);

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
      if (!SERVE_STATIC) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); return; }
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
    console.log(`中转导航站已启动: http://localhost:${PORT}`);
  });
})();
