'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { parseJSON, toInt } = require('../lib/helpers');
const { getSettings } = require('../lib/settings');
const audit = require('../lib/audit');
const { asyncHandler } = require('../middleware/error');

// --------------------------------------------------------------------------
// Settings (public branding/contact/SEO config) + active sections
// --------------------------------------------------------------------------
router.get('/settings', (req, res) => res.json(getSettings()));

router.get('/sections', (req, res) => {
  const rows = db.prepare('SELECT * FROM sections WHERE active = 1 ORDER BY sort_order, id').all();
  for (const s of rows) s.config = parseJSON(s.config, {});
  res.json(rows);
});

router.get('/categories', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM categories WHERE active = 1';
  const params = [];
  if (type) { sql += " AND (type = ? OR type = 'both')"; params.push(type); }
  sql += ' ORDER BY sort_order, name';
  res.json(db.prepare(sql).all(...params));
});

// --------------------------------------------------------------------------
// Products
// --------------------------------------------------------------------------
router.get('/products', (req, res) => {
  const { city, category, q, featured } = req.query;
  const where = ['p.active = 1'];
  const params = [];
  if (city) {
    where.push('(p.city_id = ? OR p.id IN (SELECT product_id FROM product_cities WHERE city_id = ?))');
    params.push(toInt(city), toInt(city));
  }
  if (category) { where.push('p.category_id = ?'); params.push(toInt(category)); }
  if (featured) { where.push('p.featured = 1'); }
  if (q) { where.push('(p.title LIKE ? OR p.short_description LIKE ? OR p.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const rows = db.prepare(`
    SELECT p.*, c.name AS category_name, ci.name AS city_name
    FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN cities ci ON ci.id=p.city_id
    WHERE ${where.join(' AND ')} ORDER BY p.featured DESC, p.sort_order, p.created_at DESC
  `).all(...params);
  res.json(rows);
});

router.get('/products/:slug', (req, res) => {
  const p = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug, ci.name AS city_name
    FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN cities ci ON ci.id=p.city_id
    WHERE p.slug = ? AND p.active = 1
  `).get(req.params.slug);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.specifications = parseJSON(p.specifications, []);
  p.images = db.prepare('SELECT image_path FROM product_images WHERE product_id = ? ORDER BY sort_order, id').all(p.id).map((r) => r.image_path);
  p.cities = db.prepare('SELECT ci.* FROM cities ci JOIN product_cities pc ON pc.city_id=ci.id WHERE pc.product_id = ? AND ci.active = 1').all(p.id);
  p.related = db.prepare(`
    SELECT p2.*, ci.name AS city_name FROM products p2 LEFT JOIN cities ci ON ci.id=p2.city_id
    WHERE p2.active=1 AND p2.id != ? AND (p2.category_id = ? OR ? IS NULL) ORDER BY p2.featured DESC LIMIT 4
  `).all(p.id, p.category_id, p.category_id);
  res.json(p);
});

// --------------------------------------------------------------------------
// Services
// --------------------------------------------------------------------------
router.get('/services', (req, res) => {
  const { city, category, q, featured } = req.query;
  const where = ['s.active = 1'];
  const params = [];
  if (city) {
    where.push('(s.city_id = ? OR s.id IN (SELECT service_id FROM service_cities WHERE city_id = ?))');
    params.push(toInt(city), toInt(city));
  }
  if (category) { where.push('s.category_id = ?'); params.push(toInt(category)); }
  if (featured) { where.push('s.featured = 1'); }
  if (q) { where.push('(s.title LIKE ? OR s.short_description LIKE ? OR s.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const rows = db.prepare(`
    SELECT s.*, c.name AS category_name, ci.name AS city_name
    FROM services s LEFT JOIN categories c ON c.id=s.category_id LEFT JOIN cities ci ON ci.id=s.city_id
    WHERE ${where.join(' AND ')} ORDER BY s.featured DESC, s.sort_order, s.created_at DESC
  `).all(...params);
  for (const r of rows) r.gallery = parseJSON(r.gallery, []);
  res.json(rows);
});

router.get('/services/:slug', (req, res) => {
  const s = db.prepare(`
    SELECT s.*, c.name AS category_name, c.slug AS category_slug, ci.name AS city_name
    FROM services s LEFT JOIN categories c ON c.id=s.category_id LEFT JOIN cities ci ON ci.id=s.city_id
    WHERE s.slug = ? AND s.active = 1
  `).get(req.params.slug);
  if (!s) return res.status(404).json({ error: 'Not found' });
  s.specifications = parseJSON(s.specifications, []);
  s.gallery = parseJSON(s.gallery, []);
  s.cities = db.prepare('SELECT ci.* FROM cities ci JOIN service_cities sc ON sc.city_id=ci.id WHERE sc.service_id = ? AND ci.active = 1').all(s.id);
  s.related = db.prepare(`
    SELECT s2.*, ci.name AS city_name FROM services s2 LEFT JOIN cities ci ON ci.id=s2.city_id
    WHERE s2.active=1 AND s2.id != ? AND (s2.category_id = ? OR ? IS NULL) ORDER BY s2.featured DESC LIMIT 4
  `).all(s.id, s.category_id, s.category_id);
  res.json(s);
});

// --------------------------------------------------------------------------
// Cities
// --------------------------------------------------------------------------
router.get('/cities', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, r.name AS region_name,
      (SELECT COUNT(*) FROM products p WHERE p.city_id=c.id AND p.active=1) AS product_count,
      (SELECT COUNT(*) FROM services s WHERE s.city_id=c.id AND s.active=1) AS service_count
    FROM cities c LEFT JOIN regions r ON r.id=c.region_id
    WHERE c.active=1 ORDER BY c.featured DESC, c.sort_order, c.name
  `).all();
  res.json(rows);
});

router.get('/cities/:id', (req, res) => {
  const city = db.prepare(`
    SELECT c.*, r.name AS region_name FROM cities c LEFT JOIN regions r ON r.id=c.region_id
    WHERE c.id = ? AND c.active = 1
  `).get(req.params.id);
  if (!city) return res.status(404).json({ error: 'Not found' });
  city.products = db.prepare(`
    SELECT DISTINCT p.*, ci.name AS city_name FROM products p LEFT JOIN cities ci ON ci.id=p.city_id
    WHERE p.active=1 AND (p.city_id = ? OR p.id IN (SELECT product_id FROM product_cities WHERE city_id = ?))
    ORDER BY p.featured DESC, p.sort_order
  `).all(city.id, city.id);
  city.services = db.prepare(`
    SELECT DISTINCT s.*, ci.name AS city_name FROM services s LEFT JOIN cities ci ON ci.id=s.city_id
    WHERE s.active=1 AND (s.city_id = ? OR s.id IN (SELECT service_id FROM service_cities WHERE city_id = ?))
    ORDER BY s.featured DESC, s.sort_order
  `).all(city.id, city.id);
  res.json(city);
});

// --------------------------------------------------------------------------
// Inquiries (lead capture from contact form & WhatsApp flow)
// --------------------------------------------------------------------------
router.post('/inquiries', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const customer_name = String(b.customer_name || '').slice(0, 200);
  const phone = String(b.phone || '').slice(0, 50);
  if (!customer_name && !phone && !b.message) {
    return res.status(400).json({ error: 'Please provide your name, phone or a message' });
  }
  const info = db.prepare(`
    INSERT INTO inquiries (customer_name, phone, email, item_type, item_id, item_name, price, city, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    customer_name, phone, String(b.email || '').slice(0, 200),
    b.item_type || 'contact', toInt(b.item_id), String(b.item_name || '').slice(0, 300),
    String(b.price || '').slice(0, 60), String(b.city || '').slice(0, 120),
    String(b.message || '').slice(0, 4000)
  );
  audit.log('inquiry_created', { id: info.lastInsertRowid, item: b.item_name || 'contact' }, req);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
}));

module.exports = router;
