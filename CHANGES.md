# CHANGES — Perceptron Gallery

This file documents every significant implementation decision made during each phase. It is the primary reference for continuing work in future sessions.

---

## Phase 1 — Backend + Shared Types

**Completed:** 2026-05-25  
**Scope:** Monorepo setup, backend API scaffolding, auth, all endpoints, seed data, tests

---

### Monorepo Setup

- **pnpm workspaces** with three packages: `@perceptron/shared`, `@perceptron/backend`, and placeholder dirs for `admin`, `ios`, `android`
- Root `tsconfig.base.json` with strict mode, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- ESLint 8 + `@typescript-eslint/recommended` + `eslint-config-prettier`
- Prettier: single quotes, no semi, trailing commas, 100 char print width
- `.gitignore` covers Node, build artifacts, `.env` files, generated `keys/` dir, Prisma migrations

---

### `@perceptron/shared`

**Files:** `src/enums.ts`, `src/types.ts`, `src/index.ts`

- Pure TypeScript — no runtime dependencies
- `enums.ts` exports: `PaintingStatus`, `AuthProvider`, `GalleryStaffRole`, `ScanMethod`, `VisualizationMode`, `InquiryStatus`
- `types.ts` exports all API request/response contracts: `GalleryPublic`, `PaintingPublic`, `PaintingListItem`, `ArtistPublic`, `UserPublic`, `AuthResponse`, `AdminAuthResponse`, all request body types, pagination wrappers
- Both backend and admin portal (Phase 2) import from `@perceptron/shared` — never duplicate these types

---

### Database Schema (Prisma)

**File:** `backend/prisma/schema.prisma`

Key decisions:
- **pgvector** via `postgresqlExtensions` preview feature; `imageEmbedding` stored as `Unsupported("vector(512)")` — not in TypeScript types, queried via `$queryRaw` with `<->` operator (Phase 6)
- **Decimal** for `price`, `widthCm`, `heightCm`, `depthCm` — use `Number()` to convert for JSON responses (Prisma returns `Decimal` objects)
- `qrCodeId` on Painting is a UUID, unique, auto-generated. It's what gets encoded in the QR code, NOT the painting's primary ID. This allows QR codes to be regenerated without changing the URL structure.
- `SavedPainting` uses composite PK `(userId, paintingId)` — Prisma maps to `userId_paintingId` for unique operations
- `Inquiry.userId` is nullable (guest users can submit if staff take their contact info offline — currently requires auth)
- `ScanEvent.userId` is nullable — anonymous scans are supported
- `GalleryStaff.galleryId` is nullable — null means SUPER_ADMIN (access to all galleries)

Indexes added for common query patterns:
- `paintings(galleryId)`, `paintings(artistId)`, `paintings(status)`, `paintings(qrCodeId)`
- `scanEvents(paintingId)`, `scanEvents(galleryId)`, `scanEvents(createdAt)`
- `inquiries(galleryId)`, `inquiries(status)`

---

### Config

**File:** `backend/src/config.ts`

- Validated at startup using **Zod** — app exits with a clear error message if env vars are missing or malformed
- `getJwtPrivateKey()` and `getJwtPublicKey()` handle `\\n` → `\n` conversion for env vars stored as single-line strings
- All env vars have defaults where sensible; DATABASE_URL, Redis URL, JWT keys, and S3 credentials are required

---

### JWT / Auth

**File:** `backend/src/lib/jwt.ts`, `backend/src/plugins/jwt.ts`

- **RS256** with `@fastify/jwt` — private key for signing, public key for verification
- Single JWT instance; token type is discriminated by `payload.type`:
  - `'customer'` — issued to mobile app users
  - `'admin'` — issued to gallery staff
  - `'refresh'` — refresh tokens (include `jti` for revocation, `tokenType` to know what to issue on rotation)
- Access tokens: 1 hour TTL
- Refresh tokens: 30 days TTL, stored **hashed** (SHA-256) in Redis under key `rt:{userId}:{jti}`
- **Token rotation**: each use of a refresh token revokes the old one and issues a new pair
- `revokeAllRefreshTokens()` uses `redis.keys()` to find and delete all tokens for a user (logout from all devices)
- Admin token rotation requires a DB lookup to get current role/galleryId (role can change)
- OTP codes: 6-digit, stored in Redis under `otp:{phoneNumber}` with 10-minute TTL; Twilio integration is conditional on env vars, falls back to console log

---

### Middleware

**Files:** `backend/src/middleware/`

- `requireAuth` — verifies JWT, checks `type === 'customer'`, loads user from DB (for fresh data), sets `req.currentUser`; updates `lastActiveAt` in background (fire-and-forget)
- `requireAdmin` — verifies JWT, checks `type === 'admin'`, loads staff from DB, sets `req.adminUser`
- `requireSuperAdmin` — calls `requireAdmin` then checks `role === SUPER_ADMIN`
- `requireGalleryAccess(getGalleryId)` — factory that returns a preHandler; SUPER_ADMIN bypasses, others must match their `galleryId`
- `assertAdminGalleryFilter(req, galleryId)` — pure function that overrides the requested galleryId to the staff's assigned gallery for list queries

---

### S3 / Storage

**File:** `backend/src/lib/s3.ts`, `backend/src/services/storage.service.ts`

