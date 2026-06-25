# Business Platform — Reusable Catalog & Lead-Generation System

A complete, production-ready, **fully configurable** business catalog and
lead-generation web app with a secure admin dashboard. It is **industry-agnostic**:
the *same codebase* powers schools, agencies, real-estate firms, training centers,
construction companies, beauty businesses, electronics stores, consulting firms,
service providers and general catalogs — **without any source-code changes**.
Everything (branding, colors, logos, content, catalog, locations, homepage
sections, SEO, social links, WhatsApp number) is managed from the dashboard.

> Default admin login: **`admin` / `admin123`** — change it immediately in *Account*.

---

## ✨ Features

**Public website**
- Configurable homepage built from reorderable **sections**: hero, text, features,
  gallery, testimonials, FAQ, statistics, CTA, custom HTML.
- Products & Services with search, **category** and **city** filters.
- Product/Service detail pages with image gallery, specifications, location badges,
  related items and **WhatsApp inquiry**.
- Multi-city / region support with Google Maps embeds.
- About & Contact pages, contact form (captured as leads), social links.
- **Light / dark mode**, responsive mobile-first design, brand colors applied live.

**WhatsApp inquiry system**
- "Inquire on WhatsApp" generates a professional pre-filled message and opens
  `https://wa.me/<number>`. Each inquiry is also stored as a lead in the dashboard.
- WhatsApp number is editable from Settings.

**Secure admin dashboard**
- Overview with live stats and recent activity/inquiries.
- CRUD for Products (multi-image + drag-reorder + featured image + duplicate),
  Services, Categories, Cities (full location fields), Regions, and homepage Sections.
- Media library, Settings (branding/colors/contact/social/SEO/business/feature toggles),
  Inquiries inbox, Audit log, and Backup/Restore.

**Security**
- JWT access tokens + rotating refresh tokens (httpOnly cookie), bcrypt password
  hashing, optional admin **PIN** (2nd factor), login **rate-limiting + lockout**,
  Helmet headers, CORS, parameterized SQL (no injection), secure image uploads
  (type + size limits), protected API endpoints, change password / change PIN.

**Operational**
- **Audit logging** of logins, content changes, settings, uploads, backups.
- **Backup system**: manual snapshots, download, restore, and DB import/export.

---

## 🧱 Tech Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React + Vite, React Router, Axios, CSS variables (light/dark) |
| Backend   | Node.js + Express |
| Database  | SQLite (embedded — **no separate database server / no Supabase needed**) |
| Auth      | JWT (access + refresh) + bcrypt, optional PIN |
| Uploads   | Multer (local disk) |

Because SQLite is a single file and the backend can serve the built frontend,
**the whole product is one self-contained process** — cheap to host 24/7.

---

## 📁 Project Structure

```
business-platform/
├── backend/                 # Express API + SQLite
│   ├── server.js            # App entry (also serves built frontend in prod)
│   ├── .env.example         # Configuration template
│   └── src/
│       ├── config.js
│       ├── db/              # schema.sql, database.js, seed.js
│       ├── lib/             # helpers, settings, tokens (JWT), audit, backup
│       ├── middleware/      # auth (JWT), upload, rateLimit, error
│       └── routes/          # auth, public, admin/* (controllers)
│   ├── data/                # SQLite db + backups (gitignored)
│   └── uploads/             # uploaded media (gitignored)
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── api/             # axios client + JWT interceptors
│       ├── context/         # Auth, Settings, Theme (dark mode), Toast
│       ├── components/      # Modal, cards, section renderer, uploader, inquiry…
│       ├── layouts/         # PublicLayout, AdminLayout
│       ├── pages/public/    # Home, Products, Services, Cities, About, Contact…
│       └── pages/admin/     # Dashboard + all management screens
├── docs/API.md              # REST API reference
└── package.json             # convenience scripts
```

---

## 🚀 Quick Start (local development)

Requires Node.js 18+.

```bash
# 1. Install dependencies for both apps
npm run install:all

# 2. Seed the database (creates admin user + demo content)
npm run seed

# 3. Start the backend API (terminal 1) — http://localhost:4000
npm run dev:backend

# 4. Start the frontend dev server (terminal 2) — http://localhost:5173
npm run dev:frontend
```

Open **http://localhost:5173** for the site and **/admin** for the dashboard.
The Vite dev server proxies `/api` and `/uploads` to the backend automatically.

To wipe and reseed: `npm run reset`.

---

## 📦 Production (single self-contained app)

In production the Express server serves the built React app, so you run **one process**.

```bash
# Build the frontend
npm run build

# Configure secrets
cp backend/.env.example backend/.env   # then edit JWT secrets, admin password, etc.

# Start (serves API + website on PORT, default 4000)
npm start
```

Now everything is available on `http://<host>:4000/`.

---

## ☁️ Deployment (cheapest 24/7)

This app needs one always-on process. The database is a file (SQLite) — **no Supabase
or managed DB required**. Cheapest options:

### Option A — Free 24/7 (Oracle Cloud "Always Free" VM)
1. Create an Always-Free **Ubuntu** VM and SSH in.
2. Install Node 18+ and (optionally) nginx:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```
3. Clone the repo, then:
   ```bash
   npm run install:all && npm run build && npm run seed
   cp backend/.env.example backend/.env   # set strong secrets + ADMIN_PASSWORD
   ```
4. Run it persistently with **pm2**:
   ```bash
   sudo npm i -g pm2
   cd backend && NODE_ENV=production pm2 start server.js --name business-platform
   pm2 save && pm2 startup
   ```
5. (Optional) Put **nginx** in front for ports 80/443 + HTTPS (Let's Encrypt):
   ```nginx
   server {
     server_name yourdomain.com;
     location / { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host;
                  proxy_set_header X-Forwarded-For $remote_addr; }
   }
   ```
   Then `sudo certbot --nginx -d yourdomain.com`.

### Option B — Cheap VPS (Hostinger / Hetzner / Contabo, ~$4/mo)
Identical steps to Option A — any Ubuntu VPS works.

### Domain
Point your domain's A record at the server IP. With nginx + certbot you get HTTPS.

### Reselling to multiple clients
Each client gets their own copy + their own `backend/data/app.db`. Customize entirely
from the dashboard. Back up a client by downloading their `.db` from **Backup**, or
copy `backend/data/app.db`.

---

## 🔐 Environment Variables (`backend/.env`)

| Key | Purpose |
|-----|---------|
| `PORT` | Server port (default 4000) |
| `NODE_ENV` | `production` to serve the built frontend |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **Set strong random values in prod** |
| `ACCESS_TOKEN_TTL` | Access token lifetime (default `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifetime (default 7) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Initial admin created on first seed |
| `CORS_ORIGINS` | Allowed dev origins (e.g. `http://localhost:5173`) |
| `MAX_LOGIN_ATTEMPTS` / `LOCKOUT_MINUTES` | Brute-force lockout |

---

## 🗄️ Database

SQLite schema (see `backend/src/db/schema.sql`): `users`, `refresh_tokens`,
`settings`, `regions`, `cities`, `categories`, `products`, `product_images`,
`services`, `product_cities`, `service_cities`, `sections`, `inquiries`, `audit_logs`.

## 📚 API

See [`docs/API.md`](docs/API.md) for the full REST reference.

## 📝 License

MIT — sell and customize freely.
