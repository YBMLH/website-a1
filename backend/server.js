'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./src/config');
require('./src/db/database'); // initialise DB / run schema
require('./src/db/seed').seedIfEmpty(); // self-seed on empty/ephemeral disks
const tokens = require('./src/lib/tokens');
const { apiLimiter } = require('./src/middleware/rateLimit');
const { notFound, errorHandler } = require('./src/middleware/error');

const app = express();
app.set('trust proxy', 1); // correct client IPs behind a reverse proxy (nginx)

// ---------------------------------------------------------------------------
// Security headers. We allow cross-origin resource loading so the SPA dev
// server (different port) can display uploaded images.
// ---------------------------------------------------------------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // CSP applied to the SPA build separately
}));

app.use(cors({
  origin: config.corsOrigins.length ? config.corsOrigins : true,
  credentials: true,
}));

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded media.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api', apiLimiter);
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/public', require('./src/routes/public'));
app.use('/api/admin', require('./src/routes/admin'));
app.get('/api/health', (req, res) => res.json({ ok: true, env: config.env }));

// ---------------------------------------------------------------------------
// In production, serve the built React frontend (single self-contained app).
// ---------------------------------------------------------------------------
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback for any non-API, non-upload route.
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.json({
    name: 'Business Platform API',
    note: 'Frontend build not found. Run the Vite dev server in ../frontend, or build it for production.',
  }));
}

// 404 + error handling (API).
app.use('/api', notFound);
app.use(errorHandler);

// Periodic cleanup of expired refresh tokens.
tokens.purgeExpired();
setInterval(() => tokens.purgeExpired(), 6 * 60 * 60 * 1000).unref();

app.listen(config.port, () => {
  console.log(`\n  Business Platform API — ${config.env}`);
  console.log(`   • API:    http://localhost:${config.port}/api`);
  console.log(`   • Health: http://localhost:${config.port}/api/health`);
  if (!fs.existsSync(FRONTEND_DIST)) {
    console.log('   • Frontend: run `npm run dev` in ../frontend (http://localhost:5173)\n');
  } else {
    console.log(`   • App:    http://localhost:${config.port}/\n`);
  }
});

module.exports = app;
