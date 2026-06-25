'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toBool, toInt, toFloat, uniqueSlug, parseJSON } = require('../../lib/helpers');
const audit = require('../../lib/audit');

function loadCities(id) {
  return db.prepare('SELECT city_id FROM service_cities WHERE service_id = ?').all(id).map((r) => r.city_id);
}
function setCities(id, cityIds) {
  db.prepare('DELETE FROM service_cities WHERE service_id = ?').run(id);
  const ins = db.prepare('INSERT OR IGNORE INTO service_cities (service_id, city_id) VALUES (?, ?)');
  (cityIds || []).forEach((c) => { const cid = toInt(c); if (cid) ins.run(id, cid); });
}
function hydrate(row) {
  if (!row) return row;
  row.specifications = parseJSON(row.specifications, []);
  row.gallery = parseJSON(row.gallery, []);
  row.cities = loadCities(row.id);
  return row;
}

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, c.name AS category_name, ci.name AS city_name
    FROM services s LEFT JOIN categories c ON c.id=s.category_id LEFT JOIN cities ci ON ci.id=s.city_id
    ORDER BY s.sort_order, s.created_at DESC
  `).all();
  for (const r of rows) { r.cities = loadCities(r.id); r.gallery = parseJSON(r.gallery, []); }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
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
    price_unit: b.price_unit ?? existing.price_unit ?? null,
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
  if (!b.title) return res.status(400).json({ error: 'title is required' });
  const f = fields(b);
  f.slug = uniqueSlug(db, 'services', b.slug || b.title);
  const info = db.prepare(`
    INSERT INTO services (title, slug, short_description, description, specifications, price, sale_price, currency, price_unit, category_id, city_id, image, gallery, featured, active, sort_order)
    VALUES (@title,@slug,@short_description,@description,@specifications,@price,@sale_price,@currency,@price_unit,@category_id,@city_id,@image,@gallery,@featured,@active,@sort_order)
  `).run(f);
  const id = info.lastInsertRowid;
  setCities(id, b.cities || (f.city_id ? [f.city_id] : []));
  audit.log('service_created', { id, title: f.title }, req);
  res.status(201).json(hydrate(db.prepare('SELECT * FROM services WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const f = fields(b, existing);
  f.slug = b.slug ? uniqueSlug(db, 'services', b.slug, existing.id) : existing.slug;
  f.id = Number(req.params.id);
  db.prepare(`
    UPDATE services SET title=@title, slug=@slug, short_description=@short_description, description=@description,
      specifications=@specifications, price=@price, sale_price=@sale_price, currency=@currency, price_unit=@price_unit,
      category_id=@category_id, city_id=@city_id, image=@image, gallery=@gallery, featured=@featured, active=@active, sort_order=@sort_order
    WHERE id=@id
  `).run(f);
  if (b.cities !== undefined) setCities(f.id, b.cities);
  audit.log('service_updated', { id: f.id, title: f.title }, req);
  res.json(hydrate(db.prepare('SELECT * FROM services WHERE id = ?').get(f.id)));
});

router.post('/:id/duplicate', (req, res) => {
  const src = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!src) return res.status(404).json({ error: 'Not found' });
  const slug = uniqueSlug(db, 'services', src.title + '-copy');
  const info = db.prepare(`
    INSERT INTO services (title, slug, short_description, description, specifications, price, sale_price, currency, price_unit, category_id, city_id, image, gallery, featured, active, sort_order)
    SELECT title || ' (Copy)', ?, short_description, description, specifications, price, sale_price, currency, price_unit, category_id, city_id, image, gallery, 0, active, sort_order
    FROM services WHERE id = ?
  `).run(slug, src.id);
  const newId = info.lastInsertRowid;
  loadCities(src.id).forEach((cid) => db.prepare('INSERT OR IGNORE INTO service_cities (service_id, city_id) VALUES (?, ?)').run(newId, cid));
  audit.log('service_duplicated', { from: src.id, to: newId }, req);
  res.status(201).json(hydrate(db.prepare('SELECT * FROM services WHERE id = ?').get(newId)));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT title FROM services WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  audit.log('service_deleted', { id: Number(req.params.id), title: row && row.title }, req);
  res.json({ ok: true });
});

module.exports = router;
