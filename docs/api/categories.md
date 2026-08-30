# Categories API

Categories group products for browsing. Products reference a category by ObjectId; category name/slug on product responses are populated summaries, not duplicated authority.

Base path: `/api/v1`

## Fields

`id`, `name`, `slug` (unique, URL-safe), `description`, `image`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`

## Public endpoints

### `GET /categories`

Returns active categories ordered by `sortOrder`, then `name`.

```json
{
  "status": "success",
  "data": { "items": [ /* PublicCategory */ ] }
}
```

### `GET /categories/:slug`

Returns one active category. Inactive → `404`.

## Admin endpoints

Require auth + `admin` role.

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/admin/categories` | All categories (including inactive) |
| `POST` | `/admin/categories` | Create |
| `GET` | `/admin/categories/:id` | By id |
| `PATCH` | `/admin/categories/:id` | Update (including reactivate) |
| `DELETE` | `/admin/categories/:id` | Soft-deactivate (`isActive=false`) |

Deactivating a category:

- does **not** delete or hide products from the database
- removes the category from the public category list / slug lookup
- active products remain visible in `GET /products` (and remain filterable by that category id/slug)

## Errors

`409` duplicate slug · `404` missing · `422` validation · `401`/`403` authz
