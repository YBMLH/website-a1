'use strict';

/**
 * Seed the database with:
 *  - default admin user (bcrypt password)
 *  - default settings (branding/colors/contact/social/business/seo + toggles)
 *  - generic, industry-agnostic demo content (regions, cities, categories,
 *    products, services, homepage sections)
 *
 * Run with `--reset` to wipe all data first.
 */

const bcrypt = require('bcryptjs');
const db = require('./database');
const config = require('../config');
const { slugify } = require('../lib/helpers');

const RESET = process.argv.includes('--reset');

function reset() {
  const tables = [
    'product_cities', 'service_cities', 'product_images', 'products', 'services',
    'categories', 'cities', 'regions', 'sections', 'settings',
    'inquiries', 'audit_logs', 'refresh_tokens', 'users',
  ];
  db.pragma('foreign_keys = OFF');
  for (const t of tables) db.exec(`DELETE FROM ${t};`);
  db.exec('DELETE FROM sqlite_sequence;');
  db.pragma('foreign_keys = ON');
  console.log('Database reset.');
}

const DEFAULT_SETTINGS = [
  // Branding
  ['site_name', 'Acme Platform', 'string', 'branding', 'Site Name', 1],
  ['tagline', 'Your business, beautifully presented', 'string', 'branding', 'Tagline', 2],
  ['logo', '', 'image', 'branding', 'Logo', 3],
  ['favicon', '', 'image', 'branding', 'Favicon', 4],
  ['footer_text', '© Acme Platform. All rights reserved.', 'text', 'branding', 'Footer Text', 5],

  // Colors
  ['color_primary', '#2563eb', 'color', 'colors', 'Primary Color', 1],
  ['color_secondary', '#1e293b', 'color', 'colors', 'Secondary Color', 2],
  ['color_accent', '#f59e0b', 'color', 'colors', 'Accent Color', 3],

  // Contact
  ['contact_email', 'hello@example.com', 'string', 'contact', 'Email', 1],
  ['contact_phone', '+15550000000', 'string', 'contact', 'Phone', 2],
  ['contact_whatsapp', '15550000000', 'string', 'contact', 'WhatsApp Number (digits only)', 3],
  ['contact_address', '123 Main Street', 'text', 'contact', 'Address', 4],
  ['contact_city', 'New York', 'string', 'contact', 'City', 5],
  ['contact_country', 'United States', 'string', 'contact', 'Country', 6],
  ['contact_map', 'https://maps.google.com/?q=New+York', 'string', 'contact', 'Google Maps Link', 7],

  // Social
  ['social_facebook', '', 'string', 'social', 'Facebook URL', 1],
  ['social_instagram', '', 'string', 'social', 'Instagram URL', 2],
  ['social_twitter', '', 'string', 'social', 'Twitter / X URL', 3],
  ['social_linkedin', '', 'string', 'social', 'LinkedIn URL', 4],
  ['social_youtube', '', 'string', 'social', 'YouTube URL', 5],
  ['social_tiktok', '', 'string', 'social', 'TikTok URL', 6],

  // Business
  ['business_name', 'Acme Inc.', 'string', 'business', 'Legal Business Name', 1],
  ['business_about', 'We help businesses present their products and services beautifully across multiple locations — all managed from one dashboard.', 'text', 'business', 'About', 2],
  ['business_mission', 'To make professional online catalogs accessible to every business.', 'text', 'business', 'Mission', 3],
  ['business_vision', 'A world where any business can launch online in minutes.', 'text', 'business', 'Vision', 4],
  ['business_hours', 'Mon–Fri 9:00–18:00', 'string', 'business', 'Working Hours', 5],
  ['currency', 'USD', 'string', 'business', 'Default Currency', 6],

  // Feature toggles
  ['enable_products', '1', 'boolean', 'general', 'Enable Products', 1],
  ['enable_services', '1', 'boolean', 'general', 'Enable Services', 2],
  ['enable_cities', '1', 'boolean', 'general', 'Enable Cities / Locations', 3],
  ['enable_maps', '1', 'boolean', 'general', 'Enable Google Maps', 4],
  ['enable_whatsapp', '1', 'boolean', 'general', 'Enable WhatsApp Inquiries', 5],

  // SEO
  ['seo_title', 'Acme Platform', 'string', 'seo', 'Meta Title', 1],
  ['seo_description', 'A configurable business catalog & lead-generation platform.', 'text', 'seo', 'Meta Description', 2],
  ['seo_keywords', 'business, catalog, products, services', 'string', 'seo', 'Meta Keywords', 3],
];

