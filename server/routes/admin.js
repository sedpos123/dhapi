const express = require('express');
const router = express.Router();
const { authMiddleware, createToken } = require('../auth');
const { db, getProviders, getProviderById, getBrands, getCategories, getPending, SEED_PROVIDERS, SEED_BRANDS, SEED_CATEGORIES } = require('../db');

// ── Login (no auth required) ──
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  const token = createToken();
  res.json({ token });
});

// All routes below require auth
router.use(authMiddleware);

// ── Providers ──
router.get('/providers', (req, res) => {
  try {
    res.json({ providers: getProviders(false) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/providers', (req, res) => {
  try {
    const { name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online, input_price, output_price } = req.body;
    if (!name || !category || !desc) {
      return res.status(400).json({ error: '请填写必填项' });
    }
    if (!Array.isArray(brands) || brands.length === 0) {
      return res.status(400).json({ error: '请至少选择一个品牌' });
    }
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9一-鿿-]/g, '') + '-' + Date.now().toString(36);
    db.prepare(`
      INSERT INTO providers (id, name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online, input_price, output_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, color || '#888', category, desc, rating || 0, reviews || 0,
      JSON.stringify(brands), JSON.stringify(features || []),
      status || 'ok', uptime || '—', speed || '—', url || '#', online !== false ? 1 : 0,
      input_price || '', output_price || '');
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/providers/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '商家不存在' });

    const { name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online, input_price, output_price } = req.body;
    db.prepare(`
      UPDATE providers SET name=?, color=?, category=?, desc=?, rating=?, reviews=?, brands=?, features=?, status=?, uptime=?, speed=?, url=?, online=?, input_price=?, output_price=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(
      name || existing.name, color || existing.color, category || existing.category,
      desc ?? existing.desc, rating ?? existing.rating, reviews ?? existing.reviews,
      JSON.stringify(brands ?? JSON.parse(existing.brands)),
      JSON.stringify(features ?? JSON.parse(existing.features)),
      status || existing.status, uptime || existing.uptime, speed || existing.speed,
      url ?? existing.url, online !== undefined ? (online ? 1 : 0) : existing.online,
      input_price ?? existing.input_price, output_price ?? existing.output_price,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/providers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM providers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.patch('/providers/:id/toggle', (req, res) => {
  try {
    const row = db.prepare('SELECT online FROM providers WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '商家不存在' });
    const newOnline = row.online ? 0 : 1;
    db.prepare("UPDATE providers SET online = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(newOnline, req.params.id);
    res.json({ success: true, online: !!newOnline });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ── Brands ──
router.get('/brands', (req, res) => {
  try {
    res.json({ brands: getBrands() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/brands', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '品牌名不能为空' });
    const existing = db.prepare('SELECT id FROM brands WHERE name = ?').get(name);
    if (existing) return res.status(400).json({ error: '品牌已存在' });
    const info = db.prepare('INSERT INTO brands (name) VALUES (?)').run(name);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/brands/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '品牌名不能为空' });
    const row = db.prepare('SELECT name FROM brands WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '品牌不存在' });
    const oldName = row.name;

    const tx = db.transaction(() => {
      db.prepare('UPDATE brands SET name = ? WHERE id = ?').run(name, req.params.id);
      // Cascade: update all providers that reference this brand
      const providers = db.prepare('SELECT id, brands FROM providers').all();
      const updateStmt = db.prepare('UPDATE providers SET brands = ?, updated_at = datetime("now","localtime") WHERE id = ?');
      for (const p of providers) {
        const arr = JSON.parse(p.brands || '[]');
        const idx = arr.indexOf(oldName);
        if (idx >= 0) {
          arr[idx] = name;
          updateStmt.run(JSON.stringify(arr), p.id);
        }
      }
    });
    tx();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/brands/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT name FROM brands WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '品牌不存在' });
    const name = row.name;

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM brands WHERE id = ?').run(req.params.id);
      const providers = db.prepare('SELECT id, brands FROM providers').all();
      const updateStmt = db.prepare('UPDATE providers SET brands = ?, updated_at = datetime("now","localtime") WHERE id = ?');
      for (const p of providers) {
        const arr = JSON.parse(p.brands || '[]');
        const filtered = arr.filter(b => b !== name);
        if (filtered.length !== arr.length) {
          updateStmt.run(JSON.stringify(filtered), p.id);
        }
      }
    });
    tx();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ── Categories ──
router.get('/categories', (req, res) => {
  try {
    res.json({ categories: getCategories() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/categories', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '分类名不能为空' });
    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (existing) return res.status(400).json({ error: '分类已存在' });
    const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '分类名不能为空' });
    const row = db.prepare('SELECT name FROM categories WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '分类不存在' });
    const oldName = row.name;

    const tx = db.transaction(() => {
      db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, req.params.id);
      db.prepare("UPDATE providers SET category = ?, updated_at = datetime('now','localtime') WHERE category = ?").run(name, oldName);
    });
    tx();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/categories/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT name FROM categories WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '分类不存在' });
    const name = row.name;

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
      db.prepare("UPDATE providers SET category = '', updated_at = datetime('now','localtime') WHERE category = ?").run(name);
    });
    tx();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ── Pending ──
router.get('/pending', (req, res) => {
  try {
    res.json({ pending: getPending() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/pending/:id/approve', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM pending_submissions WHERE id = ? AND status = ?').get(req.params.id, 'pending');
    if (!row) return res.status(404).json({ error: '申请不存在或已处理' });

    const id = (row.name || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9一-鿿-]/g, '') + '-' + Date.now().toString(36);

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO providers (id, name, color, category, desc, brands, features, status, uptime, speed, url, online, input_price, output_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ok', '—', '—', '#', 1, ?, ?)
      `).run(id, row.name, row.logo_color || '#888', row.category || '综合中转', row.desc,
        row.brands, row.features, row.input_price, row.output_price);
      db.prepare("UPDATE pending_submissions SET status = 'approved' WHERE id = ?").run(req.params.id);
    });
    tx();
    res.json({ success: true, providerId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/pending/:id/reject', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM pending_submissions WHERE id = ? AND status = ?').get(req.params.id, 'pending');
    if (!row) return res.status(404).json({ error: '申请不存在或已处理' });
    db.prepare("UPDATE pending_submissions SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ── Data Management ──
router.get('/export', (req, res) => {
  try {
    const providers = db.prepare('SELECT * FROM providers').all();
    const brands = db.prepare('SELECT * FROM brands').all();
    const categories = db.prepare('SELECT * FROM categories').all();
    const pending = db.prepare('SELECT * FROM pending_submissions').all();
    res.json({ providers, brands, categories, pending });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/import', (req, res) => {
  try {
    const { providers, brands, categories, pending } = req.body;

    const tx = db.transaction(() => {
      if (providers) {
        db.prepare('DELETE FROM providers').run();
        const stmt = db.prepare(`
          INSERT INTO providers (id, name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online, input_price, output_price)
          VALUES (@id, @name, @color, @category, @desc, @rating, @reviews, @brands, @features, @status, @uptime, @speed, @url, @online, @input_price, @output_price)
        `);
        for (const p of providers) stmt.run(p);
      }
      if (brands) {
        db.prepare('DELETE FROM brands').run();
        const stmt = db.prepare('INSERT INTO brands (id, name) VALUES (@id, @name)');
        for (const b of brands) stmt.run(b);
      }
      if (categories) {
        db.prepare('DELETE FROM categories').run();
        const stmt = db.prepare('INSERT INTO categories (id, name) VALUES (@id, @name)');
        for (const c of categories) stmt.run(c);
      }
      if (pending) {
        db.prepare('DELETE FROM pending_submissions').run();
        const stmt = db.prepare(`
          INSERT INTO pending_submissions (id, name, url, category, desc, brands, features, input_price, output_price, contact_email, contact_wechat, extra_note, logo_color, submitted_at, status)
          VALUES (@id, @name, @url, @category, @desc, @brands, @features, @input_price, @output_price, @contact_email, @contact_wechat, @extra_note, @logo_color, @submitted_at, @status)
        `);
        for (const p of pending) stmt.run(p);
      }
    });
    tx();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '导入失败: ' + err.message });
  }
});

router.post('/reset', (req, res) => {
  try {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM providers').run();
      db.prepare('DELETE FROM brands').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM pending_submissions').run();

      const insertProvider = db.prepare(`
        INSERT INTO providers (id, name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online)
        VALUES (@id, @name, @color, @category, @desc, @rating, @reviews, @brands, @features, @status, @uptime, @speed, @url, 1)
      `);
      for (const p of SEED_PROVIDERS) {
        insertProvider.run({ ...p, brands: JSON.stringify(p.brands), features: JSON.stringify(p.features) });
      }
      const insertBrand = db.prepare('INSERT INTO brands (name) VALUES (?)');
      for (const b of SEED_BRANDS) insertBrand.run(b);
      const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
      for (const c of SEED_CATEGORIES) insertCategory.run(c);
    });
    tx();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
