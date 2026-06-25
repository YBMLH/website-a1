'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db/database');

// Overview statistics + recent activity for the dashboard home.
router.get('/', (req, res) => {
  const count = (sql) => db.prepare(sql).get().c;
  res.json({
    stats: {
      products: count('SELECT COUNT(*) c FROM products'),
      services: count('SELECT COUNT(*) c FROM services'),
      categories: count('SELECT COUNT(*) c FROM categories'),
      cities: count('SELECT COUNT(*) c FROM cities'),
      regions: count('SELECT COUNT(*) c FROM regions'),
      sections: count('SELECT COUNT(*) c FROM sections'),
      featured_products: count('SELECT COUNT(*) c FROM products WHERE featured = 1'),
      featured_services: count('SELECT COUNT(*) c FROM services WHERE featured = 1'),
      active_products: count('SELECT COUNT(*) c FROM products WHERE active = 1'),
      inquiries: count('SELECT COUNT(*) c FROM inquiries'),
      new_inquiries: count("SELECT COUNT(*) c FROM inquiries WHERE status = 'new'"),
    },
    recent_inquiries: db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 5').all(),
    recent_activity: db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10').all(),
  });
});

module.exports = router;
