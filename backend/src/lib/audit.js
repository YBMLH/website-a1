'use strict';

const db = require('../db/database');

/**
 * Record an audit log entry. `req` is optional (used to capture user + IP).
 */
function log(action, details, req) {
  try {
    const user = req && req.user ? req.user.username : 'system';
    const ip = req ? (req.headers['x-forwarded-for'] || req.ip || '') : '';
    const detailStr = typeof details === 'string' ? details : JSON.stringify(details || {});
    db.prepare('INSERT INTO audit_logs (user, action, details, ip) VALUES (?, ?, ?, ?)')
      .run(user, action, detailStr, String(ip).split(',')[0].trim());
  } catch (e) {
    // Never let audit logging break the request.
    console.error('audit log failed:', e.message);
  }
}

module.exports = { log };
