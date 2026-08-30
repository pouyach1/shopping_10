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

See [`.env.example`](./.env.example) and [MongoDB operations](../docs/ops/mongodb.md).

Production fails fast when:

- `JWT_SECRET` is missing or shorter than 32 characters
- `CLIENT_ORIGINS` is empty or `*`
- `MONGODB_URI` is missing / not `mongodb://` or `mongodb+srv://`
- `MONGODB_URI` points at localhost (unless `ALLOW_LOCAL_MONGO_IN_PROD=1`)
- `MONGODB_AUTO_INDEX=true` (must be false — no index rebuild/drop on boot)
- `PAYMENT_PROVIDER=mock`
- payment/SMS/email provider credentials missing when those providers are selected

Development may boot with a temporary JWT secret (logged as a warning). Prefer setting a real secret even locally.

### MongoDB readiness

| Endpoint | Meaning |
| --- | --- |
| `GET /api/v1/health` / `.../live` | Process alive (200 even if Mongo is down) |
| `GET /api/v1/health/ready` | Mongo connected **and** ping OK (503 otherwise) |

Connection pool, timeouts, and heartbeat are configured via `MONGODB_*` env vars. Credentials are never logged. Graceful shutdown: stop HTTP → stop schedulers → disconnect Mongo (`SIGTERM`/`SIGINT`).

**Backups** are an operator responsibility (Atlas snapshots / `mongodump`) — not performed by the app.

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

## Phase 4 — Checkout + Orders

- `POST /checkout/preview`, `POST /orders` (Idempotency-Key supported)
- Item + address snapshots; integer تومان; shared shipping rules
- Atomic stock decrement + compensation; cancel restocks
- Customer/admin order APIs + centralized transitions
- See [docs/api/orders.md](../docs/api/orders.md)

## Phase 5 — Payments, coupons, refunds, notifications

Production commerce foundation (provider-agnostic):

- **PaymentProvider** interface + `mock` (tests/dev) + `zarinpal` stub
- `Payment` model with explicit transitions (`paymentTransitions.ts`)
- `POST /api/v1/payments`, callback, signed webhooks — verify with provider before marking paid
- Inventory reservation TTL + `releaseExpiredReservations()` (worker-ready, no Redis/Kafka)
- Coupon engine with atomic usage limits; server-side totals
- Admin refunds (full/partial, idempotent); never trust client amounts
- Commerce event bus + mock notification provider; `AuditLog` for money ops
- Structured error codes (`PAYMENT_*`, `COUPON_*`, `REFUND_*`, …)
- See [docs/api/payments.md](../docs/api/payments.md)

### Payment lifecycle (attempt)

`created → pending → redirected → processing → paid`  
also: `failed | cancelled | expired`; `paid → partially_refunded | refunded`

### Late success after cancel

Policy: verify payment, then **auto-refund** and keep order cancelled. Never leave paid+cancelled.

### Environment (payments)

| Variable | Notes |
| --- | --- |
| `PAYMENT_PROVIDER` | `mock` (dev/test) / `zarinpal` / … — mock forbidden in production |
| `PAYMENT_CALLBACK_URL` | Browser return URL (`/payment/callback`) |
| `PAYMENT_WEBHOOK_SECRET` | Required in production (16+) |
| `PAYMENT_RESERVATION_TTL_MS` | Default 30m |
| `ZARINPAL_MERCHANT_ID` | Required when provider=zarinpal (36-char UUID) |
| `ZARINPAL_SANDBOX` | `true`/`false` |
| `ENABLE_RESERVATION_SCHEDULER` | In-process reservation release |
| `ENABLE_NOTIFICATION_SCHEDULER` | In-process notification drain |
| `SMS_PROVIDER` / `EMAIL_PROVIDER` | `mock` by default |

## Phase 6 — Real payment & reliability

- Real Zarinpal v4 HTTP provider (injectable client; tests never hit network)
- تومان→ریال conversion at provider boundary only
- Frontend `/payment/callback` return page (verify-before-success UI)
- Atomic callback/webhook race handling
- Reservation + notification in-process schedulers
- Reconciliation admin endpoint (`applySafeFix` for provider-paid/local-pending only)
- SMS/Email abstractions + idempotent `NotificationDelivery`
- Expanded audit actions (`payment.webhook_*`, `notification.*`, `inventory.reservation_released`)

## Phase 7.5 — Integrity hardening

See Phase 7.5 commit notes: provider-verify-first callbacks, reservation expiry honesty, admin paid-cancel refusal, orphan hold recovery, coupon rollback release.

## MongoDB production readiness

See [docs/ops/mongodb.md](../docs/ops/mongodb.md).

## Phase 8+ (later)

1. Wire live Kavenegar SMS + SMTP email transports in store deployments
2. Zarinpal refund/reverse when merchant plan supports it
3. Admin UI panels for payments, webhooks, notifications, reconcile
4. Multi-store tenancy (storeId / config boundary)
5. Payment analytics / dispute tooling
