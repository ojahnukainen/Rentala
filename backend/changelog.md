# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
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
