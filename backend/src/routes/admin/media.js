'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { upload, UPLOAD_DIR } = require('../../middleware/upload');
const audit = require('../../lib/audit');

// Upload one or more images. Returns public paths under /uploads/.
router.post('/', (req, res) => {
  upload.array('files', 20)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const files = (req.files || []).map((f) => ({ filename: f.filename, path: '/uploads/' + f.filename, size: f.size }));
    audit.log('media_uploaded', { count: files.length }, req);
    res.status(201).json({ files });
  });
});

// List media library, newest first.
router.get('/', (req, res) => {
  const items = fs.readdirSync(UPLOAD_DIR)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, f));
      return { filename: f, path: '/uploads/' + f, size: stat.size, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  res.json(items);
});

router.delete('/:filename', (req, res) => {
  const name = path.basename(req.params.filename); // no traversal
  const full = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(full)) fs.unlinkSync(full);
  audit.log('media_deleted', { filename: name }, req);
  res.json({ ok: true });
});

module.exports = router;
