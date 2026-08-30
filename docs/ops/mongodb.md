# Luxora — MongoDB operations

Production MongoDB readiness for the Luxora commerce engine (modular monolith).

## Connection

Configured in `src/config/db.ts` via `MONGODB_*` environment variables.

| Behavior | Detail |
| --- | --- |
| Pool | `MONGODB_MAX_POOL_SIZE` (default 20), `MONGODB_MIN_POOL_SIZE` |
| Timeouts | server selection, connect, socket, ping |
| Heartbeat | `MONGODB_HEARTBEAT_FREQUENCY_MS` |
| Production writes | `retryWrites: true`, `w: 'majority'` when replica set available |
| Buffering | `bufferCommands: false` in production (fail fast when disconnected) |
| Listeners | Attached once — reconnect does not duplicate handlers |
| Logging | URI credentials always redacted (`sanitizeMongoUri`) |

Startup:

- **production**: Mongo connect failure → process exits (`1`)
- **development**: server may start; `/health/ready` returns `503`

## Health semantics

| Endpoint | Meaning | Mongo down |
| --- | --- | --- |
| `GET /api/v1/health` / `/live` | Process is alive | **200** |
| `GET /api/v1/health/ready` | Can serve commerce (Mongo ping OK) | **503** |

Optional notification providers never block readiness.

## Indexes

- **Development/test**: `MONGODB_AUTO_INDEX=true` (default) runs non-destructive `createIndexes()` on connect.
- **Production**: `MONGODB_AUTO_INDEX` **must be false**. Startup never calls `syncIndexes` (which can **drop** indexes).
- Apply schema index changes via controlled ops: call `ensureIndexes({ mode: 'create' })` from a migration job, or create indexes in Atlas/mongosh.

Integrity-critical uniques (non-exhaustive):

| Collection | Constraint | Invariant |
| --- | --- | --- |
| Payment | `authority` unique sparse | One authority → one payment |
| Payment | partial unique open `orderNumber` | One open attempt per order |
| PaymentProviderEvent | `(provider, eventId)` unique | Webhook once |
| Order | `orderNumber` unique; `(user, idempotencyKey)` unique sparse | Idempotent checkout |
| Refund | `idempotencyKey` unique | Idempotent refunds |
| NotificationDelivery | `deliveryKey` unique | Idempotent notifications |
| SchedulerLock | `name` unique | Lease ownership |
| IdempotencyRecord | `(key, userId)` unique + TTL on `expiresAt` | Checkout replay |

TTL: only `IdempotencyRecord.expiresAt`. Order/Payment money fields are **not** TTL.

## Shutdown

`SIGTERM` / `SIGINT`:

1. Stop accepting HTTP (`server.close`)
2. Stop commerce schedulers
3. Brief drain (bounded by `SHUTDOWN_TIMEOUT_MS`)
4. Disconnect MongoDB
5. Exit `0` (or `1` on forced timeout)

## Backup responsibility

Luxora application code does **not** perform backups. Operators must configure:

- Atlas continuous backup / snapshots, or
- `mongodump` / Ops Manager

RPO/RTO are an infrastructure concern outside this codebase.

## Known limitations

- MongoMemoryServer in Vitest proves connection/index/readiness logic — **not** replica-set failover or Atlas networking.
- `w: majority` is a no-op / may behave differently on standalone Mongo (local dev).
- Mid-request Mongo outage surfaces as 5xx; atomic service claims still prevent double money movement when the write that would commit never lands.
- Index *removal* of redundant singles is deferred (write-cost cleanup) — adding query-backed indexes is preferred in this phase.

## Related

- [backend/README.md](../README.md)
- [docs/api/payments.md](../api/payments.md)
