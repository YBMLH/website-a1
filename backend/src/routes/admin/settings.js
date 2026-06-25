'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { getSettingsByGroup, setSetting } = require('../../lib/settings');
const audit = require('../../lib/audit');

router.get('/', (req, res) => res.json(getSettingsByGroup()));

// Bulk update: body is { key: value, ... }
router.put('/', (req, res) => {
  const updates = req.body || {};
  db.transaction((obj) => {
    for (const [key, value] of Object.entries(obj)) setSetting(key, value);
  })(updates);
  audit.log('settings_updated', { keys: Object.keys(updates) }, req);
  res.json({ ok: true, updated: Object.keys(updates).length });
});

// Create a brand new custom setting.
router.post('/', (req, res) => {
  const { key, value, type, group_name, label } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key is required' });
  if (db.prepare('SELECT key FROM settings WHERE key = ?').get(key)) {
    return res.status(409).json({ error: 'Setting already exists' });
  }
  setSetting(key, value, { type, group_name, label });
  audit.log('setting_created', { key }, req);
  res.status(201).json({ ok: true });
});

router.delete('/:key', (req, res) => {
  db.prepare('DELETE FROM settings WHERE key = ?').run(req.params.key);
  audit.log('setting_deleted', { key: req.params.key }, req);
  res.json({ ok: true });
});

module.exports = router;
