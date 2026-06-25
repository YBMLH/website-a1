'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toBool, toInt } = require('../../lib/helpers');
const audit = require('../../lib/audit');

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT r.*, (SELECT COUNT(*) FROM cities c WHERE c.region_id = r.id) AS city_count
    FROM regions r ORDER BY r.sort_order, r.name
  `).all());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM regions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const info = db.prepare('INSERT INTO regions (name, country, description, active, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(b.name, b.country || null, b.description || null, toBool(b.active ?? 1), toInt(b.sort_order, 0));
  audit.log('region_created', { id: info.lastInsertRowid, name: b.name }, req);
  res.status(201).json(db.prepare('SELECT * FROM regions WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM regions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  db.prepare('UPDATE regions SET name=?, country=?, description=?, active=?, sort_order=? WHERE id=?').run(
    b.name ?? existing.name, b.country ?? existing.country, b.description ?? existing.description,
    b.active === undefined ? existing.active : toBool(b.active),
    b.sort_order === undefined ? existing.sort_order : toInt(b.sort_order, 0), req.params.id
  );
  audit.log('region_updated', { id: Number(req.params.id) }, req);
  res.json(db.prepare('SELECT * FROM regions WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM regions WHERE id = ?').run(req.params.id);
  audit.log('region_deleted', { id: Number(req.params.id) }, req);
  res.json({ ok: true });
});

module.exports = router;
