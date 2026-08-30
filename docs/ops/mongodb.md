# Luxora MongoDB operations (v1.0 readiness)

This document describes production MongoDB behavior for the Luxora commerce backend as of Phases 1–3 (auth, catalog, cart/wishlist). Future order/payment models will extend the index inventory; do not invent those collections here.

## Responsibility boundary

| Concern | Owner |
| --- | --- |
| Application connection pool, timeouts, readiness, graceful disconnect | Luxora backend |
| Cluster topology, TLS, auth users, disk, backups, PITR, monitoring alerts | Infrastructure / DBA |
| Index creation in production | Controlled ops / migration (not app boot) |
| Schema business rules (stock, uniqueness) | Luxora services + Mongoose indexes |

**Backups are not performed by the application.** Operators must configure MongoDB Atlas backups or equivalent snapshots/PITR before go-live.

## Required production configuration

| Variable | Production rule |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | **Required.** No localhost default. Must be `mongodb://` or `mongodb+srv://`. |
| `MONGODB_ALLOW_LOCALHOST` | Default `false`. Set `true` only for intentional single-node self-host. |
| `JWT_SECRET` | Required, ≥32 chars |
| `CLIENT_ORIGINS` | Explicit origins (never `*`) |

Optional pool/timeout variables and safe defaults are listed in `backend/.env.example`.

Never commit real credentials. Never log the raw URI — use `sanitizeMongoUri()`.

## Connection behavior

On boot (`server.ts` → `connectDB`):

1. Apply Mongoose globals: `autoIndex` off in production, `bufferCommands` off in production.
2. Attach connection listeners **once** (idempotent).
3. Connect with conservative pool + timeout options (`getMongoConnectOptions()`).
4. **Never** call `syncIndexes()` / drop indexes on startup.

| Environment | Mongo unreachable at startup |
| --- | --- |
| Production | Log + `process.exit(1)` |
| Development / test | HTTP may listen; `/health/ready` → `503 not_ready` |

Driver reconnect is relied upon for transient network blips. Application state tracks `available` | `unavailable` | `draining`.

## Readiness semantics

| Probe | Path | Meaning | Mongo down |
| --- | --- | --- | --- |
| LIVE | `/api/v1/health`, `/api/v1/health/live` | Process alive | Still `200` |
| READY | `/api/v1/health/ready` | Can serve commerce | `503` |

READY requires: not shutting down + `readyState === connected` + successful `ping` within `MONGODB_PING_TIMEOUT_MS`.

Optional notification providers do **not** block readiness.

## Graceful shutdown

Signals: `SIGTERM`, `SIGINT` (single shutdown system).

Order:

1. `beginShutdown()` → READY fails immediately (`draining`)
2. Stop accepting new HTTP (`server.close`)
3. In-flight HTTP finishes within `SHUTDOWN_TIMEOUT_MS`
4. `disconnectDB()`
5. Exit `0` (or `1` on error / force timeout)

When payment/order workers are added, stop them between steps 1–3 — do not leave them running after shutdown begins.

## Index strategy (current models)

### User

| Index | Serves |
| --- | --- |
| unique sparse `phone` / `email` | Login + registration uniqueness |
| `{ role, isActive }` | Admin user filters |
| `{ createdAt: -1 }` | Chronological listing |

### Category

| Index | Serves |
| --- | --- |
| unique `slug` | Public/admin category lookup |
| `{ isActive, sortOrder }` | Public category list |

Soft-deactivate (`isActive=false`) keeps the unique slug (URL stability). No TTL.

### Product

| Index | Serves |
| --- | --- |
| unique `slug` / `sku` | Storefront URL + commerce identity |
| `{ status, createdAt }` | Newest/oldest lists |
| `{ status, featured, createdAt }` | Featured shelf |
| `{ status, category, createdAt }` | Category browse |
| `{ status, price }` / `{ status, salePrice }` | Price-oriented filters/sorts |
| `{ status, productKind }` | Kind filter |
| `{ status, stock }` | `inStock` filter |

No text index: search uses escaped regex in `catalogSearch.service.ts`. Soft-archive keeps unique slug/sku (no partial unique on active-only).

### Cart / Wishlist

| Index | Serves |
| --- | --- |
| unique `user` | One cart / one wishlist per user |
| `items.product` / `products` | Product membership lookups |

### Not yet in codebase (Phase 4+)

When implemented, add explicit unique/compound indexes for: order history, admin order search, payment authority, webhook event idempotency, refunds, coupons, notification delivery keys, scheduler leases, inventory holds, audit/timeline. Do not weaken atomic service logic with weaker app-only checks.

## Integrity notes (current phase)

- Stock `min: 0` on schema; cart checks stock without reservation. Checkout must use atomic `$inc` with a `stock >= qty` filter so stock cannot go negative.
- Cart/wishlist ownership uniqueness is enforced by Mongo unique indexes (race-safe create paths already handle `11000`).
- No TTL indexes that would delete audit-relevant data.

## Known limitations

- MongoMemoryServer / local `luxora_test` tests do **not** prove replica-set transactions, Atlas failover, or production cluster SLOs.
- Test setup prefers `LUXORA_TEST_MONGO_URI` (default `mongodb://127.0.0.1:27017/luxora_test`) when reachable; set `LUXORA_FORCE_MEMORY_MONGO=true` to force MongoMemoryServer (first download can be large).
- Readiness ping can lag briefly behind a hung socket; conservative socket/serverSelection timeouts bound impact.
- Existing deployments may still have a leftover Product text index from earlier schemas — drop it manually in ops if present; startup will not drop it.
- Production index changes require a runbook (`createIndexes` / Atlas UI), never `syncIndexes` on boot.
- Order/payment/webhook/coupon/scheduler models are **not** in the codebase yet (Phases 1–3 only). Their uniqueness/idempotency indexes must be added when those features land — do not invent collections prematurely.
