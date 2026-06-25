'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toInt } = require('../../lib/helpers');
const audit = require('../../lib/audit');

router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM inquiries';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT 500';
  res.json(db.prepare(sql).all(...params));
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const status = ['new', 'read', 'archived'].includes(req.body.status) ? req.body.status : existing.status;
  db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM inquiries WHERE id = ?').run(req.params.id);
  audit.log('inquiry_deleted', { id: toInt(req.params.id) }, req);
  res.json({ ok: true });
});

module.exports = router;
