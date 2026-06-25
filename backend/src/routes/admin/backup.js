'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const backup = require('../../lib/backup');
const audit = require('../../lib/audit');
const { asyncHandler } = require('../../middleware/error');

// Temp storage for uploaded .db files to import.
const tmpUpload = multer({
  dest: path.join(backup.BACKUP_DIR, 'tmp'),
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.get('/', (req, res) => res.json(backup.listBackups()));

// Create a manual backup snapshot.
router.post('/', asyncHandler(async (req, res) => {
  const info = await backup.createBackup();
  audit.log('backup_created', { filename: info.filename }, req);
  res.status(201).json(info);
}));

// Download a backup / export the database.
router.get('/download/:filename', (req, res) => {
  const full = backup.backupPath(req.params.filename);
  res.download(full);
});

// Export current DB on the fly (fresh snapshot, streamed for download).
router.get('/export', asyncHandler(async (req, res) => {
  const info = await backup.createBackup();
  audit.log('backup_exported', { filename: info.filename }, req);
  res.download(backup.backupPath(info.filename), info.filename);
}));

// Restore from an existing backup file on the server.
router.post('/restore/:filename', asyncHandler(async (req, res) => {
  backup.restoreFromBackup(req.params.filename);
  audit.log('backup_restored', { filename: req.params.filename }, req);
  res.json({ ok: true });
}));

// Import a database file uploaded by the admin.
router.post('/import', (req, res, next) => {
  tmpUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      backup.importFromFile(req.file.path);
      audit.log('backup_imported', { original: req.file.originalname }, req);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    } finally {
      fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    }
  });
});

router.delete('/:filename', (req, res) => {
  backup.deleteBackup(req.params.filename);
  audit.log('backup_deleted', { filename: req.params.filename }, req);
  res.json({ ok: true });
});

module.exports = router;
