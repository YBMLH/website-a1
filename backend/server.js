'use strict';

const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const expressLayouts = require('express-ejs-layouts');

const db = require('./src/db/database');
const { getSettings } = require('./src/lib/settings');
const { formatPrice, escapeHtml } = require('./src/lib/helpers');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// ---------------------------------------------------------------------------
// View engine + layouts
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'public/layout'); // default layout for the public site

// ---------------------------------------------------------------------------
// Core middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true, sameSite: 'lax' },
}));

// Inject site settings + helpers into every view.
app.use((req, res, next) => {
  res.locals.site = getSettings();
  res.locals.formatPrice = formatPrice;
  res.locals.escapeHtml = escapeHtml;
  res.locals.currentUrl = req.originalUrl;
  res.locals.user = req.session && req.session.userId
    ? { id: req.session.userId, username: req.session.username }
    : null;
  res.locals.title = res.locals.site.site_name || 'Business Platform';
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/admin', require('./src/routes/admin'));
app.use('/api', require('./src/routes/api'));
app.use('/', require('./src/routes/public'));

// Health check.
app.get('/healthz', (req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// 404 + error handling
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404);
  if (req.path.startsWith('/api')) return res.json({ error: 'Not found' });
  res.render('public/404', { title: 'Page not found', active: '' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500);
  if (req.path.startsWith('/api')) return res.json({ error: err.message || 'Server error' });
  res.render('public/error', { layout: 'public/layout', title: 'Error', message: err.message || 'Something went wrong', active: '' });
});

app.listen(PORT, () => {
  console.log(`\n  ${getSettings().site_name || 'Business Platform'} running:`);
  console.log(`   • Public site:    http://localhost:${PORT}/`);
  console.log(`   • Admin dashboard: http://localhost:${PORT}/admin  (admin / admin123)\n`);
});

module.exports = app;
