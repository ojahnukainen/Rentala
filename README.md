# Rentala — Camera Club Gear Loaning System

> **This is proof-of-concept.** It is not production-ready and is intended solely to demonstrate the core idea. Security hardening, role-based access control, and other production concerns are not yet in place.

A web application for managing gear loans in a camera club. Members can browse available equipment, reserve it for a date range, pick it up, and return it — including partial returns (e.g. return a camera body while keeping a lens).

---

## Features (MVP scope)

- Browse available gear by category
- Reserve one or more items for a date range (double-booking prevented)
- Pickup and return flows, including cancelling a reservation before pickup
- User authentication (sign-up / sign-in / sign-out)
- Dashboard showing current and upcoming loans
- OpenAPI docs at `/api-docs`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 24, TypeScript, Express 5 |
| Database | PostgreSQL 18, Prisma 7 |
| Validation | Zod 4 |
| Auth | better-auth |
| Frontend | Vite, React, TypeScript |

---

## Project Structure

```
rentala_project/
├── backend/        # Express API
├── frontend/       # Vite + React app
└── shared/         # Shared Zod schemas and enums
```

---

## Prerequisites

- Node.js 24+
- PostgreSQL 18 running locally

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"
BETTER_AUTH_URL="http://localhost:3000"
API_DOCS_PUBLIC="true"
```

`API_DOCS_PUBLIC=true` serves Swagger UI at `/api-docs` without a password. **Local development only** — without it the docs are not mounted at all.

### Optional / deployment environment

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `FRONTEND_URL` | — | Extra allowed CORS origin and better-auth trusted origin |
| `SECURE_COOKIES` | `false` | Set `true` when frontend and backend are on different domains — issues `SameSite=None; Secure` session cookies |
| `API_DOCS_USER` + `API_DOCS_PASSWORD` | — | Serve `/api-docs` behind HTTP Basic auth. **Both** are required; setting one alone leaves the docs unmounted |
| `API_DOCS_PUBLIC` | — | `true` serves `/api-docs` with no password. Ignored when the credentials above are set |
| `RATE_LIMIT_ENABLED` | on except under `NODE_ENV=test` | Force auth rate limiting on (`true`) or off (`false`) |

Rate limiting on `/api/auth/*` keys off the `x-forwarded-for` header. Behind a proxy that does not set it, better-auth skips rate limiting rather than failing closed.

### 3. Run database migrations

```bash
cd backend
npx prisma migrate dev
```

### 4. Start the backend

```bash
# From monorepo root
npm run dev:backend
```

Backend runs on `http://localhost:3000`. API docs at `http://localhost:3000/api-docs`.

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`.

### 6. Create the first admin

Sign-up always creates a `MEMBER` — a `role` in the sign-up body is ignored. To get an admin, sign up through the frontend, then promote that account:

```bash
# From monorepo root, against the DB in backend/.env
npm run promote-admin -w backend -- you@example.com
```

On a deployed build (e.g. the Render shell): `node dist/scripts/promoteAdmin.js you@example.com`. The change applies to existing sessions on their next request.

---

## Key API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/sign-up/email` | — | Register |
| `POST` | `/api/auth/sign-in/email` | — | Sign in |
| `GET` | `/api/v1/gear` | — | List all gear |
| `POST` | `/api/v1/gear` | Admin | Add a gear item |
| `POST` | `/api/v1/loans` | Required | Create a reservation |
| `POST` | `/api/v1/loans/:id/pickup` | Required | Mark loan as picked up |
| `POST` | `/api/v1/loans/returns` | Required | Return items (full or partial) |
| `GET` | `/api/v1/users` | Admin | List all users |
| `GET` | `/api/v1/loans/stats` | Admin | Dashboard loan counts |
| `GET` | `/api/v1/users/:id/loans` | Required (own only) | Get loans for a user |

Full spec available at `/api-docs`.

---

## Known Limitations (MVP)

- Two roles only (`MEMBER`, `ADMIN`); admins are promoted via the `promote-admin` script, not through the UI
- No email verification or password reset
- No production deployment configuration
