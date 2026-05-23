import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono().basePath('/api');

// ── CORS ──
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'], credentials: true }));

// ── Helpers ──
function parseProvider(row) {
  if (!row) return null;
  return { ...row, brands: JSON.parse(row.brands || '[]'), features: JSON.parse(row.features || '[]'), online: !!row.online };
}

// ── Auth ──
async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '未登录或登录已过期' }, 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('admin', payload);
    await next();
  } catch {
    return c.json({ error: '登录已过期，请重新登录' }, 401);
  }
}

async function signJWT(payload, secret, expiresIn = '24h') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = expiresIn.endsWith('h') ? now + parseInt(expiresIn) * 3600 : now + 86400;
  const body = { ...payload, iat: now, exp };
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const h = btoa(JSON.stringify(header)).replace(/=+$/, '');
  const p = btoa(JSON.stringify(body)).replace(/=+$/, '');
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${h}.${p}`));
  const s = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${s}`;
}

async function verifyJWT(token, secret) {
  const [h, p, s] = token.split('.');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(`${h}.${p}`));
  if (!valid) throw new Error('Invalid signature');
  const payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

// ── Health ──
app.get('/health', (c) => c.json({ ok: true }));

// ── Public Routes ──
app.get('/providers', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT * FROM providers WHERE online = 1 ORDER BY rating DESC, reviews DESC').all();
  return c.json({ providers: results.map(parseProvider) });
});

app.get('/brands', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT * FROM brands ORDER BY id').all();
  return c.json({ brands: results });
});

app.get('/categories', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT * FROM categories ORDER BY id').all();
  return c.json({ categories: results });
});

app.post('/submit', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { name, url, category, desc, brands, features, input_price, output_price, contact_email, contact_wechat, extra_note, logo_color } = body;
  if (!name || !url || !category || !desc || !input_price) return c.json({ error: '请填写所有必填项' }, 400);
  const brandsArr = Array.isArray(brands) ? brands : [];
  if (brandsArr.length === 0) return c.json({ error: '请至少选择一个品牌/模型' }, 400);
  await db.prepare(`INSERT INTO pending_submissions (name, url, category, desc, brands, features, input_price, output_price, contact_email, contact_wechat, extra_note, logo_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(name, url, category, desc, JSON.stringify(brandsArr), JSON.stringify(Array.isArray(features) ? features : []), input_price || '', output_price || '', contact_email || '', contact_wechat || '', extra_note || '', logo_color || '#888').run();
  return c.json({ success: true, message: '提交成功，我们会尽快审核' });
});

// ── Admin Login ──
app.post('/admin/login', async (c) => {
  const { password } = await c.req.json();
  if (!password || password !== c.env.ADMIN_PASSWORD) return c.json({ error: '密码错误' }, 401);
  const token = await signJWT({ role: 'admin' }, c.env.JWT_SECRET, c.env.JWT_EXPIRES_IN || '24h');
  return c.json({ token });
});

// ── Admin Routes (auth required) ──
app.use('/admin/*', authMiddleware);

app.get('/admin/providers', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT * FROM providers ORDER BY rating DESC, reviews DESC').all();
  return c.json({ providers: results.map(parseProvider) });
});

app.post('/admin/providers', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online, input_price, output_price } = body;
  if (!name || !category || !desc) return c.json({ error: '请填写必填项' }, 400);
  if (!Array.isArray(brands) || brands.length === 0) return c.json({ error: '请至少选择一个品牌' }, 400);
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9一-鿿-]/g, '') + '-' + Date.now().toString(36);
  await db.prepare(`INSERT INTO providers (id, name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online, input_price, output_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, name, color || '#888', category, desc, rating || 0, reviews || 0, JSON.stringify(brands), JSON.stringify(features || []), status || 'ok', uptime || '—', speed || '—', url || '#', online !== false ? 1 : 0, input_price || '', output_price || '').run();
  return c.json({ success: true, id });
});

app.put('/admin/providers/:id', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online, input_price, output_price } = body;
  await db.prepare(`UPDATE providers SET name=?, color=?, category=?, desc=?, rating=?, reviews=?, brands=?, features=?, status=?, uptime=?, speed=?, url=?, online=?, input_price=?, output_price=?, updated_at=datetime('now','localtime') WHERE id=?`).bind(name, color, category, desc, rating, reviews, JSON.stringify(brands), JSON.stringify(features || []), status, uptime, speed, url, online ? 1 : 0, input_price, output_price, c.req.param('id')).run();
  return c.json({ success: true });
});

