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