function seedSettings() {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value, type, group_name, label, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
  tx(DEFAULT_SETTINGS);
  console.log(`Seeded ${DEFAULT_SETTINGS.length} settings.`);
}

function seedUser() {
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(config.admin.username)) return;
  const hash = bcrypt.hashSync(config.admin.password, 10);
  db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(config.admin.username, 'admin@example.com', hash, 'admin');
  console.log(`Created admin user (username: ${config.admin.username} / password: ${config.admin.password}).`);
}

function seedDemo() {
  if (db.prepare('SELECT COUNT(*) c FROM sections').get().c > 0) {
    console.log('Demo content already present, skipping.');
    return;
  }

  const region = db.prepare('INSERT INTO regions (name, country, active, sort_order) VALUES (?, ?, 1, ?)');
  const r1 = region.run('North', 'United States', 1).lastInsertRowid;
  const r2 = region.run('West', 'United States', 2).lastInsertRowid;

  const city = db.prepare(`
    INSERT INTO cities (name, region_id, region, country, state_province, address, postal_code, google_maps_link, latitude, longitude, active, featured, sort_order)
    VALUES (@name,@region_id,@region,@country,@sp,@address,@postal,@maps,@lat,@lng,1,@featured,@sort)`);
  const cNy = city.run({ name: 'New York', region_id: r1, region: 'North', country: 'United States', sp: 'NY', address: '5th Avenue', postal: '10001', maps: 'https://maps.google.com/?q=New+York', lat: 40.7128, lng: -74.006, featured: 1, sort: 1 }).lastInsertRowid;
  const cLa = city.run({ name: 'Los Angeles', region_id: r2, region: 'West', country: 'United States', sp: 'CA', address: 'Sunset Blvd', postal: '90001', maps: 'https://maps.google.com/?q=Los+Angeles', lat: 34.0522, lng: -118.2437, featured: 1, sort: 2 }).lastInsertRowid;
  const cCh = city.run({ name: 'Chicago', region_id: r1, region: 'North', country: 'United States', sp: 'IL', address: 'Michigan Ave', postal: '60601', maps: 'https://maps.google.com/?q=Chicago', lat: 41.8781, lng: -87.6298, featured: 0, sort: 3 }).lastInsertRowid;

  const cat = db.prepare('INSERT INTO categories (name, slug, type, description, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)');
  const catA = cat.run('Featured', slugify('Featured'), 'both', 'Highlighted items', 1).lastInsertRowid;
  const catB = cat.run('Standard', slugify('Standard'), 'product', 'Everyday products', 2).lastInsertRowid;
  const catC = cat.run('Consulting', slugify('Consulting'), 'service', 'Professional services', 3).lastInsertRowid;

  const prod = db.prepare(`
    INSERT INTO products (title, slug, short_description, description, specifications, price, currency, category_id, city_id, featured, active, sort_order)
    VALUES (@title,@slug,@short,@desc,@spec,@price,'USD',@cat,@city,@featured,1,@sort)`);
  const pcity = db.prepare('INSERT OR IGNORE INTO product_cities (product_id, city_id) VALUES (?, ?)');
  const demoProducts = [
    { title: 'Sample Product One', short: 'A great configurable product.', spec: [{ label: 'Material', value: 'Premium' }, { label: 'Warranty', value: '2 years' }], price: 49, cat: catA, city: cNy, featured: 1, cities: [cNy, cLa] },
    { title: 'Sample Product Two', short: 'Available in multiple cities.', spec: [{ label: 'Weight', value: '1.2kg' }], price: 99, cat: catB, city: cLa, featured: 1, cities: [cLa, cCh] },
    { title: 'Sample Product Three', short: 'Demonstration catalog item.', spec: [], price: 149, cat: catB, city: cCh, featured: 0, cities: [cCh] },
  ];
  demoProducts.forEach((p, i) => {
    const id = prod.run({ title: p.title, slug: slugify(p.title), short: p.short, desc: p.short, spec: JSON.stringify(p.spec), price: p.price, cat: p.cat, city: p.city, featured: p.featured, sort: i + 1 }).lastInsertRowid;
    p.cities.forEach((cid) => pcity.run(id, cid));
  });

  const svc = db.prepare(`
    INSERT INTO services (title, slug, short_description, description, price, price_unit, currency, category_id, city_id, featured, active, sort_order)
    VALUES (@title,@slug,@short,@desc,@price,@unit,'USD',@cat,@city,@featured,1,@sort)`);
  const scity = db.prepare('INSERT OR IGNORE INTO service_cities (service_id, city_id) VALUES (?, ?)');
  const demoServices = [
    { title: 'Consultation Service', short: 'Expert advice for your business.', price: 120, unit: 'per hour', cat: catC, city: cNy, featured: 1, cities: [cNy, cLa, cCh] },
    { title: 'Premium Support', short: 'Dedicated ongoing support.', price: 499, unit: 'per month', cat: catC, city: cLa, featured: 1, cities: [cLa] },
  ];
  demoServices.forEach((s, i) => {
    const id = svc.run({ title: s.title, slug: slugify(s.title), short: s.short, desc: s.short, price: s.price, unit: s.unit, cat: s.cat, city: s.city, featured: s.featured, sort: i + 1 }).lastInsertRowid;
    s.cities.forEach((cid) => scity.run(id, cid));
  });

  const section = db.prepare(
    'INSERT INTO sections (type, title, subtitle, content, image, config, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
  );
  section.run('hero', 'Welcome to Acme Platform', 'A fully configurable business & catalog platform',
    'Showcase your products and services across multiple cities — all managed from one dashboard.',
    '', JSON.stringify({ button_text: 'Explore Products', button_link: '/products', button2_text: 'Contact Us', button2_link: '/contact' }), 1);
  section.run('stats', 'By the numbers', '', '', '', JSON.stringify({
    items: [{ value: '3', label: 'Cities' }, { value: '3', label: 'Products' }, { value: '2', label: 'Services' }, { value: '100%', label: 'Configurable' }],
  }), 2);
  section.run('features', 'Why choose us', 'Everything you need, configurable from the dashboard', '', '', JSON.stringify({
    items: [
      { icon: '🛍️', title: 'Products & Services', text: 'Full catalog management with categories and pricing.' },
      { icon: '📍', title: 'Multi-City', text: 'Operate across many cities and regions with location filtering.' },
      { icon: '🎨', title: 'Custom Branding', text: 'Logos, colors and content — no code required.' },
      { icon: '🧩', title: 'Custom Sections', text: 'Build your homepage from reusable section blocks.' },
    ],
  }), 3);
  section.run('testimonials', 'What people say', '', '', '', JSON.stringify({
    items: [
      { name: 'Jane D.', role: 'Business Owner', text: 'Setting up my catalog took minutes, not weeks.' },
      { name: 'Mark T.', role: 'Agency Lead', text: 'We reused the same platform for three different clients.' },
    ],
  }), 4);
  section.run('faq', 'Frequently asked questions', '', '', '', JSON.stringify({
    items: [
      { q: 'Can I use this for any industry?', a: 'Yes — schools, agencies, real estate, stores and more, all from the dashboard.' },
      { q: 'Do I need to write code?', a: 'No. Branding, content, catalog and sections are all editable in the admin.' },
    ],
  }), 5);
  section.run('cta', 'Ready to get started?', 'Configure everything from your dashboard today.', '', '',
    JSON.stringify({ button_text: 'Get in touch', button_link: '/contact' }), 6);

  console.log('Seeded demo content (regions, cities, categories, products, services, sections).');
}

function main() {
  if (RESET) reset();
  seedSettings();
  seedUser();
  seedDemo();
  console.log('Seed complete.');
}

/**
 * Seed only if the database is empty (no users). Called on server startup so
 * the app self-heals on hosts with ephemeral disks (free demo deployments).
 */
function seedIfEmpty() {
  const empty = db.prepare('SELECT COUNT(*) c FROM users').get().c === 0;
  if (empty) {
    console.log('Empty database detected — seeding defaults…');
    seedSettings();
    seedUser();
    seedDemo();
  }
  return empty;
}

module.exports = { seedSettings, seedUser, seedDemo, reset, seedIfEmpty };

// Run as a CLI script (npm run seed) — but not when require()'d by the server.
if (require.main === module) main();
