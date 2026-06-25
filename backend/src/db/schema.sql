-- ============================================================================
-- Reusable Business Platform — Database Schema (SQLite)
-- Industry-agnostic catalog & lead-generation system. All content (branding,
-- locations, catalog, homepage, settings) is data-driven so the same codebase
-- serves schools, agencies, real estate, stores, etc. without code changes.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Admin users (JWT auth, bcrypt password + optional PIN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT,
  password_hash TEXT NOT NULL,
  pin_code      TEXT,                       -- bcrypt hash of optional admin PIN
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Refresh tokens (rotation + revocation for "secure logout")
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Settings: key/value store powering branding, colors, logos, contact info,
-- social links, SEO and business information. Editable from the dashboard.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  type        TEXT NOT NULL DEFAULT 'string', -- string|text|number|boolean|color|image|json
  group_name  TEXT NOT NULL DEFAULT 'general', -- general|branding|colors|contact|social|business|seo
  label       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Regions (group cities)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  country     TEXT,
  description TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Cities / locations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cities (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  region_id        INTEGER REFERENCES regions(id) ON DELETE SET NULL,
  region           TEXT,                    -- denormalized region label (per spec)
  country          TEXT,
  state_province   TEXT,
  address          TEXT,
  postal_code      TEXT,
  google_maps_link TEXT,
  latitude         REAL,
  longitude        REAL,
  image            TEXT,
  description      TEXT,
  active           INTEGER NOT NULL DEFAULT 1,
  featured         INTEGER NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Categories (shared by products & services)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL DEFAULT 'both', -- product|service|both
  description TEXT,
  image       TEXT,
  icon        TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description       TEXT,
  specifications    TEXT,                   -- JSON array of {label,value}
  price             REAL,
  sale_price        REAL,
  currency          TEXT DEFAULT 'USD',
  sku               TEXT,
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  city_id           INTEGER REFERENCES cities(id) ON DELETE SET NULL, -- primary city
  image             TEXT,                   -- featured image path
  featured          INTEGER NOT NULL DEFAULT 0,
  active            INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Multiple images per product with drag-and-drop ordering
CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- Services
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description       TEXT,
  specifications    TEXT,
  price             REAL,
  sale_price        REAL,
  currency          TEXT DEFAULT 'USD',
  price_unit        TEXT,                   -- e.g. "per hour", "per project"
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  city_id           INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  image             TEXT,
  gallery           TEXT,                   -- JSON array of image paths
  featured          INTEGER NOT NULL DEFAULT 0,
  active            INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Many-to-many: assign products / services to multiple cities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_cities (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  city_id    INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, city_id)
);
CREATE TABLE IF NOT EXISTS service_cities (
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  city_id    INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, city_id)
);

-- ----------------------------------------------------------------------------
-- Homepage custom sections.
-- Types: hero|text|features|gallery|testimonials|faq|stats|cta|html
-- Type-specific items live in JSON `config` so new layouts need no schema change.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL DEFAULT 'text',
  title       TEXT,
  subtitle    TEXT,
  content     TEXT,
  image       TEXT,
  config      TEXT,                         -- JSON
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Inquiries / leads (captured from contact form & WhatsApp inquiry flow)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT,
  phone         TEXT,
  email         TEXT,
  item_type     TEXT,                       -- product|service|contact
  item_id       INTEGER,
  item_name     TEXT,
  price         TEXT,
  city          TEXT,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'new', -- new|read|archived
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user       TEXT,
  action     TEXT NOT NULL,
  details    TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cities_region    ON cities(region_id);
CREATE INDEX IF NOT EXISTS idx_products_city    ON products(city_id);
CREATE INDEX IF NOT EXISTS idx_products_cat     ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_images   ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_services_city    ON services(city_id);
CREATE INDEX IF NOT EXISTS idx_services_cat     ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_sections_order   ON sections(sort_order);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_refresh_user     ON refresh_tokens(user_id);
