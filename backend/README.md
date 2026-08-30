# Luxora Backend

Production-oriented Express + TypeScript + MongoDB API for the Luxora e-commerce platform.

**Phase 1** — foundation + authentication + users.  
**Phase 2** — catalog engine: products, categories, search, filtering, inventory foundation.  
**Phase 3** — cart + wishlist.  
**Ops** — production MongoDB readiness (connection, indexes, readiness, shutdown).

## Requirements

- Node.js 22+
- MongoDB 6+ (local or hosted)
- npm

## Quick start

```bash
cd backend
cp .env.example .env
# Edit JWT_SECRET (required in production) and MONGODB_URI
npm install
npm run seed   # idempotent sample catalog
npm run dev
```

Health checks:

- `GET http://localhost:4000/api/v1/health` — **liveness** (process alive; ignores Mongo)
- `GET http://localhost:4000/api/v1/health/live` — same as above
- `GET http://localhost:4000/api/v1/health/ready` — **readiness** (Mongo connected + ping; `503` when not)
- `GET http://localhost:4000/api/health` — temporary compatibility alias (liveness)

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch mode via `tsx` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest + in-memory MongoDB |
| `npm run seed` | Idempotent catalog seed (categories + products) |

## Architecture

```text
Route → Controller → Service → Model
```

Cross-cutting concerns live in middleware (auth, validation, rate limits, errors).

```text
src/
  config/       env validation, DB lifecycle, Mongo safety, constants
  controllers/  HTTP adapters (thin)
  middleware/   auth, errors, rate limits, validation helpers
  models/       Mongoose schemas (User, Category, Product, Cart, Wishlist)
  routes/v1/    versioned API
  scripts/      seedCatalog (idempotent)
  services/     business logic, mappers, catalog search
  validators/   Zod request schemas
  utils/        AppError, logger, password, phone, slug
  types/        Express augmentation
```

## Authentication

- Register / login issue a JWT access token
- Token is returned in the JSON body **and** set as an httpOnly cookie (`AUTH_COOKIE_NAME`)
- Protected routes accept `Authorization: Bearer <token>` **or** the auth cookie
- Logout clears the cookie (Bearer clients discard the token client-side)
- Passwords are hashed with bcrypt (cost 12)
- `passwordHash` is never selected by default and never returned in API responses

See:

- [docs/api/auth.md](../docs/api/auth.md)
- [docs/api/users.md](../docs/api/users.md)

## Catalog (Phase 2)

Public:

- `GET /api/v1/products` — paginated search/filter/sort (active only)
- `GET /api/v1/products/:slug`
- `GET /api/v1/categories`
- `GET /api/v1/categories/:slug`

Admin (`requireAuth` + `requireRole('admin')`):

- `/api/v1/admin/products` — CRUD; `DELETE` soft-archives
- `/api/v1/admin/categories` — CRUD; `DELETE` soft-deactivates

See:

- [docs/api/products.md](../docs/api/products.md)
- [docs/api/categories.md](../docs/api/categories.md)

Pricing: `price` = regular, `salePrice` = promo; responses also include `displayPrice` / `originalPrice` for storefront compatibility.

Search is isolated in `catalogSearch.service.ts` (regex over name/description/sku/tags) so it can be swapped later without rewriting controllers.

## Environment

See [`.env.example`](./.env.example) and [MongoDB operations](../docs/ops/mongodb.md).

Production fails fast when:

- `MONGODB_URI` is missing, not a Mongo URI, or targets localhost without `MONGODB_ALLOW_LOCALHOST=true`
- `JWT_SECRET` is missing or shorter than 32 characters
- `CLIENT_ORIGINS` is empty or `*`
- MongoDB is unreachable at startup (`process.exit(1)`)

Development may boot without Mongo; `/api/v1/health/ready` stays `503` until connected. Prefer setting a real `JWT_SECRET` even locally.

The process never logs the full MongoDB URI, credentials, JWT secrets, or raw request bodies.

## MongoDB production readiness

- Conservative pool + timeout defaults (`MONGODB_*` env vars)
- Idempotent connection listeners; safe duplicate `connectDB`
- `autoIndex` disabled in production; **never** `syncIndexes` on startup
- READY = not draining + connected + ping
- Graceful `SIGTERM` / `SIGINT`: mark draining → close HTTP → disconnect Mongo → exit
- Indexes audited for current models (see ops doc); Phase 4+ payment/order indexes deferred until those models exist

## Security defaults

- Helmet
- CORS with explicit `CLIENT_ORIGINS` (credentials enabled)
- JSON body size limit
- General API rate limit
- Stricter rate limit on `/auth/register` and `/auth/login`
- Centralized operational errors (no stack traces in production responses)
- Admin catalog mutations never exposed without authz
- Query filters/sorts are whitelisted (no raw Mongo operators from clients)

## Frontend note

Storefront catalog pages still use mock product lists. With `VITE_API_BASE_URL` set:

- Login uses `POST /api/v1/auth/login`
- Authenticated cart/wishlist sync through `/api/v1/cart` and `/api/v1/wishlist`
- Mock product ids resolve to backend products via slug when seeded (`silk-blend-blouse`, etc.)
- Guest mode keeps LocalStorage; login merges then server owns state; logout clears private state

See [docs/api/cart.md](../docs/api/cart.md) and [docs/api/wishlist.md](../docs/api/wishlist.md).

## Phase 3 — Cart + Wishlist

- One cart / one wishlist per user (unique user index)
- Cart lines: product ref + quantity + size/color + price snapshot
- Add increments same variant; stock checked without reservation
- Unavailable products stay inspectable (`available: false`)
- `POST /cart/merge` and `POST /wishlist/merge` for guest → auth migration

## Phase 4 (recommended)

1. Checkout + Orders with line-item snapshots and stock decrement
2. Wire Admin Products UI to `/api/v1/admin/products`
3. Optional guest cart cookie session if multi-device guests are required
