'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toBool, toInt, toFloat } = require('../../lib/helpers');

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, r.name AS region_name,
      (SELECT COUNT(*) FROM products p WHERE p.city_id = c.id) AS product_count,
      (SELECT COUNT(*) FROM services s WHERE s.city_id = c.id) AS service_count
    FROM cities c LEFT JOIN regions r ON r.id = c.region_id
    ORDER BY c.featured DESC, c.sort_order, c.name
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM cities WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

function fields(b, existing = {}) {
  return {
    name: b.name ?? existing.name,
    region_id: b.region_id === undefined ? existing.region_id : toInt(b.region_id),
    country: b.country ?? existing.country ?? null,
    state_province: b.state_province ?? existing.state_province ?? null,
    address: b.address ?? existing.address ?? null,
    postal_code: b.postal_code ?? existing.postal_code ?? null,
    google_maps_link: b.google_maps_link ?? existing.google_maps_link ?? null,
    latitude: b.latitude === undefined ? existing.latitude : toFloat(b.latitude),
    longitude: b.longitude === undefined ? existing.longitude : toFloat(b.longitude),
    image: b.image ?? existing.image ?? null,
    description: b.description ?? existing.description ?? null,
    active: b.active === undefined ? (existing.active ?? 1) : toBool(b.active),
    featured: b.featured === undefined ? (existing.featured ?? 0) : toBool(b.featured),
    sort_order: b.sort_order === undefined ? (existing.sort_order ?? 0) : toInt(b.sort_order, 0),
  };
}

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const f = fields(b);
  const info = db.prepare(`
    INSERT INTO cities (name, region_id, country, state_province, address, postal_code, google_maps_link, latitude, longitude, image, description, active, featured, sort_order)
    VALUES (@name,@region_id,@country,@state_province,@address,@postal_code,@google_maps_link,@latitude,@longitude,@image,@description,@active,@featured,@sort_order)
  `).run(f);
  res.status(201).json(db.prepare('SELECT * FROM cities WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cities WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const f = fields(req.body || {}, existing);
  db.prepare(`
    UPDATE cities SET name=@name, region_id=@region_id, country=@country, state_province=@state_province,
      address=@address, postal_code=@postal_code, google_maps_link=@google_maps_link, latitude=@latitude,
      longitude=@longitude, image=@image, description=@description, active=@active, featured=@featured, sort_order=@sort_order
    WHERE id=@id
  `).run({ ...f, id: Number(req.params.id) });
  res.json(db.prepare('SELECT * FROM cities WHERE id = ?').get(req.params.id));
});

// Quick toggles for active / featured.
router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cities WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const active = b.active === undefined ? existing.active : toBool(b.active);
  const featured = b.featured === undefined ? existing.featured : toBool(b.featured);
  db.prepare('UPDATE cities SET active = ?, featured = ? WHERE id = ?').run(active, featured, req.params.id);
  res.json(db.prepare('SELECT * FROM cities WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM cities WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
