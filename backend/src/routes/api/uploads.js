'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { upload, UPLOAD_DIR } = require('../../middleware/upload');

// Upload one or more images. Returns the public path(s) under /uploads/.
router.post('/', (req, res) => {
  upload.array('files', 12)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const files = (req.files || []).map((f) => ({
      filename: f.filename,
      path: '/uploads/' + f.filename,
      size: f.size,
    }));
    res.status(201).json({ files });
  });
});

// List uploaded media.
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

// Delete an uploaded file (basename only, no traversal).
router.delete('/:filename', (req, res) => {
  const name = path.basename(req.params.filename);
  const full = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(full)) fs.unlinkSync(full);
  res.json({ ok: true });
});

module.exports = router;
