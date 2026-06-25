'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toBool, toInt, toFloat, uniqueSlug, parseJSON } = require('../../lib/helpers');
const audit = require('../../lib/audit');

function loadImages(id) {
  return db.prepare('SELECT id, image_path, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id').all(id);
}
function loadCities(id) {
  return db.prepare('SELECT city_id FROM product_cities WHERE product_id = ?').all(id).map((r) => r.city_id);
}
function setCities(id, cityIds) {
  db.prepare('DELETE FROM product_cities WHERE product_id = ?').run(id);
  const ins = db.prepare('INSERT OR IGNORE INTO product_cities (product_id, city_id) VALUES (?, ?)');
  (cityIds || []).forEach((c) => { const cid = toInt(c); if (cid) ins.run(id, cid); });
}
function setImages(id, images) {
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
  const ins = db.prepare('INSERT INTO product_images (product_id, image_path, sort_order) VALUES (?, ?, ?)');
  (images || []).forEach((img, i) => { if (img) ins.run(id, String(img), i); });
}
function hydrate(row) {
  if (!row) return row;
  row.specifications = parseJSON(row.specifications, []);
  row.images = loadImages(row.id).map((i) => i.image_path);
  row.cities = loadCities(row.id);
  return row;
}

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, c.name AS category_name, ci.name AS city_name
    FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN cities ci ON ci.id=p.city_id
    ORDER BY p.sort_order, p.created_at DESC
  `).all();
  for (const r of rows) { r.cities = loadCities(r.id); r.image_count = loadImages(r.id).length; }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(hydrate(row));
});

function fields(b, existing = {}) {
  return {
    title: b.title ?? existing.title,
    short_description: b.short_description ?? existing.short_description ?? null,
    description: b.description ?? existing.description ?? null,
    specifications: b.specifications === undefined ? existing.specifications : JSON.stringify(parseJSON(b.specifications, b.specifications) || []),
    price: b.price === undefined ? existing.price : toFloat(b.price),
    sale_price: b.sale_price === undefined ? existing.sale_price : toFloat(b.sale_price),
    currency: b.currency ?? existing.currency ?? 'USD',
    sku: b.sku ?? existing.sku ?? null,
    category_id: b.category_id === undefined ? existing.category_id : toInt(b.category_id),
    city_id: b.city_id === undefined ? existing.city_id : toInt(b.city_id),
    image: b.image ?? existing.image ?? null,
    featured: b.featured === undefined ? (existing.featured ?? 0) : toBool(b.featured),
    active: b.active === undefined ? (existing.active ?? 1) : toBool(b.active),
    sort_order: b.sort_order === undefined ? (existing.sort_order ?? 0) : toInt(b.sort_order, 0),
  };
}

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'title is required' });
  const f = fields(b);
  f.slug = uniqueSlug(db, 'products', b.slug || b.title);
  const info = db.prepare(`
    INSERT INTO products (title, slug, short_description, description, specifications, price, sale_price, currency, sku, category_id, city_id, image, featured, active, sort_order)
    VALUES (@title,@slug,@short_description,@description,@specifications,@price,@sale_price,@currency,@sku,@category_id,@city_id,@image,@featured,@active,@sort_order)
  `).run(f);
  const id = info.lastInsertRowid;
  setCities(id, b.cities || (f.city_id ? [f.city_id] : []));
  if (b.images) setImages(id, b.images);
  audit.log('product_created', { id, title: f.title }, req);
  res.status(201).json(hydrate(db.prepare('SELECT * FROM products WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const f = fields(b, existing);
  f.slug = b.slug ? uniqueSlug(db, 'products', b.slug, existing.id) : existing.slug;
  f.id = Number(req.params.id);
  db.prepare(`
    UPDATE products SET title=@title, slug=@slug, short_description=@short_description, description=@description,
      specifications=@specifications, price=@price, sale_price=@sale_price, currency=@currency, sku=@sku,
      category_id=@category_id, city_id=@city_id, image=@image, featured=@featured, active=@active, sort_order=@sort_order
    WHERE id=@id
  `).run(f);
  if (b.cities !== undefined) setCities(f.id, b.cities);
  if (b.images !== undefined) setImages(f.id, b.images);
  audit.log('product_updated', { id: f.id, title: f.title }, req);
  res.json(hydrate(db.prepare('SELECT * FROM products WHERE id = ?').get(f.id)));
});

// Duplicate a product (with its images & city assignments).
router.post('/:id/duplicate', (req, res) => {
  const src = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!src) return res.status(404).json({ error: 'Not found' });
  const slug = uniqueSlug(db, 'products', src.title + '-copy');
  const info = db.prepare(`
    INSERT INTO products (title, slug, short_description, description, specifications, price, sale_price, currency, sku, category_id, city_id, image, featured, active, sort_order)
    SELECT title || ' (Copy)', ?, short_description, description, specifications, price, sale_price, currency, sku, category_id, city_id, image, 0, active, sort_order
    FROM products WHERE id = ?
  `).run(slug, src.id);
  const newId = info.lastInsertRowid;
  loadCities(src.id).forEach((cid) => db.prepare('INSERT OR IGNORE INTO product_cities (product_id, city_id) VALUES (?, ?)').run(newId, cid));
  loadImages(src.id).forEach((img) => db.prepare('INSERT INTO product_images (product_id, image_path, sort_order) VALUES (?, ?, ?)').run(newId, img.image_path, img.sort_order));
  audit.log('product_duplicated', { from: src.id, to: newId }, req);
  res.status(201).json(hydrate(db.prepare('SELECT * FROM products WHERE id = ?').get(newId)));
});

// Reorder product images (drag-and-drop). Body: { images: [path, path, ...] }
router.post('/:id/images/reorder', (req, res) => {
  setImages(Number(req.params.id), (req.body && req.body.images) || []);
  res.json({ ok: true, images: loadImages(req.params.id).map((i) => i.image_path) });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT title FROM products WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  audit.log('product_deleted', { id: Number(req.params.id), title: row && row.title }, req);
  res.json({ ok: true });
});

module.exports = router;
