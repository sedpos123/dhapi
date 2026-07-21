// Cloudflare Pages Function 入口：组装 Hono app，挂载各路由模块，导出 onRequest。
// 路由逻辑拆分到 _lib/ 下（_ 前缀目录不会被 Pages Functions 当作路由）。
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { applyPublicRoutes } from './_lib/routes/public.js';
import { applyAdminRoutes } from './_lib/routes/admin.js';
import { applyMerchantRoutes } from './_lib/routes/merchant.js';

const app = new Hono().basePath('/api');

// ── CORS ──
app.use('*', cors({
  origin: (origin, c) => {
    if (!origin) return null;
    const allowed = (c.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    return allowed.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// 挂载路由：公开 -> 管理后台（含 admin/login，登录在 auth 中间件之前注册） -> 商家自助
applyPublicRoutes(app);
applyAdminRoutes(app);
applyMerchantRoutes(app);

app.notFound((c) => c.json({ error: '接口不存在' }, 404));

app.onError((err, c) => {
  console.error('Unhandled function error:', err);
  return c.json({ error: '服务器错误' }, 500);
});

export const onRequest = (context) => app.fetch(context.request, context.env, context);
