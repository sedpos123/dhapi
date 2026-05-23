const express = require('express');
const router = express.Router();
const { getProviders, getBrands, getCategories, db } = require('../db');

// GET /api/providers — 返回在线商家列表
router.get('/providers', (req, res) => {
  try {
    const providers = getProviders(true);
    res.json({ providers });
  } catch (err) {
    console.error('GET /api/providers error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/brands — 品牌列表
router.get('/brands', (req, res) => {
  try {
    const brands = getBrands();
    res.json({ brands });
  } catch (err) {
    console.error('GET /api/brands error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/categories — 分类列表
router.get('/categories', (req, res) => {
  try {
    const categories = getCategories();
    res.json({ categories });
  } catch (err) {
    console.error('GET /api/categories error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/submit — 提交新商家
router.post('/submit', (req, res) => {
  try {
    const { name, url, category, desc, brands, features, input_price, output_price, contact_email, contact_wechat, extra_note, logo_color } = req.body;

    if (!name || !url || !category || !desc || !input_price) {
      return res.status(400).json({ error: '请填写所有必填项' });
    }

    const brandsArr = Array.isArray(brands) ? brands : [];
    if (brandsArr.length === 0) {
      return res.status(400).json({ error: '请至少选择一个品牌/模型' });
    }

    db.prepare(`
      INSERT INTO pending_submissions (name, url, category, desc, brands, features, input_price, output_price, contact_email, contact_wechat, extra_note, logo_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, url, category, desc,
      JSON.stringify(brandsArr),
      JSON.stringify(Array.isArray(features) ? features : []),
      input_price || '', output_price || '',
      contact_email || '', contact_wechat || '', extra_note || '',
      logo_color || '#888'
    );

    res.json({ success: true, message: '提交成功，我们会尽快审核' });
  } catch (err) {
    console.error('POST /api/submit error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
