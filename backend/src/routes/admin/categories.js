'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toBool, toInt, uniqueSlug } = require('../../lib/helpers');
const audit = require('../../lib/audit');

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id) AS product_count,
      (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id) AS service_count
    FROM categories c ORDER BY c.sort_order, c.name
  `).all());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const slug = uniqueSlug(db, 'categories', b.slug || b.name);
  const info = db.prepare(
    'INSERT INTO categories (name, slug, type, description, image, icon, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(b.name, slug, b.type || 'both', b.description || null, b.image || null, b.icon || null, toBool(b.active ?? 1), toInt(b.sort_order, 0));
  audit.log('category_created', { id: info.lastInsertRowid, name: b.name }, req);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const slug = b.slug ? uniqueSlug(db, 'categories', b.slug, existing.id) : existing.slug;
  db.prepare(
    'UPDATE categories SET name=?, slug=?, type=?, description=?, image=?, icon=?, active=?, sort_order=? WHERE id=?'
  ).run(
    b.name ?? existing.name, slug, b.type ?? existing.type, b.description ?? existing.description,
    b.image ?? existing.image, b.icon ?? existing.icon,
    b.active === undefined ? existing.active : toBool(b.active),
    b.sort_order === undefined ? existing.sort_order : toInt(b.sort_order, 0), req.params.id
  );
  audit.log('category_updated', { id: Number(req.params.id) }, req);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

// Reorder: { order: [id, id, ...] }
router.post('/reorder', (req, res) => {
  const order = (req.body && req.body.order) || [];
  const upd = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  db.transaction((ids) => ids.forEach((id, i) => upd.run(i + 1, toInt(id))))(order);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  audit.log('category_deleted', { id: Number(req.params.id) }, req);
  res.json({ ok: true });
});

module.exports = router;
