'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

// General API limiter — generous, guards against abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Tight limiter for auth endpoints (brute-force protection).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

// ---------------------------------------------------------------------------
// In-memory per-username lockout (temporary lockout after repeated failures).
// Suitable for single-instance deployments (the cheap VPS / free-VM target).
// ---------------------------------------------------------------------------
const attempts = new Map(); // username -> { count, lockedUntil }

function isLocked(username) {
  const rec = attempts.get(username);
  if (!rec || !rec.lockedUntil) return false;
  if (Date.now() > rec.lockedUntil) {
    attempts.delete(username);
    return false;
  }
  return true;
}

function lockRemaining(username) {
  const rec = attempts.get(username);
  if (!rec || !rec.lockedUntil) return 0;
  return Math.max(0, Math.ceil((rec.lockedUntil - Date.now()) / 60000));
}

function recordFailure(username) {
  const rec = attempts.get(username) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= config.login.maxAttempts) {
    rec.lockedUntil = Date.now() + config.login.lockoutMinutes * 60000;
  }
  attempts.set(username, rec);
}

function clearFailures(username) {
  attempts.delete(username);
}

module.exports = {
  apiLimiter, authLimiter,
  isLocked, lockRemaining, recordFailure, clearFailures,
};
