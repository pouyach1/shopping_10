# Luxora Backend

Production-oriented Express + TypeScript + MongoDB API for the Luxora e-commerce platform.

**Phase 1** — foundation + authentication + users.  
**Phase 2** — catalog engine: products, categories, search, filtering, inventory foundation.

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

- `GET http://localhost:4000/api/v1/health` — process liveness
- `GET http://localhost:4000/api/v1/health/ready` — MongoDB readiness
- `GET http://localhost:4000/api/health` — temporary compatibility alias

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
  config/       env validation, DB lifecycle, constants
  controllers/  HTTP adapters (thin)
  middleware/   auth, errors, rate limits, validation helpers
  models/       Mongoose schemas (User, Category, Product)
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

See [`.env.example`](./.env.example).

Production fails fast when:

- `JWT_SECRET` is missing or shorter than 32 characters
- `CLIENT_ORIGINS` is empty or `*`

Development may boot with a temporary JWT secret (logged as a warning). Prefer setting a real secret even locally.

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

Storefront and Admin UIs still use mock catalog data. The Product API is shaped so a thin client adapter can map:

- `displayPrice` → storefront `Product.price`
- `originalPrice` → storefront `Product.originalPrice`
- `imageSrc` / `gallery` / `href` → existing card/PDP fields
- `productKind` + `category` → recommendations

Do **not** delete mock catalog files until a dedicated frontend wiring phase.

Migration point: replace data loaders in Home / Shop / Search / Product / admin products with `GET /api/v1/products` (+ admin routes), keeping presentational components unchanged.

## Phase 3 (recommended)

1. Server-side Cart + Wishlist APIs consuming this catalog (availability/stock checks)
2. Wire Admin Products UI to `/api/v1/admin/products`
3. Orders later — snapshot line items from product fields at purchase time (do not rely on mutable Product alone for history)
