'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');

/** Sign a short-lived access token. */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
}

/** Verify an access token, throwing on failure. */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Issue a refresh token (opaque random string) and persist it for revocation.
 * Returns the raw token to set as an httpOnly cookie.
 */
function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const expires = new Date(Date.now() + config.jwt.refreshTtlDays * 86400000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
    .run(userId, token, expires);
  return token;
}

/** Look up a refresh token; returns the row if valid & unexpired, else null. */
function getValidRefreshToken(token) {
  if (!token) return null;
  const row = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
    return null;
  }
  return row;
}

/** Revoke a single refresh token (logout). */
function revokeRefreshToken(token) {
  if (token) db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
}

/** Revoke all refresh tokens for a user (logout everywhere / password change). */
function revokeAllForUser(userId) {
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

/** Housekeeping: drop expired refresh tokens. */
function purgeExpired() {
  db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();
}

module.exports = {
  signAccessToken, verifyAccessToken, issueRefreshToken,
  getValidRefreshToken, revokeRefreshToken, revokeAllForUser, purgeExpired,
};
