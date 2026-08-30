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

## Admin / ops

- `GET /admin/payments`
- `GET /admin/payments/:paymentId` — includes failure reason, provider tx id, webhook events
- `POST /admin/payments/:paymentId/reconcile` `{ applySafeFix?: boolean }`
- `POST /admin/payments/release-expired`
- `POST /admin/notifications/process`
- `POST /admin/orders/:orderNumber/refund`
- Coupons CRUD

## Reconciliation

Detects:

- provider paid / local pending → optional safe fix (`applySafeFix: true`)
- local paid / provider failed → report only (manual review)
- order/payment mismatch → report only

## Inventory reservation expiry

`inventoryReservedUntil` + atomic `inventoryDecremented` claim.

Run via:

1. `ENABLE_RESERVATION_SCHEDULER=true` on **one** process, or
2. External cron → `POST /admin/payments/release-expired`

Duplicate ticks are safe (no double restock).

## Notifications

Commerce events enqueue `NotificationDelivery` rows with deterministic keys:

`event:channel:recipient:entityId`

Duplicate PaymentSuccessful (callback+webhook) → one SMS/email.

Statuses: `pending | sent | failed | retryable | permanent_failure`

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

Requires production credentials. Automated tests never call the live network.

## Idempotency

Open payments reused on double-click. Payment success claimed atomically so callback/webhook races produce one paid transition and one notification delivery.
