'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toBool, toInt, parseJSON } = require('../../lib/helpers');
const audit = require('../../lib/audit');

const VALID_TYPES = ['hero', 'text', 'features', 'gallery', 'testimonials', 'faq', 'stats', 'cta', 'html'];

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM sections ORDER BY sort_order, id').all();
  for (const r of rows) r.config = parseJSON(r.config, {});
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.config = parseJSON(row.config, {});
  res.json(row);
});

function fields(b, existing = {}) {
  let type = b.type ?? existing.type ?? 'text';
  if (!VALID_TYPES.includes(type)) type = 'text';
  return {
    type,
    title: b.title ?? existing.title ?? null,
    subtitle: b.subtitle ?? existing.subtitle ?? null,
    content: b.content ?? existing.content ?? null,
    image: b.image ?? existing.image ?? null,
    config: b.config === undefined ? existing.config : JSON.stringify(parseJSON(b.config, b.config) || {}),
    active: b.active === undefined ? (existing.active ?? 1) : toBool(b.active),
    sort_order: b.sort_order === undefined ? (existing.sort_order ?? 0) : toInt(b.sort_order, 0),
  };
}

router.post('/', (req, res) => {
  const f = fields(req.body || {});
  if (!f.sort_order) f.sort_order = (db.prepare('SELECT COALESCE(MAX(sort_order),0) m FROM sections').get().m) + 1;
  const info = db.prepare(`
    INSERT INTO sections (type, title, subtitle, content, image, config, active, sort_order)
    VALUES (@type,@title,@subtitle,@content,@image,@config,@active,@sort_order)
  `).run(f);
  audit.log('section_created', { id: info.lastInsertRowid, type: f.type }, req);
  const row = db.prepare('SELECT * FROM sections WHERE id = ?').get(info.lastInsertRowid);
  row.config = parseJSON(row.config, {});
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const f = fields(req.body || {}, existing);
  f.id = Number(req.params.id);
  db.prepare(`
    UPDATE sections SET type=@type, title=@title, subtitle=@subtitle, content=@content,
      image=@image, config=@config, active=@active, sort_order=@sort_order WHERE id=@id
  `).run(f);
  audit.log('section_updated', { id: f.id }, req);
  const row = db.prepare('SELECT * FROM sections WHERE id = ?').get(f.id);
  row.config = parseJSON(row.config, {});
  res.json(row);
});

// Reorder: { order: [id, id, ...] }
router.post('/reorder', (req, res) => {
  const order = (req.body && req.body.order) || [];
  const upd = db.prepare('UPDATE sections SET sort_order = ? WHERE id = ?');
  db.transaction((ids) => ids.forEach((id, i) => upd.run(i + 1, toInt(id))))(order);
  audit.log('section_reordered', { order }, req);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM sections WHERE id = ?').run(req.params.id);
  audit.log('section_deleted', { id: Number(req.params.id) }, req);
  res.json({ ok: true });
});

module.exports = router;