- `S3_ENDPOINT` is optional — when set, `forcePathStyle: true` is enabled (required for MinIO)
- `getPublicUrl(key)` uses `S3_PUBLIC_URL` if set, otherwise constructs standard AWS URL
- Allowed upload types: `image/jpeg`, `image/png`, `image/webp`
- S3 key conventions:
  - Painting images: `paintings/{paintingId}/{uuid}.{ext}`
  - Artist portraits: `artists/{artistId}/portrait.{ext}`
  - Gallery logos: `galleries/{galleryId}/logo.{ext}`
  - Placeholder: `paintings/placeholder.jpg` (no actual file needed for dev)

---

### Routes — Customer

**Prefix:** `/v1`

All routes are Fastify plugins registered with encapsulated scope.

- **`/auth`** — guest creation doesn't validate galleryId exists (fast path; gallery validation optional). Apple/Google auth delegates to `apple-signin-auth` and `google-auth-library`. Phone OTP stubs to console in dev.
- **`/me`** — hooks `requireAuth` on the entire plugin scope. `lastActiveAt` update is fire-and-forget.
- **`/galleries`** — fully public, no auth
- **`/paintings`** — fully public; `/by-qr/:qrCodeId` is registered BEFORE `/:id` to avoid Fastify routing the literal string "by-qr" as a painting ID
- **`/inquiries`** — requires customer auth; validates painting exists before creating
- **`/analytics/scan`** — intentionally public (anonymous scans allowed). Tries to decode token if present but doesn't fail if absent. `/analytics/visualization` requires customer auth.

---

### Routes — Admin

**Prefix:** `/v1/admin`

Structure: public login/refresh routes + authenticated sub-scope via nested plugin registration.

- **Gallery scoping** is enforced at service layer via `assertAdminGalleryFilter` for list operations, and explicitly checked for single-resource operations
- **Staff routes** are super-admin only (can't demote/delete yourself)
- **Paintings image upload** stubs the embedding generation — adds a comment marking where Phase 6 wires it in
- **QR PDF generation** — `qrcode` generates a data URI, `pdfkit` renders an A5 PDF with the QR image and painting title. Deep link URL format: `perceptrongallery://scan?qr={qrCodeId}`
- **Analytics overview** takes `galleryId` and `days` params; gallery-scoped for non-super-admins

---

### Error Handling

**File:** `backend/src/app.ts` — `setErrorHandler`

Priority order:
1. `ZodError` → 400 with first issue message
2. Prisma P2002 (unique violation) → 409
3. Prisma P2025 (not found) → 404
4. JWT errors → 401
5. Fastify validation errors (statusCode in error) → pass through
6. Everything else → 500 (message hidden in production)

---

### Rate Limiting

**File:** `backend/src/plugins/rate-limit.ts`

- `@fastify/rate-limit` with Redis backend for distributed rate limiting
- Default: 100 req/min per IP (keyed by `x-forwarded-for` or `req.ip`)
- Auth endpoints override to 10 req/min via per-route `config.rateLimit` option

---

### Seed Data

**File:** `backend/prisma/seed.ts`

- 3 galleries, 5 artists, 20 paintings with realistic descriptions and metadata
- QR codes are deterministic hashes of `title + galleryId` — re-running seed is idempotent
- `paintings/placeholder.jpg` is used as `primaryImage` — the actual S3 object doesn't need to exist for API responses to work
- All `upsert` calls — safe to run multiple times

---

### Tests

**Unit tests** (`src/__tests__/unit/`):
- `auth.test.ts` — `hashPassword`, `createGuestUser`, `requestPhoneOtp`, `verifyPhoneOtp` — all Prisma/Redis dependencies mocked
- `gallery-scope.test.ts` — `assertAdminGalleryFilter` for all role combinations — pure function, no mocks needed

**Integration tests** (`src/__tests__/integration/`):
- `auth.test.ts` — guest auth flow, token refresh, JWT verification, admin login, `/health`
- `paintings.test.ts` — full painting CRUD via admin API, QR lookup, saved paintings CRUD
- `global-setup.ts` runs `prisma migrate deploy` on the test database before any tests
- Each test suite clears all tables in `beforeAll` for isolation
- Tests use `fastify.inject()` — no real HTTP server needed

**Test environment:**
- `setup-env.ts` runs via `setupFiles` (before module loading) and generates a fresh RSA key pair for each test run
- Set `DATABASE_URL_TEST` to point at your test database (Docker Compose creates `gallery_test` automatically)

---

### Infrastructure

**File:** `docker-compose.yml`

- PostgreSQL image: `pgvector/pgvector:pg16` — includes pgvector extension pre-installed
- `backend/scripts/init-test-db.sql` is mounted as an init script to create `gallery_test` database on first startup
- MinIO bucket `perceptron-gallery` is created automatically by the `minio-setup` service
- All services have health checks

---

## What's Next — Phase 2

1. Run `pnpm build` in `admin/` directory placeholder → scaffold Next.js 14 App Router
2. Install `@perceptron/shared` in admin — all types already defined
3. Admin portal will call the admin API endpoints above
4. Key admin screens: dashboard, painting list/edit, QR download, inquiry management, staff management

## Remaining Stubs (to complete in later phases)

| Stub | Phase |
|---|---|
| Apple Sign In (`apple-signin-auth`) | 3 — when iOS app is ready |
| Google Sign In (`google-auth-library`) | 3/4 — when mobile apps are ready |
| Twilio SMS OTP | Can be wired up any time with credentials |
| Image embedding generation (`POST /admin/paintings/:id/image`) | 6 — CV pipeline |
| pgvector similarity search | 6 — CV pipeline |
| Push notifications | 5+ |
