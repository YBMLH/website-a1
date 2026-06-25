# API Reference

Base URL: `/api`. All admin endpoints require `Authorization: Bearer <accessToken>`.
Responses are JSON. Mutations are audit-logged.

## Auth — `/api/auth`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/login` | `{ username, password, pin? }` | Returns `{ accessToken, user }`, sets `refresh_token` httpOnly cookie. `pin` required only if the user set one. Rate-limited + lockout after repeated failures. |
| POST | `/refresh` | — (uses cookie) | Rotates refresh token, returns new `{ accessToken, user }`. |
| POST | `/logout` | — | Revokes refresh token + clears cookie. |
| GET | `/me` | — | Current user (auth required). |
| POST | `/change-password` | `{ current, next }` | Auth required; revokes all sessions. |
| POST | `/change-pin` | `{ current?, next }` | Set/change/clear admin PIN (blank `next` clears). |

## Public (no auth) — `/api/public`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/settings` | All settings as a flat `{ key: value }` object (typed). |
| GET | `/sections` | Active homepage sections (with parsed `config`). |
| GET | `/categories?type=product\|service` | Active categories. |
| GET | `/products?city=&category=&q=&featured=` | Active products, filterable. |
| GET | `/products/:slug` | Product + `images`, `cities`, `specifications`, `related`. |
| GET | `/services?city=&category=&q=&featured=` | Active services. |
| GET | `/services/:slug` | Service + `gallery`, `cities`, `specifications`, `related`. |
| GET | `/cities` | Active cities with product/service counts. |
| GET | `/cities/:id` | City + its `products` and `services`. |
| POST | `/inquiries` | Capture a lead: `{ customer_name, phone, email?, item_type, item_id?, item_name?, price?, city?, message? }`. |

## Admin (auth required) — `/api/admin`

### Dashboard
- `GET /dashboard` → `{ stats, recent_inquiries, recent_activity }`.

### Products — `/products`
- `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`
- `POST /:id/duplicate` — clone a product (with images + cities).
- `POST /:id/images/reorder` — `{ images: [path, ...] }` (drag-and-drop order).
- Body fields: `title, short_description, description, specifications[], price, sale_price,
  currency, sku, category_id, city_id, image (featured), images[], cities[], featured, active, sort_order`.

### Services — `/services`
- `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` · `POST /:id/duplicate`
- Body fields: like products plus `price_unit`, `gallery[]` (instead of `images[]`).

### Categories — `/categories`
- `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` · `POST /reorder` `{ order: [id,...] }`
- Fields: `name, type (product|service|both), description, image, icon, active, sort_order`.

### Cities — `/cities`
- `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `PATCH /:id` (toggle `active`/`featured`) · `DELETE /:id`
- Fields: `name, region_id, region, country, state_province, address, postal_code,
  google_maps_link, latitude, longitude, image, description, active, featured, sort_order`.

### Regions — `/regions`
- `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`
- Fields: `name, country, description, active, sort_order`.

### Sections — `/sections`
- `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` · `POST /reorder` `{ order: [id,...] }`
- Fields: `type (hero|text|features|gallery|testimonials|faq|stats|cta|html),
  title, subtitle, content, image, config (JSON), active, sort_order`.

### Settings — `/settings`
- `GET /` → settings grouped by `group_name`.
- `PUT /` → bulk update `{ key: value, ... }`.
- `POST /` → create a custom setting `{ key, value, type, group_name, label }`.
- `DELETE /:key`.

### Media — `/media`
- `GET /` → list uploaded files.
- `POST /` → multipart `files[]` (images only, ≤8MB each). Returns `{ files: [{ path }] }`.
- `DELETE /:filename`.

### Inquiries — `/inquiries`
- `GET /?status=new|read|archived` · `PATCH /:id` `{ status }` · `DELETE /:id`.

### Audit — `/audit`
- `GET /?action=&limit=` · `GET /actions` (distinct action types).

### Backup — `/backup`
- `GET /` → list snapshots.
- `POST /` → create a snapshot.
- `GET /download/:filename` → download a `.db` snapshot.
- `GET /export` → create + download a fresh snapshot.
- `POST /restore/:filename` → restore from a server-side snapshot.
- `POST /import` → multipart `file` (`.db`) to overwrite the database.
- `DELETE /:filename`.

## Errors
Errors return `{ "error": "message" }` with an appropriate HTTP status
(`400` validation, `401` auth, `403` role, `404` not found, `429` rate-limited, `500`).
