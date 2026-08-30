# Cart API

Authenticated user cart. Cart quantity is **intent**, not inventory reservation — Checkout/Orders will re-validate stock.

Base path: `/api/v1/cart`  
All routes require `requireAuth`. User identity comes from the JWT — never from the client body.

## Endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/cart` | Get or create the user's cart; resolve current product pricing |
| `POST` | `/cart/items` | Add item (same product+size+color **increments** quantity) |
| `PATCH` | `/cart/items/:productId` | Set quantity (`?size=&color=` for variant) |
| `DELETE` | `/cart/items/:productId` | Remove line |
| `DELETE` | `/cart` | Clear cart |
| `POST` | `/cart/merge` | Merge guest lines (login migration) |

## Add body

```json
{ "productId": "<ObjectId>", "quantity": 1, "size": "M", "color": "مشکی", "colorValue": "#171717" }
```

Rejected fields: price, salePrice, totals, productName (mass assignment blocked via `.strict()` Zod).

## Validation

- quantity 1–99 integer
- product must exist and be `active`
- quantity cannot exceed stock (409, not silently reduced)
- archived/draft cannot be added (409)
- archived items already in cart remain inspectable with `available: false`

## Pricing

Line unit price = current `displayPrice` from Product.  
`unitPriceSnapshot` stored on write; `priceChanged` when current ≠ snapshot.

## Summary

Server calculates `subtotal`, `itemCount`, free-shipping progress using `FREE_SHIPPING_THRESHOLD` (5_000_000). Final shipping cost stays in Checkout UI.
