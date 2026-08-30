# Orders & Checkout API

Transaction boundary: Cart → Checkout preview → Order → Inventory.

Base: `/api/v1`

## Checkout preview

`POST /checkout/preview` (auth)

```json
{ "shippingMethodId": "post-express", "couponCode": "SAVE10" }
```

Returns server-calculated lines, issues (`PRICE_CHANGED`, `INSUFFICIENT_STOCK`, …), shipping, optional coupon discount, totals. Never trusts client money.

## Create order

`POST /orders` (auth)

**Required** header: `Idempotency-Key: <8–128 chars>`

Same key + same body → original order. Same key + different body → `409 IDEMPOTENCY_CONFLICT`.

Body: shipping method, payment method (`online` | `cash_on_delivery`), shipping address snapshot, optional `couponCode`, optional `expectedSubtotal` / `expectedTotal` for change acknowledgment.

Server: loads cart → validates → calculates (+ coupon) → durable `InventoryHold` → atomic stock decrement → creates order → commits hold → redeems coupon atomically → clears cart.

Crash between decrement and order create leaves a recoverable hold (scheduler / `recoverOrphanedInventoryHolds`).

Order numbers: `LUX-YYYY-NNNNNN`.

**Online and COD** orders set `inventoryReservedUntil` (payment TTL). Stock is never held forever without expiry processing.

## Customer orders

- `GET /orders`
- `GET /orders/:orderNumber`
- `POST /orders/:orderNumber/cancel` — only `pending` / `awaiting_payment` (Option A: paid orders require admin refund workflow)

## Admin

- `GET /admin/orders`
- `GET /admin/orders/:orderNumber`
- `GET /admin/orders/:orderNumber/timeline` — joined Order/Payment/Refund/Audit/Notification diagnostic
- `PATCH /admin/orders/:orderNumber/status` `{ "status", "reason?" }`
- `POST /admin/orders/:orderNumber/refund` — see payments.md

Transitions are centralized in `orderTransitions.ts`.

## Inventory

`findOneAndUpdate({ stock: { $gte: qty }, status: 'active' }, { $inc: { stock: -qty } })` — concurrent-safe without requiring replica-set transactions.

Inventory restoration uses a one-time claim (`inventoryReleaseClaimedAt`) shared by customer cancel, admin cancel, and reservation expiry — double restock is impossible.

## Money

All amounts are integer تومان.
