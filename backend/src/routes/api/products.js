'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toBool, toInt, toFloat, uniqueSlug, parseJSON } = require('../../lib/helpers');

function loadCities(productId) {
  return db.prepare('SELECT city_id FROM product_cities WHERE product_id = ?')
    .all(productId).map((r) => r.city_id);
}

function setCities(productId, cityIds) {
  db.prepare('DELETE FROM product_cities WHERE product_id = ?').run(productId);
  const ins = db.prepare('INSERT OR IGNORE INTO product_cities (product_id, city_id) VALUES (?, ?)');
  (cityIds || []).forEach((cid) => { const id = toInt(cid); if (id) ins.run(productId, id); });
}

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, c.name AS category_name, ci.name AS city_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN cities ci ON ci.id = p.city_id
    ORDER BY p.sort_order, p.created_at DESC
  `).all();
  for (const r of rows) r.cities = loadCities(r.id);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.cities = loadCities(row.id);
  res.json(row);
});

function fields(b, existing = {}) {
  return {
    name: b.name ?? existing.name,
    short_description: b.short_description ?? existing.short_description ?? null,
    description: b.description ?? existing.description ?? null,
    price: b.price === undefined ? existing.price : toFloat(b.price),
    sale_price: b.sale_price === undefined ? existing.sale_price : toFloat(b.sale_price),
    currency: b.currency ?? existing.currency ?? 'USD',
    sku: b.sku ?? existing.sku ?? null,
    category_id: b.category_id === undefined ? existing.category_id : toInt(b.category_id),
    city_id: b.city_id === undefined ? existing.city_id : toInt(b.city_id),
    image: b.image ?? existing.image ?? null,
    gallery: b.gallery === undefined ? existing.gallery : JSON.stringify(parseJSON(b.gallery, b.gallery) || []),
    featured: b.featured === undefined ? (existing.featured ?? 0) : toBool(b.featured),
    active: b.active === undefined ? (existing.active ?? 1) : toBool(b.active),
    sort_order: b.sort_order === undefined ? (existing.sort_order ?? 0) : toInt(b.sort_order, 0),
  };
}

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const f = fields(b);
  f.slug = uniqueSlug(db, 'products', b.slug || b.name);
  const info = db.prepare(`
    INSERT INTO products (name, slug, short_description, description, price, sale_price, currency, sku, category_id, city_id, image, gallery, featured, active, sort_order)
    VALUES (@name,@slug,@short_description,@description,@price,@sale_price,@currency,@sku,@category_id,@city_id,@image,@gallery,@featured,@active,@sort_order)
  `).run(f);
  const id = info.lastInsertRowid;
  if (b.cities) setCities(id, b.cities);
  else if (f.city_id) setCities(id, [f.city_id]);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  row.cities = loadCities(id);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const f = fields(b, existing);
  f.slug = b.slug ? uniqueSlug(db, 'products', b.slug, existing.id) : existing.slug;
  f.id = Number(req.params.id);
  db.prepare(`
    UPDATE products SET name=@name, slug=@slug, short_description=@short_description, description=@description,
      price=@price, sale_price=@sale_price, currency=@currency, sku=@sku, category_id=@category_id, city_id=@city_id,
      image=@image, gallery=@gallery, featured=@featured, active=@active, sort_order=@sort_order
    WHERE id=@id
  `).run(f);
  if (b.cities !== undefined) setCities(f.id, b.cities);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(f.id);
  row.cities = loadCities(f.id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
