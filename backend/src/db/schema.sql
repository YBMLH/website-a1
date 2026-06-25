-- ============================================================================
-- Configurable Business Platform — Database Schema
-- Industry-agnostic catalog & business management system.
-- All content (branding, locations, catalog, homepage) is data-driven so the
-- same codebase serves schools, agencies, real estate, stores, etc.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Admin users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Settings: key/value store powering branding, colors, logos, contact info,
-- social links and business information. Fully editable from the dashboard.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  type        TEXT NOT NULL DEFAULT 'string', -- string|text|number|boolean|color|image|json
  group_name  TEXT NOT NULL DEFAULT 'general', -- general|branding|colors|contact|social|business|seo
  label       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Regions (used to group cities)
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
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  region_id       INTEGER REFERENCES regions(id) ON DELETE SET NULL,
  country         TEXT,
  state_province  TEXT,
  address         TEXT,
  postal_code     TEXT,
  google_maps_link TEXT,
  latitude        REAL,
  longitude       REAL,
  image           TEXT,
  description     TEXT,
  active          INTEGER NOT NULL DEFAULT 1,
  featured        INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Categories (shared by products & services)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL DEFAULT 'both', -- product|service|both
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
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
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description       TEXT,
  price             REAL,
  sale_price        REAL,
  currency          TEXT DEFAULT 'USD',
  sku               TEXT,
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  city_id           INTEGER REFERENCES cities(id) ON DELETE SET NULL, -- primary city
  image             TEXT,
  gallery           TEXT, -- JSON array of image paths
  featured          INTEGER NOT NULL DEFAULT 0,
  active            INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Services
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description       TEXT,
  price             REAL,
  sale_price        REAL,
  currency          TEXT DEFAULT 'USD',
  price_unit        TEXT, -- e.g. "per hour", "per project"
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  city_id           INTEGER REFERENCES cities(id) ON DELETE SET NULL, -- primary city
  image             TEXT,
  gallery           TEXT, -- JSON array of image paths
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
-- Homepage custom sections (drag-free ordering via sort_order)
-- Section types: hero|text|features|gallery|testimonials|faq|stats|cta|html
-- Type-specific items (feature list, gallery images, faq pairs, etc.) live in
-- the JSON `config` column so new layouts need no schema change.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL DEFAULT 'text',
  title       TEXT,
  subtitle    TEXT,
  content     TEXT,
  image       TEXT,
  config      TEXT, -- JSON for type-specific data
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Helpful indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cities_region   ON cities(region_id);
CREATE INDEX IF NOT EXISTS idx_products_city   ON products(city_id);
CREATE INDEX IF NOT EXISTS idx_products_cat    ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_services_city   ON services(city_id);
CREATE INDEX IF NOT EXISTS idx_services_cat    ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_sections_order  ON sections(sort_order);
