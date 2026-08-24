# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Security
- Rate limiting enabled on `/api/auth/*` via better-auth's built-in limiter — no new dependency. `src/lib/rateLimit.ts` holds the config: `/sign-in/email` 5 per 60s, `/sign-up/email`, `/forget-password` and `/reset-password` 5 per hour, with a 60-per-60s global fallback for other auth routes. better-auth also applies its own built-in 3-per-10s rule to `/sign-in*`, `/sign-up*`, `/change-password*` and `/change-email*`
- `rateLimit.enabled` is **not** left on better-auth's default of `NODE_ENV === "production"`. A host that does not set `NODE_ENV` would otherwise leave sign-in brute force unbounded while the config still looked enabled. It now defaults to on everywhere except `NODE_ENV=test` (the suite shares one client IP), overridable with `RATE_LIMIT_ENABLED`
- Verified end-to-end: 5 sign-in attempts from one IP succeed with 401, the 6th returns 429; a second IP is unaffected, so the limiter keys per-IP rather than globally
- Limits are per-IP, read from `x-forwarded-for`. Behind a proxy that does not set that header better-auth **skips** rate limiting rather than failing closed. Storage is in-memory, so budgets are per process
- `/api-docs` is no longer served unconditionally. `src/middleware/apiDocs.ts` resolves a mode from the environment and **fails closed**: `API_DOCS_USER` + `API_DOCS_PASSWORD` serve it behind HTTP Basic auth, `API_DOCS_PUBLIC=true` serves it unprotected for local development, and anything else does not mount it at all. Half-configured credentials resolve to off rather than silently downgrading to public
- The docs guard deliberately does not key off `NODE_ENV`, so a deployed host that forgets to set it cannot publish the API surface
- Basic auth compares both halves of the credentials with `timingSafeEqual` over SHA-256 digests, and returns an identical 401 for every failure mode, so the response reveals neither timing nor which half was wrong
- Startup now logs the resolved API-docs mode and whether auth rate limiting is on
- `POST /api/v1/loans/returns` is now ownership-checked. `LoanService.processReturn` takes a `requestingUserId` and scopes its `loanItem.findMany` with `loan: { userId: requestingUserId }`, so items on another member's loan never come back and the existing length check rejects them as `NotFoundError` (not 403, so the response does not confirm whether that item id exists). Previously any authenticated member could return **or cancel** any other member's gear by passing arbitrary `loanItemIds` — resolves the finding at `CODEAUDIT.md:3`
- The ownership scope lives in the query rather than in a loop over the results, so an extra id added to the batch cannot skip the check
- OpenAPI: `401` registered on `POST /api/v1/loans`, `POST /api/v1/loans/:id/pickup` and `POST /api/v1/loans/returns`; the pickup and returns paths now document their own-records-only rule
- `GET /api/v1/users` now requires an authenticated session — it previously returned every user's name, email, role and id to unauthenticated callers
- `GET /api/v1/users/:id` now requires a session **and** is restricted to the requesting user's own record; `UserService.getUserById` takes a `requestingUserId` and throws `NotFoundError` (not 403) for a foreign id, so the response does not confirm whether that user exists. The ownership check runs before the query, so no lookup happens for foreign ids
- `GET /api/v1/users/:id/loans` now requires a session **and** is restricted to the requesting user's own loans; `LoanService.getLoansByUser` takes a `requestingUserId` with the same NotFound-over-403 behaviour. It previously exposed any user's full loan history to unauthenticated callers
- `POST /api/v1/gear` now requires an authenticated session; anyone could previously add inventory
- `GET /api/v1/gear` and `GET /api/v1/gear/:id` deliberately remain public so members can browse the catalogue before signing in — covered by a regression test
- OpenAPI: `401` responses registered on all four newly gated paths; the two `:id` paths document the own-record-only rule
- Note: these gates close *anonymous* access only. Any authenticated member can still list the full user directory — closing that requires the ADMIN role gate, which is not yet implemented

### Removed
- `POST /api/v1/users` route, `UserController.createUser`, `UserService.createUser`, `backend/src/user/user.schema.ts`, and `CreateUserSchema`/`CreateUserInput` from `@rentala_project/shared` — the route was unauthenticated and accepted `role: "ADMIN"` straight from the request body, and the rows it created had no `Account`, so they could never log in. Signup is owned by better-auth at `POST /api/auth/sign-up/email`. A route test asserts the path now 404s, to guard against reintroduction

