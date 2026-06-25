'use strict';

/**
 * Generate a URL-friendly slug from arbitrary text.
 */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

/**
 * Ensure a slug is unique within a table by appending -2, -3, ...
 * @param {object} db better-sqlite3 instance
 */
function uniqueSlug(db, table, base, ignoreId = null) {
  let slug = slugify(base);
  let candidate = slug;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = ignoreId
      ? db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(candidate, ignoreId)
      : db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(candidate);
    if (!row) return candidate;
    candidate = `${slug}-${n++}`;
  }
}

/** Parse a value into a clean integer or return fallback. */
function toInt(v, fallback = null) {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Parse a value into a float or return fallback. */
function toFloat(v, fallback = null) {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
}

/** Coerce checkbox / truthy form values into 0/1. */
function toBool(v) {
  return v === true || v === 1 || v === '1' || v === 'on' || v === 'true' ? 1 : 0;
}

/** Safely parse JSON, returning a fallback on error. */
function parseJSON(str, fallback) {
  if (str == null || str === '') return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

/** Escape HTML for safe interpolation in templates. */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format a price with currency symbol. */
function formatPrice(amount, currency = 'USD') {
  if (amount == null || amount === '') return '';
  const symbols = { USD: '$', EUR: '€', GBP: '£', MAD: 'DH', AED: 'AED', SAR: 'SAR', INR: '₹' };
  const sym = symbols[currency] || (currency ? currency + ' ' : '');
  const num = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${sym}${num}`;
}

module.exports = {
  slugify,
  uniqueSlug,
  toInt,
  toFloat,
  toBool,
  parseJSON,
  escapeHtml,
  formatPrice,
};
