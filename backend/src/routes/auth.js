'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const config = require('../config');
const tokens = require('../lib/tokens');
const audit = require('../lib/audit');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, isLocked, lockRemaining, recordFailure, clearFailures } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/error');

const REFRESH_COOKIE = 'refresh_token';
function refreshCookieOpts() {
  return {
    httpOnly: true,
    secure: config.isProd(),
    sameSite: 'lax',
    maxAge: config.jwt.refreshTtlDays * 86400000,
    path: '/api/auth',
  };
}

function publicUser(u) {
  return { id: u.id, username: u.username, email: u.email, role: u.role, has_pin: !!u.pin_code };
}

// --------------------------------------------------------------------------
// POST /api/auth/login  — username/password (+ optional PIN if one is set)
// --------------------------------------------------------------------------
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { username, password, pin } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  if (isLocked(username)) {
    return res.status(429).json({ error: `Account temporarily locked. Try again in ${lockRemaining(username)} minute(s).` });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  const ok = user && bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    recordFailure(username);
    audit.log('login_failed', { username }, req);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Optional admin PIN as a second factor (if configured for this user).
  if (user.pin_code) {
    if (!pin || !bcrypt.compareSync(String(pin), user.pin_code)) {
      recordFailure(username);
      audit.log('login_failed_pin', { username }, req);
      return res.status(401).json({ error: 'Invalid PIN', pin_required: true });
    }
  }

  clearFailures(username);
  const accessToken = tokens.signAccessToken(user);
  const refreshToken = tokens.issueRefreshToken(user.id);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOpts());
  audit.log('login', { username }, { ...req, user: publicUser(user) });
  res.json({ accessToken, user: publicUser(user) });
}));

// --------------------------------------------------------------------------
// POST /api/auth/refresh — rotate refresh token, issue new access token
// --------------------------------------------------------------------------
router.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  const row = tokens.getValidRefreshToken(token);
  if (!row) return res.status(401).json({ error: 'Invalid refresh session' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  if (!user) return res.status(401).json({ error: 'Invalid refresh session' });

  // Rotate: revoke old, issue new.
  tokens.revokeRefreshToken(token);
  const refreshToken = tokens.issueRefreshToken(user.id);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOpts());
  res.json({ accessToken: tokens.signAccessToken(user), user: publicUser(user) });
}));

// --------------------------------------------------------------------------
// POST /api/auth/logout — revoke refresh token + clear cookie
// --------------------------------------------------------------------------
router.post('/logout', asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  tokens.revokeRefreshToken(token);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ ok: true });
}));

// --------------------------------------------------------------------------
// GET /api/auth/me — current user
// --------------------------------------------------------------------------
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ user: publicUser(user) });
});

// --------------------------------------------------------------------------
// POST /api/auth/change-password
// --------------------------------------------------------------------------
router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { current, next } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(current || '', user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (!next || String(next).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(next), 10), user.id);
  tokens.revokeAllForUser(user.id); // force re-login everywhere
  audit.log('change_password', { username: user.username }, req);
  res.json({ ok: true });
}));

// --------------------------------------------------------------------------
// POST /api/auth/change-pin — set, change, or clear the optional admin PIN
// --------------------------------------------------------------------------
router.post('/change-pin', requireAuth, asyncHandler(async (req, res) => {
  const { current, next } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.pin_code) {
    if (!current || !bcrypt.compareSync(String(current), user.pin_code)) {
      return res.status(400).json({ error: 'Current PIN is incorrect' });
    }
  }
  if (next === '' || next == null) {
    db.prepare('UPDATE users SET pin_code = NULL WHERE id = ?').run(user.id);
    audit.log('clear_pin', { username: user.username }, req);
    return res.json({ ok: true, has_pin: false });
  }
  if (!/^\d{4,8}$/.test(String(next))) return res.status(400).json({ error: 'PIN must be 4–8 digits' });
  db.prepare('UPDATE users SET pin_code = ? WHERE id = ?').run(bcrypt.hashSync(String(next), 10), user.id);
  audit.log('change_pin', { username: user.username }, req);
  res.json({ ok: true, has_pin: true });
}));

module.exports = router;
