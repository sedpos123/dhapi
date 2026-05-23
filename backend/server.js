require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // 允许无 origin 的请求（如服务端请求、curl）
    if (!origin) return callback(null, true);
    // 开发模式允许 localhost
    if (origin.includes('localhost')) return callback(null, true);
    if (origin.includes('127.0.0.1')) return callback(null, true);
    // 允许配置的域名
    if (ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.endsWith('.' + allowed.replace(/^\*\./, '')))) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// 静态文件仅在本地开发时使用，生产环境由 Cloudflare Pages 托管
if (process.env.SERVE_STATIC !== 'false') {
  app.use(express.static(path.join(__dirname, '..', 'public')));
}

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`中转导航站已启动: http://localhost:${PORT}`);
});
