# Payments, Coupons, Refunds & Reliability (Phase 5–6)

Base: `/api/v1`

Order status, payment attempt status, and fulfillment status remain **separate**.

## Sequence — online payment

```text
Customer                Frontend                 Backend                    Provider
   |                       |                        |                          |
   |---- place order ----->|---- POST /orders ----->|                          |
   |                       |<- orderNumber ---------|                          |
   |---- pay ------------->|---- POST /payments --->|---- request (ریال) ----->|
   |                       |<- redirectUrl ---------|<- authority -------------|
   |<---- redirect --------|                        |                          |
   |==================== gateway UI ===========================================|
   |---- return URL ------>| /payment/callback      |                          |
   |                       |---- POST /callback --->|---- verify ------------->|
   |                       |<- paid | failed -------|<- code 100/101 ----------|
   |                       |                        |                          |
   |                       |                        |<---- optional webhook ---|
```

Browser return is **never** treated as proof. Backend always verifies.

## Money units

Luxora stores integer **تومان**. Zarinpal v4 expects integer **ریال**.

Conversion (provider boundary only): `1 تومان = 10 ریال`.

## Customer payments

- `POST /payments` `{ "orderNumber" }` → `{ payment: { id, redirectUrl, authority, amount, … } }`
- `POST /payments/callback` `{ "authority", "status?" }`
- `GET /payments/:paymentId` (owner only)
- `POST /payments/webhooks/:provider` — HMAC `x-luxora-webhook-signature` (separate rate limit)

## Admin / ops (Phase 7)

All under `requireAuth` + `requireRole('admin')`:

- `GET /admin/payments` / `GET /admin/payments/:paymentId`
- `POST /admin/payments/:paymentId/reconcile` `{ applySafeFix?: boolean }`
- `POST /admin/payments/reconcile-open` — scan open payments (bounded)
- `POST /admin/payments/:paymentId/retry-verification` — only when safe (not already paid)
- `POST /admin/payments/:paymentId/manual-review`
- `POST /admin/payments/release-expired`
- `GET /admin/orders/:orderNumber/timeline` — chronological order/payment/refund/inventory/notification/audit
- `GET /admin/notifications` / `POST /admin/notifications/:id/retry` / `POST /admin/notifications/process`
- `GET /admin/refunds` / `POST /admin/refunds/:id/retry`
- `POST /admin/orders/:orderNumber/refund`
- `GET /admin/scheduler/health`
- Coupons CRUD

Health: `GET /api/v1/health` (liveness), `GET /api/v1/health/ready` (Mongo + critical deps; notification providers do not block ready).

## Reconciliation

Detects:

- `provider_paid_local_pending` → optional safe fix (`applySafeFix: true`)
- `local_paid_provider_failed` → report only (manual review)
- `order_payment_mismatch` → report only
- `provider_unreachable` / timeout → leave open; never mark failed from ambiguity
- `already_reconciled` / `in_sync`

## Inventory reservation expiry

`inventoryReservedUntil` + shared one-time release claim (`inventoryReleaseClaimedAt`).

Applies to **online and COD** unpaid orders.

Run via:

1. `ENABLE_RESERVATION_SCHEDULER=true` on **one** process, or
2. External cron → `POST /admin/payments/release-expired`

Duplicate ticks are safe (no double restock). The same claim is used by customer cancel.

Late payment after cancel: order stays cancelled. If the provider confirms auto-refund → payment `refunded`. If refund is unsupported/fails → payment stays `paid` with `needsManualRefund` and order `financialIntegrityStatus=paid_needs_manual_refund`. Never labeled `auto_refunded` without provider confirmation.

## Notifications

Commerce events enqueue `NotificationDelivery` rows with deterministic keys:

`event:channel:recipient:entityId`

Workers claim rows with a lease (`status=processing`, `lockedUntil`) so two workers cannot both send the same delivery. Crashed leases expire and become retryable (at-least-once + idempotent keys).

Statuses: `pending | processing | sent | failed | retryable | permanent_failure`

SMS/Email providers are abstracted (`mock` / `kavenegar` boundary / `smtp` boundary).
Notification failure never rolls back payment.

## Mock provider

`PAYMENT_PROVIDER=mock` — authorities `mock.<scenario>.<paymentId>`:
`success`, `failure`, `wrong_amount`, `invalid`, `timeout`.

## Zarinpal (real)

Official v4:

- Request `POST /pg/v4/payment/request.json`
- Verify `POST /pg/v4/payment/verify.json`
- StartPay `/pg/StartPay/{authority}`
- Sandbox hosts: `sandbox.zarinpal.com`
- Verify codes: `100` success, `101` already verified (idempotent OK)
- Automatic refund API is **not** part of this adapter (`NOT_SUPPORTED`) — unresolved captures surface as `needsManualRefund`

Requires production credentials. Automated tests never call the live network.

## Webhook trust

`x-luxora-webhook-signature` proves possession of **our** webhook secret — it is not a Zarinpal-signed payload.

Paid events still require provider `verifyPayment`. Failure/cancel webhooks re-verify with the provider before mutating open payments; a forged failure cannot overturn a paid capture.

## Idempotency

**Required** `Idempotency-Key` on `POST /payments` (and `POST /orders`).

Same key + same normalized body → original result. Same key + different body → `409 IDEMPOTENCY_CONFLICT`.

Open payments reused on double-click. Payment success claimed atomically so callback/webhook races produce one paid transition and one notification delivery.

Refund capacity is reserved with an atomic `$expr` update so concurrent refunds cannot exceed the captured amount.

## Cookie / CSRF model

- Default `AUTH_COOKIE_SAMESITE=lax` (blocks most cross-site POSTs).
- Cookie-authenticated mutating requests require Origin/Referer in `CLIENT_ORIGINS`.
- Bearer `Authorization` clients skip the cookie CSRF guard.
- Cross-site cookie SPAs may set `AUTH_COOKIE_SAMESITE=none` (Secure) and still pass Origin checks.
