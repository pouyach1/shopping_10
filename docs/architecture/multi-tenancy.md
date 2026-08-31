# Luxora Multi-Tenancy Architecture

Luxora is a reusable modular monolith: one API process (or shared fleet) serving many independent stores from a shared MongoDB cluster with **strict tenant isolation**.

```text
                    ┌─────────────────────────────┐
   shop-a.example   │     Shared API instances    │
   shop-b.luxora.app│  Route→Controller→Service   │
   x-store-slug     │                             │
         │          └──────────────┬──────────────┘
         ▼                         │
   resolveTenant()                 ▼
   TenantContext {storeId,...}   MongoDB cluster
         │                         │
         ▼                         ▼
   store-scoped queries     indexes lead with storeId
```

Target scale: **~1,000 stores** on shared infrastructure — **not** database-per-tenant, **not** process-per-store.

## Collection classification

### PLATFORM-SCOPED

| Collection | Notes |
| --- | --- |
| `users` | Global identity (phone/email). Not duplicated per store. |
| `stores` | Tenant registry |
| `storememberships` | User↔Store roles |

### STORE-SCOPED (must include `storeId`)

| Collection | Unique / key compounds |
| --- | --- |
| `categories` | `{ storeId, slug }` |
| `products` | `{ storeId, slug }`, `{ storeId, sku }` |
| `carts` | `{ storeId, user }` |
| `wishlists` | `{ storeId, user }` |
| `orders` | `{ storeId, orderNumber }` |
| `payments` | `{ storeId, authority }` |
| `refunds` | scoped by `storeId` |
| `coupons` | `{ storeId, code }` |
| `couponusages` | `{ storeId, couponId, userId }` |
| `webhookevents` | `{ storeId, provider, eventId }` |
| `notificationdeliveries` | `{ storeId, deliveryKey }` |
| `auditlogs` | `{ storeId, createdAt }` |
| `idempotencyrecords` | `{ storeId, key, operation }` |
| `inventoryholds` | `{ storeId, productId, status }` |

User addresses remain on the platform User document (reusable across stores). Store-specific address books can be added later without weakening this model.

## Tenant resolution

Trusted sources only (in order):

1. `Host` → `Store.domain`
2. `Host` subdomain of `PLATFORM_BASE_DOMAIN` → `Store.subdomain`
3. Header `x-store-slug`
4. `DEFAULT_STORE_SLUG` (compatibility for the original Luxora install)

**Never trust** `body.storeId` / `query.storeId` as the authority. If present, validate against `TenantContext` and reject mismatches.

Public catalog does **not** require authentication. Admin/cart/wishlist require auth **after** tenant resolution.

Middleware order:

```text
requestId → helmet/cors/json → /api/v1
  /health                    (no tenant)
  /payments/webhooks/:provider (tenant from payment authority)
  resolveTenant → rejectClientStoreIdSmuggling → auth → requireStoreRole → controller
```

Payment webhooks **never** use request tenant headers. The handler looks up `Payment.authority` globally, bootstraps `TenantContext` from `payment.storeId`, then verifies the signature with that store's provider configuration.

## Frontend contract

When the storefront and API share one host, the SPA sends `x-store-slug` (from `VITE_STORE_SLUG`, default `luxora`) on every API request. Domain/subdomain routing can omit the header when DNS already identifies the store.


## Membership & authorization

- `User.role` (`customer` | `admin`) is **platform display / legacy JWT** only.
- Store power comes from `StoreMembership.role`: `owner` | `admin` | `staff` | `customer`.
- Admin APIs use `requireStoreRole('staff')` (owner/admin/staff).
- Clients cannot escalate via JSON (`PROTECTED_USER_FIELDS` includes `role`, `storeId`, `membershipRole`).
- Prefer **404** for cross-tenant resource IDs (no existence leak).

## Configuration isolation

`StoreConfigService` exposes:

- **Public** branding/shipping/currency/orderPrefix (safe for `GET /api/v1/store`)
- **Private** payment/notification provider refs + `credentialsConfigured` — **never** returned on public APIs; secrets live in env/vault, not Mongo documents readable by clients.

Payment providers stay abstracted: resolve merchant binding from the current store context before creating/verifying payments.

## Order numbers

Per-store prefix from `Store.publicConfig.orderPrefix`:

```text
LUXA-2026-000001
LUXB-2026-000001
```

Same sequence in two stores does not collide because uniqueness is `{ storeId, orderNumber }`.

## Migration

**Not** run on application startup.

```bash
cd backend && npm run migrate:tenancy
# optional: --drop-legacy-indexes
```

Flow:

```text
existing records → ensure default store (luxora)
  → assign missing storeId → grant admin memberships
  → createIndexes (additive) → optional drop of legacy global uniques
```

## Seed

`npm run seed` creates/updates the default store, then upserts categories/products **scoped by storeId**. Idempotent.

## Security invariant

> A valid Store A request must never read, mutate, infer, or enumerate Store B's tenant-owned data without explicit platform-level authorization (not implemented as unrestricted super-admin in this phase).

Covered by `tests/multitenant.test.ts`.

## Performance (~1000 stores)

- Shared pools/connections (one app, one cluster).
- All hot paths prefix `storeId` in filters and indexes.
- No collection scan across tenants for catalog/cart/admin list.

## Known limitations

- Checkout/payment/refund **workflows** are foundation schemas + isolation helpers — not full checkout UX.
- Guest LocalStorage must key by store slug on the frontend (documented; not redesigned here).
- Legacy DBs need `migrate:tenancy` before enabling multi-store traffic.
- Passing tests does **not** by itself prove 1000-store production capacity under load.
- Unrestricted platform super-admin is intentionally **not** introduced.
