'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toBool, toInt, uniqueSlug } = require('../../lib/helpers');

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, p.name AS parent_name,
      (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id) AS product_count,
      (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id) AS service_count
    FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
    ORDER BY c.sort_order, c.name
  `).all();
  res.json(rows);
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
  const info = db.prepare(`
    INSERT INTO categories (name, slug, type, parent_id, description, image, icon, active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.name, slug, b.type || 'both', toInt(b.parent_id), b.description || null,
    b.image || null, b.icon || null, toBool(b.active ?? 1), toInt(b.sort_order, 0)
  );
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const slug = b.slug ? uniqueSlug(db, 'categories', b.slug, existing.id) : existing.slug;
  // Prevent self-parenting.
  let parentId = b.parent_id === undefined ? existing.parent_id : toInt(b.parent_id);
  if (parentId === existing.id) parentId = null;
  db.prepare(`
    UPDATE categories SET name=?, slug=?, type=?, parent_id=?, description=?, image=?, icon=?, active=?, sort_order=?
    WHERE id=?
  `).run(
    b.name ?? existing.name, slug, b.type ?? existing.type, parentId,
    b.description ?? existing.description, b.image ?? existing.image, b.icon ?? existing.icon,
    b.active === undefined ? existing.active : toBool(b.active),
    b.sort_order === undefined ? existing.sort_order : toInt(b.sort_order, 0),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
