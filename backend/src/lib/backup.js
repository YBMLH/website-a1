'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = require('../db/database');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Tables copied during import/restore (order respects FK dependencies).
const TABLES = [
  'users', 'refresh_tokens', 'settings', 'regions', 'cities', 'categories',
  'products', 'product_images', 'services', 'product_cities', 'service_cities',
  'sections', 'inquiries', 'audit_logs',
];

/** Create a consistent .db snapshot in the backups dir. Returns its info. */
async function createBackup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${stamp}.db`;
  const dest = path.join(BACKUP_DIR, filename);
  await db.backup(dest);
  const stat = fs.statSync(dest);
  return { filename, size: stat.size, created_at: new Date().toISOString() };
}

/** List existing backups, newest first. */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, size: stat.size, created_at: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function backupPath(filename) {
  // Prevent path traversal — basename only, must live in BACKUP_DIR.
  const safe = path.basename(filename);
  const full = path.join(BACKUP_DIR, safe);
  if (!fs.existsSync(full)) throw Object.assign(new Error('Backup not found'), { status: 404 });
  return full;
}

function deleteBackup(filename) {
  fs.unlinkSync(backupPath(filename));
}

/**
 * Restore/import: copy all known tables from an external SQLite file into the
 * live database inside a single transaction. Validates the source first.
 */
function importFromFile(sourcePath) {
  // Validate the source is a readable SQLite db with our schema.
  let src;
  try {
    src = new Database(sourcePath, { readonly: true, fileMustExist: true });
    src.prepare('SELECT key FROM settings LIMIT 1').get();
  } catch (e) {
    if (src) src.close();
    throw Object.assign(new Error('Invalid or incompatible backup file'), { status: 400 });
  }
  src.close();

  db.pragma('foreign_keys = OFF');
  const restore = db.transaction(() => {
    db.exec(`ATTACH DATABASE '${sourcePath.replace(/'/g, "''")}' AS src`);
    try {
      for (const t of TABLES) {
        // Only copy tables present in the source.
        const exists = db.prepare("SELECT 1 FROM src.sqlite_master WHERE type='table' AND name=?").get(t);
        if (!exists) continue;
        db.exec(`DELETE FROM main.${t};`);
        db.exec(`INSERT INTO main.${t} SELECT * FROM src.${t};`);
      }
    } finally {
      db.exec('DETACH DATABASE src');
    }
  });
  restore();
  db.pragma('foreign_keys = ON');
}

function restoreFromBackup(filename) {
  importFromFile(backupPath(filename));
}

module.exports = {
  createBackup, listBackups, backupPath, deleteBackup,
  importFromFile, restoreFromBackup, BACKUP_DIR,
};
