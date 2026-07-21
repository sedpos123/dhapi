// 公开路由：目录、详情、提交、跳转/收藏统计、logo、排行榜、首页聚合、对比、监测、评价
import { parseProvider, cleanText, cleanStringArray, isHttpUrl, isEmail, PROVIDERS_ORDER } from '../helpers.js';

export function applyPublicRoutes(app) {
  // ── Health ──
  app.get('/health', (c) => c.json({ ok: true }));

  // ── Sitemap ──
  app.get('/sitemap', async (c) => {
    const db = c.env.DB;
    const { results } = await db.prepare('SELECT id, updated_at FROM providers WHERE online = 1').all();
    const base = 'https://dhapi.pages.dev';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    xml += `<url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`;
    xml += `<url><loc>${base}/submit.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`;
    for (const p of results) {
      const lastmod = p.updated_at ? p.updated_at.slice(0, 10) : '';
      xml += `<url><loc>${base}/provider.html?id=${p.id}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    }
    xml += '</urlset>';
    return new Response(xml, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } });
  });

  // ── Public Routes ──
  app.get('/providers', async (c) => {
    const db = c.env.DB;
    let sql = `SELECT * FROM providers WHERE online = 1`;
    const params = [];
    const billingType = c.req.query('billing_type');
    if (billingType) { sql += ` AND billing_type = ?`; params.push(billingType); }
    const model = c.req.query('model');
    if (model) { sql += ` AND (supported_models LIKE ? OR brands LIKE ?)`; params.push(`%${model}%`, `%${model}%`); }
    const audience = c.req.query('audience');
    if (audience) { sql += ` AND target_audience = ?`; params.push(audience); }
    const freeQuota = c.req.query('free_quota');
    if (freeQuota === '1') { sql += ` AND free_quota = 1`; }
    sql += ` ORDER BY ${PROVIDERS_ORDER}`;
    const { results } = await db.prepare(sql).bind(...params).all();
    return c.json({ providers: results.map(parseProvider) });
  });

  app.get('/providers/:id', async (c) => {
    const db = c.env.DB;
    const row = await db.prepare('SELECT * FROM providers WHERE id = ? AND online = 1').bind(c.req.param('id')).first();
    if (!row) return c.json({ error: '商家不存在或已下线' }, 404);
    return c.json({ provider: parseProvider(row) });
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
    const name = cleanText(body.name, 100);
    const url = cleanText(body.url, 2048);
    const category = cleanText(body.category, 80);
    const desc = cleanText(body.desc, 2000);
    const input_price = cleanText(body.input_price, 80);
    const output_price = cleanText(body.output_price, 80);
    const contact_email = cleanText(body.contact_email, 254);
    const contact_wechat = cleanText(body.contact_wechat, 100);
    const extra_note = cleanText(body.extra_note, 2000);
    const logo_color = cleanText(body.logo_color, 20);
    const logo_url = cleanText(body.logo_url, 512);
    const billing_type = cleanText(body.billing_type, 40);
    const target_audience = cleanText(body.target_audience, 80);
    const free_quota = !!body.free_quota;
    if (!name || !url || !category || !desc || !input_price) return c.json({ error: '请填写所有必填项' }, 400);
    if (!isHttpUrl(url)) return c.json({ error: '请填写有效的 http 或 https 网址' }, 400);
    if (contact_email && !isEmail(contact_email)) return c.json({ error: '请填写有效邮箱' }, 400);
    const brandsArr = cleanStringArray(body.brands);
    if (brandsArr.length === 0) return c.json({ error: '请至少选择一个品牌/模型' }, 400);
    const featuresArr = cleanStringArray(body.features, 20, 120);
    const modelsArr = cleanStringArray(body.supported_models).length ? cleanStringArray(body.supported_models) : brandsArr;
    await db.prepare(`INSERT INTO pending_submissions (name, url, category, desc, brands, features, input_price, output_price, contact_email, contact_wechat, extra_note, logo_color, logo_url, billing_type, supported_models, target_audience, free_quota) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(name, url, category, desc, JSON.stringify(brandsArr), JSON.stringify(featuresArr), input_price, output_price, contact_email, contact_wechat, extra_note, logo_color || '#888', logo_url, billing_type, JSON.stringify(modelsArr), target_audience, free_quota ? 1 : 0).run();
    return c.json({ success: true, message: '提交成功，我们会尽快审核' });
  });

  // ── Redirect (click tracking) ──
  app.get('/redirect/:id', async (c) => {
    const db = c.env.DB;
    const row = await db.prepare('SELECT url FROM providers WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return c.json({ error: '商家不存在' }, 404);
    if (!row.url || row.url === '#') return c.json({ error: '该商家暂无官网链接' }, 400);
    await db.prepare('UPDATE providers SET click_count = click_count + 1 WHERE id = ?').bind(c.req.param('id')).run();
    return c.redirect(row.url, 302);
  });

  // ── Favorites (toggle) ──
  app.post('/favorites/:id', async (c) => {
    const db = c.env.DB;
    const row = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return c.json({ error: '商家不存在' }, 404);
    const { favorited } = await c.req.json();
    if (typeof favorited !== 'boolean') return c.json({ error: '收藏状态格式不正确' }, 400);
    if (favorited) {
      await db.prepare('UPDATE providers SET favorite_count = favorite_count + 1 WHERE id = ?').bind(c.req.param('id')).run();
    } else {
      await db.prepare('UPDATE providers SET favorite_count = MAX(favorite_count - 1, 0) WHERE id = ?').bind(c.req.param('id')).run();
    }
    const updated = await db.prepare('SELECT favorite_count FROM providers WHERE id = ?').bind(c.req.param('id')).first();
    return c.json({ success: true, favorite_count: updated.favorite_count || 0 });
  });

  // ── Logo Upload (public, for submit form) ──
  app.post('/upload-logo', async (c) => {
    const { handleLogoUpload } = await import('../upload.js');
    return handleLogoUpload(c, 'logos/pending');
  });

  // ── Logo Serve (proxy) ──
  app.get('/logo/:id', async (c) => {
    const db = c.env.DB;
    const bucket = c.env.LOGOS;
    const row = await db.prepare('SELECT logo_url FROM providers WHERE id = ?').bind(c.req.param('id')).first();
    if (!row || !row.logo_url) return c.json({ error: '暂无 logo' }, 404);
    if (!bucket) return c.json({ error: '存储服务未配置' }, 500);
    const obj = await bucket.get(row.logo_url);
    if (!obj) return c.json({ error: 'logo 文件不存在' }, 404);
    const contentType = obj.httpMetadata?.contentType || 'image/png';
    return new Response(obj.body, {
      headers: { 'Content-Type': contentType, 'Content-Length': obj.size, 'Cache-Control': 'public, max-age=86400' }
    });
  });

  // ── Rankings API ──
  app.get('/rankings', async (c) => {
    const db = c.env.DB;
    const [topRated, popular, newest] = await Promise.all([
      db.prepare('SELECT id, name, color, logo_url, category, avg_rating, review_count, click_count FROM providers WHERE online = 1 AND review_count > 0 ORDER BY avg_rating DESC, review_count DESC LIMIT 10').all(),
      db.prepare('SELECT id, name, color, logo_url, category, avg_rating, review_count, click_count FROM providers WHERE online = 1 ORDER BY click_count DESC LIMIT 10').all(),
      db.prepare("SELECT id, name, color, logo_url, category, avg_rating, review_count, click_count, created_at FROM providers WHERE online = 1 ORDER BY created_at DESC LIMIT 10").all()
    ]);
    return c.json({
      top_rated: topRated.results,
      popular: popular.results,
      newest: newest.results
    });
  });

  // ── Home API (combined: providers + brands + categories + rankings in one request) ──
  app.get('/home', async (c) => {
    const db = c.env.DB;
    const [providersRes, brandsRes, categoriesRes, topRatedRes, popularRes, newestRes] = await db.batch([
      db.prepare(`SELECT * FROM providers WHERE online = 1 ORDER BY ${PROVIDERS_ORDER}`),
      db.prepare('SELECT * FROM brands ORDER BY id'),
      db.prepare('SELECT * FROM categories ORDER BY id'),
      db.prepare('SELECT id, name, color, logo_url, category, avg_rating, review_count, click_count FROM providers WHERE online = 1 AND review_count > 0 ORDER BY avg_rating DESC, review_count DESC LIMIT 10'),
      db.prepare('SELECT id, name, color, logo_url, category, avg_rating, review_count, click_count FROM providers WHERE online = 1 ORDER BY click_count DESC LIMIT 10'),
      db.prepare("SELECT id, name, color, logo_url, category, avg_rating, review_count, click_count, created_at FROM providers WHERE online = 1 ORDER BY created_at DESC LIMIT 10")
    ]);
    return c.json({
      providers: providersRes.results.map(parseProvider),
      brands: brandsRes.results,
      categories: categoriesRes.results,
      rankings: {
        top_rated: topRatedRes.results,
        popular: popularRes.results,
        newest: newestRes.results
      }
    });
  });

  // ── Compare API ──
  app.get('/compare', async (c) => {
    const db = c.env.DB;
    const ids = (c.req.query('ids') || '').split(',').filter(Boolean).slice(0, 5);
    if (ids.length < 2) return c.json({ error: '请至少选择 2 个商家进行对比' }, 400);
    const placeholders = ids.map(() => '?').join(',');
    const { results } = await db.prepare(`SELECT * FROM providers WHERE online = 1 AND id IN (${placeholders})`).bind(...ids).all();
    return c.json({ providers: results.map(parseProvider) });
  });

  // ── Monitoring (public) ──
  app.get('/providers/:id/monitoring', async (c) => {
    const db = c.env.DB;
    const pid = c.req.param('id');
    const provider = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(pid).first();
    if (!provider) return c.json({ error: '商家不存在' }, 404);
    const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') || '50')));
    const { results } = await db.prepare('SELECT * FROM provider_monitoring WHERE provider_id = ? ORDER BY checked_at DESC').bind(pid).all();
    const rows = results || [];
    const overall = rows.length ? rows[0] : null;
    const byFamilyMap = {};
    for (const r of rows) {
      const fam = r.family || '';
      if (!byFamilyMap[fam]) byFamilyMap[fam] = r;
    }
    return c.json({ overall, by_family: Object.values(byFamilyMap), timeline: rows.slice(0, limit) });
  });

  // ── Reviews: Public API ──
  app.get('/reviews/:providerId', async (c) => {
    const db = c.env.DB;
    const providerId = c.req.param('providerId');
    const page = parseInt(c.req.query('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;
    const { results } = await db.prepare('SELECT id, score, tags, content, merchant_reply, created_at FROM reviews WHERE provider_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(providerId, 'approved', limit, offset).all();
    const total = await db.prepare('SELECT COUNT(*) as cnt FROM reviews WHERE provider_id = ? AND status = ?').bind(providerId, 'approved').first();
    const reviews = (results || []).map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
    return c.json({ reviews, total: total ? total.cnt : 0, page, limit });
  });

  app.post('/reviews/:providerId', async (c) => {
    const db = c.env.DB;
    const providerId = c.req.param('providerId');
    const provider = await db.prepare('SELECT id FROM providers WHERE id = ? AND online = 1').bind(providerId).first();
    if (!provider) return c.json({ error: '商家不存在或已下线' }, 404);
    const body = await c.req.json();
    const score = Number(body.score);
    const email = cleanText(body.email, 254).toLowerCase();
    const content = cleanText(body.content, 200);
    const tags = cleanStringArray(body.tags, 5, 40);
    if (!Number.isInteger(score) || score < 1 || score > 5) return c.json({ error: '评分必须在 1-5 之间' }, 400);
    if (!isEmail(email)) return c.json({ error: '请填写有效邮箱' }, 400);
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(email.toLowerCase().trim()));
    const emailHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const existing = await db.prepare('SELECT id FROM reviews WHERE provider_id = ? AND email_hash = ? AND status != ?').bind(providerId, emailHash, 'rejected').first();
    if (existing) return c.json({ error: '您已经评价过该商家' }, 400);
    await db.prepare('INSERT INTO reviews (provider_id, score, tags, content, email_hash) VALUES (?, ?, ?, ?, ?)').bind(providerId, score, JSON.stringify(tags), content, emailHash).run();
    return c.json({ success: true, message: '评价提交成功，审核通过后将展示' });
  });
}
