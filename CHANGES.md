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

---

## Phase 2 — Admin Portal

**Completed:** 2026-05-25  
**Scope:** Next.js 14 App Router admin portal for gallery management

---

### Stack

- **Next.js 14.2.5** App Router with TypeScript strict, `moduleResolution: bundler`
- **Tailwind CSS 3** + `tailwindcss-animate` + custom amber/stone design tokens
- **shadcn/ui** components (manually inlined to avoid CLI dependency)
- **TanStack Query v5** with a `QueryProvider` wrapper, 30s stale time, smart retry (no retry on 401/403/404)
- **react-hook-form + zod** for all forms
- **Tiptap** (StarterKit + Link + Placeholder) for rich-text description/provenance editors
- **recharts** for dashboard charts (BarChart + PieChart)
- **sonner** toasts (top-right, rich colors)
- **next-themes** for dark/light mode toggle
- **jose** for Edge-compatible RS256 JWT verification in middleware

---

### Authentication

- **HTTP-only cookies** — access token in `perceptron_admin_token` (1h), refresh in `perceptron_admin_refresh` (30d, scoped to `/api/auth`)
- `POST /api/auth/login` — proxies to backend `/v1/admin/auth/login`, sets both cookies
- `POST /api/auth/logout` — clears both cookies
- `POST /api/auth/refresh` — rotates tokens via backend; on failure clears cookies
- **Middleware** (`src/middleware.ts`) — verifies RS256 JWT on every non-public route. SUPER_ADMIN paths gated by role. Sets `x-admin-id`, `x-admin-role`, `x-admin-gallery-id` headers for downstream use.
- `getAdminSession()` — server-component helper that reads cookie and verifies JWT via `jose.importSPKI` + `jwtVerify`

---

### API Proxy

`/api/proxy/[...path]/route.ts` — wildcard handler that:
1. Reads `perceptron_admin_token` cookie and forwards as `Authorization: Bearer`
2. Passes through all methods (GET/POST/PUT/PATCH/DELETE)
3. Handles both JSON and multipart/form-data transparently
4. Returns 502 if backend is unreachable

All client-side `api.*` calls go to `/api/proxy/v1/...` — the proxy adds the auth header server-side, so the token never touches client JavaScript.

---

### Screen Inventory

| Route | Component | Notes |
|---|---|---|
| `/login` | `LoginPage` | Email/password form, shows/hides password |
| `/` | `DashboardPage` + `DashboardClient` | Stats cards + recharts analytics |
| `/paintings` | `PaintingsPage` + `PaintingsTable` | Paginated list, search, status filter, QR download, delete |
| `/paintings/new` | `NewPaintingPage` + `PaintingWizard` | 3-step wizard: details → dimensions/pricing → description/image |
| `/paintings/[id]` | `PaintingDetailPage` + `PaintingDetailClient` | Tabbed detail editor (details, description, provenance) |
| `/artists` | `ArtistsPage` + `ArtistsClient` | Card grid, create/edit/delete via dialog |
| `/inquiries` | `InquiriesPage` + `InquiriesClient` | Inbox list, click to open detail dialog, status transitions |
| `/staff` | `StaffPage` + `StaffClient` | Table, create staff dialog, delete (SUPER_ADMIN only) |
| `/galleries` | `GalleriesPage` + `GalleriesClient` | Card grid (SUPER_ADMIN only), create/edit galleries |
| `/photography` | `PhotographyPage` + `PhotographyClient` | Tablet camera helper: select painting → capture → preview → upload |

---

### Design Decisions

- **Fonts**: Fraunces (variable, serif) for headings and brand marks; Inter for UI text. Loaded via `next/font/google`.
- **Color system**: CSS custom properties in `globals.css` with separate light/dark sets. Primary = deep amber (HSL 35 92% 50%). Background = warm off-white (HSL 40 20% 98%) in light, dark charcoal in dark.
- **Gallery-scoped views**: All client components receive `galleryId` from server components via session. GALLERY_ADMIN/GALLERY_STAFF users see only their gallery's data; SUPER_ADMIN sees everything.
- **Sidebar**: Fixed left-side navigation with active state indicator. Logout button at bottom calls `/api/auth/logout` then redirects to `/login`.
- **`typedRoutes`**: Disabled in final next.config.mjs (not supported in 14.2.5 without the experimental beta).

---

### QR Placard Download

- Client calls `GET /api/proxy/v1/admin/paintings/:id/qr` (no JSON, returns `application/pdf`)
- Response is streamed as a blob, then triggered as a file download with filename `placard-{id}.pdf`
- PDF generation is handled entirely by the backend (pdfkit + qrcode) — no frontend PDF library needed

---

### Photography Helper

Tablet-optimized full-screen camera UI:
1. **Select**: search paintings by title, pick one
2. **Camera**: access device camera (`facingMode: environment`), can flip, tap shutter to capture to canvas
3. **Preview**: shows captured image full-screen, confirm or retake
4. On confirm: uploads as multipart form to `/v1/admin/paintings/:id/images` via proxy

---

## What's Next — Phase 3+

### Remaining Stubs (to complete in later phases)

| Stub | Phase |
|---|---|
| Apple Sign In (`apple-signin-auth`) | 3 — when iOS app is ready |
| Google Sign In (`google-auth-library`) | 3/4 — when mobile apps are ready |
| Twilio SMS OTP | Can be wired up any time with credentials |
| Image embedding generation (`POST /admin/paintings/:id/image`) | 6 — CV pipeline |
| pgvector similarity search | 6 — CV pipeline |
| Push notifications | 5+ |
| iOS app | Phase 3 |
| Android app | Phase 4 |

## Remaining Stubs (to complete in later phases)

| Stub | Phase |
|---|---|
| Apple Sign In (`apple-signin-auth`) | 3 — when iOS app is ready |
| Google Sign In (`google-auth-library`) | 3/4 — when mobile apps are ready |
| Twilio SMS OTP | Can be wired up any time with credentials |
| Image embedding generation (`POST /admin/paintings/:id/image`) | 6 — CV pipeline |
| pgvector similarity search | 6 — CV pipeline |
| Push notifications | 5+ |
