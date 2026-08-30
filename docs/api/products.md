# Products API

Catalog products are the commerce source of truth for Luxora storefront and admin.

Base path: `/api/v1`

## Pricing contract

| Field | Meaning |
| --- | --- |
| `price` | Regular / list price (authoritative) |
| `salePrice` | Optional promotional price (`null`/omitted when none) |
| `displayPrice` | What the customer pays now (`salePrice ?? price`) |
| `originalPrice` | Crossed-out was-price when on sale (storefront `Product.originalPrice`) |
| `onSale` | `true` when a valid sale price is active |
| `currency` | Display currency label (default `تومان`) |

Rules enforced on write: non-negative prices; `salePrice` cannot exceed `price`.

## Identity

- MongoDB `_id` — internal / admin
- `slug` — public storefront URLs (`GET /products/:slug`)
- `sku` — unique commerce identifier for inventory / future order lines

## Product fields

`name`, `slug`, `sku`, `shortDescription`, `description`, `categoryId` / `category`, `productKind`, pricing fields, `images[]`, `gallery`, `imageSrc`, `colors`, `sizes`, `stock`, `lowStockThreshold`, `inStock`, `availability` (`in_stock` | `low_stock` | `out_of_stock`), `status` (`draft` | `active` | `archived`), `featured`, `badge`, `tags`, `material`, `brand`, `href`, timestamps.

`productKind`: `top` | `bottom` | `outerwear` | `dress` | `bag` | `shoes` | `accessory` | `other`

## Public endpoints

### `GET /products`

Query (whitelist only):

| Param | Notes |
| --- | --- |
| `page` | default `1` |
| `limit` | default `24`, max `48` |
| `search` | name, shortDescription, description, sku, tags |
| `category` | category slug or ObjectId |
| `minPrice` / `maxPrice` | against effective price (`salePrice ?? price`) |
| `featured` | `true` \| `false` |
| `kind` | productKind enum |
| `inStock` | `true` \| `false` |
| `sort` | `newest` \| `oldest` \| `price_asc` \| `price_desc` \| `name_asc` \| `name_desc` |

Only `status=active` products are returned. Passing `status` other than active → `400`.

Response:

```json
{
  "status": "success",
  "data": {
    "items": [ /* PublicProduct */ ],
    "pagination": { "page": 1, "limit": 24, "total": 8, "totalPages": 1 }
  }
}
```

### `GET /products/:slug`

Returns a single active product. Archived/draft → `404`.

## Admin endpoints

All require `Authorization: Bearer <token>` **and** role `admin`.

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/admin/products` | List (any status; same query filters + optional `status`) |
| `POST` | `/admin/products` | Create |
| `GET` | `/admin/products/:id` | Retrieve by id |
| `PATCH` | `/admin/products/:id` | Update |
| `DELETE` | `/admin/products/:id` | Soft-archive (`status=archived`) |

Customers receive `403`. Guests receive `401`.

## Errors

| Status | When |
| --- | --- |
| `400` | Malformed public status filter |
| `401` / `403` | Authz |
| `404` | Missing product/category |
| `409` | Duplicate slug or SKU |
| `422` | Validation (prices, stock, images, query) |

## Indexes (why)

- unique `slug`, `sku`
- `{ status, createdAt }`, `{ status, featured, createdAt }`, `{ status, category, createdAt }`, `{ status, price }`, `{ status, productKind }` — public list patterns
- text index on name / descriptions / sku — search assist (regex fallback also used)
