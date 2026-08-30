# Payments, Coupons & Refunds API (Phase 5)

Base: `/api/v1`

Order status, payment attempt status, and fulfillment status remain **separate**.

## Payment flow

```text
Order (awaiting_payment, inventory reserved)
  → POST /payments  (auth, Idempotency-Key)
  → redirect to provider
  → browser POST /payments/callback  (signal only)
  → provider POST /payments/webhooks/:provider  (idempotent)
  → server verifies with provider
  → Payment=paid, Order=paid
```

Amounts always come from the order document. Clients never supply trusted `amount`, `userId`, or `paymentStatus`.

## Customer payments

- `POST /payments` `{ "orderNumber" }` → `{ payment: { id, redirectUrl, authority, amount, … } }`
- `POST /payments/callback` `{ "authority", "status?" }`
- `GET /payments/:paymentId` (owner only)
- `POST /payments/webhooks/:provider` — signature via `x-luxora-webhook-signature` (mock/HMAC)

## Admin

- `GET /admin/payments`
- `GET /admin/payments/:paymentId`
- `POST /admin/payments/release-expired` — releases unpaid reservations (worker-ready)
- `POST /admin/orders/:orderNumber/refund` `{ amount?, reason?, idempotencyKey }`
- `GET /admin/refunds?orderNumber=`
- `GET|POST|PATCH /admin/coupons`

## Coupons

Server calculates discount. Optional `couponCode` on checkout preview / create order.

Supports percentage/fixed, min order, max discount, dates, active flag, usage limit, per-user limit, product/category restrictions. Usage increments are atomic (`findOneAndUpdate`).

## Inventory reservation

Phase 4 still decrements stock at order create. Phase 5 adds `inventoryReservedUntil`. Unpaid expiry / cancel restores stock once (`inventoryDecremented` flag). Late payment after cancel → auto-refund (never paid+cancelled).

## Mock provider

`PAYMENT_PROVIDER=mock` — deterministic authorities `mock.<scenario>.<paymentId>` with scenarios: `success`, `failure`, `wrong_amount`, `invalid`, `timeout`.

## Idempotency

Reuses Phase 4 `Idempotency-Key` patterns. Open payments for the same order are reused on double-click / refresh.