app.delete('/admin/providers/:id', async (c) => {
  const db = c.env.DB;
  await db.prepare('DELETE FROM providers WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.patch('/admin/providers/:id/toggle', async (c) => {
  const db = c.env.DB;
  const row = await db.prepare('SELECT online FROM providers WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ error: '商家不存在' }, 404);
  const newOnline = row.online ? 0 : 1;
  await db.prepare("UPDATE providers SET online = ?, updated_at = datetime('now','localtime') WHERE id = ?").bind(newOnline, c.req.param('id')).run();
  return c.json({ success: true, online: !!newOnline });
});

app.get('/admin/brands', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT * FROM brands ORDER BY id').all();
  return c.json({ brands: results });
});

app.post('/admin/brands', async (c) => {
  const db = c.env.DB;
  const { name } = await c.req.json();
  if (!name) return c.json({ error: '品牌名不能为空' }, 400);
  const existing = await db.prepare('SELECT id FROM brands WHERE name = ?').bind(name).first();
  if (existing) return c.json({ error: '品牌已存在' }, 400);
  const info = await db.prepare('INSERT INTO brands (name) VALUES (?)').bind(name).run();
  return c.json({ success: true, id: info.meta.last_row_id });
});

app.put('/admin/brands/:id', async (c) => {
  const db = c.env.DB;
  const { name } = await c.req.json();
  if (!name) return c.json({ error: '品牌名不能为空' }, 400);
  const row = await db.prepare('SELECT name FROM brands WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ error: '品牌不存在' }, 404);
  const oldName = row.name;
  await db.prepare('UPDATE brands SET name = ? WHERE id = ?').bind(name, c.req.param('id')).run();
  // Cascade update providers
  const { results } = await db.prepare('SELECT id, brands FROM providers').all();
  for (const p of results) {
    const arr = JSON.parse(p.brands || '[]');
    const idx = arr.indexOf(oldName);
    if (idx >= 0) { arr[idx] = name; await db.prepare('UPDATE providers SET brands = ? WHERE id = ?').bind(JSON.stringify(arr), p.id).run(); }
  }
  return c.json({ success: true });
});

app.delete('/admin/brands/:id', async (c) => {
  const db = c.env.DB;
  const row = await db.prepare('SELECT name FROM brands WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ error: '品牌不存在' }, 404);
  const name = row.name;
  await db.prepare('DELETE FROM brands WHERE id = ?').bind(c.req.param('id')).run();
  const { results } = await db.prepare('SELECT id, brands FROM providers').all();
  for (const p of results) {
    const arr = JSON.parse(p.brands || '[]');
    const filtered = arr.filter(b => b !== name);
    if (filtered.length !== arr.length) { await db.prepare('UPDATE providers SET brands = ? WHERE id = ?').bind(JSON.stringify(filtered), p.id).run(); }
  }
  return c.json({ success: true });
});

app.get('/admin/categories', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT * FROM categories ORDER BY id').all();
  return c.json({ categories: results });
});

app.post('/admin/categories', async (c) => {
  const db = c.env.DB;
  const { name } = await c.req.json();
  if (!name) return c.json({ error: '分类名不能为空' }, 400);
  const existing = await db.prepare('SELECT id FROM categories WHERE name = ?').bind(name).first();
  if (existing) return c.json({ error: '分类已存在' }, 400);
  const info = await db.prepare('INSERT INTO categories (name) VALUES (?)').bind(name).run();
  return c.json({ success: true, id: info.meta.last_row_id });
});

app.put('/admin/categories/:id', async (c) => {
  const db = c.env.DB;
  const { name } = await c.req.json();
  if (!name) return c.json({ error: '分类名不能为空' }, 400);
  const row = await db.prepare('SELECT name FROM categories WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ error: '分类不存在' }, 404);
  const oldName = row.name;
  await db.prepare('UPDATE categories SET name = ? WHERE id = ?').bind(name, c.req.param('id')).run();
  await db.prepare("UPDATE providers SET category = ?, updated_at = datetime('now','localtime') WHERE category = ?").bind(name, oldName).run();
  return c.json({ success: true });
});

app.delete('/admin/categories/:id', async (c) => {
  const db = c.env.DB;
  const row = await db.prepare('SELECT name FROM categories WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ error: '分类不存在' }, 404);
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(c.req.param('id')).run();
  await db.prepare("UPDATE providers SET category = '', updated_at = datetime('now','localtime') WHERE category = ?").bind(row.name).run();
  return c.json({ success: true });
});

app.get('/admin/pending', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare("SELECT * FROM pending_submissions WHERE status = 'pending' ORDER BY submitted_at DESC").all();
  return c.json({ pending: results.map(r => ({ ...r, brands: JSON.parse(r.brands || '[]'), features: JSON.parse(r.features || '[]') })) });
});

app.post('/admin/pending/:id/approve', async (c) => {
  const db = c.env.DB;
  const row = await db.prepare('SELECT * FROM pending_submissions WHERE id = ? AND status = ?').bind(c.req.param('id'), 'pending').first();
  if (!row) return c.json({ error: '申请不存在或已处理' }, 404);
  const id = (row.name || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9一-鿿-]/g, '') + '-' + Date.now().toString(36);
  await db.prepare(`INSERT INTO providers (id, name, color, category, desc, brands, features, status, uptime, speed, url, online, input_price, output_price) VALUES (?, ?, ?, ?, ?, ?, ?, 'ok', '—', '—', '#', 1, ?, ?)`).bind(id, row.name, row.logo_color || '#888', row.category || '综合中转', row.desc, row.brands, row.features, row.input_price, row.output_price).run();
  await db.prepare("UPDATE pending_submissions SET status = 'approved' WHERE id = ?").bind(c.req.param('id')).run();
  return c.json({ success: true, providerId: id });
});

app.post('/admin/pending/:id/reject', async (c) => {
  const db = c.env.DB;
  const row = await db.prepare('SELECT * FROM pending_submissions WHERE id = ? AND status = ?').bind(c.req.param('id'), 'pending').first();
  if (!row) return c.json({ error: '申请不存在或已处理' }, 404);
  await db.prepare("UPDATE pending_submissions SET status = 'rejected' WHERE id = ?").bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.get('/admin/export', async (c) => {
  const db = c.env.DB;
  const [providers, brands, categories, pending] = await Promise.all([
    db.prepare('SELECT * FROM providers').all(),
    db.prepare('SELECT * FROM brands').all(),
    db.prepare('SELECT * FROM categories').all(),
    db.prepare('SELECT * FROM pending_submissions').all(),
  ]);
  return c.json({ providers: providers.results, brands: brands.results, categories: categories.results, pending: pending.results });
});

app.post('/admin/import', async (c) => {
  const db = c.env.DB;
  const { providers, brands, categories, pending } = await c.req.json();
  if (providers) { for (const p of providers) { await db.prepare(`INSERT OR REPLACE INTO providers (id, name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online, input_price, output_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(p.id, p.name, p.color, p.category, p.desc, p.rating, p.reviews, p.brands, p.features, p.status, p.uptime, p.speed, p.url, p.online, p.input_price, p.output_price).run(); } }
  if (brands) { for (const b of brands) { await db.prepare('INSERT OR REPLACE INTO brands (id, name) VALUES (?, ?)').bind(b.id, b.name).run(); } }
  if (categories) { for (const cat of categories) { await db.prepare('INSERT OR REPLACE INTO categories (id, name) VALUES (?, ?)').bind(cat.id, cat.name).run(); } }
  if (pending) { for (const p of pending) { await db.prepare(`INSERT OR REPLACE INTO pending_submissions (id, name, url, category, desc, brands, features, input_price, output_price, contact_email, contact_wechat, extra_note, logo_color, submitted_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(p.id, p.name, p.url, p.category, p.desc, p.brands, p.features, p.input_price, p.output_price, p.contact_email, p.contact_wechat, p.extra_note, p.logo_color, p.submitted_at, p.status).run(); } }
  return c.json({ success: true });
});

app.post('/admin/reset', async (c) => {
  const db = c.env.DB;
  await db.prepare('DELETE FROM providers').run();
  await db.prepare('DELETE FROM brands').run();
  await db.prepare('DELETE FROM categories').run();
  await db.prepare('DELETE FROM pending_submissions').run();
  // Re-seed from schema is too long; return success and user can re-import
  return c.json({ success: true });
});

export const onRequest = app.fetch;
