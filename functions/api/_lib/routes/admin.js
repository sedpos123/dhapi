// 管理后台路由：登录 + providers/brands/categories/pending CRUD + reviews/merchants/monitoring 管理 + 数据导入导出/重置
import { authMiddleware, signJWT } from '../auth.js';
import { handleLogoUpload } from '../upload.js';
import { parseProvider, cleanProviderInput, providerInputError, cleanText, numOr, PROVIDERS_ORDER } from '../helpers.js';
import { runProviderSiteChecks } from '../site-check.js';

// 评价审核后重算商家 avg_rating / review_count
async function recalcProviderRating(db, providerId) {
  const row = await db.prepare('SELECT AVG(score) as avg_score, COUNT(*) as cnt FROM reviews WHERE provider_id = ? AND status = ?').bind(providerId, 'approved').first();
  const avgRating = row && row.avg_score ? Math.round(row.avg_score * 10) / 10 : 0;
  const reviewCount = row ? row.cnt : 0;
  await db.prepare('UPDATE providers SET avg_rating = ?, review_count = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').bind(avgRating, reviewCount, providerId).run();
  return { avg_rating: avgRating, review_count: reviewCount };
}

export function applyAdminRoutes(app) {
  async function hasTable(db, name) {
    const row = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").bind(name).first();
    return !!row;
  }

  // ── Admin Login (no auth required) ──
  app.post('/admin/login', async (c) => {
    const { password } = await c.req.json();
    if (!password || password !== c.env.ADMIN_PASSWORD) return c.json({ error: '密码错误' }, 401);
    const token = await signJWT({ role: 'admin' }, c.env.JWT_SECRET, c.env.JWT_EXPIRES_IN || '24h');
    return c.json({ token });
  });

  // ── Admin Routes (auth required) ──
  app.use('/admin/*', authMiddleware);

  app.post('/admin/upload-logo', async (c) => {
    const providerId = c.req.query('provider_id');
    const prefix = providerId ? `logos/${providerId}` : 'logos/new';
    return handleLogoUpload(c, prefix);
  });

  app.get('/admin/providers', async (c) => {
    const db = c.env.DB;
    const { results } = await db.prepare(`SELECT * FROM providers ORDER BY ${PROVIDERS_ORDER}`).all();
    return c.json({ providers: results.map(parseProvider) });
  });

  app.post('/admin/providers', async (c) => {
    const db = c.env.DB;
    const value = cleanProviderInput(await c.req.json());
    const error = providerInputError(value);
    if (error) return c.json({ error }, 400);
    const { name, color, category, desc, brands, features, status, founded_at, url, online, input_price, output_price, sort_order, logo_url, billing_type, supported_models, target_audience, free_quota, pricing_plans } = value;
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9一-鿿-]/g, '') + '-' + Date.now().toString(36);
    const modelsArr = Array.isArray(supported_models) ? supported_models : brands;
    await db.prepare(`INSERT INTO providers (id, name, color, logo_url, category, desc, brands, features, status, founded_at, url, online, input_price, output_price, sort_order, billing_type, supported_models, target_audience, free_quota, pricing_plans) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, name, color || '#888', logo_url || '', category, desc, JSON.stringify(brands), JSON.stringify(features || []), status || 'ok', founded_at || '', url || '#', online !== false ? 1 : 0, input_price || '', output_price || '', sort_order || 0, billing_type || '', JSON.stringify(modelsArr), target_audience || '', free_quota ? 1 : 0, JSON.stringify(pricing_plans || [])).run();
    return c.json({ success: true, id });
  });

  app.put('/admin/providers/:id', async (c) => {
    const db = c.env.DB;
    const value = cleanProviderInput(await c.req.json());
    const error = providerInputError(value);
    if (error) return c.json({ error }, 400);
    const { name, color, category, desc, brands, features, status, founded_at, url, online, input_price, output_price, sort_order, logo_url, billing_type, supported_models, target_audience, free_quota, pricing_plans } = value;
    const bucket = c.env.LOGOS;
    if (bucket && logo_url) {
      const old = await db.prepare('SELECT logo_url FROM providers WHERE id = ?').bind(c.req.param('id')).first();
      if (old && old.logo_url && old.logo_url !== logo_url) { await bucket.delete(old.logo_url).catch(() => {}); }
    }
    const modelsArr = Array.isArray(supported_models) ? supported_models : brands;
    await db.prepare(`UPDATE providers SET name=?, color=?, logo_url=?, category=?, desc=?, brands=?, features=?, status=?, founded_at=?, url=?, online=?, input_price=?, output_price=?, sort_order=?, billing_type=?, supported_models=?, target_audience=?, free_quota=?, pricing_plans=?, updated_at=datetime('now','localtime') WHERE id=?`).bind(name, color, logo_url || '', category, desc, JSON.stringify(brands), JSON.stringify(features || []), status, founded_at || '', url, online ? 1 : 0, input_price || '', output_price || '', sort_order || 0, billing_type || '', JSON.stringify(modelsArr), target_audience || '', free_quota ? 1 : 0, JSON.stringify(pricing_plans || []), c.req.param('id')).run();
    return c.json({ success: true });
  });

  app.delete('/admin/providers/:id', async (c) => {
    const db = c.env.DB;
    const bucket = c.env.LOGOS;
    if (bucket) {
      const row = await db.prepare('SELECT logo_url FROM providers WHERE id = ?').bind(c.req.param('id')).first();
      if (row && row.logo_url) { await bucket.delete(row.logo_url).catch(() => {}); }
    }
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

  app.post('/admin/site-checks/run', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const limit = body.limit || (ids.length ? ids.length : 200);
    const summary = await runProviderSiteChecks(c.env, { ids, limit });
    return c.json({ success: true, ...summary });
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
    const { name, description } = await c.req.json();
    if (!name) return c.json({ error: '分类名不能为空' }, 400);
    const existing = await db.prepare('SELECT id FROM categories WHERE name = ?').bind(name).first();
    if (existing) return c.json({ error: '分类已存在' }, 400);
    const info = await db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').bind(name, description || '').run();
    return c.json({ success: true, id: info.meta.last_row_id });
  });

  app.put('/admin/categories/:id', async (c) => {
    const db = c.env.DB;
    const { name, description } = await c.req.json();
    if (!name) return c.json({ error: '分类名不能为空' }, 400);
    const row = await db.prepare('SELECT name FROM categories WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return c.json({ error: '分类不存在' }, 404);
    const oldName = row.name;
    await db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').bind(name, description || '', c.req.param('id')).run();
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
    return c.json({ pending: results.map(r => ({ ...r, brands: JSON.parse(r.brands || '[]'), features: JSON.parse(r.features || '[]'), supported_models: JSON.parse(r.supported_models || '[]'), billing_type: r.billing_type || '', target_audience: r.target_audience || '', free_quota: r.free_quota || 0 })) });
  });

  app.post('/admin/pending/:id/approve', async (c) => {
    const db = c.env.DB;
    const row = await db.prepare('SELECT * FROM pending_submissions WHERE id = ? AND status = ?').bind(c.req.param('id'), 'pending').first();
    if (!row) return c.json({ error: '申请不存在或已处理' }, 404);
    const id = (row.name || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9一-鿿-]/g, '') + '-' + Date.now().toString(36);
    let logoUrl = row.logo_url || '';
    const bucket = c.env.LOGOS;
    if (bucket && row.logo_url) {
      const ext = row.logo_url.split('.').pop() || 'png';
      const newKey = `logos/${id}.${ext}`;
      const obj = await bucket.get(row.logo_url);
      if (obj) {
        await bucket.put(newKey, obj.body, { httpMetadata: { contentType: obj.httpMetadata?.contentType } });
        await bucket.delete(row.logo_url).catch(() => {});
        logoUrl = newKey;
      }
    }
    await db.prepare(`INSERT INTO providers (id, name, color, logo_url, category, desc, brands, features, status, founded_at, url, online, input_price, output_price, sort_order, billing_type, supported_models, target_audience, free_quota) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ok', '', ?, 1, ?, ?, 0, ?, ?, ?, ?)`).bind(id, row.name, row.logo_color || '#888', logoUrl, row.category || '聚合中转', row.desc, row.brands, row.features, row.url || '#', row.input_price, row.output_price, row.billing_type || '', row.supported_models || '[]', row.target_audience || '', row.free_quota || 0).run();
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

  // ── Data Export：全部 7 张业务表 ──
  app.get('/admin/export', async (c) => {
    const db = c.env.DB;
    const [providers, brands, categories, pending, reviews, merchants, monitoring] = await Promise.all([
      db.prepare('SELECT * FROM providers').all(),
      db.prepare('SELECT * FROM brands').all(),
      db.prepare('SELECT * FROM categories').all(),
      db.prepare('SELECT * FROM pending_submissions').all(),
      db.prepare('SELECT * FROM reviews').all(),
      db.prepare('SELECT * FROM merchants').all(),
      db.prepare('SELECT * FROM provider_monitoring').all(),
    ]);
    const sponsorLeads = await hasTable(db, 'sponsor_leads') ? await db.prepare('SELECT * FROM sponsor_leads').all() : { results: [] };
    return c.json({
      providers: providers.results,
      brands: brands.results,
      categories: categories.results,
      pending: pending.results,
      reviews: reviews.results,
      merchants: merchants.results,
      monitoring: monitoring.results,
      sponsor_leads: sponsorLeads.results
    });
  });

  // ── Data Import：全部业务表，providers/pending 补全所有列 ──
  app.post('/admin/import', async (c) => {
    const db = c.env.DB;
    const { providers, brands, categories, pending, reviews, merchants, monitoring, sponsor_leads } = await c.req.json();
    // 先清空全部表（子先父后，FK-safe），再做全量替换导入
    const tablesToClear = ['reviews', 'merchants', 'provider_monitoring', 'pending_submissions', 'providers', 'brands', 'categories'];
    if (await hasTable(db, 'sponsor_leads')) tablesToClear.splice(3, 0, 'sponsor_leads');
    for (const t of tablesToClear) {
      await db.prepare(`DELETE FROM ${t}`).run();
    }
    // 插入按父先子后，避免外键引用落空
    if (providers) { for (const p of providers) {
      await db.prepare(`INSERT OR REPLACE INTO providers (id, name, color, logo_url, category, desc, brands, features, status, founded_at, url, online, input_price, output_price, sort_order, click_count, favorite_count, billing_type, supported_models, target_audience, free_quota, avg_rating, review_count, pricing_plans, site_status, site_checked_at, site_status_code, site_latency_ms, site_error, site_error_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        p.id, p.name, p.color, p.logo_url || '', p.category, p.desc, p.brands, p.features, p.status, p.founded_at || '', p.url, p.online, p.input_price || '', p.output_price || '', p.sort_order || 0, p.click_count || 0, p.favorite_count || 0, p.billing_type || '', p.supported_models || '[]', p.target_audience || '', p.free_quota || 0, p.avg_rating || 0, p.review_count || 0, p.pricing_plans || '[]', p.site_status || 'unknown', p.site_checked_at || '', p.site_status_code || 0, p.site_latency_ms || 0, p.site_error || '', p.site_error_days || 0, p.created_at || '', p.updated_at || ''
      ).run();
    } }
    if (brands) { for (const b of brands) { await db.prepare('INSERT OR REPLACE INTO brands (id, name) VALUES (?, ?)').bind(b.id, b.name).run(); } }
    if (categories) { for (const cat of categories) { await db.prepare('INSERT OR REPLACE INTO categories (id, name, description) VALUES (?, ?, ?)').bind(cat.id, cat.name, cat.description || '').run(); } }
    if (pending) { for (const p of pending) {
      await db.prepare(`INSERT OR REPLACE INTO pending_submissions (id, name, url, category, desc, brands, features, input_price, output_price, contact_email, contact_wechat, extra_note, logo_color, logo_url, billing_type, supported_models, target_audience, free_quota, submitted_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        p.id, p.name, p.url, p.category, p.desc, p.brands, p.features, p.input_price, p.output_price, p.contact_email, p.contact_wechat, p.extra_note, p.logo_color, p.logo_url || '', p.billing_type || '', p.supported_models || '[]', p.target_audience || '', p.free_quota || 0, p.submitted_at, p.status
      ).run();
    } }
    if (reviews) { for (const r of reviews) {
      await db.prepare(`INSERT OR REPLACE INTO reviews (id, provider_id, score, tags, content, email_hash, status, merchant_reply, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        r.id, r.provider_id, r.score, r.tags, r.content, r.email_hash || '', r.status, r.merchant_reply ?? null, r.created_at
      ).run();
    } }
    if (merchants) { for (const m of merchants) {
      await db.prepare(`INSERT OR REPLACE INTO merchants (id, email, password_hash, salt, provider_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        m.id, m.email, m.password_hash, m.salt, m.provider_id, m.status, m.created_at, m.updated_at
      ).run();
    } }
    if (monitoring) { for (const mo of monitoring) {
      await db.prepare(`INSERT OR REPLACE INTO provider_monitoring (id, provider_id, family, availability, latency_recent, latency_7d, cache_hit_rate, sample_count, source, note, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        mo.id, mo.provider_id, mo.family, mo.availability, mo.latency_recent, mo.latency_7d, mo.cache_hit_rate, mo.sample_count, mo.source, mo.note, mo.checked_at
      ).run();
    } }
    if (sponsor_leads && await hasTable(db, 'sponsor_leads')) { for (const lead of sponsor_leads) {
      await db.prepare(`INSERT OR REPLACE INTO sponsor_leads (id, provider_name, website_url, contact_name, contact_email, contact_wechat, package_code, budget, message, source, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        lead.id, lead.provider_name, lead.website_url || '', lead.contact_name || '', lead.contact_email || '', lead.contact_wechat || '', lead.package_code || '', lead.budget || '', lead.message || '', lead.source || '', lead.status || 'new', lead.created_at || ''
      ).run();
    } }
    return c.json({ success: true });
  });

  // ── Reset：清空全部业务表（子先父后，FK-safe，含 merchants 避免孤儿） ──
  app.post('/admin/reset', async (c) => {
    const db = c.env.DB;
    const tablesToClear = ['reviews', 'merchants', 'provider_monitoring', 'pending_submissions', 'providers', 'brands', 'categories'];
    if (await hasTable(db, 'sponsor_leads')) tablesToClear.splice(3, 0, 'sponsor_leads');
    for (const t of tablesToClear) {
      await db.prepare(`DELETE FROM ${t}`).run();
    }
    return c.json({ success: true });
  });

  // ── Sponsor Leads: Admin API ──
  app.get('/admin/sponsor-leads', async (c) => {
    const db = c.env.DB;
    if (!await hasTable(db, 'sponsor_leads')) return c.json({ leads: [] });
    const status = c.req.query('status') || '';
    const sql = status
      ? 'SELECT * FROM sponsor_leads WHERE status = ? ORDER BY created_at DESC LIMIT 200'
      : 'SELECT * FROM sponsor_leads ORDER BY created_at DESC LIMIT 200';
    const stmt = db.prepare(sql);
    const { results } = status ? await stmt.bind(status).all() : await stmt.all();
    return c.json({ leads: results || [] });
  });

  app.patch('/admin/sponsor-leads/:id/status', async (c) => {
    const db = c.env.DB;
    if (!await hasTable(db, 'sponsor_leads')) return c.json({ error: '合作线索表未初始化' }, 400);
    const id = c.req.param('id');
    const body = await c.req.json();
    const status = cleanText(body.status, 40);
    const allowed = new Set(['new', 'contacted', 'won', 'lost']);
    if (!allowed.has(status)) return c.json({ error: '状态不正确' }, 400);
    const row = await db.prepare('SELECT id FROM sponsor_leads WHERE id = ?').bind(id).first();
    if (!row) return c.json({ error: '合作线索不存在' }, 404);
    await db.prepare('UPDATE sponsor_leads SET status = ? WHERE id = ?').bind(status, id).run();
    return c.json({ success: true });
  });

  // ── Reviews: Admin API ──
  app.get('/admin/reviews', async (c) => {
    const db = c.env.DB;
    const status = c.req.query('status') || 'pending';
    const { results } = await db.prepare(`SELECT r.*, p.name as provider_name FROM reviews r LEFT JOIN providers p ON r.provider_id = p.id WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 100`).bind(status).all();
    const reviews = (results || []).map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
    return c.json({ reviews });
  });

  app.post('/admin/reviews/:id/approve', async (c) => {
    const db = c.env.DB;
    const row = await db.prepare("SELECT id, provider_id FROM reviews WHERE id = ? AND status = 'pending'").bind(c.req.param('id')).first();
    if (!row) return c.json({ error: '评价不存在或已处理' }, 404);
    await db.prepare("UPDATE reviews SET status = 'approved' WHERE id = ?").bind(c.req.param('id')).run();
    const rating = await recalcProviderRating(db, row.provider_id);
    return c.json({ success: true, ...rating });
  });

  app.post('/admin/reviews/:id/reject', async (c) => {
    const db = c.env.DB;
    const row = await db.prepare("SELECT id, provider_id FROM reviews WHERE id = ? AND status = 'pending'").bind(c.req.param('id')).first();
    if (!row) return c.json({ error: '评价不存在或已处理' }, 404);
    await db.prepare("UPDATE reviews SET status = 'rejected' WHERE id = ?").bind(c.req.param('id')).run();
    return c.json({ success: true });
  });

  // ── ADMIN: Merchant Management ──
  app.get('/admin/merchants', async (c) => {
    const db = c.env.DB;
    const { results } = await db.prepare('SELECT m.*, p.name as provider_name FROM merchants m LEFT JOIN providers p ON m.provider_id = p.id ORDER BY m.created_at DESC').all();
    return c.json({ merchants: results });
  });

  app.post('/admin/merchants/:id/approve', async (c) => {
    const db = c.env.DB;
    const row = await db.prepare("SELECT id, provider_id FROM merchants WHERE id = ? AND status = 'pending'").bind(c.req.param('id')).first();
    if (!row) return c.json({ error: '申请不存在或已处理' }, 404);
    const existingApproved = await db.prepare("SELECT id FROM merchants WHERE provider_id = ? AND status = 'approved' AND id != ?").bind(row.provider_id, row.id).first();
    if (existingApproved) return c.json({ error: '该商家已有其他已认领账号' }, 400);
    await db.prepare("UPDATE merchants SET status = 'approved', updated_at = datetime('now','localtime') WHERE id = ?").bind(c.req.param('id')).run();
    return c.json({ success: true });
  });

  app.post('/admin/merchants/:id/reject', async (c) => {
    const db = c.env.DB;
    await db.prepare("UPDATE merchants SET status = 'rejected', updated_at = datetime('now','localtime') WHERE id = ?").bind(c.req.param('id')).run();
    return c.json({ success: true });
  });

  app.delete('/admin/merchants/:id', async (c) => {
    const db = c.env.DB;
    await db.prepare('DELETE FROM merchants WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
  });

  // ── Monitoring: Admin CRUD ──
  app.get('/admin/monitoring', async (c) => {
    const db = c.env.DB;
    const pid = c.req.query('provider_id');
    let sql = 'SELECT * FROM provider_monitoring';
    const params = [];
    if (pid) { sql += ' WHERE provider_id = ?'; params.push(pid); }
    sql += ' ORDER BY checked_at DESC LIMIT 500';
    const { results } = await db.prepare(sql).bind(...params).all();
    return c.json({ monitoring: results });
  });

  app.post('/admin/monitoring', async (c) => {
    const db = c.env.DB;
    const body = await c.req.json();
    const provider_id = cleanText(body.provider_id, 160);
    if (!provider_id) return c.json({ error: '请指定商家' }, 400);
    const provider = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(provider_id).first();
    if (!provider) return c.json({ error: '商家不存在' }, 404);
    await db.prepare(`INSERT INTO provider_monitoring (provider_id, family, availability, latency_recent, latency_7d, cache_hit_rate, sample_count, source, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      provider_id,
      cleanText(body.family, 40),
      Math.max(0, Math.min(100, numOr(body.availability, 0))),
      Math.max(0, Math.min(600, numOr(body.latency_recent, 0))),
      Math.max(0, Math.min(600, numOr(body.latency_7d, 0))),
      Math.max(0, Math.min(100, numOr(body.cache_hit_rate, 0))),
      Math.max(0, Math.min(1000000, Math.floor(numOr(body.sample_count, 0)))),
      cleanText(body.source, 20) || 'manual',
      cleanText(body.note, 200)
    ).run();
    return c.json({ success: true });
  });

  app.delete('/admin/monitoring/:id', async (c) => {
    const db = c.env.DB;
    await db.prepare('DELETE FROM provider_monitoring WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
  });
}
