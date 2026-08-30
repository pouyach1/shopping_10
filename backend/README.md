# Luxora Backend

Production-oriented Express + TypeScript + MongoDB API for the Luxora e-commerce platform.

Phase 1 delivers the **foundation + authentication + users** layer. Commerce domains (products, cart, orders, payments) build on this later.

## Requirements

- Node.js 22+
- MongoDB 6+ (local or hosted)
- npm

## Quick start

```bash
cd backend
cp .env.example .env
# Edit JWT_SECRET (required in production) and MONGODB_URI
npm install
npm run dev
```

Health checks:

- `GET http://localhost:4000/api/v1/health` — process liveness
- `GET http://localhost:4000/api/v1/health/ready` — MongoDB readiness
- `GET http://localhost:4000/api/health` — temporary compatibility alias

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch mode via `tsx` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest + in-memory MongoDB |

## Architecture

```text
Route → Controller → Service → Model
```

Cross-cutting concerns live in middleware (auth, validation, rate limits, errors).

```text
src/
  config/       env validation, DB lifecycle, constants
  controllers/  HTTP adapters (thin)
  middleware/   auth, errors, rate limits, validation helpers
  models/       Mongoose schemas
  routes/v1/    versioned API
  services/     business logic + tokens
  validators/   Zod request schemas
  utils/        AppError, logger, password, phone
  types/        Express augmentation
```

## Authentication

- Register / login issue a JWT access token
- Token is returned in the JSON body **and** set as an httpOnly cookie (`AUTH_COOKIE_NAME`)
- Protected routes accept `Authorization: Bearer <token>` **or** the auth cookie
- Logout clears the cookie (Bearer clients discard the token client-side)
- Passwords are hashed with bcrypt (cost 12)
- `passwordHash` is never selected by default and never returned in API responses

See:

- [docs/api/auth.md](../docs/api/auth.md)
- [docs/api/users.md](../docs/api/users.md)

## Environment

See [`.env.example`](./.env.example).

Production fails fast when:

- `JWT_SECRET` is missing or shorter than 32 characters
- `CLIENT_ORIGINS` is empty or `*`

Development may boot with a temporary JWT secret (logged as a warning). Prefer setting a real secret even locally.

## Security defaults

- Helmet
- CORS with explicit `CLIENT_ORIGINS` (credentials enabled)
- JSON body size limit
- General API rate limit
- Stricter rate limit on `/auth/register` and `/auth/login`
- Centralized operational errors (no stack traces in production responses)

## Frontend note

The storefront Profile UI still uses the mock `profileAuth` layer. This API is intentionally shaped so that layer can later call:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/users/me`

without redesigning the account hub screens.

Do not remove mock storefront auth until a dedicated frontend migration phase wires `fetch` + credentials/Bearer.

## Phase 2 (recommended)

1. Product + category models and public catalog APIs
2. Admin auth (`requireRole('admin')`) wired to the existing Admin UI
3. Server-authoritative cart / inventory primitives
