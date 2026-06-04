# Rentala — Camera Club Gear Loaning System

> **This is an MVP / proof-of-concept.** It is not production-ready and is intended solely to demonstrate the core idea. Security hardening, role-based access control, and other production concerns are not yet in place.

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
| Monorepo | npm workspaces |

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
```

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

---

## Key API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/sign-up/email` | — | Register |
| `POST` | `/api/auth/sign-in/email` | — | Sign in |
| `GET` | `/api/v1/gear` | — | List all gear |
| `POST` | `/api/v1/loans` | Required | Create a reservation |
| `POST` | `/api/v1/loans/:id/pickup` | Required | Mark loan as picked up |
| `POST` | `/api/v1/loans/returns` | Required | Return items (full or partial) |
| `GET` | `/api/v1/users/:id/loans` | — | Get loans for a user |

Full spec available at `/api-docs`.

---

## Known Limitations (MVP)

- No admin interface — gear must be added directly via API
- No role-based access control — all authenticated users have the same permissions
- No email verification or password reset
- No production deployment configuration
