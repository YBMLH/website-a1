'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { getSettingsByGroup, setSetting } = require('../../lib/settings');

// List all settings grouped.
router.get('/', (req, res) => {
  res.json(getSettingsByGroup());
});

// Bulk update: body is { key: value, ... }
router.put('/', (req, res) => {
  const updates = req.body || {};
  const tx = db.transaction((obj) => {
    for (const [key, value] of Object.entries(obj)) {
      setSetting(key, value);
    }
  });
  tx(updates);
  res.json({ ok: true, updated: Object.keys(updates).length });
});

// Create a brand new custom setting.
router.post('/', (req, res) => {
  const { key, value, type, group_name, label } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key is required' });
  const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
  if (exists) return res.status(409).json({ error: 'Setting already exists' });
  setSetting(key, value, { type, group_name, label });
  res.status(201).json({ ok: true });
});

// Delete a setting.
router.delete('/:key', (req, res) => {
  db.prepare('DELETE FROM settings WHERE key = ?').run(req.params.key);
  res.json({ ok: true });
});

module.exports = router;
