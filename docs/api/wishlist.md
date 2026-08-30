# Wishlist API

Authenticated wishlist of product references. Duplicates are prevented (`$addToSet`).

Base path: `/api/v1/wishlist`  
All routes require `requireAuth`.

## Endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/wishlist` | List saved products (current catalog fields) |
| `POST` | `/wishlist/:productId` | Add (idempotent) |
| `DELETE` | `/wishlist/:productId` | Remove (idempotent if missing) |
| `POST` | `/wishlist/merge` | `{ productIds: [] }` unique merge for login |

Archived products stay on the wishlist with `available: false` — user intent is preserved.
