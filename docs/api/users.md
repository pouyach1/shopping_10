# Users API

Base path: `/api/v1/users`

All routes require authentication.

## GET `/api/v1/users/me`

Returns the authenticated user's public profile (never includes `passwordHash`).

## PATCH `/api/v1/users/me`

Update safe profile fields only.

**Allowed**

```json
{
  "firstName": "نیما",
  "lastName": "محمدی",
  "phone": "09121234567",
  "email": "nima@luxora.ir"
}
```

`email` may be set to `null` to clear, as long as `phone` remains.

**Rejected** (400): attempts to set `role`, `passwordHash`, `password`, `isActive`, `id`, timestamps, etc.

## POST `/api/v1/users/me/password`

Dedicated password change.

```json
{
  "currentPassword": "demo1234a",
  "newPassword": "newPass123"
}
```

## POST `/api/v1/users/me/addresses`

Add a shipping address foundation record.

```json
{
  "title": "منزل",
  "recipientName": "سارا محمدی",
  "phone": "09121234567",
  "province": "تهران",
  "city": "تهران",
  "postalCode": "1234567890",
  "addressLine": "خیابان ولیعصر",
  "plaque": "۱۲",
  "unit": "۳",
  "isDefault": true
}
```

## DELETE `/api/v1/users/me/addresses/:addressId`

Remove one address. If the default was removed and others remain, the first remaining address becomes default.

## Roles

`requireRole('admin')` middleware exists for future admin APIs. Customer profile routes only require authentication.
