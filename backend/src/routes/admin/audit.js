'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { toInt } = require('../../lib/helpers');

router.get('/', (req, res) => {
  const limit = Math.min(toInt(req.query.limit, 200), 1000);
  const action = req.query.action;
  let sql = 'SELECT * FROM audit_logs';
  const params = [];
  if (action) { sql += ' WHERE action = ?'; params.push(action); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  res.json(db.prepare(sql).all(...params));
});

// Distinct action types (for filtering UI).
router.get('/actions', (req, res) => {
  res.json(db.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action').all().map((r) => r.action));
});

module.exports = router;
