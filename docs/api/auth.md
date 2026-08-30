# Auth API

Base path: `/api/v1/auth`

All responses use a consistent envelope:

```json
{ "status": "success" | "error", "message?": "...", "code?": "...", "data?": {}, "errors?": {} }
```

## POST `/api/v1/auth/register`

Create a customer account.

**Body**

```json
{
  "firstName": "سارا",
  "lastName": "محمدی",
  "phone": "09121234567",
  "email": "customer@luxora.ir",
  "password": "demo1234a"
}
```

- `phone` and/or `email` required (at least one)
- Iranian mobiles accepted as `09xxxxxxxxx`, `+989...`, `989...`
- Password: min 8 chars, must include a letter and a number

**201**

```json
{
  "status": "success",
  "data": {
    "user": { "id": "...", "firstName": "سارا", "role": "customer", "...": "..." },
    "accessToken": "<jwt>"
  }
}
```

Also sets httpOnly cookie `luxora_token` (name configurable).

## POST `/api/v1/auth/login`

**Body**

```json
{
  "identifier": "09121234567",
  "password": "demo1234a",
  "remember": true
}
```

`identifier` may be phone or email.

Invalid credentials always return the same Persian message (no account enumeration).

**200** — same shape as register.

## POST `/api/v1/auth/logout`

Clears the auth cookie. Bearer clients should discard their token locally.

**200**

```json
{ "status": "success", "message": "با موفقیت خارج شدید." }
```

## GET `/api/v1/auth/me`

Requires authentication (Bearer or cookie).

**200**

```json
{
  "status": "success",
  "data": { "user": { "...": "..." } }
}
```

## Auth header

```http
Authorization: Bearer <accessToken>
```

or cookie credentials with CORS `credentials: true` from an allowed origin.
