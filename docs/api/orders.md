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

Optional header: `Idempotency-Key: <8–128 chars>`

Body: shipping method, payment method (`online` | `cash_on_delivery`), shipping address snapshot, optional `couponCode`, optional `expectedSubtotal` / `expectedTotal` for change acknowledgment.

Server: loads cart → validates → calculates (+ coupon) → snapshots items/address → atomic stock decrement → creates order → redeems coupon atomically → clears cart.

Order numbers: `LUX-YYYY-NNNNNN`.

Online orders set `inventoryReservedUntil` (payment TTL). See [payments.md](./payments.md).

## Customer orders

- `GET /orders`
- `GET /orders/:orderNumber`
- `POST /orders/:orderNumber/cancel`

## Admin

- `GET /admin/orders`
- `GET /admin/orders/:orderNumber`
- `PATCH /admin/orders/:orderNumber/status` `{ "status", "reason?" }`
- `POST /admin/orders/:orderNumber/refund` — see payments.md

Transitions are centralized in `orderTransitions.ts`.

## Inventory

`findOneAndUpdate({ stock: { $gte: qty }, status: 'active' }, { $inc: { stock: -qty } })` — concurrent-safe without requiring replica-set transactions. Compensation restores stock if order persistence fails. Cancellation / reservation expiry restocks when `inventoryDecremented`.

## Money

All amounts are integer تومان.
