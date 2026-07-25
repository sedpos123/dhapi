// 商家自助路由：注册/登录（公开）+ 仪表盘/资料/logo/评价管理（需 merchant 鉴权）
import { merchantAuthMiddleware, signJWT, generateSalt, hashPassword, verifyPassword } from '../auth.js';
import { handleLogoUpload } from '../upload.js';
import { parseProvider, cleanProviderInput, providerInputError, cleanText, isEmail } from '../helpers.js';

export function applyMerchantRoutes(app) {
  // ── MERCHANT: Public Auth ──
  app.post('/merchant/register', async (c) => {
    const db = c.env.DB;
    const body = await c.req.json();
    const email = cleanText(body.email, 254).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const provider_id = cleanText(body.provider_id, 160);
    if (!isEmail(email)) return c.json({ error: '请填写有效邮箱' }, 400);
    if (password.length < 8 || password.length > 128) return c.json({ error: '密码长度应为 8-128 位' }, 400);
    if (!provider_id) return c.json({ error: '请选择要认领的商家' }, 400);
    const provider = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(provider_id).first();
    if (!provider) return c.json({ error: '商家不存在' }, 404);
    const existing = await db.prepare('SELECT id FROM merchants WHERE email = ?').bind(email.toLowerCase().trim()).first();
    if (existing) return c.json({ error: '该邮箱已注册' }, 409);
    const approved = await db.prepare("SELECT id FROM merchants WHERE provider_id = ? AND status = 'approved'").bind(provider_id).first();
    if (approved) return c.json({ error: '该商家已被认领' }, 409);
    const salt = await generateSalt();
    const passwordHash = await hashPassword(password, salt);
    await db.prepare('INSERT INTO merchants (email, password_hash, salt, provider_id) VALUES (?, ?, ?, ?)').bind(email.toLowerCase().trim(), passwordHash, salt, provider_id).run();
    return c.json({ success: true, message: '注册成功，请等待管理员审核' });
  });

  app.post('/merchant/login', async (c) => {
    const db = c.env.DB;
    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password) return c.json({ error: '请填写邮箱和密码' }, 400);
    const merchant = await db.prepare('SELECT * FROM merchants WHERE email = ?').bind(email.toLowerCase().trim()).first();
    if (!merchant) return c.json({ error: '账号不存在' }, 404);
    const valid = await verifyPassword(password, merchant.salt, merchant.password_hash);
    if (!valid) return c.json({ error: '密码错误' }, 401);
    if (merchant.status === 'pending') return c.json({ error: '账号审核中，请耐心等待' }, 403);
    if (merchant.status === 'rejected') return c.json({ error: '账号审核未通过' }, 403);
    const token = await signJWT({ role: 'merchant', merchant_id: merchant.id, provider_id: merchant.provider_id }, c.env.JWT_SECRET, c.env.JWT_EXPIRES_IN || '24h');
    return c.json({ token, provider_id: merchant.provider_id, merchant_id: merchant.id });
  });

  // ── MERCHANT: Protected Routes ──
  app.use('/merchant/dashboard', merchantAuthMiddleware);
  app.use('/merchant/provider', merchantAuthMiddleware);
  app.use('/merchant/upload-logo', merchantAuthMiddleware);
  app.use('/merchant/reviews', merchantAuthMiddleware);
  app.use('/merchant/reviews/*', merchantAuthMiddleware);

  app.get('/merchant/dashboard', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const provider = await db.prepare('SELECT id, name, online, status, click_count, favorite_count, avg_rating, review_count FROM providers WHERE id = ?').bind(merchant.provider_id).first();
    if (!provider) return c.json({ error: '商家不存在' }, 404);
    const pendingReviews = await db.prepare("SELECT COUNT(*) as cnt FROM reviews WHERE provider_id = ? AND status = 'pending'").bind(merchant.provider_id).first();
    return c.json({
      provider,
      stats: {
        click_count: provider.click_count || 0,
        favorite_count: provider.favorite_count || 0,
        avg_rating: provider.avg_rating || 0,
        review_count: provider.review_count || 0,
        pending_review_count: pendingReviews ? pendingReviews.cnt : 0
      }
    });
  });

  app.get('/merchant/provider', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const row = await db.prepare('SELECT * FROM providers WHERE id = ?').bind(merchant.provider_id).first();
    if (!row) return c.json({ error: '商家不存在' }, 404);
    return c.json({ provider: parseProvider(row) });
  });

  app.put('/merchant/provider', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const value = cleanProviderInput(await c.req.json());
    const error = providerInputError(value);
    if (error) return c.json({ error }, 400);
    const { name, desc, url, category, color, logo_url, input_price, output_price, billing_type, target_audience, free_quota, founded_at, brands, features, supported_models, promotion } = value;
    const modelsArr = Array.isArray(supported_models) ? supported_models : (Array.isArray(brands) ? brands : []);
    const bucket = c.env.LOGOS;
    if (bucket && logo_url) {
      const old = await db.prepare('SELECT logo_url FROM providers WHERE id = ?').bind(merchant.provider_id).first();
      if (old && old.logo_url && old.logo_url !== logo_url) { await bucket.delete(old.logo_url).catch(() => {}); }
    }
    await db.prepare(`UPDATE providers SET name=?, desc=?, url=?, category=?, color=?, logo_url=?, input_price=?, output_price=?, billing_type=?, target_audience=?, free_quota=?, founded_at=?, brands=?, features=?, supported_models=?, promotion=?, updated_at=datetime('now','localtime') WHERE id=?`).bind(name, desc, url || '#', category, color || '#888', logo_url || '', input_price || '', output_price || '', billing_type || '', target_audience || '', free_quota ? 1 : 0, founded_at || '', JSON.stringify(Array.isArray(brands) ? brands : []), JSON.stringify(Array.isArray(features) ? features : []), JSON.stringify(modelsArr), JSON.stringify(promotion || {}), merchant.provider_id).run();
    return c.json({ success: true });
  });

  app.post('/merchant/upload-logo', async (c) => {
    const merchant = c.get('merchant');
    return handleLogoUpload(c, 'logos/' + merchant.provider_id);
  });

  app.get('/merchant/reviews', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const status = c.req.query('status');
    let sql = 'SELECT * FROM reviews WHERE provider_id = ?';
    const params = [merchant.provider_id];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const { results } = await db.prepare(sql).bind(...params).all();
    const reviews = (results || []).map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
    return c.json({ reviews });
  });

  app.post('/merchant/reviews/:id/reply', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const reviewId = c.req.param('id');
    const review = await db.prepare('SELECT id, provider_id, merchant_reply FROM reviews WHERE id = ? AND provider_id = ?').bind(reviewId, merchant.provider_id).first();
    if (!review) return c.json({ error: '评价不存在' }, 404);
    if (review.merchant_reply) return c.json({ error: '已回复过该评价' }, 400);
    const body = await c.req.json();
    const reply = (body.reply || '').slice(0, 500);
    if (!reply) return c.json({ error: '回复内容不能为空' }, 400);
    await db.prepare('UPDATE reviews SET merchant_reply = ? WHERE id = ?').bind(reply, reviewId).run();
    return c.json({ success: true });
  });
}
