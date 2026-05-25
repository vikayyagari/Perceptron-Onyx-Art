# Perceptron Gallery

Premium art gallery mobile platform by **Perceptron Media Designs**.

Three gallery locations, one owner. Customers scan paintings via QR or computer vision, save favourites, and visualize artwork in their home via AR or photo upload.

---

## Monorepo Structure

```
/
├── backend/          # Node.js + TypeScript API (Fastify)
├── admin/            # Next.js 14 admin portal (Phase 2)
├── ios/              # Native iOS app — Swift/SwiftUI (Phase 3+)
├── android/          # Native Android app — Kotlin/Compose (Phase 3+)
└── shared/           # Shared TypeScript types (enums, API contracts)
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone <repo>
cd Perceptron-Onyx-Art
pnpm install
```

### 2. Start infrastructure

```bash
docker-compose up -d
```

This brings up:
- **PostgreSQL 16 + pgvector** on `localhost:5432`
- **Redis 7** on `localhost:6379`
- **MinIO** (S3-compatible) on `localhost:9000` (console on `9001`)

Wait for the health checks to pass (~15 seconds on first run).

### 3. Configure environment

```bash
cd backend
cp .env.example .env
```

Generate RS256 JWT key pair:

```bash
pnpm keys:generate
```

Copy the printed `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` values into `backend/.env`.

### 4. Run database migrations

```bash
cd backend
pnpm db:migrate:dev
```

### 5. Seed the database

```bash
pnpm db:seed
```

This creates:
- 3 galleries (New York, San Francisco, Austin)
- 5 artists
- 20 paintings with rich descriptions
- 3 staff accounts (super admin + gallery admin + gallery staff)
- 2 sample customer accounts with saved paintings

Default credentials after seed:
| Role | Email | Password |
|---|---|---|
| Super Admin | `super@perceptron.art` | `SuperAdmin123!` |
| Gallery Admin | `admin@grandcollection.art` | `GalleryAdmin1!` |
| Gallery Staff | `staff@wcmodern.art` | `GalleryAdmin1!` |

### 6. Start the development server

```bash
# From the monorepo root:
pnpm dev

# Or directly:
cd backend && pnpm dev
```

API available at `http://localhost:3000`

### 7. Start the admin portal

In a separate terminal:

```bash
cd admin
cp .env.example .env
# Set JWT_PUBLIC_KEY to the same public key from step 3
# Set BACKEND_URL=http://localhost:3000
pnpm dev
```

Admin portal at `http://localhost:3002`

Login with any of the seeded staff credentials above.

---

## Environment Variables

All variables are documented in [`backend/.env.example`](backend/.env.example).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `REDIS_URL` | ✓ | Redis connection string |
| `JWT_PRIVATE_KEY` | ✓ | RS256 private key (generate with `pnpm keys:generate`) |
| `JWT_PUBLIC_KEY` | ✓ | RS256 public key |
| `S3_BUCKET` | ✓ | S3/MinIO bucket name |
| `S3_ACCESS_KEY_ID` | ✓ | S3 credentials |
| `S3_SECRET_ACCESS_KEY` | ✓ | S3 credentials |
| `S3_ENDPOINT` | Local dev | MinIO endpoint (omit for AWS) |
| `S3_PUBLIC_URL` | | Public base URL for image URLs |
| `APPLE_APP_ID` | iOS auth | Apple Sign In bundle ID |
| `GOOGLE_CLIENT_ID` | Android auth | Google OAuth client ID |
| `TWILIO_*` | Phone auth | Twilio credentials (OTP stubs to console if omitted) |

---

## API Reference

Base URL: `http://localhost:3000/v1`

### Customer Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/apple` | — | Sign in with Apple |
| `POST` | `/auth/google` | — | Sign in with Google |
| `POST` | `/auth/guest` | — | Create guest session |
| `POST` | `/auth/phone/request` | — | Request SMS OTP |
| `POST` | `/auth/phone/verify` | — | Verify OTP |
| `POST` | `/auth/refresh` | — | Rotate refresh token |
| `GET` | `/me` | Customer | Current user profile |
| `GET` | `/me/saved-paintings` | Customer | User's saved paintings |
| `POST` | `/me/saved-paintings` | Customer | Save a painting |
| `DELETE` | `/me/saved-paintings/:id` | Customer | Unsave a painting |
| `GET` | `/galleries` | — | List all galleries |
| `GET` | `/galleries/:id` | — | Gallery detail |
| `GET` | `/paintings` | — | List paintings (filterable) |
| `GET` | `/paintings/:id` | — | Painting detail with artist |
| `GET` | `/paintings/by-qr/:qrCodeId` | — | QR code lookup |
| `POST` | `/inquiries` | Customer | Create purchase inquiry |
| `POST` | `/analytics/scan` | Optional | Log scan event |
| `POST` | `/analytics/visualization` | Customer | Log AR/photo visualization |

