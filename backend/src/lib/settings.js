'use strict';

const db = require('../db/database');
const { parseJSON } = require('./helpers');

/**
 * Load all settings as a flat { key: value } object, with typed coercion.
 * This object is injected into every view as `site`.
 */
function getSettings() {
  const rows = db.prepare('SELECT key, value, type FROM settings').all();
  const out = {};
  for (const r of rows) {
    if (r.type === 'boolean') out[r.key] = r.value === '1' || r.value === 'true';
    else if (r.type === 'number') out[r.key] = r.value === null || r.value === '' ? null : Number(r.value);
    else if (r.type === 'json') out[r.key] = parseJSON(r.value, null);
    else out[r.key] = r.value;
  }
  return out;
}

/**
 * Load settings grouped by group_name with full metadata, for the admin editor.
 */
function getSettingsByGroup() {
  const rows = db
    .prepare('SELECT * FROM settings ORDER BY group_name, sort_order, key')
    .all();
  const groups = {};
  for (const r of rows) {
    if (!groups[r.group_name]) groups[r.group_name] = [];
    groups[r.group_name].push(r);
  }
  return groups;
}

/** Upsert a single setting value (preserving type/group metadata if it exists). */
function setSetting(key, value, meta = {}) {
  const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
  const v = value == null ? '' : String(value);
  if (existing) {
    db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?").run(v, key);
  } else {
    db.prepare(
      `INSERT INTO settings (key, value, type, group_name, label, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(key, v, meta.type || 'string', meta.group_name || 'general', meta.label || key, meta.sort_order || 0);
  }
}

module.exports = { getSettings, getSettingsByGroup, setSetting };