### Changed
- `src/openapi/document.ts` — replaced 11 deprecated `z.string().datetime()` calls with Zod 4's `z.iso.datetime()`. Verified no-op: the generated OpenAPI document was dumped before and after and is byte-identical, so `format: "date-time"` is unchanged for every field. No other deprecated Zod string-format calls remain in the codebase (the `z.coerce.date()` calls in `gear.schema.ts` and the shared package are current API, not deprecated)

### Added
- `GearClassification` enum (`EVENT`, `NON_EVENT`) added to Prisma; new `Gear.classification` column with `@default(EVENT)` migration backfills existing rows
- `CreateGearSchema` in `@rentala_project/shared` now requires `classification`
- `GearService.createGear` translates Prisma P2002 duplicate-serial errors into `ConflictError` (`409`)
- OpenAPI: `Gear` schema gains `classification`; `POST /api/v1/gear` documents the new `409` response
- `GET /api/v1/loans/stats` — returns `{ activeLoans }` for the admin dashboard; auth-required
- `LoanService.getStats` — counts loans that are not fully returned (zero items OR at least one non-RETURNED item)
- `LoanStatsResponseSchema` and `LoanStatsResponse` type added to `@rentala_project/shared`
- OpenAPI: `LoanStats` schema component + `GET /api/v1/loans/stats` path registered in `src/openapi/document.ts`
- Initialized Node.js + TypeScript project with strict mode enabled
- Installed Express, Prisma, Zod, Vitest, Supertest, vitest-mock-extended, swagger-ui-express, @asteasolutions/zod-to-openapi and all related @types packages
- Configured `tsconfig.json` with `"strict": true`, CommonJS module output
- Configured `vitest.config.ts` for node environment test runner
- Basic Express server in `src/index.ts` with `GET /ping` health check endpoint
- npm scripts: `dev`, `build`, `start`, `test`
- Prisma 7 initialized with PostgreSQL schema (User, Gear, Loan, LoanItem models + enums)
- Prisma client generated to `src/generated/prisma/` using `@prisma/adapter-pg` driver
- `src/lib/prisma.ts` — singleton PrismaClient instance
- `prisma/seed.ts` — repeatable seed script (2 users, 5 gear items); clears data before seeding
- `src/__mocks__/prisma.ts` — deep mock of PrismaClient via vitest-mock-extended for unit tests
- `src/errors/AppError.ts` — custom error hierarchy: `AppError`, `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409)
- `src/middleware/errorHandler.ts` — global Express error-handling middleware; formats operational errors as `{ error: { name, message } }`, returns generic 500 for unexpected errors without leaking internals
- Registered `errorHandler` in `src/index.ts`
- `src/middleware/validate.ts` — curried Zod validation middleware; formats field-level errors using `error.issues` (Zod 4 API) and forwards a `ValidationError` to the error handler on failure
- `src/gear/gear.schema.ts` — Zod schema `CreateGearSchema` (name, serialNumber, category)
- `src/gear/gear.service.ts` — `GearService`: `listGear`, `getGearById` (throws `NotFoundError`), `createGear`
- `src/gear/gear.controller.ts` — `GearController`: thin handlers delegating to `GearService`
- `src/gear/gear.routes.ts` — `GET /gear`, `GET /gear/:id`, `POST /gear` (with Zod validation)
- Mounted gear router at `/gear` in `src/index.ts`
- `src/user/user.schema.ts` — Zod schema `CreateUserSchema` (email, name, role enum MEMBER|ADMIN — all required)
- `src/user/user.service.ts` — `UserService`: `listUsers`, `getUserById` (throws `NotFoundError`), `createUser` (catches P2002 and throws `ConflictError`)
- `src/user/user.controller.ts` — `UserController`: thin handlers delegating to `UserService`
- `src/user/user.routes.ts` — `GET /users`, `GET /users/:id`, `POST /users` (with Zod validation)
- Mounted user router at `/users` in `src/index.ts`
- `src/loan/loan.schema.ts` — Zod schema `CreateLoanSchema` (userId, gearIds array min 1, dueDate coerced from string)
- `src/loan/loan.service.ts` — `LoanService.createLoan`: validates empty gearIds and past dueDate, verifies all gear IDs exist, checks date-range overlaps via `LoanItem` (not gear status), creates Loan + LoanItems + updates Gear to RENTED inside a single `$transaction`
- `src/loan/loan.controller.ts` — `LoanController`: thin handler delegating to `LoanService`
- `src/loan/loan.routes.ts` — `POST /loans` with Zod validation
- Mounted loan router at `/loans` in `src/index.ts`
- `ProcessReturnSchema` added to `loan.schema.ts` — validates `loanItemIds` array (min 1)
- `LoanService.processReturn` — fetches items by ID, throws `NotFoundError` for missing IDs, throws `ConflictError` for already-returned items, then wraps `loanItem.updateMany` (status → RETURNED, sets `returnedAt`) + `gear.updateMany` (status → AVAILABLE) in a single `$transaction`; supports partial and full returns
- `POST /loans/returns` route with Zod validation added to loan router
- All API routes moved under `/api/v1` prefix (`/api/v1/gear`, `/api/v1/users`, `/api/v1/loans`); `GET /ping` remains at root for health checks
- `src/openapi/document.ts` — OpenAPI 3.0 document generated dynamically from Zod schemas using `@asteasolutions/zod-to-openapi`; documents all gear, user and loan routes with request/response schemas and error responses
- Swagger UI served at `GET /api-docs`
- Loan model redesigned: added `startDate DateTime` (booking period start) and made `borrowedAt DateTime?` nullable (set only at actual pickup); gear stays `AVAILABLE` at booking time
- `LoanService.createLoan` updated: validates `startDate` not in past and `dueDate` after `startDate`; availability checked by date-range overlap on `LoanItem` (not gear status), so future-period bookings work even if gear is currently rented; no gear status update at booking time
- `LoanService.pickupLoan` added: sets `borrowedAt` to current timestamp and updates all loan gear to `RENTED` inside a `$transaction`; throws `NotFoundError` if loan not found, `ConflictError` if already picked up
- `POST /api/v1/loans/:id/pickup` route added to loan router
- `GET /api/v1/users/:id/loans` route added — returns all loans for a user with nested items and gear details; throws `NotFoundError` if user does not exist
- `LoanService.getLoansByUser` added: verifies user exists, then queries loans with `include: { items: { include: { gear: true } } }`
- `getLoansByUser` handler added to `UserController` and mounted in `UserRoutes`
- Better Auth integrated for authentication (`better-auth` package installed)
- Prisma schema updated with Better Auth required models: `Session`, `Account`, `Verification`; `User` model extended with `emailVerified Boolean`, `image String?`, `sessions`, and `accounts` relations; `User.id` no longer auto-generated (Better Auth manages IDs)
- `src/lib/auth.ts` — Better Auth server instance initialised with Prisma adapter and `emailAndPassword` plugin enabled
- `src/auth/auth.routes.ts` — exports `authHandler = toNodeHandler(auth)` for mounting in Express
- `app.all("/api/auth/*path", authHandler)` registered in `src/index.ts` before `express.json()` (required by Better Auth)
- `src/lib/prisma.ts` updated to import `dotenv/config` directly so the DB connection works in all contexts including tests and seed
- `prisma/seed.ts` updated: clears `Session`, `Account`, `Verification` tables before seeding; seed users now include `emailVerified: true` and explicit `id` fields; imports `dotenv/config`
- `UserService.createUser` updated to generate a UUID via `crypto.randomUUID()` and set `emailVerified: false` for API-created users
- OpenAPI document updated: Auth tag with `POST /api/auth/sign-up/email` and `POST /api/auth/sign-in/email` documented; Loan response schema updated with `startDate` and nullable `borrowedAt`; pickup route and user loans route documented
- `src/middleware/requireAuth.ts` — async Express middleware that calls `auth.api.getSession` via `fromNodeHeaders`; attaches `session.user` to `req.user` on success; forwards a 401 `AppError` to the error handler when the session is missing or invalid
- `src/types/express.d.ts` — declaration merging to extend Express `Request` with `user?: User` (Prisma generated type)
- `requireAuth` added to all three loan routes (`POST /api/v1/loans`, `POST /api/v1/loans/:id/pickup`, `POST /api/v1/loans/returns`); `userId` removed from `CreateLoanSchema` and `CreateLoanInput` — it is now read from `req.user.id` (set by `requireAuth`) in `LoanController.createLoan`
- `cors` installed and configured in `src/index.ts`; allows origins `http://localhost:3000` and `http://localhost:5173` with `credentials: true` so Better Auth session cookies are accepted by the frontend
- `src/lib/auth.ts` updated with `baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000"` to eliminate the base URL warning and support redirect/callback flows
- `prisma/seed.ts` rewritten to create seed users via `auth.api.signUpEmail` — passwords are now properly hashed by Better Auth and `Account` records are created, so `alice@cameraclub.fi` and `bob@cameraclub.fi` (password: `password123`) can sign in from the frontend immediately after seeding; roles and `emailVerified` are set via a follow-up `prisma.user.update`