### Admin Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/admin/auth/login` | — | Admin email/password login |
| `POST` | `/admin/auth/refresh` | — | Rotate admin refresh token |
| `POST` | `/admin/auth/logout` | Admin | Revoke all refresh tokens |
| `GET` | `/admin/auth/me` | Admin | Current admin profile |
| `GET/POST` | `/admin/galleries` | Admin | List / create galleries |
| `GET/PATCH/DELETE` | `/admin/galleries/:id` | Admin | Gallery detail / update / delete |
| `POST` | `/admin/galleries/:id/logo` | Admin | Upload gallery logo |
| `GET/POST` | `/admin/paintings` | Admin | List / create paintings |
| `GET/PATCH/DELETE` | `/admin/paintings/:id` | Admin | Painting detail / update / delete |
| `POST` | `/admin/paintings/:id/image` | Admin | Upload painting image |
| `GET` | `/admin/paintings/:id/qr` | Admin | Download QR code PDF |
| `GET/POST` | `/admin/artists` | SuperAdmin | List / create artists |
| `GET/PATCH/DELETE` | `/admin/artists/:id` | SuperAdmin | Artist detail / update / delete |
| `POST` | `/admin/artists/:id/portrait` | SuperAdmin | Upload artist portrait |
| `GET/POST` | `/admin/staff` | SuperAdmin | List / create staff |
| `GET/PATCH/DELETE` | `/admin/staff/:id` | SuperAdmin | Staff detail / update / delete |
| `GET` | `/admin/inquiries` | Admin | List inquiries (gallery-scoped) |
| `PATCH` | `/admin/inquiries/:id/status` | Admin | Update inquiry status |
| `GET` | `/admin/analytics/overview` | Admin | Dashboard stats |

---

## Architecture

### Auth

- **RS256 JWT** — access tokens (1 hour) + refresh tokens (30 days)
- Customer tokens: `{ sub: userId, type: "customer" }`
- Admin tokens: `{ sub: staffId, type: "admin", role, galleryId }`
- Refresh tokens stored **hashed** in Redis; rotated on use (single-use)
- OTP codes stored in Redis with 10-minute TTL

### Gallery Scoping

GALLERY_ADMIN and GALLERY_STAFF can only access data for their assigned gallery. The `assertAdminGalleryFilter` middleware function forces their queries to their `galleryId`. SUPER_ADMIN bypasses all gallery restrictions.

### Database

PostgreSQL 16 with `pgvector` extension. Prisma ORM with strict TypeScript types. The `imageEmbedding` field (`vector(512)`) is stored as a raw PostgreSQL column — similarity search will use `$queryRaw` in Phase 6 when CV is wired up.

### Object Storage

S3-compatible (AWS S3 in production, MinIO locally). Image URLs are constructed from `S3_PUBLIC_URL` + key. Pre-signed URLs are available for private assets if needed.

### Rate Limiting

Backed by Redis. Auth endpoints: 10 req/min per IP. All other endpoints: 100 req/min per IP.

---

## Development

```bash
# Type-check all packages
pnpm typecheck

# Admin portal typecheck
cd admin && pnpm typecheck

# Run all backend tests
cd backend && pnpm test

# Run unit tests only (no Docker needed)
cd backend && pnpm test:unit

# Run integration tests (requires Docker infra)
cd backend && pnpm test:integration

# Admin portal build
cd admin && pnpm build

# Prisma Studio (database GUI)
cd backend && pnpm db:studio

# MinIO console
open http://localhost:9001   # minioadmin / minioadmin
```

---

## Roadmap

| Phase | Scope |
|---|---|
| **1** | Backend API + shared types |
| **2 (current)** | Next.js 14 admin portal |
| **3** | iOS app (Swift/SwiftUI) |
| **4** | Android app (Kotlin/Compose) |
| **5** | AR visualization (RealityKit / ARCore) |
| **6** | Computer vision painting recognition |

See [CHANGES.md](CHANGES.md) for detailed implementation notes.
